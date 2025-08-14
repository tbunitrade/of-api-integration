import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { uploadDirectory, uploadFile, unlinkSmart, toPublicUrl, listPublicFiles } from 'src/utils/upload';

@Injectable()
export class FileUploadService {
  async deleteFile(file: string): Promise<boolean> {
    try {
      //const filename = file.replace(/^.*[\\/]/, '');

      // если приходит абсолютный путь (как мы отдаем при аплоаде) — удаляем его
      // если относительный — удаляем из uploads
     // console.log('FileUploadService filename ', file );
      //console.log('FileUploadService filename ', filename );
      //await fs.unlink(`${uploadDirectory}/${filename}`);

      // если приходит абсолютный путь — удаляем его как есть
      // если относительный — удаляем из uploads
      console.log('FileUploadService filename ', file);
      await unlinkSmart(file);
      return true;
    } catch (err) {
      console.log('error : ', err);
      return false;
    }
  }

  async uploadFiles (files: Express.Multer.File[]): Promise<string[]> {

    //return files.map( (file) => `${uploadDirectory}/${file.filename}`);

    // return files.map( (file) => {
    //   console.log(`📂 Saved file: ${file.filename} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    //   return `${uploadDirectory}/${file.filename}`;
    // });

    return files.map((file) => {
      // Multer с diskStorage кладёт в file.destination + file.filename
      const full = path.resolve(file.destination, file.filename);
      console.log(`📂 Saved file: ${full} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      const publicUrl = toPublicUrl(full);

      console.log('[upload] public url:', publicUrl);
      return publicUrl; // <-- важно
    });
  }
  async getAllFiles(): Promise<string[]> {
    try {
      // Create the uploads directory if it doesn't exist
      //const files = fs.readdirSync(uploadDirectory);
      const arrayOfFiles: string[] = [];
      const  root = path.resolve(uploadDirectory);
      fs.ensureDirSync(root);
      // files.forEach(function (file) {
      //   if (file === '.DS_Store') return;
      //   if (!fs.statSync(path.join(uploadDirectory, file)).isDirectory()) {
      //     arrayOfFiles.push(path.join(uploadDirectory, file));
      //   }
      // });

      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir)) {
          if (entry === '.DS_Store') continue;
          const full = path.join(dir, entry);
          if (fs.statSync(full).isDirectory()) {
            walk(full);
          } else {
            arrayOfFiles.push(full);
          }
        }
      };

      //walk(path.resolve(uploadDirectory));
      walk(root);

      return arrayOfFiles;
    } catch (err) {
      console.error('File Upload  error', err);
    }
  }

  async listByModel(modelName: string, modelId: string | number, entity = 'post') {
    return listPublicFiles(modelName, modelId, entity);
  }
}
