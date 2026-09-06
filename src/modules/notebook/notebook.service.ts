import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNotebookDto } from './dto/create-notebook.dto';
import { UpdateNotebookDto } from './dto/update-notebook.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotebookService {

  // ডাটাবেস অপারেশনের জন্য PrismaService ইনজেক্ট করা হয়েছে
  constructor(private readonly prisma: PrismaService) { }

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
    })
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


}
