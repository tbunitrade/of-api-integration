import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { uploadDirectory, uploadFile } from 'src/utils/upload';

@Injectable()
export class FileUploadService {
  async deleteFile(file: string): Promise<boolean> {
    try {
      const filename = file.replace(/^.*[\\/]/, '');

      await fs.unlink(`${uploadDirectory}/${filename}`);
      return true;
    } catch (err) {
      console.log('error : ', err);
      return false;
    }
  }
  // async uploadFiles(files: Express.Multer.File[]): Promise<string[]> {
  //   try {
  //     // Create the uploads directory if it doesn't exist
  //     const uploadPromises = files.map((file) => uploadFile(file));
  //     const fileUrls: string[] = await Promise.all(uploadPromises);
  //     return fileUrls;
  //   } catch (err) {
  //     console.error('File Upload  error', err);
  //   }
  // }

  async uploadFiles (files: Express.Multer.File[]): Promise<string[]> {
    return files.map( (file) => `${uploadDirectory}/${file.filename}`);
  }
  async getAllFiles(): Promise<string[]> {
    try {
      // Create the uploads directory if it doesn't exist
      const files = fs.readdirSync(uploadDirectory);
      const arrayOfFiles = [];
      files.forEach(function (file) {
        if (file === '.DS_Store') return;
        if (!fs.statSync(path.join(uploadDirectory, file)).isDirectory()) {
          arrayOfFiles.push(path.join(uploadDirectory, file));
        }
      });

      return arrayOfFiles;
    } catch (err) {
      console.error('File Upload  error', err);
    }
  }
}
