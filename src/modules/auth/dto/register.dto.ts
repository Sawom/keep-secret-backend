//**  ক্লায়েন্ট থেকে ডাটা আসার সময় তা ভ্যালিডেট করার জন্য আমরা DTO (Data Transfer Object) ব্যবহার করি। */

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    // ইউজার নাম খালি রাখা যাবে না এবং স্ট্রিং হতে হবে
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    name: string;

    // সঠিক ইমেইল ফরম্যাট চেক করবে
    @IsEmail({}, { message: 'Invalid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    // পাসওয়ার্ড সর্বনিম্ন ৬ ক্যারেক্টার হতে হবে
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    // কনফার্ম পাসওয়ার্ড ফিল্ড
    @IsString()
    @IsNotEmpty({ message: 'Confirm password is required' })
    confirmPassword: string;
}