import { Module } from '@nestjs/common';
import { NotebookService } from './notebook.service.js';
import { NotebookController } from './notebook.controller.js';
import { PrismaModule } from './../prisma/prisma.module.js';
import { PassportModule } from '@nestjs/passport';
import { AuditLogModule } from '../audit-log/audit-log.module.js';

/**
 * NotebookModule: নোটবুক সম্পর্কিত Controller, Service এবং Prisma Dependency একসাথে যুক্ত করে।
 */

@Module({
  imports: [
    PrismaModule,
    AuditLogModule, // inject auditlog
    PassportModule.register({ defaultStrategy: 'jwt' }), // <--- imports-এ PassportModule থাকতে হবে
  ],
  controllers: [NotebookController],
  providers: [NotebookService],
  exports: [NotebookService],
})

export class NotebookModule { }