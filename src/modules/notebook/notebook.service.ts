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



}
