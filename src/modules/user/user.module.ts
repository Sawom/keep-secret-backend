import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditLogModule } from '../audit-log/audit-log.module.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    AuditLogModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})

export class UserModule { }