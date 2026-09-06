import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

// @Injectable: NestJS-কে বলে যে এটি একটি Provider সার্ভিস যা কন্ট্রোলারে ইনজেক্ট হবে
@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,     // ডাটাবেস অপারেশন চালানোর জন্য
        private readonly jwtService: JwtService,   // JWT Token জেনারেট করার জন্য
    ) { }

    /**
        * [হেলপার ফাংশন: JWT Access Token জেনারেট করা]
    */
    private generateToken(userId: string, email: string): string {
        const payload = { sub: userId, email };
        return this.jwtService.sign(payload);
    }

    /**
        * [১. ইউজার রেজিস্ট্রেশন]
        * পাসওয়ার্ড ম্যাচ ভ্যালিডেশন, ডুওপ্লিকেট ইমেইল চেক এবং bcrypt দিয়ে হ্যাশ করে সেভ করে।
    */

    async register(dto: RegisterDto) {
        // পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড এক আছে কি না চেক
        if (dto.password !== dto.confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }

        // ইমেইল আগে থেকেই আছে কি না চেক
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        // bcryptjs দিয়ে পাসওয়ার্ড হ্যাশ করা (Salt Round = 10)
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // Prisma দিয়ে ডাটাবেসে ইউজার সেভ
        const user = await this.prisma.user.create({
            data: {
                fullName: dto.name,
                email: dto.email,
                password: hashedPassword,
            },
        });

        // পাসওয়ার্ড বাদে ইউজার ডাটা এবং JWT টোকেন রিটার্ন
        const token = this.generateToken(user.id, user.email);
        return {
            message: 'Registration successful',
            user: { id: user.id, name: user.fullName, email: user.email },
            accessToken: token,
        };
    }

    /**
        * [২. ইমেইল ও পাসওয়ার্ড লগইন]
        * ইউজার খুঁজে বের করা এবং bcrypt.compare দিয়ে পাসওয়ার্ড চেক করা।
    */


}
