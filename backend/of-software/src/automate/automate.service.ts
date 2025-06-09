import { Injectable } from '@nestjs/common';
import { PuppeteerUtil } from './utils/puppeteer-utils';
import {CONFIG, CONFIG as DEFAULT_CONFIG} from './utils/config/step-config';
import * as _ from 'lodash';
import testRecaptchaSolver from './utils/test-recaptcha-solver';
import { getRandomNumber } from 'src/cron/utils';
import { ModelPlatform } from 'src/modelPlatform/model_platform.entity';
import { PostTime } from 'src/postTime/post_time.entity';
import { PostFile } from 'src/postFile/post_file.entity';
import { Post } from 'src/post/post.entity';
import {acceptCookie, loadCookiesFromFile} from "./utils/_functions/cookies-utils";

/* Logic of login_captcha
The OnlyFans website has 2 captcha google recaptcha v2 and v3. (v2 enterprise, v3 enterprise)
At first when users try to login on the website the website tries to login with default v3 cookie from browser site Cookie.
If it fails then the website will be reloaded and at this time it shows google recaptcha v2 version.

Now we have to resolve 2 captchas (v2, v3)
First we have to resolve v3 and replace the e-recaptcha-response field with the result.
Next we have to resolve v2 and replace the ec-recaptcha-response field with the result.

And with these keys click login button.
*/

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
  constructor() {}

  async startMessage(data: any = {}, manualStart = false) {
    console.log('start function startMessage');
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
            isLoggedIn = await puppeteerUtil.login(data.username, data.password, cookieFileName);
            loginTried++;
            if (loginTried >= 3) await puppeteerUtil.waitFor(200000);
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
                  const hour = ((parseInt(_hour) % 13) + parseInt(_hour) / 13) | 0;
                  const suffix = parseInt(_hour) >= 12 ? 'pm' : 'am';

                  let free_previews =
                    (msg.content?.split(',') || []).length <= msg.free_preview
                      ? msg.free_preview - 1
                      : msg.free_preview;
                  free_previews = free_previews > 0 ? free_previews : 0;
                  if (msg.price === 0) free_previews = 0;

                  const msgData = {
                    message: msg.message,
                    message_month: scheduledDate.toLocaleString('default', { month: 'long' }),
                    message_date: scheduledDate.getDate(),
                    message_hour: hour,
                    message_minute: minutes,
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

                  const config = _config.work.map((c) => {
                    if (c['key']) {
                      c.value = c.value.replace('$value', msgData[c['key']]);
                    }
                    return { ...c };
                  });

                  await puppeteerUtil.work(config);
                } catch (error) {
                  console.log('Error : ', error);
                  continue;
                }
              }
              scheduledCount++;
              if (i === groupsWithMessages.length - 1 && scheduledCount !== groupsWithMessages.length) {
                scheduledCount = groupsWithMessages.length;
              }
            }

            console.log('Work Finished');
            await puppeteerUtil.closeBrowser();
            return scheduledCount;
          } else {
            continue;
          }
        } catch (error) {
          console.log('Error: ', error);
          repeatCount--;
          if (repeatCount < 0) break;
          continue;
        }
      }
      await puppeteerUtil.closeBrowser();
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
      console.log('start function startPost');
      const puppeteerUtil = new PuppeteerUtil();
      puppeteerUtil.initialize();
      puppeteerUtil.setConfig();

      console.log('>>> [startPost] ENV.HEADLESS_MODE =', process.env.HEADLESS_MODE);
      console.log('>>> [startPost] ENV.DISPLAY      =', process.env.DISPLAY);
      console.log('>>> [startPost] ENV.PUPPETEER_EXECUTABLE_PATH =', process.env.PUPPETEER_EXECUTABLE_PATH);

      const headless = !manualStart;
      await puppeteerUtil.openBrowser();
      //const cookieFileName = 'user_' + modelPlatform.model_id + '.' + modelPlatform.platform_id + '.json';
      const cookieFileName = `user_${modelPlatform.model_id}.${modelPlatform.platform_id}.json`;
      console.log('Check file before start Autopost cookieFileName', cookieFileName);
      await puppeteerUtil.openPage('https://onlyfans.com/posts/create');
      await acceptCookie.call(puppeteerUtil);

      try {
        await loadCookiesFromFile.call(puppeteerUtil, cookieFileName);
        await puppeteerUtil.reload();
        const isLoginPage = await puppeteerUtil.checkLogin();
        if (isLoginPage) {
          await puppeteerUtil.login(modelPlatform.username, modelPlatform.password, cookieFileName);
          console.log('[AUTOMATE] Login вызван, ожидаем файл:', cookieFileName);
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
          let _config = _.cloneDeep(DEFAULT_CONFIG);
          _config['model_id'] = modelPlatform.model_id;
          _config['platform_id'] = modelPlatform.platform_id;
          let isLoggedIn = false;
          if (!modelPlatform.username) break;

          if (isLoginPage) {
            let _config = _.cloneDeep(CONFIG);
            _config['model_id'] = modelPlatform.model_id;
            _config['platform_id'] = modelPlatform.platform_id;
            _config.login.idValue = _config.login.idValue.replace('$value', modelPlatform.username);
            _config.login.passwordValue = _config.login.passwordValue.replace('$value', modelPlatform.password);
            if (prokey) {
              _config.login_captcha_extension.proKey =
                _config.login_captcha_extension.proKey.replace('$value', prokey);
            }

            isLoggedIn = await puppeteerUtil.login(
              modelPlatform.username,
              modelPlatform.password,
              cookieFileName
            );
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

            for (let i = 0; i < numberOfDays; i++) {
              let scheduledDt = new Date();
              if (scheduledDate && manualStart)
                scheduledDt =
                  manualStart && new Date(scheduledDate) > new Date()
                    ? new Date(scheduledDate)
                    : new Date();
              else {
                scheduledDt = new Date();
              }
              scheduledDt.setDate(scheduledDt.getDate() + i + 1);

              for (let j = 0; j < postWithTimesAndCaptions.post_times.length; j++) {
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
                  const postTime = postWithTimesAndCaptions.post_times[j];
                  if (!postTime) continue;
                  const [_hour, minutes, secs] = postTime.time?.split(':');
                  const hour =
                    ((parseInt(_hour) % 13) + parseInt(_hour) / 13) | 0;
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
                    }),
                    message_date: scheduledDt.getDate(),
                    message_hour: hour,
                    message_minute: minutes,
                    message_time_suffix: suffix,
                    release_user_tags: postWithTimesAndCaptions.user_tags || '',
                    release_form_tags: postWithTimesAndCaptions.form_tags || '',
                    idValue: modelPlatform.username,
                    passwordValue: modelPlatform.password,
                  };

                  const config = _config.post.map((c) => {
                    if (c['key']) {
                      c.value = c.value.replace('$value', msgData[c['key']]);
                    }
                    return { ...c };
                  });

                  await puppeteerUtil.work(config);
                } catch (error) {
                  console.log('Error : ', error);
                  continue;
                }
              }
              scheduledCount++;
              if (i === numberOfDays - 1 && scheduledCount !== numberOfDays) {
                scheduledCount = numberOfDays;
              }
            }

            console.log('Work Finished');
            await puppeteerUtil.closeBrowser();
            return scheduledCount;
          } else {
            repeatCount--;
            if (repeatCount < 0) break;
            continue;
          }
        } catch (error) {
          console.log('Error: ', error);
          repeatCount--;
          if (repeatCount < 0) break;
          continue;
        }
      }
      await puppeteerUtil.closeBrowser();
      return scheduledCount;
    } catch (err) {
      console.error('Error: ', err);
      return 0;
    }
  }


  async testLogin() {
    const puppeteerUtil = new PuppeteerUtil();
    puppeteerUtil.initialize();
    puppeteerUtil.setConfig();

    const username = 'mail@frontporchswingers.com';
    const password = 'тут_введи_пароль';
    const prokey = ''; // если капча нужна — сюда ключ

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
    //const isLoggedIn = await puppeteerUtil.login(config);
    const cookieFileName = 'user_12.1_cookie.json';
    const isLoggedIn = await puppeteerUtil.login(username,password, cookieFileName);

    if (isLoggedIn) {
      console.log('[✅ LOGIN OK]');
    } else {
      console.log('[❌ LOGIN FAILED]');
    }

    await puppeteerUtil.waitFor(10000); // подождать 10 сек, чтобы успеть увидеть
    await puppeteerUtil.closeBrowser();
  }
}
