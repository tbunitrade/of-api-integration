import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express/multer';
import { FileUploadService } from './upload.service';
import { MessageService } from 'src/message/message.service';

@Controller('upload')
@ApiTags('upload')
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly messageService: MessageService,
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('jwt')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFiles(
    @UploadedFiles() uploaded_files: Express.Multer.File[],
  ): Promise<string[]> {
    try {
      return await this.fileUploadService.uploadFiles(uploaded_files);
    } catch (error) {
      throw error;
    }
  }

  @Get('delete')
  @ApiBearerAuth('jwt')
  async deleteFile(
    @Query('file') filePath: string,
    @Query('id') messageId: number,
  ): Promise<boolean> {
    try {
      if (messageId && messageId > 0) {
        await this.messageService.deleteFile(messageId, filePath);
      }

      return await this.fileUploadService.deleteFile(filePath);
    } catch (error) {
      throw error;
    }
  }
}
