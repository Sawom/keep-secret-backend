import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Request, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as passport from 'passport';
import { GoogleOAuthGuard } from './guards/googleOAuthGuard.js';

// Base Route: /auth
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /**
     * [POST] /auth/register
     */
    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    /**
     * [POST] /auth/login
     */
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.login(dto);

        // রিফ্রেশ টোকেন HttpOnly কুকি হিসেবে সেট করা (৭ দিন মেয়াদ)
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // এক্সেস টোকেন এবং ইউজার ডাটা বডিতে পাঠানো (ফ্রন্টএন্ডের স্টেট বা Zustand-এ রাখার জন্য)
        return {
            message: 'Login successful',
            accessToken: result.accessToken,
            user: result.user,
        };
    }

    /**
     * [POST] /auth/refresh - সাইলেন্ট টোকেন রিফ্রেশ রুট
     */
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Req() req: any,
        @Res({ passthrough: true }) res: Response,
    ) {
        const incomingRefreshToken = req.cookies?.refreshToken;
        const result = await this.authService.refreshTokens(incomingRefreshToken);

        return {
            message: 'Token refreshed successfully',
            accessToken: result.accessToken,
            user: result.user,
        };
    }

    /**
     * [POST] /auth/logout
     */
    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @GetUser() user: { id: string },
        @Res({ passthrough: true }) res: Response,
    ) {
        await this.authService.logout(user.id);

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
        });

        return { message: 'Logged out successfully' };
    }

    /**
     * [POST] /auth/forgot-password
     */
    @HttpCode(HttpStatus.OK)
    @Post('forgot-password')
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    /**
     * [POST] /auth/reset-password
     */
    @HttpCode(HttpStatus.OK)
    @Post('reset-password')
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    // ১. গুগল লগইন পেজে রিডাইরেক্ট করার জন্য

    @Get('google')
    @UseGuards(GoogleOAuthGuard)
    async googleAuth(@Req() req: any, @Res() res: any) { }

    // ২. গুগল থেকে ব্যাক আসার পর কলব্যাক হ্যান্ডেল করার জন্য
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(
        @Req() req: any,
        @Res() res: Response,
    ) {
        const authResult = req.user;

        // রিফ্রেশ টোকেন কুকি সেট করা
        res.cookie('refreshToken', authResult.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const frontendUrl = process.env.FRONTEND_URL;
        // এক্সেস টোকেনটি ইউআরএল প্যারামিটার হিসেবে ফ্রন্টএন্ডে পাঠানো হচ্ছে, যা ক্যাচ করে Zustand এ সেট হবে
        return res.redirect(`${frontendUrl}/callback?token=${authResult.accessToken}`);
    }

    /**
   * [GET] /auth/profile (Protected Route)
   * @UseGuards(JwtAuthGuard): এই ডেকোরেটরটির কারণে বৈধ JWT Token ছাড়া কেউ এই রুটে ঢুকতে পারবে না।
   */
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@GetUser() user: { id: string; email: string; name: string }) {
        return {
            message: 'Profile retrieved successfully',
            user,
        };
    }
}