import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

// PassportStrategy(Strategy) দিয়ে আমরা NestJS-কে বলছি এটি একটি JWT স্ট্র্যাটেজি
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly prisma: PrismaService) {
        super({
            // Request-এর Authorization Header থেকে 'Bearer <token>' আকারে টোকেন নেবে
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false, // টোকেনের মেয়াদ শেষ হলে অটোমেটিক রিজেক্ট করবে
            secretOrKey: process.env.JWT_SECRET || 'super-secret-jwt-key', // সিক্রেট কী দিয়ে টোকেন ভ্যালিডেট করবে
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