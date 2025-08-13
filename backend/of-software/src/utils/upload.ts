// src/utils/upload.ts
import { Readable } from 'stream';
import * as path from 'path';
import * as fs from 'fs-extra';

// База хранения: .env → UPLOAD_FOLDER_URL, иначе ./uploads
export const uploadDirectory: string =
  process.env.UPLOAD_FOLDER_URL ? process.env.UPLOAD_FOLDER_URL : path.resolve(process.cwd(), 'uploads');

/// utils for save slug for name folder of model
export function getModelDirname(name: string) {
  const base = (name || 'unknown-model').toString();
  return base
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
}

// Абсолютный путь к папке uploads/{model}{id}/files
// СОВМЕСТИМОСТЬ: id опциональный, старые вызовы без id не ломаем
export function resolveModelFolder(modelName?: string, id?: string | number) {
  const dir = getModelDirname(modelName || 'unknown-model');
  const idPart =
    id !== undefined && id !== null && String(id).trim() !== '' ? String(id).trim() : '';
  // новая иерархия: uploads/{modelname}{id}/files
  const full = path.resolve(uploadDirectory, `${dir}${idPart}`, 'files');
  fs.ensureDirSync(full);
  return full;
}

// Абсолютный путь → публичный URL (/uploads/…)
export function toPublicUrl(absPath: string): string {
  try {
    const normalized = absPath.replace(/\\/g, '/');
    const baseNorm = uploadDirectory.replace(/\\/g, '/');
    if (normalized.startsWith(baseNorm)) {
      const tail = normalized.slice(baseNorm.length).replace(/^\/+/, '');
      return `/uploads/${tail}`;
    }
    return normalized; // fallback — не ломаем старые записи
  } catch (e) {
    console.error('[toPublicUrl] error:', e);
    return absPath;
  }
}

// Удаление по абсолютному пути, относительному или по публичному URL (/uploads/…)
export function unlinkSmart(filePath: string) {
  try {
    let full = filePath;

    // если пришёл публичный URL — маппим обратно в ФС
    if (typeof filePath === 'string' && filePath.startsWith('/uploads/')) {
      const tail = filePath.replace(/^\/uploads\/+/, '');
      full = path.resolve(uploadDirectory, tail);
    }

    if (!path.isAbsolute(full)) {
      full = path.resolve(uploadDirectory, full);
    }

    console.log('[unlinkSmart] remove:', full);
    return fs.unlink(full);
  } catch (e) {
    console.error('[unlinkSmart] error:', e);
    // отдаём промис отклонения наружу, как и раньше
    return Promise.reject(e);
  }
}

// Универсальная запись файла. Если передать modelName/modelId — кладёт в uploads/{model}{id}/files.
// Возвращает ПУБЛИЧНЫЙ URL (/uploads/...).
export const uploadFile = async (
  file: Express.Multer.File,
  modelName?: string,
  modelId?: string | number
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Куда сохраняем:
      // 1) Если Multer уже положил временный файл и дал destination — используем подкаталог.
      // 2) Иначе создаём по нашей схеме.
      let targetDir: string;

      if (file?.destination) {
        // diskStorage уже выбрал папку (в контроллере через resolveModelFolder)
        targetDir = path.resolve(file.destination);
      } else {
        // поток/буфер — выбираем сами
        targetDir = resolveModelFolder(modelName, modelId);
      }

      await fs.ensureDir(targetDir);

      // Генерируем имя как раньше — random + оригинальное расширение
      const randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');
      const fileName = `${randomName}${path.extname(file.originalname)}`;
      const destinationPath = path.join(targetDir, fileName);

      // Если Multer положил бинарь на диск (file.path) — просто двигаем
      if (file && (file as any).path && await fs.pathExists((file as any).path)) {
        await fs.move((file as any).path, destinationPath, { overwrite: true });
        console.log(`File ${file.originalname} moved to ${destinationPath}`);
        return resolve(toPublicUrl(destinationPath));
      }

      // Иначе пишем потоково из буфера (как было раньше)
      if (!file || !file.buffer) {
        throw new Error('[uploadFile] Missing file buffer and file.path');
      }

      const writableStream = fs.createWriteStream(destinationPath);

      let position = 0;
      const chunkSize = 1024 * 1024; // 1MB
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

      readableStream.pipe(writableStream);

      writableStream.on('finish', () => {
        console.log(`File ${file.originalname} uploaded successfully → ${destinationPath}`);
        resolve(toPublicUrl(destinationPath)); // Возвращаем ПУБЛИЧНЫЙ URL
      });

      writableStream.on('error', (err) => {
        console.error(`Error uploading file ${file.originalname}:`, err);
        reject(err);
      });
    } catch (err) {
      console.error('[uploadFile] error:', err);
      reject(err);
    }
  });
};
