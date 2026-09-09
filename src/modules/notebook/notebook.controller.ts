import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { NotebookService } from './notebook.service.js';
import { CreateNotebookDto } from './dto/create-notebook.dto.js';
import { UpdateNotebookDto } from './dto/update-notebook.dto.js';


// Express-এর Request ইন্টারফেস এক্সটেন্ড করে লগড-ইন ইউজারের পে লোড সংজ্ঞায়িত করা
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

/**
 * Controller Routing: `/notebooks`
 * `@UseGuards(JwtAuthGuard)` দিয়ে কন্ট্রোলারের সব এপিআই-কে প্রটেক্ট করা হয়েছে।
 * অর্থাৎValid JWT Token ছাড়া কেউ এই এপিআইগুলো ব্যবহার করতে পারবে না।
 */

@UseGuards(JwtAuthGuard)
@Controller('notebooks')
export class NotebookController {
  constructor(private readonly notebookService: NotebookService) { }

  /**
   * [POST /notebooks]
   * কী করে: নতুন নোটবুক তৈরি করে।
   * কীভাবে কাজ করে: `req.user.id` থেকে লগড-ইন ইউজারের আইডি বের করে সার্ভিস ফাংশনে পাঠায়।
   */
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createNotebookDto: CreateNotebookDto,
  ) {
    return this.notebookService.create(req.user.id, createNotebookDto);
  }

  /**
   * [GET /notebooks]
   * কী করে: লগড-ইন ইউজারের সব নোটবুকের তালিকা নিয়ে আসে।
   */

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.notebookService.findAllByUser(req.user.id);
  }

  /**
   * [GET /notebooks/:id]
   * কী করে: ইউআরএল প্যারামিটার (`:id`) থেকে আইডি নিয়ে নির্দিষ্ট নোটবুক দেখায়।
   */

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notebookService.findOne(id, req.user.id);
  }

  /**
   * [PATCH /notebooks/:id]
   * কী করে: নির্দিষ্ট একটি নোটবুকের ফিল্ড আপডেট করে।
   */

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() updateNotebookDto: UpdateNotebookDto,
  ) {
    return this.notebookService.update(id, req.user.id, updateNotebookDto);
  }

  /**
   * [DELETE /notebooks/:id]
   * কী করে: নির্দিষ্ট একটি নোটবুক মুছে ফেলে।
   */

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notebookService.remove(id, req.user.id);
  }

}