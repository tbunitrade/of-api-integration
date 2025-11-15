import { Injectable } from '@nestjs/common';
import { PuppeteerUtil } from './utils/puppeteer-utils';
import { acceptCookie, loadCookiesFromFile } from "./utils/_functions/cookies-utils";
import * as _ from 'lodash';
import { CONFIG as DEFAULT_CONFIG } from './utils/config/step-config';
import { getRandomNumber } from 'src/cron/utils';

function checkIfExpired(numDays: number, scheduled_date: string): boolean {
  const now = new Date();
  const scheduled = new Date(scheduled_date);
  scheduled.setDate(scheduled.getDate() + numDays);
  return now > scheduled;
}

@Injectable()
export class PuppeteerMessageService {
  async startMessage(data: any, manualStart = false, waitForManualLogin = false) {
    console.log(`[PuppeteerMessage] start for modelPlatform id=${data.model_id}`);

    let scheduledCount = 0;

    const isExpired = checkIfExpired(data.number_of_days, data.scheduled_date);
    if (!isExpired && !manualStart) return false;

    const browser = new PuppeteerUtil();
    browser.initialize();
    browser.setConfig();

    try {
      await browser.openBrowser();
    } catch (err) {
      console.log('[PuppeteerMessage] Browser open error:', err);
      return false;
    }

    const cookieFileName = `user_${data.model_id}.${data.platform_id}`;
    await browser.openPage('https://onlyfans.com/my/chats/send');
    await acceptCookie.call(browser);

    try {
      await loadCookiesFromFile.call(browser, cookieFileName);
      await browser.reload();

      const isLoginPage = await browser.checkLogin();
      const cookiesAreValid = await browser.validateCookies();

      if (!cookiesAreValid || isLoginPage) {
        await browser.clearCookies();
        await browser.reload();
        await browser.login(data.username, data.password, cookieFileName, true, waitForManualLogin);
        console.log("[PuppeteerMessage] Bad cookies → re-login");
      } else {
        console.log("[PuppeteerMessage] Valid cookies → skip login");
      }
    } catch (e) {
      console.log(`[PuppeteerMessage] Failed load cookie "${cookieFileName}"`, e);
    }

    const isLoginPage = await browser.checkLogin();
    let repeatCount = 50;
    let loginTried = 0;

    while (repeatCount-- > 0) {
      try {
        let logged = false;

        if (!data.username) break;

        if (isLoginPage) {
          logged = await browser.login(data.username, data.password, cookieFileName, true, waitForManualLogin);
          loginTried++;
          if (loginTried >= 3) await browser.waitFor(200000);

          console.log('[PuppeteerMessage] Login required…');
        } else {
          console.log('[PuppeteerMessage] Already logged in');
          logged = true;
        }

        if (logged) {
          console.log('[PuppeteerMessage] Running message workflow…');

          const groups = data.groupsWithMessages;

          for (let i = 0; i < groups.length; i++) {
            let scheduledDate = new Date();
            if (data.scheduled_date && manualStart) {
              const tmp = new Date(data.scheduled_date);
              scheduledDate = tmp > new Date() ? tmp : new Date();
            }
            scheduledDate.setDate(scheduledDate.getDate() + i + 1);

            const group = groups[i];

            for (const msg of group.messages) {
              let _config = _.cloneDeep(DEFAULT_CONFIG);

              try {
                const [_hour, minutes] = msg.message_time?.split(':');
                const hour = parseInt(_hour) % 12 || 12;
                const suffix = parseInt(_hour) >= 12 ? 'pm' : 'am';

                let freePreview =
                  (msg.content?.split(',') || []).length <= msg.free_preview
                    ? msg.free_preview - 1
                    : msg.free_preview;

                freePreview = freePreview > 0 ? freePreview : 0;
                if (msg.price === 0) freePreview = 0;

                const msgData = {
                  message: msg.message,
                  message_month: scheduledDate.toLocaleString('default', { month: 'long' }).toLowerCase(),
                  message_date: scheduledDate.getDate().toString(),
                  message_hour: hour.toString(),
                  message_minute: minutes.toString(),
                  message_time_suffix: suffix,
                  message_list: msg.message_list,
                  message_exclude_list: msg.message_exclude_list,
                  release_form_tags: msg.release_form_tags,
                  release_user_tags: msg.release_user_tags,
                  content: msg.content,
                  message_price: msg.price,
                  free_preview: freePreview > 0 ? Array.from({ length: freePreview }, (_, k) => k + 1).join(',') : '',
                  idValue: data.username,
                  passwordValue: data.password,
                };

                const config = _config.work.map((c) => {
                  const step = { ...c };
                  if (step.key) {
                    step.value = step.value.replace('$value', msgData[step.key]);
                  }
                  return step;
                });

                await browser.work(config);

              } catch (err) {
                console.log('[PuppeteerMessage] Error:', err);
              }
            }

            scheduledCount++;
          }

          if (!waitForManualLogin) {
            await browser.closeBrowser();
          }
          return scheduledCount;
        }
      } catch (err) {
        console.log('[PuppeteerMessage] Error:', err);
      }
    }

    if (!waitForManualLogin) await browser.closeBrowser();

    return scheduledCount;
  }
}
