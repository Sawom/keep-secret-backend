import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { NoteService } from './note.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) { }

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createNoteDto: CreateNoteDto,

  ) {
    return this.noteService.create(req.user.id, createNoteDto);
  }


  // all notes fetching. এখানে আমি cursor-based infinite loading দেব। UI pagination থাকবে না। 
  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,

    @Query('notebookId')
    notebookId?: string,

    @Query('limit')
    limit?: string,

    @Query('cursor')
    cursor?: string,

    @Query('search')
    search?: string,
  ) {
    const parsedLimit = Math.min(
      Math.max(
        Number(limit) || 20,
        1,
      ),
      50,
    );

    return this.noteService.findAllByUser(
      req.user.id,
      notebookId,
      parsedLimit,
      cursor,
      search,
    );
  }

  // search route
  @Get('search')
  search(
    @Req() req: AuthenticatedRequest,
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Math.min(
      Math.max(
        Number(limit) || 50,
        1,
      ),
      100,
    );

    return this.noteService.searchByUser(
      req.user.id,
      query || '',
      parsedLimit,
    );
  }

  /**
   * [GET /notes/trash]
   * সফট ডিলিট বা ট্র্যাশে থাকা সব নোট দেখতে পাওয়ার এপিআই
   */

  @Get('trash')
  getTrashNotes(@Req() req: AuthenticatedRequest) {
    return this.noteService.findTrashByUser(req.user.id);
  }

  /**
  * [DELETE /notes/trash/empty]
  * ট্র্যাশ খালি করার রাউট (অবশ্যই @Delete(':id')-এর ওপরে রাখবে)
  */

  @Delete('trash/empty')
  emptyTrash(@Req() req: AuthenticatedRequest) {
    return this.noteService.emptyTrash(req.user.id);
  }

  /**
   * [PATCH /notes/reorder]
   * ড্র্যাগ এন্ড ড্রপের পর নোটগুলোর নতুন পজিশন সেভ করার রাউট
   */
  @Patch('reorder')
  reorderNotes(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      items: {
        id: string;
        position: number;
      }[];
    },
  ) {
    return this.noteService.reorderNotes(req.user.id, body.items);
  }

  /**
   * [GET /notes/:id]
   * নির্দিষ্ট আইডি দিয়ে নোট দেখার এপিআই (সবসময় 'trash'-এর নিচে থাকবে)
   */

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.noteService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.noteService.update(id, req.user.id, updateNoteDto);
  }

  @Patch(':id/trash')
  softDelete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.noteService.softDelete(id, req.user.id);
  }

  /**
   * [PATCH /notes/:id/restore]
   * ট্র্যাশ থেকে নোট রিস্টোর করার রাউট
   */

  @Patch(':id/restore')
  restoreNote(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.noteService.restoreNote(id, req.user.id);
  }

  @Delete(':id')
  hardDelete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.noteService.hardDelete(id, req.user.id);
  }

}

/**
  ৩টি গোল্ডেন রুল (Route Order Rules)
  রুল ১: Static Path সবসময় ওপরে থাকবে
  যেসব ইউআরএলে কোনো কোলোন (:) নেই, মানে নির্দিষ্ট শব্দ দিয়ে রাউট তৈরি (যেমন: trash, trash/empty, search, me), সেগুলোকে ফাইলের সবার ওপরে রাখতে হবে।

  রুল ২: Dynamic Parameter (:id) রাউট সবসময় নিচে থাকবে
  যেসব রাউটে প্যারামিটার বা আইডির ওপর বেস করে ডাটা রিড/ডিলেট করা হয় (যেমন: :id), সেগুলোকে সবসময় নির্দিষ্ট (Static) রাউটগুলোর নিচে রাখতে হবে।

  রুল ৩: Specific Suffix Path যেকোনো জায়গায় কাজ করে
  যদি প্যারামিটারের পর নির্দিষ্ট কোনো শব্দ থাকে (যেমন: :id/restore, :id/pin), সেগুলো নিয়ে সাধারণত কোনো কনফ্লিক্ট হয় না, কারণ ইউআরএলের শেষে অতিরিক্ত অংশ থাকে। তবে ভালো প্র্যাকটিস হলো এগুলোকেও সাধারণ :id রাউটের ওপরে রাখা।

  ভিজ্যুয়াল স্ট্রাকচার
  @Controller('notes')
  export class NoteController {

    // ==========================================
    // ১. STATIC ROUTES (সবার ওপরে)
    // ==========================================

    @Get('trash')             // URL: GET /notes/trash
    getTrashNotes() {}

    @Delete('trash/empty')    // URL: DELETE /notes/trash/empty
    emptyTrash() {}


    // ==========================================
    // ২. PARAMETER + SUFFIX ROUTES (মাঝখানে)
    // ==========================================

    @Patch(':id/restore')     // URL: PATCH /notes/123/restore
    restoreNote() {}


    // ==========================================
    // ৩. GENERIC DYNAMIC ROUTES (সবার নিচে)
    // ==========================================

    @Get(':id')               // URL: GET /notes/123
    findOne() {}

    @Patch(':id')             // URL: PATCH /notes/123
    update() {}

    @Delete(':id')            // URL: DELETE /notes/123
    remove() {}
  }

  */