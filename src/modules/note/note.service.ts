import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { CryptoService } from '../crypto/crypto.service.js';

@Injectable()
export class NoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,  // AuditLog inject
    private readonly cryptoService: CryptoService,
  ) { }


  /**
   * নোট ডিক্রিপ্ট করার জন্য helper function
   */
  private decryptNote(note: any) {
    if (!note) return note;
    try {
      return {
        ...note,
        title: note.title && note.iv && note.authTag
          ? this.cryptoService.decrypt(note.title, note.iv, note.authTag)
          : note.title,
        content: note.content && note.iv && note.authTag
          ? this.cryptoService.decrypt(note.content, note.iv, note.authTag)
          : note.content,
      };
    } catch (error) {
      // পুরোনো বা প্লেইন টেক্সট ডাটা হলে যাতে এরর না খায়
      return note;
    }
  }

  /**
    [১. নতুন এনক্রিপ্টেড নোট তৈরি]
    ফ্রন্টএন্ড থেকে পাঠানো প্লেইন টাইটেল এবং কন্টেন্টকে ব্যাকএন্ডে স্বয়ংক্রিয়ভাবে এনক্রিপ্ট করে
    iv এবং authTag সহ ডাটাবেসে সেভ করা হয়েছে এবং রিটার্ন করার সময় ডিক্রিপ্ট করা হয়েছে।
  */

  async create(userId: string, dto: CreateNoteDto) {
    if (dto.notebookId) {
      const notebook = await this.prisma.notebook.findUnique({
        where: { id: dto.notebookId },
      });

      if (!notebook || notebook.userId !== userId) {
        throw new ForbiddenException('Invalid Notebook ID');
      }
    }

    // ব্যাকএন্ডে টাইটেল ও কন্টেন্ট এনক্রিপ্ট করে নেওয়া হচ্ছে
    const encryptedTitle = this.cryptoService.encrypt(dto.title);
    const encryptedContent = dto.content ? this.cryptoService.encrypt(dto.content) : null;

    const newNote = await this.prisma.note.create({
      data: {
        title: encryptedTitle.encryptedData,
        content: encryptedContent ? encryptedContent.encryptedData : '',
        iv: encryptedTitle.iv, // ইউনিক IV
        authTag: encryptedTitle.authTag, // Auth Tag
        color: dto.color ?? '#FFFFFF',
        isPinned: dto.isPinned ?? false,
        notebookId: dto.notebookId ?? null,
        userId,
      },
    });

    // [Audit Log Trigger]: নোট তৈরি সফল হলে অডিট লগ সেভ হবে
    await this.auditLogService.log(userId, {
      action: 'NOTE_CREATE',
      details: { noteId: newNote.id, title: dto.title }, // লগে আসল প্লেইন টাইটেল রাখা যেতে পারে
    });

    // ফ্রন্টএন্ডে রেসপন্স পাঠানোর সময় ডিক্রিপ্ট করে পাঠানো হচ্ছে
    return this.decryptNote(newNote);
  }

  /**
   * [২. ইউজারের সব সক্রিয় নোট গেট করা]
    ডাটাবেস থেকে ইউজারের সব নোট ফেচ করার পর decryptNote helper function ব্যবহার করে সবগুলো নোট ডিক্রিপ্ট করে
    ফ্রন্টএন্ডে পাঠানোর আপডেট করা হয়েছে।
  */

  async findAllByUser(userId: string, notebookId?: string) {
    const notes = await this.prisma.note.findMany({
      where: {
        userId,
        isDeleted: false,
        ...(notebookId ? { notebookId } : {}),
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });

    // সবগুলো নোট ডিক্রিপ্ট করে ফ্রন্টএন্ডে পাঠানো হচ্ছে
    return notes.map((note) => this.decryptNote(note));
  }

  /**
   * [৩. সিঙ্গেল নোট ভ্যালিডেশনসহ গেট করা]
   * কী কাজ করে: অনারশিপ চেক করে নির্দিষ্ট নোটটি রিটার্ন করে।
  */

  async findOne(id: string, userId: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (note.userId !== userId) {
      throw new ForbiddenException('Access denied to this note');
    }

    return note;
  }

  /**
   * [৪. নোট আপডেট করা]
   * কী কাজ করে: নতুন এনক্রিপ্টেড ডাটা দিয়ে বিদ্যমান নোট আপডেট করে।
  */

  async update(id: string, userId: string, dto: UpdateNoteDto) {
    await this.findOne(id, userId);

    return this.prisma.note.update({
      where: { id },
      data: { ...dto },
    });
  }

  /**
   * [৫. সফট ડিলিট / ট্র্যাশে পাঠানো (Soft Delete)]
   * কী কাজ করে: নোট স্থায়ীভাবে ডিলিট না করে `isDeleted: true` সেট করে রিসাইকেল বিনের মতো রাখে।
  */

  async softDelete(id: string, userId: string) {
    await this.findOne(id, userId);

    const updatedNote = await this.prisma.note.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // [Audit Log Trigger]: ট্র্যাশে পাঠানোর লগ সেভ
    await this.auditLogService.log(userId, {
      action: 'NOTE_TRASH',
      details: { noteId: id },
    });

    return updatedNote;
  }

  /**
   * [৬. স্থায়ীভাবে নোট ডিলিট করা (Hard Delete)]
   * কী কাজ করে: ডাটাবেস থেকে রিমুভ করে ফেলে।
  */
  async hardDelete(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.prisma.note.delete({
      where: { id },
    });

    // [Audit Log Trigger]: পারমানেন্ট ডিলিটের লগ সেভ
    await this.auditLogService.log(userId, {
      action: 'NOTE_PERMANENT_DELETE',
      details: { noteId: id },
    });

    return { message: 'Note permanently deleted' };
  }

  /**
   * [ট্র্যাশে থাকা নোটগুলোর লিস্ট পাওয়া]
   * কী কাজ করে: ইউজারের সফট ডিলিট হওয়া সব নোট গেট করে।
   */
  async findTrashByUser(userId: string) {
    return this.prisma.note.findMany({
      where: {
        userId,
        isDeleted: true, // শুধু ট্র্যাশে থাকা নোটগুলো ফিল্টার করা হচ্ছে
      },
      orderBy: {
        deletedAt: 'desc', // যেগুলো সম্প্রতি ট্র্যাশে পাঠানো হয়েছে সেগুলো ওপরে থাকবে
      },
    });
  }


  /**
   * [ ট্র্যাশ থেকে নোট Restore করা]
   */
  async restoreNote(id: string, userId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, userId, isDeleted: true },
    });

    if (!note) {
      throw new NotFoundException('Note not found in trash');
    }

    const restoredNote = await this.prisma.note.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });

    await this.auditLogService.log(userId, {
      action: 'NOTE_RESTORE',
      details: { noteId: restoredNote.id },
    });

    return restoredNote;
  }

  /**
   * [ ট্র্যাশ সম্পূর্ণ খালি করা (Empty Trash)]
   */
  async emptyTrash(userId: string) {
    const deletedNotes = await this.prisma.note.deleteMany({
      where: {
        userId,
        isDeleted: true,
      },
    });

    await this.auditLogService.log(userId, {
      action: 'TRASH_EMPTY',
      details: { count: deletedNotes.count },
    });

    return {
      message: 'Trash emptied successfully',
      count: deletedNotes.count,
    };
  }

}
