import { Injectable } from '@nestjs/common';
import { PuppeteerUtil } from './utils/puppeteer-utils';
import { CONFIG, CONFIG as DEFAULT_CONFIG } from './utils/config/step-config';
import * as _ from 'lodash';
import { getRandomNumber } from 'src/cron/utils';
import { ModelPlatform } from 'src/modelPlatform/model_platform.entity';
import { PostFile } from 'src/postFile/post_file.entity';
import { Post } from 'src/post/post.entity';
import { acceptCookie, loadCookiesFromFile } from "./utils/_functions/cookies-utils";
import {ModelLimitService} from "./utils/model-limit.service";
import {AutomateLoggerService} from "./utils/automate-logger.service";
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/* Logic of login_captcha
The OnlyFans website has 2 captcha google recaptcha v2 and v3. (v2 enterprise, v3 enterprise)
At first when users try to login on the website the website tries to login with default v3 cookie from browser site Cookie.
If it fails then the website will be reloaded and at this time it shows google recaptcha v2 version.

Now we have to resolve 2 captchas (v2, v3)
First we have to resolve v3 and replace the e-recaptcha-response field with the result.
Next we have to resolve v2 and replace the ec-recaptcha-response field with the result.

And with these keys click login button.
*/

function execPy(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
      if (error) {
        console.log('[execPy] Error:', error.message);
        return reject(error);
      }
      if (stderr?.trim()) {
        console.log('[execPy] stderr:', stderr);
      }
      resolve(stdout || '');
    });
  });
}

function buildSafariPayload(data: any, useFingerPrint = false): string {
  const payload: Record<string, any> = {
    platform_id: data.platform_id,
    model_id: data.model_id,
    caption: data.caption || 'Auto-post from Safari',
  };
  if (useFingerPrint) {
    if (!data.fingerprint_username) {
      console.warn('⚠️ fingerprint_username is missing in data');
    } else {
      payload.fingerprint_username = data.fingerprint_username;
    }

  } else {
    if (!data.username || !data.password) {
      console.warn('⚠️ Missing email or password in data');
    }
    payload.email = data.username || 'test@example.com';
    payload.password = data.password || '';
  }
  return JSON.stringify(payload);
}

function getSafariPaths(modelId: any, platformId: any) {
  const basePath = path.resolve(__dirname, '../../../src/automate/utils/python');
  // ✅ Настоящий путь до python, без .venv
  const pythonBin = `sudo -u botuser ${basePath}/.venv/bin/python`;

  const cookiePath = path.resolve(
    basePath,
    `cookies/user_${modelId}_${platformId}_cookies.json`
  );
  return {
    basePath,
    pythonBin,
    cookiePath,
  };
}

const checkIfExpired = (
  numberOfDays: number,
  scheduled_date: string,
): boolean => {
  const currentDate = new Date();
  const scheduledDate = new Date(scheduled_date);
  scheduledDate.setDate(scheduledDate.getDate() + numberOfDays);
  return currentDate > scheduledDate;
};

@Injectable()
export class AutomateService {
  constructor(
    private readonly modelLimitService: ModelLimitService,
    private readonly automateLoggerService: AutomateLoggerService,
  ) {}

  async startPostSafari(data: any) {
    console.log('[AutomateService] startPostSafari()');

    try {
      await this.automateLoggerService.log({
        modelPlatformId: data.model_id,
        type: 'post',
        step: 'login',
        status: 'started',
        message: 'Safari automation started',
      });

      const { basePath, pythonBin, cookiePath } = getSafariPaths(data.model_id, data.platform_id);
      const payload = buildSafariPayload(data);
      const loginCmd = `${pythonBin} ${basePath}/start_login_safari.py '${payload}'`;

      let skipLogin = false;

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

      if (!skipLogin) {
        const loginOut = await execPy(loginCmd);
        console.log('[startPostSafari] login stdout:', loginOut.trim());
        await new Promise(r => setTimeout(r, 1500));
      }

      await this.automateLoggerService.log({
        modelPlatformId: data.model_id,
        type: 'post',
        step: 'posting',
        status: 'success',
        message: 'Safari automation completed successfully',
      });

      return { ok: true };
    } catch (error) {
      await this.automateLoggerService.log({
        modelPlatformId: data.model_id,
        type: 'post',
        step: 'posting',
        status: 'fail',
        message: error.message || 'Unknown error in startPostSafari',
      });

      throw error;
    }
  }

