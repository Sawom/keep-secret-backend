import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

// পাসওয়ার্ড ভুলে গেলে ইমেইল পাঠানোর জন্য
export class ForgotPasswordDto {
    @IsEmail({}, { message: 'Invalid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;
}

// পাসওয়ার্ড রিসেট করার জন্য টোকেন ও নতুন পাসওয়ার্ড
export class ResetPasswordDto {
    @IsString()
    @IsNotEmpty({ message: 'Reset token is required' })
    token: string;

    @IsString()
    @MinLength(6, { message: 'New password must be at least 6 characters long' })
    newPassword: string;
}