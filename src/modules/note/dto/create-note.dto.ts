import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * ক্লায়েন্ট থেকে এনক্রিপ্টেড নোট তৈরির জন্য ডাটা ভ্যালিডেশন DTO।
 */
export class CreateNoteDto {
    // এনক্রিপ্ট করা নোটের টাইটেল (আবশ্যক)
    @IsString()
    @IsNotEmpty()
    title: string;

    // এনক্রিপ্ট করা আসল কনটেন্ট (আবশ্যক)
    @IsString()
    @IsNotEmpty()
    content: string;

    // AES-256-GCM এর Initialization Vector (আবশ্যক)
    @IsString()
    @IsNotEmpty()
    iv: string;

    // ডাটা ট্যাম্পারিং রোধ করার Authentication Tag (আবশ্যক)
    @IsString()
    @IsNotEmpty()
    authTag: string;

    // কাস্টম ব্যাকগ্রাউন্ড কালার (ঐচ্ছিক)
    @IsString()
    @IsOptional()
    color?: string;

    // পিন করা নোট কি না (ঐচ্ছিক)
    @IsBoolean()
    @IsOptional()
    isPinned?: boolean;

    // সংশ্লিষ্ট নোটবুকের আইডি (ঐচ্ছিক)
    @IsString()
    @IsOptional()
    notebookId?: string;
}