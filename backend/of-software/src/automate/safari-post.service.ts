import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as net from "net";
import { AutomateLoggerService } from './utils/automate-logger.service';
import { ModelLimitService } from "./utils/model-limit.service";
import { PostQueueService } from "./utils/post-queue.service";
import { spawn, ChildProcess } from 'child_process';

let uploadsServerProcess: ChildProcess | null = null;

function isPortOpen(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);

    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
}

async function ensureUploadsServer() {
  try {
    // уже поднят
    if (uploadsServerProcess && !uploadsServerProcess.killed) {
      console.log("[uploads_server] already running");
      return;
    }

    const busy = await isPortOpen(3001);
    if (busy) {
      console.log("[uploads_server] port 3001 already in use");
      return;
    }

    const scriptPath = path.join(
      process.cwd(),
      "src",
      "automate",
      "utils",
      "python",
      "uploads_server.py"
    );

    console.log("[uploads_server] starting python3", scriptPath);

    uploadsServerProcess = spawn("python3", [scriptPath], {
      cwd: path.dirname(scriptPath),
      stdio: "inherit", // не трогаем твои логи, просто дописываем новые
    });

    uploadsServerProcess.on("exit", (code, signal) => {
      console.log(
        `[uploads_server] exited with code=${code}, signal=${signal}`
      );
      uploadsServerProcess = null;
    });
  } catch (err) {
    console.error("[uploads_server] failed to start:", err);
  }
}


function buildSafariPayload(data: any, useFingerPrint = false) {
  const numberOfDays = data.numberOfDays ?? 0;
  const payload: Record<string, any> = {
    platform_id: data.platform_id,
    model_id: data.model_id,
  };

  // 🔐 Auth mode
  if (useFingerPrint) {
    console.log('[useFingerPrint] Auth mode started ', useFingerPrint);
    payload.fingerprint_username = data.fingerprint_username || '';
  } else {
    payload.email = data.username || '';
    payload.password = data.password || '';
  }

  // 🧩 Prepare postData
  const postWithTimes = data.postWithTimesAndCaptions || {};
  const captions = postWithTimes.captions || [];
  const files = data.postFiles || [];
  const times = postWithTimes.post_times || [];

  // 👇 инфа от очереди
  const queueSelection = (data as any).queueSelection as
    | { captionIndex: number; fileIndex: number }
    | undefined;

  const scheduledDate = data.scheduledDate
    ? new Date(data.scheduledDate)
    : new Date();

  // 🔹 Время берём из scheduledDate (истина), а times[0] оставляем как fallback
  let hour24: number;
  let minutes: string;

  if (data.scheduledDate) {
    // если пришёл явный scheduledDate из планировщика — ему верим
    hour24 = scheduledDate.getHours();
    minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
  } else if (times.length > 0) {
    // ручной запуск: берём время из post_times по fileIndex, если он в диапазоне
    const timeIndex =
      queueSelection && typeof queueSelection.fileIndex === 'number'
        ? Math.min(queueSelection.fileIndex, times.length - 1)
        : 0;

    const rawTime = times[timeIndex]?.time || '12:00';
    // '23:18:00' → ['23', '18', '00']
    const [ _hour, min = '00' ] = String(rawTime).split(':');
    hour24 = parseInt(_hour, 10) || 12;
    minutes = (min || '00').padStart(2, '0');
  } else {
    // вообще нет инфы → дефолт
    hour24 = 12;
    minutes = '00';
  }

  const hour = hour24 % 12 || 12;
  const suffix = hour24 >= 12 ? 'pm' : 'am';

  console.log('[buildSafariPayload] time source', {
    scheduledDate: data.scheduledDate,
    numberOfDays,
    hour24,
    minutes,
    suffix,
    times,
    queueSelection,
  });

  // const [_hour, minutes = '00'] = (times[0]?.time || '12:00').split(':');
  // const hour = parseInt(_hour) % 12 || 12;
  // const suffix = parseInt(_hour) >= 12 ? 'pm' : 'am';



  let captionText = '';
  let fileUrl = '';

  if (captions && captions.length > 0) {
    if (queueSelection) {
      const c = captions[queueSelection.captionIndex] || captions[0];
      captionText = c?.caption || '';
    } else {
      captionText = captions[0]?.caption || '';
    }
  }

  if (files && files.length > 0) {
    if (queueSelection) {
      const f = files[queueSelection.fileIndex] || files[0];
      fileUrl = (f as any).url || '';
    } else {
      fileUrl = (files[0] as any).url || '';
    }
  }

  let contentPath: string | null = null;
  let publicUrl: string | null = null;

  if (!fileUrl) {
    console.warn("No fileUrl provided. Skipping content_path setup.");
  } else {
    // делаем относительный путь без /uploads и без ведущих /
    const relativePath = fileUrl
      .replace(/^\/?uploads\/?/, "")  // срежем uploads/ или /uploads/
      .replace(/^\/+/, "");           // и лишние /

    // абсолютный путь на диске
    contentPath = path.join(process.cwd(), "uploads", relativePath);

    // а для URL гарантируем /uploads в начале
    const urlPath = fileUrl.startsWith("/uploads/")
      ? fileUrl
      : "/uploads/" + relativePath;

    publicUrl = `http://127.0.0.1:3001${urlPath}`;
  }

  //const contentPath = path.join(process.cwd(), 'uploads', fileUrl.replace(/^\/uploads\/?/, ''));
  //payload.postData.content_path = contentPath;

  console.log("🐍 media paths:", { fileUrl, contentPath, publicUrl });

  payload.postData = {
    content: fileUrl,
    content_url: publicUrl, // главное поле для Safari
    content_base64: null,
    content_path: contentPath,
    content_mime: null,
    message: captionText, // ⬅️ ВАЖНО: строка, а не массив captions
    number_of_days: numberOfDays,
    message_month: scheduledDate
      .toLocaleString('default', { month: 'long' })
      .toLowerCase(),
    message_date: scheduledDate.getDate().toString(),
    message_hour: hour.toString(),
    message_minute: minutes.toString(),
    message_time_suffix: suffix,
    release_user_tags: postWithTimes.user_tags || '',
    release_form_tags: postWithTimes.form_tags || '',
    idValue: data.username || '',
    passwordValue: data.password || '',
  };

  // 🆔 IDs для Safari / cookies
  (payload as any).model_id =
    data.model_id ??
    data.modelId ??
    data.model?.id ??
    data.modelPlatform?.model_id ??
    data.modelPlatform?.model?.id ??
    null;

  (payload as any).platform_id =
    data.platform_id ??
    data.platformId ??
    data.platform?.id ??
    data.modelPlatform?.platform_id ??
    data.modelPlatform?.platform?.id ??
    null;

  (payload as any).model_platform_id =
    data.modelPlatformId ??
    data.model_platform_id ??
    data.modelPlatform?.id ??
    null;

  console.log("[buildSafariPayload] ids for cookies", {
    model_id: (payload as any).model_id,
    platform_id: (payload as any).platform_id,
    model_platform_id: (payload as any).model_platform_id,
  });

  console.log(
    '🧩 [buildSafariPayload] Final payload:',
    JSON.stringify(payload, null, 2)
  );

  return payload;
}