  async startPostSafariFingerPrint(data: any) {
    console.log('[AutomateService] startPostSafariFingerPrint()');

    try {
      const { basePath, pythonBin, cookiePath } = getSafariPaths(data.model_id, data.platform_id);
      const payload = buildSafariPayload(data, true);

      const logPath = path.join(basePath, `debug_log/debug_safari_login_${Date.now()}.log`);
      const loginCmd = `${pythonBin} ${basePath}/start_login_safari.py '${payload}' >> ${logPath} 2>&1`;

      console.log(`[pythonBin] ${pythonBin}`);
      console.log(`[basePath] ${basePath}`);
      console.log(`[loginCmd] ${loginCmd}`);
      console.log(`[logPath] ${logPath}`);

      let skipLogin = false;

      if (fs.existsSync(cookiePath)) {
        const stats = fs.statSync(cookiePath);
        const ageHours = (Date.now() - stats.mtimeMs) / 1000 / 60 / 60;
        if (ageHours < 48) {
          console.log(`[startPostSafariFingerPrint] 🍪 Cookies found (age: ${ageHours.toFixed(1)}h) — skip login`);
          skipLogin = true;
        } else {
          console.log('[startPostSafariFingerPrint] ⚠️ Cookies expired — will relogin');
        }
      }

      if (!skipLogin) {
        try {
          await execPy(loginCmd);
          console.log('[startPostSafariFingerPrint] ✅ Python script executed');
        } catch (err) {
          console.error('[startPostSafariFingerPrint] ❌ Python script failed');
        }

        await new Promise(r => setTimeout(r, 1000)); // Пауза, чтобы лог успел записаться

        if (fs.existsSync(logPath)) {
          const safariLog = fs.readFileSync(logPath, 'utf-8');
          console.log('📄 [Safari Log Output]');
          console.log('----------------------------');
          console.log(safariLog);
          console.log('----------------------------');
        } else {
          console.warn('⚠️ Log file not found after script execution');
        }
      }

      return { ok: true };
    } catch (error) {
      console.log('[startPostSafariFingerPrint] Exception', error);
      throw error;
    }
  }

