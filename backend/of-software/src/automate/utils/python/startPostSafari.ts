import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';






function execPy(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
      if (error) {
        console.log('[startPostSafari] Error:', error.message);
        return reject(error);
      }
      if (stderr?.trim()) {
        console.log('[startPostSafari] stderr:', stderr);
      }
      resolve(stdout || '');
    });
  });
}


export async function startPostSafari(data: any) {
  try {
    const payload = JSON.stringify({
      email: data.username || 'test@example.com',
      password: data.password || '',
      platform_id: data.platform_id,
      model_id: data.model_id,
      caption: data.caption || 'Auto-post from Safari',
    });


    const pythonBin = 'sudo -u botuser /Users/oleksandrsonich/sites/joefans/backend/of-software/.venv/bin/python';
    const basePath =
      '/Users/oleksandrsonich/sites/joefans/backend/of-software/src/automate/utils/python';
    const cookiePath = path.resolve(
      basePath,
      `cookies/user_${data.model_id}_${data.platform_id}_cookies.json`,
    );


    // const loginCmd = `python3 ${basePath}/start_login_safari.py '${payload}'`;
    // const postCmd = `python3 ${basePath}/post_safari.py '${payload}'`;
    const loginCmd = `${pythonBin} ${basePath}/start_login_safari.py '${payload}'`;
    const postCmd  = `${pythonBin} ${basePath}/post_safari.py '${payload}'`;


    console.log('[startPostSafari] loginCmd:', loginCmd);
    console.log('[startPostSafari] postCmd:', postCmd);


    let skipLogin = false;


    // 1️⃣ Проверяем, есть ли cookies
    if (fs.existsSync(cookiePath)) {
      const stats = fs.statSync(cookiePath);
      const ageHours = (Date.now() - stats.mtimeMs) / 1000 / 60 / 60;
      if (ageHours < 48) {
        console.log(`[startPostSafari] 🍪 Cookies found (age: ${ageHours.toFixed(1)}h) — skip login`);
        skipLogin = true;
      } else {
        console.log('[startPostSafari] ⚠️ Cookies expired — will relogin');
      }
    }


    // 2️⃣ Логинимся только если нет актуальных cookies
    if (!skipLogin) {
      const loginOut = await execPy(loginCmd);
      console.log('[startPostSafari] login stdout:', loginOut.trim());
      await new Promise(r => setTimeout(r, 1500)); // небольшой буфер
    }


    // 3️⃣ Постим
    const postOut = await execPy(postCmd);
    console.log('[startPostSafari] post stdout:', postOut.trim());


    return { ok: true };
  } catch (err) {
    console.log('[startPostSafari] Exception', err);
    throw err;
  }
}