function getSafariPaths(modelId: any, platformId: any) {
  const basePath = path.resolve(process.cwd(), 'src/automate/utils/python');

  const pythonPath = path.join(basePath, '.venv/bin/python');
  const scriptPath = path.join(basePath, 'start_login_safari.py');

  // путь к cookies такой же, как в safari_session_manager.py
  const cookieDir = path.resolve(process.cwd(), 'cookies');
  const cookiePath = path.join(
    cookieDir,
    `user_${modelId}_${platformId}_cookies.json`
  );

  return { basePath, pythonPath, scriptPath, cookiePath };
}

function runPythonAsBotUser(
  pythonPath: string,
  scriptPath: string,
  payload: any,
  logPath?: string
) {
  return new Promise((resolve, reject) => {
    const args = ['-u', scriptPath, JSON.stringify(payload)];

    const child = spawn(
      'sudo',
      ['-u', 'botuser', pythonPath, ...args],
      logPath ? { stdio: ['ignore', 'pipe', 'pipe'] } : { stdio: 'inherit' }
    );

    let logStream = null;
    if (logPath) logStream = fs.createWriteStream(logPath, { flags: 'a' });

    if (logStream) {
      child.stdout.pipe(logStream);
      child.stderr.pipe(logStream);
    }

    child.on('error', reject);

    child.on('close', code => {
      if (code === 0) resolve(true);
      else reject(new Error(`Python exited with code ${code}`));
    });
  });
}

@Injectable()
export class SafariPostService {
  constructor(
    private readonly automateLogger: AutomateLoggerService,
    private readonly modelLimitService: ModelLimitService,
    private readonly postQueueService: PostQueueService,
  ) {}