  async startMessage(
    data: any = {},
    manualStart = false,
    waitForManualLogin = false ) {
    console.log(`[startMessage] start for modelPlatform id=${data.model_id}`);
    console.log('[startMessage] started startMessage');
    let scheduledCount = 0;
    try {
      const isExpired = checkIfExpired(data.number_of_days, data.scheduled_date);
      if (!isExpired && !manualStart) return false;

      const puppeteerUtil = new PuppeteerUtil();
      puppeteerUtil.initialize();
      puppeteerUtil.setConfig();

      console.log('>>> [startMessage] ENV.HEADLESS_MODE =', process.env.HEADLESS_MODE);
      console.log('>>> [startMessage] ENV.DISPLAY =', process.env.DISPLAY);
      console.log('>>> [startMessage] ENV.PUPPETEER_EXECUTABLE_PATH =', process.env.PUPPETEER_EXECUTABLE_PATH);

      try {
        await puppeteerUtil.openBrowser();
      } catch (error) {
        console.log('Error: ', error);
        return;
      }

      const cookieFileName = `user_${data.model_id}.${data.platform_id}`;
      await puppeteerUtil.openPage('https://onlyfans.com/my/chats/send');
      await acceptCookie.call(puppeteerUtil);

      try {
        await loadCookiesFromFile.call(puppeteerUtil, cookieFileName);
        await puppeteerUtil.reload();
        let isLoginPage = await puppeteerUtil.checkLogin();
        const cookiesAreValid = await puppeteerUtil.validateCookies();

        if (!cookiesAreValid || isLoginPage) {
          await puppeteerUtil.clearCookies();
          await puppeteerUtil.reload();
          await puppeteerUtil.login(data.username, data.password, cookieFileName,true, waitForManualLogin);
          console.log('🧁 Плохие куки, запускаем заново Логин без cookieFile');
        } else {
          console.log('✅ Cookie сработали');
        }
      } catch (err) {
        console.log(`Не удалось загрузить файл "${cookieFileName}", продолжим без него.`, err);
      }

      const isLoginPage = await puppeteerUtil.checkLogin();
      let repeatCount = 50;
      let loginTried = 0;

      while (1) {
        try {
          let _config = _.cloneDeep(DEFAULT_CONFIG);
          _config['model_id'] = data.model_id;
          _config['platform_id'] = data.platform_id;
          let isLoggedIn = false;

          if (!data.username) break;

          if (isLoginPage) {
            isLoggedIn = await puppeteerUtil.login(data.username, data.password, cookieFileName, true, waitForManualLogin);
            loginTried++;
            if (loginTried >= 3) await puppeteerUtil.waitFor(200000);

            console.log('[startMessage] ⚠️ Login required → вызываем login() с:', data.username, data.password, cookieFileName);
          } else {
            console.log('----------------- Login function startMessage Success -----------------');
            isLoggedIn = true;
          }

          if (isLoggedIn) {
            console.log('----------------- Start func startMessage cron -----------------');
            const groupsWithMessages = data.groupsWithMessages;

            for (let i = 0; i < groupsWithMessages.length; i++) {
              let scheduledDate = new Date();
              if (data.scheduled_date && manualStart)
                scheduledDate = new Date(data.scheduled_date) > new Date()
                  ? new Date(data.scheduled_date)
                  : new Date();
              else scheduledDate = new Date();
              scheduledDate.setDate(scheduledDate.getDate() + i + 1);

              const group = groupsWithMessages[i];
              for (let j = 0; j < group.messages.length; j++) {
                _config = _.cloneDeep(DEFAULT_CONFIG);
                try {
                  const msg = group.messages[j];
                  const [_hour, minutes] = msg.message_time?.split(':');
                  //const hour = ((parseInt(_hour) % 13) + parseInt(_hour) / 13) | 0;
                  const hour = parseInt(_hour) % 12 || 12;
                  const suffix = parseInt(_hour) >= 12 ? 'pm' : 'am';

                  let free_previews =
                    (msg.content?.split(',') || []).length <= msg.free_preview
                      ? msg.free_preview - 1
                      : msg.free_preview;
                  free_previews = free_previews > 0 ? free_previews : 0;
                  if (msg.price === 0) free_previews = 0;

                  const msgData = {
                    message: msg.message,
                    message_month: scheduledDate.toLocaleString('default', {
                      month: 'long',
                    }).toLowerCase(),
                    message_date: scheduledDate.getDate().toString(),
                    //message_date: new Date(scheduledDate).getDate(),
                    message_hour: hour.toString(),
                    message_minute: minutes.toString(),
                    message_time_suffix: suffix,
                    message_list: msg.message_list,
                    message_exclude_list: msg.message_exclude_list,
                    release_form_tags: msg.release_form_tags,
                    release_user_tags: msg.release_user_tags,
                    content: msg.content,
                    message_price: msg.price,
                    free_preview: free_previews > 0 ? Array.from({ length: free_previews }, (_, k) => k + 1).join(',') : '',
                    idValue: data.username,
                    passwordValue: data.password,
                  };

                  console.log('[startMessage] msgData:', msgData);

                  if (!msgData.message_date || typeof msgData.message_date !== 'string') {
                    console.warn('[startMessage] msgData[message_date] не строка или отсутствует:', msgData.message_date);
                  }
                  if (!msgData.message_hour || typeof msgData.message_hour !== 'string') {
                    console.warn('[startMessage] msgData[message_hour] не строка или отсутствует:', msgData.message_hour);
                  }
                  if (!msgData.release_form_tags || typeof msgData.release_form_tags !== 'string') {
                    console.warn('[startMessage] value не строка для key "release_form_tags":', msgData.release_form_tags);
                  }

                  const config = _config.work.map((c) => {
                    if (c['key']) {
                      c.value = c.value.replace('$value', msgData[c['key']]);
                    }
                    return { ...c };
                  });
                  console.log('[startMessage] Генерируем конфиг на основе msgData:', msgData);
                  console.log('[startMessage] Первый шаг конфига:', config[0]);
                  await puppeteerUtil.work(config);
                } catch (error) {
                  console.log('Error : ', error);
                  //continue;
                }
              }
              scheduledCount++;
              if (i === groupsWithMessages.length - 1 && scheduledCount !== groupsWithMessages.length) {
                scheduledCount = groupsWithMessages.length;
              }
            }

            console.log('[startMessage] Work Finished');
            if (!waitForManualLogin) {
              await puppeteerUtil.closeBrowser();
            } else {
              console.log('🟡 Browser kept open after startMessage');
            }

            return scheduledCount;
          } else {
            //continue;
          }
        } catch (error) {
          console.log('Error: ', error);
          repeatCount--;
          if (repeatCount < 0) break;
          //continue;
        }
      }
      //await puppeteerUtil.closeBrowser();

      if ( !waitForManualLogin ) {
        await puppeteerUtil.closeBrowser();
      }
      return scheduledCount;
    } catch (err) {
      console.error('Error: ', err);
      return false;
    }
  }



