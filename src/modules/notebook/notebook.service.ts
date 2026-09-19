import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNotebookDto } from './dto/create-notebook.dto.js';
import { UpdateNotebookDto } from './dto/update-notebook.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';

@Injectable()
export class NotebookService {

  // ডাটাবেস অপারেশনের জন্য PrismaService ইনজেক্ট করা হয়েছে
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) { }

  /**
   * [১. নতুন নোটবুক তৈরি করা]
   * 
   * কী কাজ করে: লগড-ইন ইউজারের আইডি নিয়ে একটি নতুন নোটবুক ডাটাবেসে সেভ করে।
   * কীভাবে কাজ করে: 
   * - ইউজার কালার, আইকন বা পজিশন না দিলে স্কিমা অনুযায়ী ডিফল্ট ভ্যালু (যেমন: #3B82F6, "book", 0.0) সেট করা হয়।
   * - Prisma-র `create` মেথড ব্যবহার করে ডাটাবেসে নতুন রেকর্ড যুক্ত হয়।
   */

  async create(userId: string, dto: CreateNotebookDto) {

    const newNotebook = await this.prisma.notebook.create({
      data: {
        title: dto.title,
        description: dto.description,
        color: dto.color ?? '#3B82F6',
        icon: dto.icon ?? 'book',
        position: dto.position ?? 0.0,
        userId: userId, // ইউজারের ফরেন কি (Foreign Key) অ্যাসাইন করা হচ্ছে
      },
    });

    // [Audit Log Trigger]: নোটবুক ক্রিয়েটের লগ
    await this.auditLogService.log(userId, {
      action: 'NOTEBOOK_CREATE',
      details: { noteId: newNotebook.id, title: newNotebook.title },
    });

    return newNotebook;
  }

  /**
   * [২. ইউজারের সব নোটবুক খুঁজে বের করা]
   * 
   * কী কাজ করে: নির্দিষ্ট ইউজারের তৈরি করা সব নোটবুক গেট করে।
   * কীভাবে কাজ করে:
   * - `where: { userId }` দিয়ে কেবল নির্দিষ্ট ইউজারের ডাটা ফিল্টার করা হয় (যেন একজন ইউজার অন্যের নোটবুক না দেখতে পায়)।
   * - `orderBy: { position: 'asc' }` দিয়ে পজিশন অনুযায়ী সাজিয়ে রিট্রিভ করা হয়।
   * - `include: { _count: { select: { notes: true } } }` দিয়ে প্রতিটি নোটবুকের ভেতরে কতগুলো নোট আছে তার সংখ্যা গণনা করা হয়।
   */

  async findAllByUser(userId: string) {
    const userNotebooks = await this.prisma.notebook.findMany({
      where: {
        userId: userId,
        isDeleted: false,
      },
      orderBy: {
        position: 'asc',
      },
      include: {
        _count: {
          select: {
            notes: true, // নোটবুকের ভেতরে টোটাল নোট সংখ্যা
          },
        },
      },
    });

    return userNotebooks;
  }

  /**
   * [৩. নির্দিষ্ট একটি নোটবুকের বিস্তারিত দেখা]
   * 
   * কী কাজ করে: নোটবুক আইডি দিয়ে সিঙ্গেল নোটবুক খুঁজে আনে এবং অনারশিপ ভ্যালিডেট করে।
   * কীভাবে কাজ করে:
   * - প্রথমে আইডি দিয়ে নোটবুক খোজা হয়, না পাওয়া গেলে `NotFoundException` থ্রো করা হয়।
   * - নোটবুক পাওয়া গেলেও সেটার `userId` এবং বর্তমান রিকোয়েস্ট পাঠানো ইউজারের `userId` মিলছে কি না চেক করা হয়।
   * - অনারশিপ না মিললে `ForbiddenException` (Access Denied) থ্রো করা হয়।
   */

  async findOne(id: string, userId: string) {
    const notebook = await this.prisma.notebook.findUnique({
      where: { id },
    });

    // ১. নোটবুক ডাটাবেসে না থাকলে এরর থ্রো
    if (!notebook) {
      throw new NotFoundException('Notebook not found');
    }

    // ২. অন্যের নোটবুক এক্সেস করার চেষ্টা করলে সিকিউরিটি চেক
    if (notebook.userId !== userId) {
      throw new ForbiddenException('Access to this notebook is denied');
    }

    return notebook;
  }

  /**
   * [৪. নোটবুক আপডেট করা]
   * 
   * কী কাজ করে: নির্দিষ্ট একটি নোটবুকের তথ্য (যেমন: টাইটেল, আইকন, কালার) পরিবর্তন করে।
   * কীভাবে কাজ করে:
   * - প্রথমে `this.findOne(id, userId)` কল করে চেক করা হয় নোটবুকটির অস্তিত্ব এবং সিকিউরিটি অনারশিপ ঠিক আছে কি না।
   * - ভ্যালিডেশন পাস করলে Prisma-র `update` মেথড দিয়ে ক্লায়েন্ট থেকে পাঠানো নতুন ডাটা সেট করা হয়।
   */

  async update(id: string, userId: string, dto: UpdateNotebookDto) {
    // অনারশিপ নিশ্চিত করা
    await this.findOne(id, userId);

    // আপডেট অপারেশন
    const updateNotebook = await this.prisma.notebook.update({
      where: { id },
      data: {
        ...dto,
      },
    });
    return updateNotebook
  }

  /**
 * নোটবুক ট্র্যাশে পাঠানো (Soft Delete)
 *
 * 🔧 CHANGED:
 *
 * Notebook-এর সাথে active notes-গুলোও একই transaction-এ
 * trash-এ যাবে।
 *
 * এতে notebook + তার notes একই lifecycle follow করবে।
 */
  async softDelete(
    id: string,
    userId: string
  ) {
    const notebook =
      await this.prisma.notebook.findFirst({
        where: {
          id,
          userId,
          isDeleted: false,
        },
      });

    if (!notebook) {
      throw new NotFoundException(
        'Notebook not found'
      );
    }

    const deletedAt =
      new Date();

    await this.prisma.$transaction([
      /*
       * Notebook trash
       */
      this.prisma.notebook.update({
        where: {
          id,
        },
        data: {
          isDeleted: true,
          deletedAt,
        },
      }),

      /*
       * Notebook-এর active notes-গুলোও trash
       */
      this.prisma.note.updateMany({
        where: {
          userId,
          notebookId: id,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt,
          deletedWithNotebook: true,
        },
      }),
    ]);

    await this.auditLogService.log(
      userId,
      {
        action:
          'NOTEBOOK_TRASH',
        details: {
          notebookId: id,
        },
      }
    );

    return {
      message:
        'Notebook and its notes moved to trash',
      notebookId: id,
    };
  }

  /**
 * স্থায়ীভাবে নোটবুক ডিলিট করা
 *
 * 🔧 CHANGED:
 *
 * Notebook-এর সাথে notebook-trash-এর কারণে
 * deleted হওয়া notes-গুলোও permanently delete হবে।
 */
  async hardDelete(
    id: string,
    userId: string
  ) {
    const notebook =
      await this.prisma.notebook.findFirst({
        where: {
          id,
          userId,
          isDeleted: true,
        },
      });

    if (!notebook) {
      throw new NotFoundException(
        'Notebook not found in trash'
      );
    }

    await this.prisma.$transaction([
      this.prisma.note.deleteMany({
        where: {
          userId,
          notebookId: id,
          isDeleted: true,
          deletedWithNotebook: true,
        },
      }),

      this.prisma.notebook.delete({
        where: {
          id,
        },
      }),
    ]);

    await this.auditLogService.log(
      userId,
      {
        action:
          'NOTEBOOK_PERMANENT_DELETE',
        details: {
          notebookId: id,
        },
      }
    );

    return {
      message:
        'Notebook permanently deleted',
    };
  }

  /**
   * ট্র্যাশে থাকা নোটবুকগুলোর লিস্ট পাওয়া
   */
  async findTrashByUser(userId: string) {
    const notebooks = await this.prisma.notebook.findMany({
      where: {
        userId,
        isDeleted: true,
      },
      orderBy: {
        deletedAt: 'desc',
      },
      include: {
        _count: {
          select: {
            notes: true,
          },
        },
      },
    });

    return notebooks;
  }

  /**
 * ট্র্যাশ থেকে নোটবুক Restore করা
 *
 * 🔧 CHANGED:
 *
 * Notebook-এর সাথে যেসব notes notebook trash-এর কারণে
 * trash হয়েছিল শুধু সেগুলো restore হবে।
 */
  async restoreNotebook(
    id: string,
    userId: string
  ) {
    const notebook =
      await this.prisma.notebook.findFirst({
        where: {
          id,
          userId,
          isDeleted: true,
        },
      });

    if (!notebook) {
      throw new NotFoundException(
        'Notebook not found in trash'
      );
    }

    await this.prisma.$transaction([
      this.prisma.notebook.update({
        where: {
          id,
        },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      }),

      this.prisma.note.updateMany({
        where: {
          userId,
          notebookId: id,
          isDeleted: true,
          deletedWithNotebook: true,
        },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedWithNotebook: false,
        },
      }),
    ]);

    await this.auditLogService.log(
      userId,
      {
        action:
          'NOTEBOOK_RESTORE',
        details: {
          notebookId: id,
        },
      }
    );

    return {
      message:
        'Notebook and its notes restored',
      notebookId: id,
    };
  }

  // drag and drop 
  async reorderNotebooks(
    userId: string,
    items: { id: string; position: number }[],
  ) {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        message: 'No notebooks to reorder',
      };
    }

    // ১. পাঠানো notebook ID গুলো বের করা
    const notebookIds = items.map((item) => item.id);

    // ২. সব notebook এই user-এর কিনা verify করা
    const notebooks = await this.prisma.notebook.findMany({
      where: {
        id: {
          in: notebookIds,
        },
        userId,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });

    // ৩. অন্য user-এর notebook reorder করার চেষ্টা হলে reject
    if (notebooks.length !== notebookIds.length) {
      throw new ForbiddenException(
        'You do not have permission to reorder these notebooks',
      );
    }

    // ৪. সব position এক transaction-এর মধ্যে update
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.notebook.update({
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
      message: 'Notebooks reordered successfully',
    };
  }

  /**
   * নোটবুক ট্র্যাশ সম্পূর্ণ খালি করা (Empty Trash)
   */
  async emptyTrash(userId: string) {
    const deletedNotebooks = await this.prisma.notebook.deleteMany({
      where: {
        userId,
        isDeleted: true,
      },
    });

    await this.auditLogService.log(userId, {
      action: 'NOTEBOOK_TRASH_EMPTY',
      details: { count: deletedNotebooks.count },
    });

    return {
      message: 'Notebook trash emptied successfully',
      count: deletedNotebooks.count,
    };
  }

}
