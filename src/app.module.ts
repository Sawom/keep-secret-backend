import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CryptoModule } from './modules/crypto/crypto.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotebookModule } from './modules/notebook/notebook.module';

@Module({
  imports: [CryptoModule, PrismaModule, AuthModule, NotebookModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
