import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogService } from '../audit-log/audit-log.service.js';

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
        const resetTokenExpiry = new Date(Date.now() + 3600000); // ১ ঘণ্টা মেয়াদ

        // ডাটাবেসে টোকেন সেভ করা
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        // ১. Nodemailer Transporter কনফিগারেশন
        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST || 'smtp.gmail.com',
            port: Number(process.env.MAIL_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });

        const frontendUrl = process.env.FRONTEND_URL;
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

        await transporter.sendMail({
            from: `"KeepSecret Security" <${process.env.MAIL_USER}>`,
            to: user.email,
            subject: 'Reset Your Password | KeepSecret',
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 0;">
                    <tr>
                        <td align="center">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e4e4e7;">
                                <!-- Header / Logo Area -->
                                <tr>
                                    <td style="padding: 30px 40px 20px 40px; text-align: left; background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
                                        <h1 style="margin: 0; color: #4f46e5; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">KeepSecret.</h1>
                                    </td>
                                </tr>
                                
                                <!-- Content Area -->
                                <tr>
                                    <td style="padding: 40px;">
                                        <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 20px; font-weight: 600;">Password Reset Request</h2>
                                        <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 15px; line-height: 24px;">Hello <b>${user.fullName}</b>,</p>
                                        <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 15px; line-height: 24px;">We received a request to reset the password for your KeepSecret account. If you made this request, click the secure button below to choose a new password:</p>
                                        
                                        <!-- Button -->
                                        <table border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                                            <tr>
                                                <td align="center" style="border-radius: 8px;" bgcolor="#4f46e5">
                                                    <a href="${resetLink}" target="_blank" style="font-size: 15px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; border: 1px solid #4f46e5; display: inline-block; font-weight: 600; background-color: #4f46e5;">Reset Password</a>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="margin: 0 0 16px 0; color: #71717a; font-size: 13px; line-height: 20px;">Or copy and paste this link into your browser:</p>
                                        <p style="margin: 0 0 30px 0; word-break: break-all; color: #4f46e5; font-size: 13px; line-height: 18px;"><a href="${resetLink}" target="_blank" style="color: #4f46e5; text-decoration: underline;">${resetLink}</a></p>
                                        
                                        <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 30px 0;">
                                        
                                        <p style="margin: 0; color: #a1a1aa; font-size: 13px; line-height: 20px;">This link is valid for <b>1 hour</b>. If you did not request a password reset, please safely ignore this email; your account remains secure.</p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 20px 40px; background-color: #fafafa; text-align: center; border-top: 1px solid #f0f0f0;">
                                        <p style="margin: 0; color: #a1a1aa; font-size: 12px;">© ${new Date().getFullYear()} KeepSecret. All rights reserved.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            `,
        });

        return {
            message: 'Password reset link has been sent to your email successfully',
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
