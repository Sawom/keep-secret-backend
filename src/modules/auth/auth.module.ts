import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
      signOptions: { expiresIn: '7d' }, // টোকেন মেয়াদ ৭ দিন
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})

export class AuthModule { }
