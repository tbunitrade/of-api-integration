import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { AutomateLoggerService } from './utils/automate-logger.service';

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
  logPath?: string,
) {
  return new Promise((resolve, reject) => {
    const args = ['-u', scriptPath, JSON.stringify(payload)];

    const child = spawn(
      'sudo',
      ['-u', 'botuser', pythonPath, ...args],
      logPath ? { stdio: ['ignore', 'pipe', 'pipe'] } : { stdio: 'inherit' },
    );

    let logStream = null;
    if (logPath) logStream = fs.createWriteStream(logPath, { flags: 'a' });

    if (logStream) {
      child.stdout.pipe(logStream);
      child.stderr.pipe(logStream);
    }

    child.on('error', reject);

    child.on('close', (code) => {
      if (code === 0) resolve(true);
      else reject(new Error(`Safari message python exited with code ${code}`));
    });
  });
}

function buildSafariPayloadMessage(data: any, useFingerPrint = false) {
  const payload: Record<string, any> = {
    platform_id: data.platform_id,
    model_id: data.model_id,
    mode: 'message',
  };

  // Авторизация Safari в режиме TouchID / Email+Password
  if (useFingerPrint) {
    payload.fingerprint_username = data.fingerprint_username;
  } else {
    payload.email = data.username;
    payload.password = data.password;
  }

  // Формируем msgData для дальнейшего Python-потока (если понадобится)
  payload.msgData = {
    username: data.username,
    platformId: data.platform_id,
    modelId: data.model_id,
    scheduledDate: data.scheduled_date,
  };

  return payload;
}

@Injectable()
export class SafariMessageService {
  constructor(private readonly logService: AutomateLoggerService) {}

  // ===========================================================================================
  // 🟦 1) Обычный Safari login → message automation (email + password)
  // ===========================================================================================
  async startMessageSafari(data: any) {
    console.log('[SafariMessageService] startMessageSafari()');

    try {
      const { basePath, pythonPath, scriptPath, cookiePath } = getSafariPaths(
        data.model_id,
        data.platform_id,
      );

      const payload = buildSafariPayloadMessage(data, false);

      const logPath = path.join(
        basePath,
        `debug_log/debug_safari_message_${Date.now()}.log`,
      );

      const dir = path.dirname(logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let skipLogin = false;

      // Проверяем куки
      if (fs.existsSync(cookiePath)) {
        const ageH =
          (Date.now() - fs.statSync(cookiePath).mtimeMs) / 1000 / 60 / 60;

        if (ageH < 48) {
          console.log(
            `[SafariMessage] 🍪 Cookies age ${ageH.toFixed(
              1,
            )}h → skip Safari message login`,
          );
          skipLogin = true;
        } else {
          console.log('[SafariMessage] ⚠️ Cookies expired — relogin required');
        }
      }

      // Safari login (password mode)
      if (!skipLogin) {
        console.log('[SafariMessage] Running Safari email login…');

        await runPythonAsBotUser(pythonPath, scriptPath, payload, logPath);

        await new Promise((r) => setTimeout(r, 1500));

        if (fs.existsSync(logPath)) {
          const logContent = fs.readFileSync(logPath, 'utf8');
          console.log('--------- SAFARI MESSAGE LOGIN LOG ---------');
          console.log(logContent);
          console.log('--------------------------------------------');
        }
      }

      await this.logService.log({
        modelPlatformId: data.model_id,
        type: 'message',
        step: 'login',
        status: 'success',
        message: 'Safari message login completed',
      });

      return { ok: true };
    } catch (err) {
      console.log('[SafariMessageService] ❌ ERROR:', err);

      await this.logService.log({
        modelPlatformId: data.model_id,
        type: 'message',
        step: 'login',
        status: 'fail',
        message: err.message || 'Unknown Safari message login error',
      });

      throw err;
    }
  }

  // ===========================================================================================
  // 🟧 2) Safari FingerPrint login (TouchID / FaceID / uXXXXXX login)
  // ===========================================================================================
  async startMessageSafariFingerPrint(data: any) {
    console.log('[SafariMessageService] startMessageSafariFingerPrint()');

    try {
      const { basePath, pythonPath, scriptPath, cookiePath } = getSafariPaths(
        data.model_id,
        data.platform_id,
      );

      const payload = buildSafariPayloadMessage(data, true);

      const logPath = path.join(
        basePath,
        `debug_log/debug_safari_message_fp_${Date.now()}.log`,
      );

      let skipLogin = false;

      // Проверка cookies
      if (fs.existsSync(cookiePath)) {
        const ageH =
          (Date.now() - fs.statSync(cookiePath).mtimeMs) / 1000 / 60 / 60;

        if (ageH < 48) {
          console.log(
            `[SafariMessage FP] 🍪 Cookies age ${ageH.toFixed(
              1,
            )}h → skip fingerprint login`,
          );
          skipLogin = true;
        }
      }

      // Fingerprint login если нет валидных cookie
      if (!skipLogin) {
        console.log('[SafariMessage FP] Running TouchID/FaceID login…');

        await runPythonAsBotUser(pythonPath, scriptPath, payload, logPath);

        await new Promise((r) => setTimeout(r, 1500));

        if (fs.existsSync(logPath)) {
          const out = fs.readFileSync(logPath, 'utf8');
          console.log('--------- SAFARI MESSAGE FP LOG ---------');
          console.log(out);
          console.log('-----------------------------------------');
        }
      }

      return { ok: true };
    } catch (err) {
      console.log('[startMessageSafariFingerPrint] ❌ ERROR:', err);
      throw err;
    }
  }
}
