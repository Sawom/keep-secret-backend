import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CryptoModule } from './modules/crypto/crypto.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotebookModule } from './modules/notebook/notebook.module';
import { NoteModule } from './modules/note/note.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [CryptoModule, PrismaModule, AuthModule, NotebookModule, NoteModule, AuditLogModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
