import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';


// @Global: এটি PrismaModule-কে পুরো অ্যাপ্লিকেশনের জন্য গ্লোবাল বানিয়ে দেয়।
// এর ফলে অন্য কোনো মডিউলে বারবার PrismaModule ইম্পোর্ট করা লাগবে না।
@Global()
@Module({
  providers: [PrismaService], // PrismaService-কে Provider হিসেবে দিয়ে দেওয়া হলো
  exports: [PrismaService],   // অন্যান্য Module যাতে PrismaService ব্যবহার করতে পারে সেজন্য Export করা হলো
})

export class PrismaModule {}