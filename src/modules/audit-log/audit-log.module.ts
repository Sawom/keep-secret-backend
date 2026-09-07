import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { PrismaModule } from '../prisma/prisma.module';
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