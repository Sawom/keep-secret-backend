import { Module } from '@nestjs/common';
import { NotebookService } from './notebook.service';
import { NotebookController } from './notebook.controller';

@Module({
  controllers: [NotebookController],
  providers: [NotebookService],
})
export class NotebookModule {}
