import { exec } from 'child_process';

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

    const loginCmd = `python3 /Users/oleksandrsonich/sites/joefans/backend/of-software/src/automate/utils/python/start_login_safari.py '${payload}'`;
    const postCmd  = `python3 /Users/oleksandrsonich/sites/joefans/backend/of-software/src/automate/utils/python/post_safari.py '${payload}'`;

    console.log('[startPostSafari] loginCmd:', loginCmd);
    console.log('[startPostSafari] postCmd:', postCmd);

    // 1) логин
    const loginOut = await execPy(loginCmd);
    console.log('[startPostSafari] login stdout:', loginOut.trim());

    // небольшой буфер — чтобы страница проглотила редирект после логина
    await new Promise(r => setTimeout(r, 1500));

    // 2) пост
    const postOut = await execPy(postCmd);
    console.log('[startPostSafari] post stdout:', postOut.trim());

    return { ok: true };
  } catch (err) {
    console.log('[startPostSafari] Exception', err);
    throw err;
  }
}
