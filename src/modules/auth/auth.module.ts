import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditLogModule } from '../audit-log/audit-log.module.js';


@Module({
  imports: [
    PrismaModule,
    AuditLogModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
      signOptions: { expiresIn: '7d' }, // টোকেন মেয়াদ ৭ দিন
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // JwtStrategy যুক্ত করা হলো
  exports: [AuthService, JwtModule, PassportModule],
})

export class AuthModule { }