  async startPost(
    allData: {
      modelPlatform: ModelPlatform;
      postWithTimesAndCaptions: Post;
      postFiles: PostFile[];
      scheduledDate: string;
      numberOfDays: number;
      prokey: string;
    },
    manualStart = false,
    waitForManualLogin = false

  ) {
    let scheduledCount = 0;
    const {
      modelPlatform,
      postWithTimesAndCaptions,
      postFiles,
      scheduledDate,
      numberOfDays,
      prokey,
    } = allData;
    try {
      console.log('[startPost] started startPost');
      const puppeteerUtil = new PuppeteerUtil();
      puppeteerUtil.initialize();
      puppeteerUtil.setConfig();

      console.log('>>> [startPost] ENV.HEADLESS_MODE =', process.env.HEADLESS_MODE);

      try {
        await puppeteerUtil.openBrowser();
      } catch (error) {
        console.log('Error: ', error);
        return;
      }
      const cookieFileName = `user_${modelPlatform.model_id}.${modelPlatform.platform_id}`;
      console.log('Check file before start Autopost cookieFileName', cookieFileName);
      await puppeteerUtil.openPage('https://onlyfans.com/posts/create');
      await acceptCookie.call(puppeteerUtil);

      try {
        await loadCookiesFromFile.call(puppeteerUtil, cookieFileName);
        ///delete
        await puppeteerUtil.reload();
        let isLoginPage = await puppeteerUtil.checkLogin();
        const cookiesAreValid = await puppeteerUtil.validateCookies();

        if (!cookiesAreValid || isLoginPage) {
          await puppeteerUtil.clearCookies();
          await puppeteerUtil.reload();
          await puppeteerUtil.login(modelPlatform.username, modelPlatform.password, cookieFileName, true,waitForManualLogin);
          console.log('🧁 Плохие куки, вошли вручную');
        } else {
          console.log('✅ Cookie сработали, логин не нужен');
        }

      } catch (err) {
        console.log(`Не удалось загрузить файл "${cookieFileName}", продолжим без него.`, err);
      }

      const isLoginPage = await puppeteerUtil.checkLogin();
      let repeatCount = 20;
      let loginTried = 0;

      while (1) {
        try {
          console.log('Start while in startPost ');
          let _config = _.cloneDeep(DEFAULT_CONFIG);
          _config['model_id'] = modelPlatform.model_id;
          _config['platform_id'] = modelPlatform.platform_id;
          let isLoggedIn = false;
          if (!modelPlatform.username) break;

          if (isLoginPage) {

            console.log('in startPost isLoginPage -> ',isLoginPage);
            let _config = _.cloneDeep(CONFIG);
            _config['model_id'] = modelPlatform.model_id;
            _config['platform_id'] = modelPlatform.platform_id;
            _config.login.idValue = _config.login.idValue.replace('$value', modelPlatform.username);
            _config.login.passwordValue = _config.login.passwordValue.replace('$value', modelPlatform.password);

            //console.log('03 [startMessage] ⚠️ Login required → вызываем login() с:', data.username, data.password, cookieFileName);
            console.log('03 [startPost] ⚠️ Login required → вызываем login() с:', modelPlatform.username, modelPlatform.password ? '***' : '', cookieFileName);

            if (prokey) {
              _config.login_captcha_extension.proKey =
                _config.login_captcha_extension.proKey.replace('$value', prokey);
              console.log('current pro key -> ',prokey);
            } else {
              console.log('no pro key -> ',prokey);
            }

            isLoggedIn = await puppeteerUtil.login( modelPlatform.username,  modelPlatform.password, cookieFileName, true,waitForManualLogin );
            loginTried++;
            if (loginTried >= 3) await puppeteerUtil.waitFor(300000);
          } else {
            console.log('----------------- Login function startPost Success -----------------');
            isLoggedIn = true;
          }

          if (isLoggedIn) {
            console.log('----------------- Start function startPost cron -----------------');

            const postCaptions = postWithTimesAndCaptions.captions || [];
            let captionIndexes = Array.from(
              { length: postCaptions.length || 0 },
              (_, i) => i,
            );

            let fileIndexes = Array.from(
              { length: postFiles.length || 0 },
              (_, i) => i,
            );

            const baseDate = manualStart && scheduledDate
              ? new Date(scheduledDate)
              : new Date(); // текущая дата

            for (let i = 0; i < numberOfDays; i++) {

              // каждый день — отдельная копия baseDate
              const scheduledDt = new Date(baseDate);
              const postTimesCount = postWithTimesAndCaptions.post_times.length;

              scheduledDt.setDate(baseDate.getDate() + i); // today + i дней
              console.log(`[startPost] День #${i} → scheduledDt: ${scheduledDt.toISOString()}`);

              for (let j = 0; j < postWithTimesAndCaptions.post_times.length; j++) {
                 console.log('start for postWithTimesAndCaptions');
                try {
                  if (captionIndexes.length === 0) {
                    captionIndexes = Array.from(
                      { length: postCaptions.length || 0 },
                      (_, ii) => ii,
                    );
                  }
                  if (fileIndexes.length === 0) {
                    fileIndexes = Array.from(
                      { length: postFiles.length || 0 },
                      (_, ii) => ii,
                    );
                  }
                  _config = _.cloneDeep(DEFAULT_CONFIG);
                  const timeIndex = j % postTimesCount; // всегда от 0..postTimesCount-1
                  const postTime = postWithTimesAndCaptions.post_times[timeIndex];
                  if (!postTime) continue;
                  const [_hour, minutes, secs] = postTime.time?.split(':');
                  //const hour =((parseInt(_hour) % 13) + parseInt(_hour) / 13) | 0;
                  const hour = parseInt(_hour) % 12 || 12;
                  const suffix = parseInt(_hour) >= 12 ? 'pm' : 'am';
                  const randNumber = getRandomNumber(fileIndexes.length ?? 0);
                  const postFile = postFiles[fileIndexes[randNumber]]?.url;
                  fileIndexes.splice(randNumber, 1);
                  let postCaption = {
                    caption: null,
                  };
                  if (postCaptions.length === 0) {
                    postCaption.caption = '';
                  } else {
                    const randNC = getRandomNumber(captionIndexes.length ?? 0);
                    postCaption = postCaptions[captionIndexes[randNC]];
                    captionIndexes.splice(randNC, 1);
                  }

                  const msgData = {
                    content: postFile,
                    message: postCaption.caption,
                    message_month: scheduledDt.toLocaleString('default', {
                      month: 'long',
                    }).toLowerCase(),
                    //message_date: scheduledDt.getDate(),
                    message_date: scheduledDt.getDate().toString(),
                    message_hour: hour.toString(),
                    message_minute: minutes.toString(),
                    message_time_suffix: suffix,
                    release_user_tags: postWithTimesAndCaptions.user_tags || '',
                    release_form_tags: postWithTimesAndCaptions.form_tags || '',
                    idValue: modelPlatform.username,
                    passwordValue: modelPlatform.password,
                  };

                  //console.log('[startPost] msgData:', msgData);

                  if (!msgData.message_date || typeof msgData.message_date !== 'string') {
                    console.warn('[startPost] msgData[message_date] не строка или отсутствует:', msgData.message_date);
                  }
                  if (!msgData.message_hour || typeof msgData.message_hour !== 'string') {
                    console.warn('[startPost] msgData[message_hour] не строка или отсутствует:', msgData.message_hour);
                  }
                  if (!msgData.release_form_tags || typeof msgData.release_form_tags !== 'string') {
                    console.warn('[startPost] value не строка для key "release_form_tags":', msgData.release_form_tags);
                  }

                  const config = _config.post.map((c) => {
                    const stepCopy = { ...c };

                    if (stepCopy.key) {
                      const val = msgData[stepCopy.key];

                      if (typeof val === 'string') {
                        if (typeof stepCopy.value === 'string') {
                          stepCopy.value = stepCopy.value.replace('$value', val || '');
                        } else {
                          console.warn(`[startPost] value не строка для key "${stepCopy.key}":`, stepCopy.value);
                        }
                      } else {
                        console.warn(`[startPost] msgData[${stepCopy.key}] не строка или отсутствует:`, val);
                      }
                    }

                    return stepCopy;
                  });

                  //console.log('[startPost] postCaptions:', postCaptions);
                  //console.log('[startPost] msgData:', msgData);
                  //console.log('[startPost] config before patching:', _config.post);

                  //console.log('[startPost] Генерируем конфиг на основе msgData:', msgData);
                  //console.log('[startPost] Первый шаг конфига:', config[0]);
                  await puppeteerUtil.work(config);
                } catch (error) {
                  console.log('Error : ', error);
                  //continue;
                }
              }
              scheduledCount++;
              if (i === numberOfDays - 1 && scheduledCount !== numberOfDays) {
                scheduledCount = numberOfDays;
                console.log(' scheduledCount++;',  scheduledCount);
              }
            }

            console.log('Work Finished');
            if ( !waitForManualLogin ) {
              await puppeteerUtil.closeBrowser();
            } else {
              console.log('🟡 Browser kept open after startMessage');
            }
            return scheduledCount;
          } else {
            repeatCount--;
            if (repeatCount < 0) break;
            //continue;
          }
        } catch (error) {
          console.log('Error: ', error);
          repeatCount--;
          if (repeatCount < 0) break;
          //continue;
        }
      }
      if ( !waitForManualLogin ) {
        await puppeteerUtil.closeBrowser();
      } else {
        console.log('🟡 Browser kept open after startMessage');
      }
      return scheduledCount;
    } catch (err) {
      console.error('Error: ', err);
      return 0;
    }
  }


