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
 *
 * 🔧 CHANGED:
 *
 * Access Token এবং Refresh Token দুটোই HttpOnly cookie হিসেবে
 * সেট করা হচ্ছে।
 *
 * Frontend আর কোনো token পাবে না।
 */
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.login(dto);

        /*
         * Access Token → HttpOnly cookie
         */
        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:
                process.env.NODE_ENV === 'production'
                    ? 'none'
                    : 'lax',
            path: '/',
            maxAge: 10 * 60 * 1000,
        });

        /*
         * Refresh Token → HttpOnly cookie
         */
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:
                process.env.NODE_ENV === 'production'
                    ? 'none'
                    : 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        /*
         * 🔧 CHANGED:
         *
         * Access token আর response body-তে পাঠানো হবে না।
         */
        return {
            message: 'Login successful',
            user: result.user,
        };
    }

    /**
 * [POST] /auth/refresh
 *
 * 🔧 CHANGED:
 *
 * Refresh Token HttpOnly cookie থেকে নেওয়া হবে।
 * নতুন Access Token HttpOnly cookie-তে সেট হবে।
 */
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Req() req: any,
        @Res({ passthrough: true }) res: Response,
    ) {
        const incomingRefreshToken =
            req.cookies?.refreshToken;

        const result =
            await this.authService.refreshTokens(
                incomingRefreshToken
            );

        /*
         * নতুন Access Token cookie-তে set করা।
         */
        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:
                process.env.NODE_ENV === 'production'
                    ? 'none'
                    : 'lax',
            path: '/',
            maxAge: 10 * 60 * 1000,
        });

        return {
            message: 'Token refreshed successfully',
            user: result.user,
        };
    }

    /**
 * [POST] /auth/logout
 *
 * 🔧 CHANGED:
 *
 * Access token expired হলেও logout যেন কাজ করে।
 * তাই এই endpoint-এর জন্য expired access token-এর উপর
 * নির্ভর করা হবে না।
 */
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(
        @Req() req: any,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken =
            req.cookies?.refreshToken;

        await this.authService.logoutByRefreshToken(
            refreshToken
        );

        /*
         * Access token cookie clear
         */
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:
                process.env.NODE_ENV === 'production'
                    ? 'none'
                    : 'lax',
            path: '/',
        });

        /*
         * Refresh token cookie clear
         */
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:
                process.env.NODE_ENV === 'production'
                    ? 'none'
                    : 'lax',
            path: '/',
        });

        return {
            message: 'Logged out successfully',
        };
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

    /**
 * [GET] /auth/google/callback
 *
 * 🔧 CHANGED:
 *
 * Google login-এর Access Token আর URL parameter হিসেবে
 * frontend-এ পাঠানো হবে না।
 *
 * Access + Refresh দুটো HttpOnly cookie হবে।
 */
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(
        @Req() req: any,
        @Res() res: Response,
    ) {
        const authResult = req.user;

        /*
         * Access Token → HttpOnly cookie
         */
        res.cookie('accessToken', authResult.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:
                process.env.NODE_ENV === 'production'
                    ? 'none'
                    : 'lax',
            path: '/',
            maxAge: 10 * 60 * 1000,
        });

        /*
         * Refresh Token → HttpOnly cookie
         */
        res.cookie('refreshToken', authResult.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:
                process.env.NODE_ENV === 'production'
                    ? 'none'
                    : 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const frontendUrl =
            process.env.FRONTEND_URL;

        /*
         * 🔧 CHANGED:
         *
         * URL-এ কোনো token নেই।
         */
        return res.redirect(
            `${frontendUrl}/dashboard`
        );
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