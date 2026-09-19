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
 * [ইউজারের active notes]
 *
 * Normal mode:
 *   cursor-based pagination
 *
 * Search mode:
 *   encrypted note decrypt করে title/content search
 *   তারপর cursor-based chunk return
 *
 * UI-তে traditional pagination থাকবে না। UI-তে pagination থাকবে না। Frontend scroll করলে next chunk চাইবে।
 */
  async findAllByUser(
    userId: string,
    notebookId?: string,
    limit = 20,
    cursor?: string,
    search?: string,
  ) {
    const normalizedSearch =
      search?.trim().toLowerCase() || '';

    /*
     
     * SEARCH MODE
     * Database-এর title/content encrypted।
     *
     * তাই database-level plaintext contains search
     * করা সম্ভব নয়।
     *
     * প্রথমে user's active notes fetch করা হচ্ছে,
     * তারপর decrypt করে search করা হচ্ছে।
     */
    if (normalizedSearch) {
      let cursorData:
        | {
          index: number;
        }
        | null = null;

      if (cursor) {
        try {
          cursorData = JSON.parse(
            Buffer.from(
              cursor,
              'base64url',
            ).toString('utf8'),
          );
        } catch {
          cursorData = null;
        }
      }

      const where: any = {
        userId,
        isDeleted: false,

        ...(notebookId
          ? { notebookId }
          : {}),
      };

      const allNotes =
        await this.prisma.note.findMany({
          where,

          orderBy: [
            {
              isPinned: 'desc',
            },
            {
              position: 'asc',
            },
            {
              id: 'asc',
            },
          ],
        });

      const matchingNotes = allNotes
        .map((note) =>
          this.decryptNote(note),
        )
        .filter((note) => {
          const title =
            typeof note.title === 'string'
              ? note.title.toLowerCase()
              : '';

          const content =
            typeof note.content === 'string'
              ? note.content.toLowerCase()
              : '';

          return (
            title.includes(normalizedSearch) ||
            content.includes(normalizedSearch)
          );
        });

      const startIndex =
        cursorData?.index ?? 0;

      const pageNotes =
        matchingNotes.slice(
          startIndex,
          startIndex + limit,
        );

      const nextIndex =
        startIndex + pageNotes.length;

      const hasMore =
        nextIndex < matchingNotes.length;

      const data = pageNotes.map(
        (note) => ({
          id: note.id,
          title: note.title,

          content:
            typeof note.content === 'string'
              ? note.content.slice(0, 500)
              : '',

          color: note.color,
          isPinned: note.isPinned,
          position: note.position,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          notebookId: note.notebookId,
        }),
      );

      let nextCursor:
        | string
        | null = null;

      if (hasMore) {
        nextCursor = Buffer.from(
          JSON.stringify({
            index: nextIndex,
          }),
        ).toString('base64url');
      }

      return {
        data,
        nextCursor,
        hasMore,
      };
    }

    /*
     * NORMAL MODE
     */

    let cursorData:
      | {
        isPinned: boolean;
        position: number;
        id: string;
      }
      | null = null;

    if (cursor) {
      try {
        cursorData = JSON.parse(
          Buffer.from(
            cursor,
            'base64url',
          ).toString('utf8'),
        );
      } catch {
        cursorData = null;
      }
    }

    const where: any = {
      userId,
      isDeleted: false,

      ...(notebookId
        ? { notebookId }
        : {}),
    };

    if (cursorData) {
      if (cursorData.isPinned) {
        where.OR = [
          {
            isPinned: true,
            position: {
              gt: cursorData.position,
            },
          },
          {
            isPinned: true,
            position:
              cursorData.position,
            id: {
              gt: cursorData.id,
            },
          },
          {
            isPinned: false,
          },
        ];
      } else {
        where.OR = [
          {
            isPinned: false,
            position: {
              gt: cursorData.position,
            },
          },
          {
            isPinned: false,
            position:
              cursorData.position,
            id: {
              gt: cursorData.id,
            },
          },
        ];
      }
    }

    const notes =
      await this.prisma.note.findMany({
        where,

        orderBy: [
          {
            isPinned: 'desc',
          },
          {
            position: 'asc',
          },
          {
            id: 'asc',
          },
        ],

        take: limit + 1,
      });

    const hasMore =
      notes.length > limit;

    const pageNotes =
      hasMore
        ? notes.slice(0, limit)
        : notes;

    const data = pageNotes.map(
      (note) => {
        const decrypted =
          this.decryptNote(note);

        return {
          id: decrypted.id,
          title: decrypted.title,

          content:
            typeof decrypted.content ===
              'string'
              ? decrypted.content.slice(0, 500)
              : '',

          color: decrypted.color,
          isPinned:
            decrypted.isPinned,
          position:
            decrypted.position,
          createdAt:
            decrypted.createdAt,
          updatedAt:
            decrypted.updatedAt,
          notebookId:
            decrypted.notebookId,
        };
      },
    );

    let nextCursor:
      | string
      | null = null;

    if (
      hasMore &&
      pageNotes.length > 0
    ) {
      const last =
        pageNotes[
        pageNotes.length - 1
        ];

      nextCursor = Buffer.from(
        JSON.stringify({
          isPinned:
            last.isPinned,
          position:
            last.position,
          id: last.id,
        }),
      ).toString('base64url');
    }

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async searchByUser(
    userId: string,
    query: string,
    limit = 50,
  ) {
    const normalizedQuery =
      query.trim().toLowerCase();

    /*
     * Empty search হলে কোনো note return করবে না।
     */
    if (!normalizedQuery) {
      return {
        data: [],
        hasMore: false,
      };
    }

    /*
     * Search result পাওয়ার জন্য limit + 1
     * পর্যন্ত match collect করছি।
     *
     * এতে hasMore জানা যাবে।
     */
    const notes =
      await this.prisma.note.findMany({
        where: {
          userId,
          isDeleted: false,
        },

        orderBy: [
          {
            isPinned: 'desc',
          },
          {
            position: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });

    const matchedNotes = [];

    for (const note of notes) {
      const decrypted =
        this.decryptNote(note);

      const title =
        typeof decrypted.title === 'string'
          ? decrypted.title
          : '';

      const content =
        typeof decrypted.content === 'string'
          ? decrypted.content
          : '';

      const titleMatch =
        title
          .toLowerCase()
          .includes(normalizedQuery);

      const contentMatch =
        content
          .toLowerCase()
          .includes(normalizedQuery);

      if (
        !titleMatch &&
        !contentMatch
      ) {
        continue;
      }

      matchedNotes.push({
        id: decrypted.id,

        title,

        content:
          content.slice(0, 500),

        color:
          decrypted.color,

        isPinned:
          decrypted.isPinned,

        position:
          decrypted.position,

        createdAt:
          decrypted.createdAt,

        updatedAt:
          decrypted.updatedAt,

        notebookId:
          decrypted.notebookId,
      });

      /*
       * limit + 1 match পেলেই থামবো।
       */
      if (
        matchedNotes.length >
        limit
      ) {
        break;
      }
    }

    const hasMore =
      matchedNotes.length > limit;

    const data = hasMore
      ? matchedNotes.slice(0, limit)
      : matchedNotes;

    return {
      data,
      hasMore,
    };
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
 * [৫. সফট ডিলিট / ট্র্যাশে পাঠানো]
 *
 * 🔧 CHANGED:
 *
 * User manually note delete করলে এটা
 * notebook-এর কারণে deleted হিসেবে mark হবে না।
 */
  async softDelete(
    id: string,
    userId: string
  ) {
    await this.findOne(
      id,
      userId
    );

    const updatedNote =
      await this.prisma.note.update({
        where: {
          id,
        },
        data: {
          isDeleted: true,
          deletedAt:
            new Date(),
          deletedWithNotebook:
            false,
        },
      });

    await this.auditLogService.log(
      userId,
      {
        action: 'NOTE_TRASH',
        details: {
          noteId: id,
        },
      }
    );

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
