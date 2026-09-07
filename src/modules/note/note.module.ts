import { Module } from '@nestjs/common';
import { NoteService } from './note.service';
import { NoteController } from './note.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';
import { AuditLogModule } from '../audit-log/audit-log.module';

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