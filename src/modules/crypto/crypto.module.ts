import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service.js';

@Module({
  providers: [CryptoService]
})
export class CryptoModule {}
