import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CryptoModule } from './modules/crypto/crypto.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { NotebookModule } from './modules/notebook/notebook.module.js';
import { NoteModule } from './modules/note/note.module.js';
import { AuditLogModule } from './modules/audit-log/audit-log.module.js';
import { UserModule } from './modules/user/user.module.js';

@Module({
  imports: [CryptoModule, PrismaModule, AuthModule, NotebookModule, NoteModule, AuditLogModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
