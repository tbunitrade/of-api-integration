import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { uploadDirectory, uploadFile, unlinkSmart, toPublicUrl, listPublicFiles } from 'src/utils/upload';

@Injectable()
export class FileUploadService {
  async deleteFile(file: string): Promise<boolean> {
    try {
      console.log(' FileUploadService deleteFile the filename ', file);
      await unlinkSmart(file);
      return true;
    } catch (err) {
      console.log('error : ', err);
      return false;
    }
  }

  async uploadFiles (files: Express.Multer.File[]): Promise<string[]> {

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
      const arrayOfFiles: string[] = [];
      const  root = path.resolve(uploadDirectory);
      fs.ensureDirSync(root);

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

      walk(root);

      return arrayOfFiles;
    } catch (err) {
      console.error('File Upload  error', err);
    }
  }

  async listByModel(modelName: string, modelId: string | number, entity = 'post', messageName?: string) {
    return listPublicFiles(modelName, modelId, entity, messageName);
  }
}
