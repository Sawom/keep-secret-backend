import { Module } from '@nestjs/common';
import { NotebookService } from './notebook.service';
import { NotebookController } from './notebook.controller';
import { PrismaModule } from './../prisma/prisma.module';

/**
 * NotebookModule: নোটবুক সম্পর্কিত Controller, Service এবং Prisma Dependency একসাথে যুক্ত করে।
 */

@Module({
  imports: [PrismaModule],
  controllers: [NotebookController],
  providers: [NotebookService],
  exports: [NotebookService], // অন্য কোনো মডিউলে (যেমন: NoteModule) প্রয়োজন হলে যেন ব্যবহার করা যায়
})

export class NotebookModule { }