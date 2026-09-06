import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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
}