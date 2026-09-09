import { PartialType } from '@nestjs/mapped-types';
import { CreateNotebookDto } from './create-notebook.dto.js';

/**
 * নোটবুক আপডেটের সময় সব ফিল্ড পাঠানো বাধ্যতামূলক নয়।
 * PartialType ব্যবহার করে CreateNotebookDto-এর ফিল্ডগুলোকে ঐচ্ছিক (Optional) করা হয়েছে।
 */
export class UpdateNotebookDto extends PartialType(CreateNotebookDto) { }