import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service.js';
import { AuditLogController } from './audit-log.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService], // অন্য মডিউলে ইনজেক্ট করার জন্য এক্সপোর্ট
})

export class AuditLogModule { }