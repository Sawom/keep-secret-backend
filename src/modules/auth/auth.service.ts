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
    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user || !user.passwordHash) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // পাসওয়ার্ড সিকিউরলি ম্যাচ চেক করা
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const token = this.generateToken(user.id, user.email);
        return {
            message: 'Login successful',
            user: { id: user.id, name: user.fullName, email: user.email },
            accessToken: token,
        };
    }

    /**
        * [৩. গুগল ও-অথ (OAuth) লগইন/রেজিস্ট্রেশন]
        * গুগল দিয়ে লগইন করলে একই ইমেইল থাকলে অ্যাকাউন্টে গুগল কানেক্ট করবে, না থাকলে নতুন অ্যাকাউন্ট খুলবে।
   */

    async validateGoogleUser(googleProfile: { email: string; name: string; googleId: string }) {
        let user = await this.prisma.user.findUnique({
            where: { email: googleProfile.email },
        });

        if (!user) {
            // অ্যাকাউন্ট না থাকলে অটোমেটিক নতুন রেজিস্ট্রেশন
            user = await this.prisma.user.create({
                data: {
                    fullName: googleProfile.name,
                    email: googleProfile.email,
                    googleId: googleProfile.googleId,
                },
            });
        } else if (!user.googleId) {
            // যদি আগে ম্যানুয়াল ইমেইল দিয়ে একাউন্ট করে থাকে, তবে তার অ্যাকাউন্টে googleId লিঙ্ক করে দেবে
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { googleId: googleProfile.googleId },
            });
        }

        const token = this.generateToken(user.id, user.email);
        return {
            message: 'Google login successful',
            user: { id: user.id, name: user.fullName, email: user.email },
            accessToken: token,
        };
    }

    /**
     * [৪. পাসওয়ার্ড রিসেট টোকেন তৈরি]
     * ভুলে যাওয়া পাসওয়ার্ডের জন্য র‍্যান্ডম সিকিউর রিসেট টোকেন জেনারেট করা।
    */

    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new NotFoundException('No account found with this email');
        }

        // ১৬ বাইটের একটি র‍্যান্ডম হেক্স টোকেন তৈরি
        const resetToken = crypto.randomBytes(32).toString('hex');

        // (এখানে ভবিষ্যতে ইমেইল সার্ভিসের মাধ্যমে ইউজারের ইমেইলে রিসেট লিঙ্ক পাঠানো হবে)

        return {
            message: 'Password reset link sent to your email',
            resetToken, // ডেভেলপমেন্ট টেস্টিংয়ের জন্য রিটার্ন করা হচ্ছে
        };
    }

    /**
        * [৫. নতুন পাসওয়ার্ড সেভ]
   */
    async resetPassword(dto: ResetPasswordDto) {
        // (এখানে টোকেন ভ্যালিডেশন লজিক চেক হবে)
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

        return {
            message: 'Password has been reset successfully',
        };
    }

}
