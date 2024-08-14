import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express/multer';
import { FileUploadService } from './upload.service';
import { MessageService } from 'src/message/message.service';
// import { diskStorage } from 'multer';
// import { mkdirSync } from 'fs';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

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
  @UseInterceptors(
    FilesInterceptor('files', 10000, {
      limits: {
        fileSize: 10 * 1024 * 1024 * 1024,
      },
    }),
  )
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

  @Get('get-all')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async getAllFiles(): Promise<string[]> {
    try {
      return await this.fileUploadService.getAllFiles();
    } catch (error) {
      throw error;
    }
  }
}