  async testLogin( keepBrowserOpen = true) {
    const puppeteerUtil = new PuppeteerUtil();
    puppeteerUtil.initialize();
    puppeteerUtil.setConfig();

    const username = 'mail@s.com';
    const password = 'тут_введи_пароль';
    //const prokey = ''; // если капча нужна — сюда ключ

    console.log('[TEST LOGIN] Стартуем Puppeteer...');
    await puppeteerUtil.openBrowser(); // показываем браузер (не headless)
    await puppeteerUtil.openPage('https://onlyfans.com/my/chats/send');
    await puppeteerUtil.acceptCookie();

    const config = _.cloneDeep(CONFIG);
    config.login.idValue = config.login.idValue.replace('$value', username);
    config.login.passwordValue = config.login.passwordValue.replace('$value', password);

    // if (prokey) {
    //   config.login_captcha_extension.proKey = config.login_captcha_extension.proKey.replace('$value', prokey);
    // }

    console.log('[TEST LOGIN] Пытаемся войти...');
    const cookieFileName = 'user_12.1_cookie.json';
    const isLoggedIn = await puppeteerUtil.login(username,password, cookieFileName, true);

    if (isLoggedIn) {
      console.log('[✅ LOGIN OK]');
    } else {
      console.log('[❌ LOGIN FAILED]');
    }

    await puppeteerUtil.waitFor(10000); // подождать 10 сек, чтобы успеть увидеть
    //if ( !waitForManualLogin ) {
      console.log('🟡 Browser  be closed');
      await puppeteerUtil.closeBrowser();
    //} else {
      console.log('🟡 Browser kept open after startMessage');
    //}
  }
}
