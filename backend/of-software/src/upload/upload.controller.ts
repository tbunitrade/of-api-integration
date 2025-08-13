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
import { diskStorage } from 'multer';
import { FileUploadService } from './upload.service';
import { MessageService } from 'src/message/message.service';
// import { diskStorage } from 'multer';
// import { mkdirSync } from 'fs';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { uploadDirectory, resolveModelFolder } from "../utils/upload";
import * as fs from 'fs-extra';
import * as path from 'path';

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
      storage: diskStorage({
        destination: (req, file, cb) => {
          try {
            const raw =
              ( req?.body && (req.body.model_name || req.body.model )) ||
              ( req?.query && ( req.query.model_name as string )) ||
              'unknown-model';

            const modelId =
              ( req?.body && ( req.body.model_id || req.body.id )) ||
              ( req?.query && ( req.query.model_id as string )) ||
              '';

            const folder = resolveModelFolder(raw, modelId);
            console.log('[upload] destination model:', raw, 'id:', modelId, '→', folder);
            cb(null, folder);
          } catch (e) {
            console.error('[upload] destination error:', e);
            // fallback в корень uploads

            fs.ensureDirSync(uploadDirectory);
            cb(null, path.resolve(uploadDirectory));
          }
        },
        filename: ( req, file, cb ) => {
          //const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

          const d = new Date();
          const pad = ( n: number) => String(n).padStart(2, '0');

          const uniqueSuffix =
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_` +
            `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`; // 2025-07-29_17-57-08
          const sanitizedName = file.originalname.replace(/\s+/g, '_');
          //cb(null, `${sanitizedName}-${uniqueSuffix}`);
          cb(null, `${sanitizedName}`);
        }

        // destination : uploadDirectory,
        // filename: ( req, file, cb) => {
        //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        //   const sanitizedName = file.originalname.replace(/\s+/g, '_');
        //   cb(null, `${uniqueSuffix}-${sanitizedName}`);
        // },
      }),
      limits: {
        fileSize: 6 * 1024 * 1024 * 1024, // 6GB
      },
    }),
  )
  async uploadFiles(
    @UploadedFiles() uploaded_files: Express.Multer.File[],
  ): Promise<string[]> {
    try {
      console.log(`📥 Start uploading ${uploaded_files.length} file(s)...`);
      const startTime = Date.now();

      uploaded_files.forEach( file => {
        console.log(`⏳ Uploading: ${file.originalname} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      });

      const result = await this.fileUploadService.uploadFiles(uploaded_files);

      //return await this.fileUploadService.uploadFiles(uploaded_files);

      const endTime = Date.now();
      console.log (startTime, ' progress time ',endTime)
      console.log(`✅ All files uploaded successfully in ${(endTime - startTime) / 1000}s`);
      return result;
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
