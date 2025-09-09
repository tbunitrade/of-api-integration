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
// import { mkdirSync } from 'fs';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { uploadDirectory, resolveModelFolder, getTypeSubDir, toPublicUrl, getModelDirname } from "../utils/upload";
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
            const rawModelName =
              ( req?.body && (req.body.model_name || req.body.modelName )) ||
              ( req?.query && ( req.query.model_name as string )) ||
              'unknown-model';

            const entityRaw =
              ( req.body.entity || req.body.model ) ||
              ( req.query.entity as string ) ||
            'post';

            const entity = String(entityRaw).toLowerCase() === 'messages' ? 'messages' : 'post';
            const baseSubdir = getTypeSubDir(file?.mimetype);

            // validation POST request END
            // next logic goes

            if ( entity === 'post') {
              const modelId =
                ( req.body && ( req.body.model_id || req.body.id)) ||
                ( req.query && ( req.query.model_id as string )) ||
                '';
              // НИЧЕГО из messages здесь не проверяем
              const subdir = baseSubdir;  // files / files/image / files/video
              const folder = resolveModelFolder(rawModelName, modelId, subdir, 'post');
              console.log('[upload:post] →', folder);
              cb(null, folder);
              return;
            }

            // --- branch MESSAGES ---
            const groupId =
              (req?.body && (req.body.group_id || req.body.groupId)) ||
              (req?.query && (req.query.group_id as string)) ||
              '';

            const messageId =
              (req?.body && (req.body.message_id || req.body.messageId)) ||
              (req?.query && (req.query.message_id as string)) ||
              '';

            if (!String(groupId).trim() || !String(messageId).trim()) {
              throw new Error('[upload] Both group_id and message_id are required for entity=messages');
            }



            ////fix folder issue

            const gid = String(groupId ?? '').trim();
            const mid = String(messageId ?? '').trim();

            if (!gid || !mid) {
              throw new Error('[upload] Both group_id and message_id are required for entity=messages');
            }
// ← добавляем ЖЕСТКУЮ проверку на ЦИФРЫ, чтобы не создавать папки под временные id
            if (!/^\d+$/.test(mid)) {
              throw new Error('[upload] message_id must be a numeric id (real DB id)');
            }


            //// hard mix

            const subdir = `group${gid}/messages${mid}/${baseSubdir}`;
            const folder = resolveModelFolder(rawModelName, '', subdir, '');

            console.log('[upload:messages] →', folder);
            console.log('[upload] destination model:', rawModelName, 'entity:', entity, 'subdir', subdir, '→', folder);
            cb(null, folder);
          } catch (e) {
            console.error('[upload] destination error:', e);
            // fallback в корень uploads
            // fs.ensureDirSync(uploadDirectory);
            // cb(null, path.resolve(uploadDirectory));

            return cb(e as Error, undefined as any);
          }
        },
        filename: ( req, file, cb ) => {
          try {
            const d = new Date();
            const pad = ( n: number) => String(n).padStart(2, '0');

            const uniqueSuffix =
              `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_` +
              `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`; // 2025-07-29_17-57-08
            //const sanitizedName = file.originalname.replace(/\s+/g, '_');

            const ext = path.extname(file.originalname);
            const base = path.basename(file.originalname, ext ).replace(/\s+/g, '_');
            let finalName = `${uniqueSuffix}-${base}${ext}`;

            // destination уже вычислён раньше; Multer прокидывает его в file.destination
            const dest = ( file as any ).destination || resolveModelFolder('unknown-model');
            const full = path.join(dest, finalName);

            // если такое имя вдруг уже есть — добьём случайный хвост
            if (fs.existsSync(full)) {
              finalName = `${uniqueSuffix}-${Math.round(Math.random() * 1e9)}-${base}${ext}`;
            }
            cb( null, finalName)

          } catch ( e ) {
            // аварийный фолбэк: дата + оригинал
            const sanitizedName = file.originalname.replace(/\s+/g, '_');
            cb(null, `${Date.now()}-${sanitizedName}`);
          }
        }
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
      console.log (startTime, ' progress time ')

      uploaded_files.forEach( file => {
        console.log(`⏳ Uploading: ${file.originalname} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      });

      const endTime = Date.now();
      console.log ('End load progress time ',endTime)

      const result = await this.fileUploadService.uploadFiles(uploaded_files);
      console.log(`✅ All files uploaded successfully in ${(endTime - startTime) / 1000}s`);
      //return await this.fileUploadService.uploadFiles(uploaded_files);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('delete')
  @ApiBearerAuth('jwt')
  async deleteFile(
    @Query('file') filePath: string,
    @Query('id') id?: number,
    @Query('message_id') mid?: number,
  ): Promise<boolean> {
    try {
      const messageId = Number( mid?? id ?? 0);

      if (messageId > 0) {
        await this.messageService.deleteFile(messageId, filePath);
        console.log('911');
      }

      return await this.fileUploadService.deleteFile(filePath);

    } catch (error) {
      console.error('[deleteFile] unexpected error:', error);
      throw error;
      //return true; // всё равно true, чтобы UI не вис
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

  @Get('list')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  async listFiles(
    @Query('model_name') modelName: string,
    @Query('model_id') modelId: string, // для messages игнорится
    @Query('entity') entity: string = 'post',
    @Query('group_id') groupId?: string,
    @Query('message_id') messageId?: string,
  ): Promise<string[]> {
    return this.fileUploadService.listByModel(modelName, modelId || '', entity, groupId, messageId);
  }
}
