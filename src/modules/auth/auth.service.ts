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
import { AuditLogService } from '../audit-log/audit-log.service';

// @Injectable: NestJS-কে বলে যে এটি একটি Provider সার্ভিস যা কন্ট্রোলারে ইনজেক্ট হবে
@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,     // ডাটাবেস অপারেশন চালানোর জন্য
        private readonly jwtService: JwtService,   // JWT Token জেনারেট করার জন্য
        private readonly auditLogService: AuditLogService,  // AuditLog inject
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
        if (dto.password !== dto.confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }

        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                fullName: dto.name,
                email: dto.email,
                passwordHash: hashedPassword,
            },
        });

        const token = this.generateToken(user.id, user.email);
        return {
            message: 'Registration successful',
            user: {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role,
            },
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

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const token = this.generateToken(user.id, user.email);

        // [Audit Log Trigger]: সফল লগইনের পর লগ সেভ 
        await this.auditLogService.log(user.id, {
            action: 'USER_LOGIN',
            details: {
                message: `User ${user.email} successfully logged in`,
                email: user.email,
            },
        });

        return {
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role,
            },
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
            user = await this.prisma.user.create({
                data: {
                    fullName: googleProfile.name,
                    email: googleProfile.email,
                    googleId: googleProfile.googleId,
                },
            });
        } else if (!user.googleId) {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { googleId: googleProfile.googleId },
            });
        }

        const token = this.generateToken(user.id, user.email);
        return {
            message: 'Google login successful',
            user: {
                id: user.id,
                name: user.fullName,
                email: user.email,
                role: user.role,
            },
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

        // ৩২ বাইটের সিকিউর র‍্যান্ডম হেক্স টোকেন তৈরি
        const resetToken = crypto.randomBytes(32).toString('hex');

        // টোকেনের মেয়াদ ১ ঘণ্টা (১ * ৬০ * ৬০ * ১০০০ মিলিডিসেকেন্ড) নির্ধারণ
        const resetTokenExpiry = new Date(Date.now() + 3600000);

        // ডাটাবেসে রিসেট টোকেন এবং এক্সপায়ারি টাইম আপডেট
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        return {
            message: 'Password reset token generated successfully',
            resetToken, // ইমেইল সার্ভিস যুক্ত না করা পর্যন্ত টেস্টিংয়ের জন্য রিটার্ন রাখা হলো
        };
    }

    /**
        * [৫. নতুন পাসওয়ার্ড সেভ]
   */
    async resetPassword(dto: ResetPasswordDto) {
        // ১. টোকেন দিয়ে ইউজার খোঁজা এবং টোকেনের মেয়াদ চেক করা
        const user = await this.prisma.user.findFirst({
            where: {
                resetToken: dto.token,
                resetTokenExpiry: {
                    gt: new Date(), // টোকেনের মেয়াদ বর্তমান সময়ের চেয়ে বেশি হতে হবে
                },
            },
        });

        if (!user) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        // ২. নতুন পাসওয়ার্ড হ্যাশ করা
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

        // ৩. ডাটাবেসে নতুন পাসওয়ার্ড আপডেট করা এবং রিসেট টোকেন মুছে ফেলা
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                resetToken: null,       // টোকেন একবার ব্যবহার হয়ে গেলে মুছে দেওয়া হলো
                resetTokenExpiry: null,
            },
        });

        return {
            message: 'Password has been reset successfully',
        };
    }

}
