import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AutomateLoggerService } from './utils/automate-logger.service';
import { spawn } from 'child_process';

function buildSafariPayload(data: any, useFingerPrint = false) {
  const payload: Record<string, any> = {
    platform_id: data.platform_id,
    model_id: data.model_id,
  };

  // 🔐 Auth mode
  if (useFingerPrint) {
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

  const scheduledDate = data.scheduledDate
    ? new Date(data.scheduledDate)
    : new Date();

  const [_hour, minutes = '00'] = (times[0]?.time || '12:00').split(':');
  const hour = parseInt(_hour) % 12 || 12;
  const suffix = parseInt(_hour) >= 12 ? 'pm' : 'am';

  const caption = captions[0]?.caption || '';
  const file = files[0]?.url || '';

  // =====================================================
  // 🟦 Encode file to base64 for Safari drag&drop
  // =====================================================
  let contentBase64 = "";
  let fileName = "";
  let mime = "image/jpeg";

  if (file) {
    try {
      const absPath = path.join(
        process.cwd(),
        "uploads",
        file.replace(/^\/uploads\/?/, "")
      );

      const fileBuf = fs.readFileSync(absPath);
      contentBase64 = fileBuf.toString("base64");

      fileName = path.basename(absPath);

    } catch (e) {
      console.log("❌ Failed to load file for base64:", e);
    }
  }

  payload.postData = {
    content: file,
    content_base64: contentBase64,
    content_filename: fileName,
    content_mime: mime,
    message: caption,
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
  const cookiePath = path.join(
    basePath,
    `cookies/user_${modelId}_${platformId}_cookies.json`
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
  constructor(private readonly automateLogger: AutomateLoggerService) {}

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
  async startPostSafariFingerPrint(data: any) {
    console.log('[SafariPostService] startPostSafariFingerPrint()');

    try {
      const { basePath, pythonPath, scriptPath, cookiePath } = getSafariPaths(
        data.model_id,
        data.platform_id
      );

      const payload = buildSafariPayload(data, true);

      const logPath = path.join(
        basePath,
        `debug_log/debug_safari_fp_${Date.now()}.log`
      );

      const dir = path.dirname(logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let skipLogin = false;

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

      return { ok: true };
    } catch (err) {
      console.log('[startPostSafariFingerPrint] ❌ Exception:', err);
      throw err;
    }
  }
}
