import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * ক্লায়েন্ট থেকে এনক্রিপ্টেড নোট তৈরির জন্য ডাটা ভ্যালিডেশন DTO।
 */
export class CreateNoteDto {
    // নোটের টাইটেল (must)
    @IsString()
    @IsNotEmpty()
    title: string;

    // নোটের আসল কনটেন্ট (must)
    @IsString()
    @IsNotEmpty()
    content: string;

    // কাস্টম ব্যাকগ্রাউন্ড কালার (optional)
    @IsString()
    @IsOptional()
    color?: string;

    // পিন করা নোট কি না (optional)
    @IsBoolean()
    @IsOptional()
    isPinned?: boolean;

    // সংশ্লিষ্ট নোটবুকের আইডি (optional)
    @IsString()
    @IsOptional()
    notebookId?: string;
}