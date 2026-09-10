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
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
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

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
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