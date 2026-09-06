import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    // লগইনের সময় ইমেইল ফরম্যাট চেক করবে
    @IsEmail({}, { message: 'Invalid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    // পাসওয়ার্ড আবশ্যক
    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    password: string;
}