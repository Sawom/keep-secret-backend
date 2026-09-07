import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * প্রোফাইল আপডেটের জন্য DTO।
 * জিরো-নলেজ প্রজেক্টের সিকিউরিটির জন্য শুধুমাত্র fullName পরিবর্তনের অনুমতি রয়েছে।
 */
export class UpdateProfileDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2, { message: 'Full name must be at least 2 characters long' })
    @MaxLength(50, { message: 'Full name cannot exceed 50 characters' })
    fullName: string;
}