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
        title: note.title && note.titleIv && note.titleAuthTag
          ? this.cryptoService.decrypt(note.title, note.titleIv, note.titleAuthTag)
          : note.title,
        content: note.content && note.contentIv && note.contentAuthTag
          ? this.cryptoService.decrypt(note.content, note.contentIv, note.contentAuthTag)
          : note.content,
      };
    } catch (error) {
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

    // টাইটেল এবং কন্টেন্ট আলাদাভাবে এনক্রিপ্ট করা হচ্ছে
    const encryptedTitle = this.cryptoService.encrypt(dto.title);
    const encryptedContent = dto.content ? this.cryptoService.encrypt(dto.content) : null;

    const newNote = await this.prisma.note.create({
      data: {
        title: encryptedTitle.encryptedData,
        titleIv: encryptedTitle.iv,
        titleAuthTag: encryptedTitle.authTag,

        content: encryptedContent ? encryptedContent.encryptedData : '',
        contentIv: encryptedContent ? encryptedContent.iv : null,
        contentAuthTag: encryptedContent ? encryptedContent.authTag : null,

        color: dto.color ?? '#FFFFFF',
        isPinned: dto.isPinned ?? false,
        notebookId: dto.notebookId ?? null,
        userId,
      },
    });

    await this.auditLogService.log(userId, {
      action: 'NOTE_CREATE',
      details: { noteId: newNote.id, title: dto.title },
    });

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
      orderBy: [{ isPinned: 'desc' }, { position: 'asc' }],
    });

    // সবগুলো নোট ডিক্রিপ্ট করে ফ্রন্টএন্ডে পাঠানো হচ্ছে
    return notes.map((note) => this.decryptNote(note));
  }

  /**
   * [৩. সিঙ্গেল নোট ভ্যালিডেশনসহ গেট করা]
   নির্দিষ্ট কোনো নোট আইডি দিয়ে খোঁজার পর সেটি ডিক্রিপ্ট করে রিটার্ন করা হয়েছে
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

    return this.decryptNote(note);
  }

  /**
   * [৪. নোট আপডেট করা]
   ইউজার নতুন কোনো টাইটেল বা কন্টেন্ট আপডেট করলে সেগুলোকে আবার নতুন করে এনক্রিপ্ট করে
  iv, authTag সহ আপডেট করার লজিক যুক্ত করা হয়েছে
  */

  async update(id: string, userId: string, dto: UpdateNoteDto) {
    await this.findOne(id, userId);

    const updateData: any = {};

    // টাইটেল আপডেট হলে আলাদাভাবে এনক্রিপ্ট ও মেটাডাটা সেট হবে
    if (dto.title !== undefined) {
      const encryptedTitle = this.cryptoService.encrypt(dto.title);
      updateData.title = encryptedTitle.encryptedData;
      updateData.titleIv = encryptedTitle.iv;
      updateData.titleAuthTag = encryptedTitle.authTag;
    }

    // কন্টেন্ট আপডেট হলে আলাদাভাবে এনক্রিপ্ট ও মেটাডাটা সেট হবে
    if (dto.content !== undefined) {
      const encryptedContent = this.cryptoService.encrypt(dto.content);
      updateData.content = encryptedContent.encryptedData;
      updateData.contentIv = encryptedContent.iv;
      updateData.contentAuthTag = encryptedContent.authTag;
    }

    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.isPinned !== undefined) updateData.isPinned = dto.isPinned;
    if (dto.notebookId !== undefined) updateData.notebookId = dto.notebookId;

    const updatedNote = await this.prisma.note.update({
      where: { id },
      data: updateData,
    });

    return this.decryptNote(updatedNote);
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
    [ট্র্যাশে থাকা নোটগুলোর লিস্ট পাওয়া]
    কী কাজ করে: ইউজারের সফট ডিলিট হওয়া সব নোট গেট করে।
    ট্র্যাশের নোটগুলো লিস্ট করার সময় বা ট্র্যাশ থেকে কোনো নোট রিস্টোর করার সময়
    সেগুলোকে ডিক্রিপ্ট করে ফ্রন্টএন্ডে পাঠানোর জন্য আপডেট করা হয়েছে
   */
  async findTrashByUser(userId: string) {
    const notes = await this.prisma.note.findMany({
      where: {
        userId,
        isDeleted: true,
      },
      orderBy: {
        deletedAt: 'desc',
      },
    });

    return notes.map((note) => this.decryptNote(note));
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

    return this.decryptNote(restoredNote);
  }

  /**
   * [নোটগুলোর পজিশন বা অর্ডার আপডেট করা]
   */
  async reorderNotes(
    userId: string,
    items: { id: string; position: number }[],
  ) {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        message: 'No notes to reorder',
      };
    }

    // ১. পাঠানো সব note ID এই user-এর কিনা verify করা
    const noteIds = items.map((item) => item.id);

    const notes = await this.prisma.note.findMany({
      where: {
        id: {
          in: noteIds,
        },
        userId,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });

    // ২. Security check
    // অন্য user-এর note ID পাঠালে reject করবে
    if (notes.length !== noteIds.length) {
      throw new ForbiddenException(
        'You do not have permission to reorder these notes',
      );
    }

    // ৩. সব position এক transaction-এর মধ্যে update করা
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.note.update({
          where: {
            id: item.id,
          },
          data: {
            position: item.position,
          },
        }),
      ),
    );

    return {
      message: 'Notes reordered successfully',
    };
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
