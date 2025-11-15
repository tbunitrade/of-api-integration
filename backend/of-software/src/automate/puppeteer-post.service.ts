import { Injectable } from '@nestjs/common';
import { PuppeteerUtil } from './utils/puppeteer-utils';
import { acceptCookie, loadCookiesFromFile } from './utils/_functions/cookies-utils';
import * as _ from 'lodash';
import { CONFIG, CONFIG as DEFAULT_CONFIG } from './utils/config/step-config';
import { getRandomNumber } from 'src/cron/utils';
import { ModelPlatform } from 'src/modelPlatform/model_platform.entity';
import { PostFile } from 'src/postFile/post_file.entity';
import { Post } from 'src/post/post.entity';

function checkIfExpired(numDays: number, scheduledDate: string): boolean {
  const now = new Date();
  const scheduled = new Date(scheduledDate);
  scheduled.setDate(scheduled.getDate() + numDays);
  return now > scheduled;
}

@Injectable()
export class PuppeteerPostService {
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
    console.log('[PuppeteerPost] started startPost');

    const {
      modelPlatform,
      postWithTimesAndCaptions,
      postFiles,
      scheduledDate,
      numberOfDays,
      prokey,
    } = allData;

    let scheduledCount = 0;

    const puppeteer = new PuppeteerUtil();
    puppeteer.initialize();
    puppeteer.setConfig();

    try {
      await puppeteer.openBrowser();
    } catch (error) {
      console.log('[PuppeteerPost] Browser open error:', error);
      return 0;
    }

    const cookieFileName = `user_${modelPlatform.model_id}.${modelPlatform.platform_id}`;

    await puppeteer.openPage('https://onlyfans.com/posts/create');
    await acceptCookie.call(puppeteer);

    try {
      await loadCookiesFromFile.call(puppeteer, cookieFileName);

      await puppeteer.reload();

      const isLoginPage = await puppeteer.checkLogin();
      const cookiesAreValid = await puppeteer.validateCookies();

      if (!cookiesAreValid || isLoginPage) {
        await puppeteer.clearCookies();
        await puppeteer.reload();
        await puppeteer.login(
          modelPlatform.username,
          modelPlatform.password,
          cookieFileName,
          true,
          waitForManualLogin
        );
        console.log('[PuppeteerPost] Bad cookies → login again');
      } else {
        console.log('[PuppeteerPost] Cookies OK → skip login');
      }
    } catch (err) {
      console.log(`[PuppeteerPost] Could not load cookie ${cookieFileName}`, err);
    }

    const isLoginPage = await puppeteer.checkLogin();
    let repeat = 20;
    let loginAttempts = 0;

    while (repeat-- > 0) {
      try {
        let loggedIn = false;

        if (isLoginPage) {
          console.log('[PuppeteerPost] Login required…');

          let cfg = _.cloneDeep(CONFIG);
          cfg['model_id'] = modelPlatform.model_id;
          cfg['platform_id'] = modelPlatform.platform_id;
          cfg.login.idValue = cfg.login.idValue.replace('$value', modelPlatform.username);
          cfg.login.passwordValue = cfg.login.passwordValue.replace('$value', modelPlatform.password);

          if (prokey) {
            cfg.login_captcha_extension.proKey =
              cfg.login_captcha_extension.proKey.replace('$value', prokey);
            console.log('[PuppeteerPost] Using prokey:', prokey);
          } else {
            console.log('[PuppeteerPost] No prokey provided');
          }

          loggedIn = await puppeteer.login(
            modelPlatform.username,
            modelPlatform.password,
            cookieFileName,
            true,
            waitForManualLogin
          );

          loginAttempts++;
          if (loginAttempts >= 3) await puppeteer.waitFor(300000);
        } else {
          console.log('[PuppeteerPost] Already logged in');
          loggedIn = true;
        }

        if (loggedIn) {
          console.log('[PuppeteerPost] Running POST workflow…');

          const postCaptions = postWithTimesAndCaptions.captions || [];
          let captionIndexes = Array.from({ length: postCaptions.length }, (_, i) => i);

          let fileIndexes = Array.from({ length: postFiles.length }, (_, i) => i);

          const baseDate =
            manualStart && scheduledDate ? new Date(scheduledDate) : new Date();

          for (let i = 0; i < numberOfDays; i++) {
            const scheduledDt = new Date(baseDate);
            const totalTimes = postWithTimesAndCaptions.post_times.length;
            scheduledDt.setDate(baseDate.getDate() + i);

            console.log(`[PuppeteerPost] Day #${i} → ${scheduledDt.toISOString()}`);

            for (let j = 0; j < totalTimes; j++) {
              try {
                if (captionIndexes.length === 0)
                  captionIndexes = Array.from({ length: postCaptions.length }, (_, i) => i);

                if (fileIndexes.length === 0)
                  fileIndexes = Array.from({ length: postFiles.length }, (_, i) => i);

                let cfg = _.cloneDeep(DEFAULT_CONFIG);

                const timeIndex = j % totalTimes;
                const postTime = postWithTimesAndCaptions.post_times[timeIndex];
                if (!postTime) continue;

                const [_hour, minutes] = postTime.time?.split(':');
                const hour = parseInt(_hour) % 12 || 12;
                const suffix = parseInt(_hour) >= 12 ? 'pm' : 'am';

                const randFileIdx = getRandomNumber(fileIndexes.length);
                const postFile = postFiles[fileIndexes[randFileIdx]]?.url;
                fileIndexes.splice(randFileIdx, 1);

                let captionObj = { caption: '' };
                if (postCaptions.length > 0) {
                  const randCaptionIdx = getRandomNumber(captionIndexes.length);
                  captionObj = postCaptions[captionIndexes[randCaptionIdx]];
                  captionIndexes.splice(randCaptionIdx, 1);
                }

                const msgData = {
                  content: postFile,
                  message: captionObj.caption,
                  message_month: scheduledDt.toLocaleString('default', { month: 'long' }).toLowerCase(),
                  message_date: scheduledDt.getDate().toString(),
                  message_hour: hour.toString(),
                  message_minute: minutes.toString(),
                  message_time_suffix: suffix,
                  release_user_tags: postWithTimesAndCaptions.user_tags || '',
                  release_form_tags: postWithTimesAndCaptions.form_tags || '',
                  idValue: modelPlatform.username,
                  passwordValue: modelPlatform.password,
                };

                const config = cfg.post.map((step) => {
                  const s = { ...step };
                  if (s.key) {
                    const val = msgData[s.key];
                    if (typeof val === 'string') {
                      s.value = s.value.replace('$value', val);
                    }
                  }
                  return s;
                });

                await puppeteer.work(config);
              } catch (err) {
                console.log('[PuppeteerPost] Error:', err);
              }
            }

            scheduledCount++;
          }

          if (!waitForManualLogin) await puppeteer.closeBrowser();

          return scheduledCount;
        }
      } catch (err) {
        console.log('[PuppeteerPost] Error:', err);
      }
    }

    if (!waitForManualLogin) await puppeteer.closeBrowser();

    return scheduledCount;
  }
}
