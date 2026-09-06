import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NotebookService } from './notebook.service';
import { CreateNotebookDto } from './dto/create-notebook.dto';
import { UpdateNotebookDto } from './dto/update-notebook.dto';

@Controller('notebook')
export class NotebookController {
  constructor(private readonly notebookService: NotebookService) {}

  @Post()
  create(@Body() createNotebookDto: CreateNotebookDto) {
    return this.notebookService.create(createNotebookDto);
  }

  @Get()
  findAll() {
    return this.notebookService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notebookService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNotebookDto: UpdateNotebookDto) {
    return this.notebookService.update(+id, updateNotebookDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notebookService.remove(+id);
  }
}
