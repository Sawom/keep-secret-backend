import { Module } from '@nestjs/common';
import { NoteService } from './note.service.js';
import { NoteController } from './note.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PassportModule } from '@nestjs/passport';
import { AuditLogModule } from '../audit-log/audit-log.module.js';

@Module({
  imports: [
    PrismaModule,
    AuditLogModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [NoteController],
  providers: [NoteService],
  exports: [NoteService],
})

export class NoteModule { }