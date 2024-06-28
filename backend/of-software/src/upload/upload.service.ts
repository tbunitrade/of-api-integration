import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Readable } from 'stream';

const uploadDirectory = './uploads';
const uploadFile = async (file: Express.Multer.File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');

    // Build the destination path for saving the file
    const destinationPath = path.join(
      uploadDirectory,
      `${randomName}${path.extname(file.originalname)}`,
    );
    const writableStream = fs.createWriteStream(destinationPath);

    let position = 0;
    const chunkSize = 1024 * 1024; // 1MB chunk size
    // Create a readable stream from the file buffer
    const readableStream = new Readable({
      read() {
        const chunk = file.buffer.slice(position, position + chunkSize);
        position += chunk.length;
        this.push(chunk);
        if (position >= file.buffer.length) {
          this.push(null); // End of file
        }
      },
    });

    // Pipe the readable stream to the writable stream
    readableStream.pipe(writableStream);

    // Wait for the write operation to complete
    writableStream.on('finish', () => {
      console.log(`File ${file.originalname} uploaded successfully.`);
      resolve(destinationPath); // Resolve with the file path
    });

    // Handle errors
    writableStream.on('error', (err) => {
      console.error(`Error uploading file ${file.originalname}:`, err);
      reject(err); // Reject with the error
    });
  });
};

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
  async uploadFiles(files: Express.Multer.File[]): Promise<string[]> {
    try {
      // Create the uploads directory if it doesn't exist
      await fs.ensureDir(uploadDirectory);
      const uploadPromises = files.map((file) => uploadFile(file));
      const fileUrls: string[] = await Promise.all(uploadPromises);
      return fileUrls;
    } catch (err) {
      console.error('File Upload  error', err);
    }
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
