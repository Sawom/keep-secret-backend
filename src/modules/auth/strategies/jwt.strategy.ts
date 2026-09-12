import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Request } from 'express';

// PassportStrategy(Strategy) দিয়ে আমরা NestJS-কে বলছি এটি একটি JWT স্ট্র্যাটেজি
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly prisma: PrismaService) {
        super({
            // রিকোয়েস্ট হেডার থেকে Bearer Token এক্সট্রাক্ট করা
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET!,
        });
    }

    async validate(payload: { sub: string; email: string }) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user) {
            throw new UnauthorizedException('User no longer exists');
        }

        return { id: user.id, email: user.email, name: user.fullName };
    }
}