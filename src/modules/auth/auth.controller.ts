import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Request, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { GetUser } from '../../common/decorators/get-user.decorator.js';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

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
    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(dto);

        // এখানে টোকেন কুকিতে সেট করে দিতে হবে
        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
            message: 'Login successful',
            user: result.user,
            accessToken: result.accessToken
        };
    }

    /**
     * [POST] /auth/logout
     */
    @HttpCode(HttpStatus.OK)
    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        const isProduction = process.env.NODE_ENV === 'production';

        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
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
    @UseGuards(AuthGuard('google'))
    googleAuth() { }

    // ২. গুগল থেকে ব্যাক আসার পর কলব্যাক হ্যান্ডেল করার জন্য
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    googleAuthRedirect(@Req() req: any, @Res() res: Response) {
        const authResult = req.user;
        const token = authResult.accessToken;
        const frontendUrl = process.env.FRONTEND_URL;

        // HttpOnly কুকিতে টোকেন সেট করা (Vercel প্রোডাকশনের জন্য secure ও sameSite: 'none' জরুরি)
        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: true, // লাইভ সার্ভারে HTTPS এর জন্য অবশ্যই true থাকতে হবে
            sameSite: 'none', // আলাদা ডোমেইন (frontend.vercel.app & backend.vercel.app) হলে 'none' দিতেই হবে
            maxAge: 7 * 24 * 60 * 60 * 1000, // ৭ দিন
        });

        // ২. ইউআরএলে টোকেন না পাঠিয়ে সরাসরি ড্যাশবোর্ডে পাঠিয়ে দেওয়া
        return res.redirect(`${frontendUrl}/dashboard`);
    }

    /**
   * [GET] /auth/profile (Protected Route)
   * @UseGuards(JwtAuthGuard): এই ডেকোরেটরটির কারণে বৈধ JWT Token ছাড়া কেউ এই রুটে ঢুকতে পারবে না।
   */
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@GetUser() user: { id: string; email: string; name: string }) {
        // JwtStrategy-র validate() থেকে আসা ইউজারের ডাটা req.user-এ পাওয়া যাবে
        return {
            message: 'Profile retrieved successfully',
            user,
        };
    }
}