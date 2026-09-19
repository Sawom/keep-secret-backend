import { Module } from '@nestjs/common';

import { TrashController } from './trash.controller.js';
import { TrashService } from './trash.service.js';
import { AuditLogModule } from './../modules/audit-log/audit-log.module.js';
import { PrismaModule } from './../modules/prisma/prisma.module.js';
import { AuthModule } from './../modules/auth/auth.module.js';
import { CryptoService } from './../modules/crypto/crypto.service.js';


@Module({
  imports: [
    PrismaModule,
    AuditLogModule,
    AuthModule,
  ],
  controllers: [
    TrashController,
  ],
  providers: [
    TrashService, CryptoService
  ],
  exports: [
    TrashService,
  ],
})
export class TrashModule { }