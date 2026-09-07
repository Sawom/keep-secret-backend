import {
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
import { NoteService } from './note.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('notebookId') notebookId?: string,
  ) {
    return this.noteService.findAllByUser(req.user.id, notebookId);
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

  @Delete(':id')
  hardDelete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.noteService.hardDelete(id, req.user.id);
  }



}