  // ====================================================================================
  // 🟦 1) startPostSafari (email + password login)
  // ====================================================================================
  async startPostSafari(data: any) {
    console.log('[SafariPostService] startPostSafari()');

    try {
      await this.automateLogger.log({
        modelPlatformId: data.model_id,
        type: 'post',
        step: 'login',
        status: 'started',
        message: 'Safari automation started',
      });

      const { basePath, pythonPath, scriptPath, cookiePath } = getSafariPaths(
        data.model_id,
        data.platform_id
      );

      const payload = buildSafariPayload(data, false);
      const logPath = path.join(
        basePath,
        `debug_log/debug_safari_pwd_${Date.now()}.log`
      );

      let skipLogin = false;

      if (fs.existsSync(cookiePath)) {
        const ageH =
          (Date.now() - fs.statSync(cookiePath).mtimeMs) / 1000 / 60 / 60;
        if (ageH < 48) {
          console.log(
            `[startPostSafari] 🍪 Cookies age ${ageH.toFixed(
              1
            )}h → skip login`
          );
          skipLogin = true;
        } else {
          console.log('[startPostSafari] ⚠️ Cookies expired — relogin needed');
        }
      }

      if (!skipLogin) {
        console.log('[startPostSafari] Launching Safari login…');

        await runPythonAsBotUser(pythonPath, scriptPath, payload, logPath);

        await new Promise(r => setTimeout(r, 1500));

        if (fs.existsSync(logPath)) {
          const log = fs.readFileSync(logPath, 'utf8');
          console.log('----- SAFARI LOGIN LOG -----');
          console.log(log);
          console.log('-----------------------------');
        }
      }

      await this.automateLogger.log({
        modelPlatformId: data.model_id,
        type: 'post',
        step: 'posting',
        status: 'success',
        message: 'Safari login completed successfully',
      });

      return { ok: true };
    } catch (err) {
      console.log('[startPostSafari] ❌ ERROR:', err);

      await this.automateLogger.log({
        modelPlatformId: data.model_id,
        type: 'post',
        step: 'posting',
        status: 'fail',
        message: err.message || 'Unknown Safari error',
      });

      throw err;
    }
  }

