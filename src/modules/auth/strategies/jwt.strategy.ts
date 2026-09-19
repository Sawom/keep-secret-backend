import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import {
    PassportStrategy,
} from '@nestjs/passport';

import {
    ExtractJwt,
    Strategy,
} from 'passport-jwt';

import { PrismaService } from '../../prisma/prisma.service.js';
import { Request } from 'express';

@Injectable()
export class JwtStrategy
    extends PassportStrategy(Strategy) {

    constructor(
        private readonly prisma: PrismaService
    ) {
        super({
            /*
             * 🔧 CHANGED:
             *
             * Authorization header আর ব্যবহার করা হবে না।
             *
             * Access token HttpOnly cookie থেকে নেওয়া হবে।
             */
            jwtFromRequest:
                ExtractJwt.fromExtractors([
                    (request: Request) => {
                        return request?.cookies
                            ?.accessToken || null;
                    },
                ]),

            ignoreExpiration: false,

            secretOrKey:
                process.env.JWT_SECRET!,
        });
    }

    async validate(
        payload: {
            sub: string;
            email: string;
        }
    ) {
        const user =
            await this.prisma.user.findUnique({
                where: {
                    id: payload.sub,
                },
            });

        if (!user) {
            throw new UnauthorizedException(
                'User no longer exists'
            );
        }

        return {
            id: user.id,
            email: user.email,
            name: user.fullName,
        };
    }
}