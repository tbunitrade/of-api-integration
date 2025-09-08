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
export function resolveModelFolder(
  modelName?: string,
  id?: string | number,
  subdir?: string,
  entityPrefix: string = 'post' // default
) {
  const dir = getModelDirname(modelName || 'unknown-model');
  const idPart =
    id !== undefined && id !== null && String(id).trim() !== '' ? String(id).trim() : '';
  // новая иерархия: uploads/{modelname}{id}/files

  // files / files/image / files/video
  const leaf = subdir && subdir.trim() ? subdir : getTypeSubDir(); // ← тут используем subdir
  const full = path.resolve(uploadDirectory, dir, `${entityPrefix}${idPart}`, leaf);
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
export async function unlinkSmart(filePath: string) {
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

    // попытка совместимости со старой схемой — как у тебя уже было
    if (!(await fs.pathExists(full))) {
      const m = full.match(/(.*\/uploads\/)([^/]+?)(\d+)\/(files.*)/);
      if (m) {
        const [, prefix, model, idNum, rest] = m;
        const tryNew = path.join(prefix, model, `post${idNum}`, rest);
        if (await fs.pathExists(tryNew)) {
          full = tryNew;
        }
      }
    }

    // 🔸 ключевое: если файла нет — не бросаем исключение
    if (!(await fs.pathExists(full))) {
      console.log('[unlinkSmart] not found, skip:', full);
      return;
    }

    console.log('[unlinkSmart] remove:', full);
    return fs.unlink(full);
  } catch (e) {
    console.error('[unlinkSmart] error:', e);
    return Promise.reject(e);
  }
}

// + NEW: определяем подкаталог по mime
export function getTypeSubDir(mime?: string) {
  if (!mime) return 'files';

  const top = mime.split('/')[0];

  if ( top === 'image') return 'files/image';
  if ( top === 'video') return 'files/video';

  return 'files';
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

// ↓ ДОБАВЬ в конец файла
export async function listPublicFiles(
  modelName: string,
  modelId: string | number,
  entity: string = 'post',
  groupId?: string,
  messageId?: string
) {
  let root: string;
  let subdir = 'files';
  // для messages строим group{ID}/messages{ID}/files
  if (entity === 'messages' && groupId && messageId) {
      // /uploads/<model_slug>/group{gid}/messages{mid}/files
      subdir = `group${String(groupId).trim()}/messages${String(messageId).trim()}/files`;
      root = resolveModelFolder(modelName, '', subdir, ''); // ← важное изменение
  } else if ( entity === 'post' && String(modelId)) {
      // /uploads/<model_slug>/post{id}/files
      root = resolveModelFolder(modelName, modelId, subdir, 'post'); // ← важное изменениеroot = resolveModelFolder(modelName, '', subdir, ''); // ← важное изменение
  } else {
    // безопасный fallback (старый формат)
      root = resolveModelFolder(modelName, modelId, 'files', entity);
  }


  console.log('[listPublicFiles] entity:', entity, 'root:', root);


  /// next recursive (рекурсивный обход + toPublicUrl)
  const urls: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir)) {
      if (entry === '.DS_Store' || entry.startsWith('._')) continue;
      const full = path.join(dir, entry);
      let stat
        try {
         stat = fs.statSync(full);
        } catch(e) {
          console.warn('[listPublicFiles.walk] skip:', full, e?.message || e);
          continue;
        }

      if (stat.isDirectory()) walk(full);
      else urls.push(toPublicUrl(full));
    }
  };
  fs.ensureDirSync(root);
  walk(root);
  return urls.sort();
}