  // ====================================================================================
  // 🟧 2) startPostSafariFingerPrint (Passwordless / Touch/FaceID)
  // ====================================================================================
  // ====================================================================================
  // 🟧 2) startPostSafariFingerPrint (Passwordless / Touch/FaceID)
  // ====================================================================================
  async startPostSafariFingerPrint(data: any) {
    // 1️⃣ Поднять сервер, если его ещё нет
    ensureUploadsServer().catch((err) => {
      console.error("[uploads_server] ensure failed:", err);
    });

    console.log('[SafariPostService] startPostSafariFingerPrint()');

    const modelPlatform =
      (data && data.modelPlatform) ? data.modelPlatform : null;

    const modelPlatformId =
      (modelPlatform && modelPlatform.id) ||
      data.model_platform_id ||
      data.model_id;

    const postWithTimesAndCaptions = data.postWithTimesAndCaptions;
    const postFiles = data.postFiles || [];

    if (!postWithTimesAndCaptions) {
      console.log('[SafariPostService] ❌ Нет postWithTimesAndCaptions в data → пропуск');
      return { ok: false };
    }

    // 📅 Сколько дней и от какой базовой даты считаем
    const numberOfDays: number = data.numberOfDays || 1;
    const baseDate: Date =
      data.scheduledDate ? new Date(data.scheduledDate) : new Date();

    const postTimes = postWithTimesAndCaptions.post_times || [];
    const totalTimes = postTimes.length || 1;

    // 🔢 сколько всего запусков Python будет (дни * валидные post_times)
    let totalRuns = 0;
    for (let d = 0; d < numberOfDays; d++) {
      for (const pt of postTimes) {
        if (pt && pt.time) {
          totalRuns++;
        }
      }
    }

    if (totalRuns === 0) {
      console.log('[SafariPostService] ❌ Нет активных post_times → нечего постить');
      return { ok: false };
    }

    try {
      const { basePath, pythonPath, scriptPath, cookiePath } = getSafariPaths(
        data.model_id,
        data.platform_id
      );

      const logDir = path.join(basePath, 'debug_log');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      let scheduledCount = 0;
      let runIndex = 0; // сколько запусков Python уже произошло

      // 🔁 Внешний цикл по дням (как в PuppeteerPostService)
      outerLoop:
        for (let dayOffset = 0; dayOffset < numberOfDays; dayOffset++) {
          const dayDate = new Date(baseDate);
          dayDate.setDate(baseDate.getDate() + dayOffset);

          console.log(
            `[SafariPostService] Day #${dayOffset} → ${dayDate.toISOString()}`
          );

          // 🔁 Внутренний цикл по всем post_times
          for (let timeIndex = 0; timeIndex < totalTimes; timeIndex++) {
            // ⛔ Проверка лимита 50 постов/сутки перед КАЖДЫМ постом
            const limitCheck = await this.modelLimitService.canSchedulePost(modelPlatformId);

            if (!limitCheck.allowed) {
              console.log(
                `[LIMIT] 50 posts/24h exceeded for modelPlatform=${modelPlatform?.id}. Reset at ${limitCheck.resetAt.toISOString()}`
              );

              await this.automateLogger.log({
                modelPlatformId,
                type: 'post',
                step: 'scheduling',
                status: 'fail',
                message: `24h post limit reached (50/50). Reset at ${limitCheck.resetAt.toISOString()}`,
              });

              break outerLoop;
            }

            const postTime = postTimes[timeIndex];
            if (!postTime || !postTime.time) continue;

            // ✅ это реальный запуск → увеличиваем счётчик
            runIndex++;
            const remainingRuns = totalRuns - runIndex; // сколько запусков останется ПОСЛЕ этого
            console.log(
              `[SafariPostService] runIndex=${runIndex}/${totalRuns}, remainingRuns=${remainingRuns}`
            );

            // time в БД вида "08:22:00"
            const [hourStr, minuteStr = '00'] = String(postTime.time).split(':');
            const hour24 = parseInt(hourStr, 10) || 0;
            const minuteNum = parseInt(minuteStr, 10) || 0;

            const scheduledDt = new Date(dayDate);
            scheduledDt.setHours(hour24, minuteNum, 0, 0);

            console.log(
              `[SafariPostService] Scheduling post at ${scheduledDt.toISOString()} (timeIndex=${timeIndex})`
            );

            // 🎲 Берём следующий caption/file из очереди
            const { captionIndex, fileIndex } = await this.postQueueService.getNext(
              modelPlatformId,
              postWithTimesAndCaptions.id,
            );

            const loopData: any = {
              ...data,
              scheduledDate: scheduledDt.toISOString(),
              queueSelection: { captionIndex, fileIndex },
              numberOfDays: remainingRuns,
            };

            console.log('[SafariPostService] Queue selection →', {
              modelPlatformId,
              postId: postWithTimesAndCaptions.id,
              captionIndex,
              fileIndex,
            });

            // 🧩 Собираем payload с учётом scheduledDate + queueSelection
            const payload = buildSafariPayload(loopData, true);

            const logPath = path.join(
              basePath,
              `debug_log/debug_safari_fp_${Date.now()}_${dayOffset}_${timeIndex}.log`
            );

            let skipLogin = false;

            // 🔐 Поведение с cookie оставляем как у тебя было
            if (fs.existsSync(cookiePath)) {
              const ageH =
                (Date.now() - fs.statSync(cookiePath).mtimeMs) / 1000 / 60 / 60;

              if (ageH < 48) {
                console.log(
                  `[startPostSafariFingerPrint] 🍪 Cookies age ${ageH.toFixed(
                    1
                  )}h — skip login`
                );
                skipLogin = true;
              }
            }

            // В fingerprint-режиме у тебя логин + постинг в одном скрипте,
            // поэтому если реально нужно ВСЕГДА постить — можно убрать это if.
            if (!skipLogin) {
              console.log('[Safari FP] Running login as botuser…');

              await runPythonAsBotUser(pythonPath, scriptPath, payload, logPath);

              await new Promise(r => setTimeout(r, 1500));

              if (fs.existsSync(logPath)) {
                const out = fs.readFileSync(logPath, 'utf8');
                console.log('----- SAFARI FINGERPRINT LOG -----');
                console.log(out);
                console.log('-----------------------------------');
              }
            }

            if (modelPlatformId) {
              await this.modelLimitService.increment(modelPlatformId);
            }

            scheduledCount++;
          }
        }

      return { ok: scheduledCount > 0, scheduledCount };
    } catch (err) {
      console.log('[startPostSafariFingerPrint] ❌ Exception:', err);
      throw err;
    }
  }
}
