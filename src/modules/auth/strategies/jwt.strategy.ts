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
            // কুকি অথবা অথরাইজেশন হেডার—যেকোনো জায়গা থেকে টোকেন এক্সট্রাক্ট করবে
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {
                    return request?.cookies?.accessToken; // কুকি থেকে টোকেন নেওয়া
                },
                ExtractJwt.fromAuthHeaderAsBearerToken(), // ফলব্যাক হিসেবে হেডার চেক করা
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET!, // always receive a string
        });
    }

    /**
     * [JWT Payload Validation]
     * টোকেন ভ্যালিড হলে এই মেথডটি রান হবে এবং ডাটাবেস থেকে ইউজার চেক করবে।
     * এখানে রিটার্ন করা object-টি সরাসরি req.user হিসেবে রিকোয়েস্টে যুক্ত হয়ে যাবে।
     */
    async validate(payload: { sub: string; email: string }) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user) {
            throw new UnauthorizedException('User no longer exists');
        }

        // পাসওয়ার্ড বাদ দিয়ে ইউজারের প্রয়োজনীয় ডাটা রিটার্ন
        return { id: user.id, email: user.email, name: user.fullName };
    }
}