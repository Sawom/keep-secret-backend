import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * ক্লায়েন্ট (Frontend) থেকে নতুন নোটবুক তৈরির সময় যে ডাটা পাঠানো হবে,
 * এই DTO (Data Transfer Object) ক্লাসটি সেই ডাটার ভ্যালিডেশন নিশ্চিত করে।
 */
export class CreateNotebookDto {
    // নোটবুকের নাম বা টাইটেল (আবশ্যক)
    @IsString({ message: 'Title must be a string' })
    @IsNotEmpty({ message: 'Title is required' })
    title: string;

    // নোটবুকের বিবরণ (ঐচ্ছিক)
    @IsString({ message: 'Description must be a string' })
    @IsOptional()
    description?: string;

    // নোটবুকের কালার কোড (ঐচ্ছিক, যেমন: "#3B82F6")
    @IsString({ message: 'Color must be a valid hex or string' })
    @IsOptional()
    color?: string;

    // নোটবুকের আইকন নেম (ঐচ্ছিক, যেমন: "book")
    @IsString({ message: 'Icon must be a string' })
    @IsOptional()
    icon?: string;

    // কাস্টম অর্ডারিং বা ড্র্যাগ-এন্ড-ড্রপ পজিশন (ঐচ্ছিক, যেমন: 0.0, 1.0)
    @IsNumber({}, { message: 'Position must be a float or number' })
    @IsOptional()
    position?: number;
}