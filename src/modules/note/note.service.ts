import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class NoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,  // AuditLog inject
  ) { }

  /**
     * [১. নতুন এনক্রিপ্টেড নোট তৈরি]
     * কী কাজ করে: ফ্রন্টএন্ড থেকে প্রাপ্ত এনক্রিপ্টেড নোট এবং মেটাডাটা (iv, authTag) সেভ করে।
     * কীভাবে কাজ করে:
     * - নোটবুক আইডি দেওয়া থাকলে সেটি ইউজারের নিজের নোটবুক কি না ভ্যালিডেট করে।
     * - ডাটাবেসে `isArchived: false` ও `isDeleted: false` অবস্থায় সেভ করে।
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

    const newNote = await this.prisma.note.create({
      data: {
        title: dto.title,
        content: dto.content,
        iv: dto.iv,
        authTag: dto.authTag,
        color: dto.color ?? '#FFFFFF',
        isPinned: dto.isPinned ?? false,
        notebookId: dto.notebookId ?? null,
        userId,
      },
    });

    //  [Audit Log Trigger]: নোট তৈরি সফল হলে অডিট লগ সেভ হবে
    await this.auditLogService.log(userId, {
      action: 'NOTE_CREATE',
      details: { noteId: newNote.id, title: newNote.title }, // details in json format
    });

    return newNote;
  }

  /**
   * [২. ইউজারের সব সক্রিয় নোট গেট করা]
   * কী কাজ করে: ট্র্যাশে না থাকা (isDeleted: false) সব নোট পিন ও ডেট অনুযায়ী ফিল্টার করে নিয়ে আসে।
  */

  async findAllByUser(userId: string, notebookId?: string) {
    return this.prisma.note.findMany({
      where: {
        userId,
        isDeleted: false,
        ...(notebookId ? { notebookId } : {}),
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });
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

}
