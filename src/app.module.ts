import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CryptoModule } from './modules/crypto/crypto.module';
import { PrismaModule } from './modules/prisma/prisma.module';

@Module({
  imports: [CryptoModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
