import { Readable } from 'stream';
import * as path from 'path';
import * as fs from 'fs-extra';
export const uploadDirectory = './uploads';

export const uploadFile = async (
  file: Express.Multer.File,
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    await fs.ensureDir(uploadDirectory);
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
