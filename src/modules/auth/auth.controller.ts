import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { GetUser } from '../../common/decorators/get-user.decorator.js';

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