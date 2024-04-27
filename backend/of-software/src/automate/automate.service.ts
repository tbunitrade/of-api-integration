import { Injectable } from '@nestjs/common';
import { PuppeteerUtil, CONFIG } from './utils/puppeteer-utils';
import * as _ from 'lodash';
import testRecaptchaSolver from './utils/test-recaptcha-solver';

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

  //test data
  // data = {
  //   username: 'chadstevens578@gmail.com',
  //   password: 'Duvo1234!',
  //   number_of_days: 5,
  //   scheduled_date: '2023-02-20',
  //   model_id: 1,
  //   platform_id: 1,
  //   groupsWithMessages: [
  //     {
  //       messages: [
  //         {
  //           message_time: '00:00:00',
  //         },
  //       ],
  //     },
  //   ],
  // };
  async start(data: any = {}, manualStart = false) {
    try {
      const isExpired = checkIfExpired(
        data.number_of_days,
        data.scheduled_date,
      );
      if (!isExpired) return;
      // Test recaptcha v2 enterprise Start
      // await testRecaptchaSolver();
      // return;
      // Test recaptcha v2 enterprise End

      const puppeteerUtil = new PuppeteerUtil();
      puppeteerUtil.initialize();
      puppeteerUtil.setConfig();
      // recaptcha solving can be wrong sometime
      const headless = !manualStart;
      await puppeteerUtil.openBrowser(headless);
      const cookieFileName = 'user_' + data.model_id + '.' + data.platform_id;
      await puppeteerUtil.openPage('https://onlyfans.com/my/chats/send');
      await puppeteerUtil.acceptCookie();
      await puppeteerUtil.loadCookiesFromFile(cookieFileName);
      await puppeteerUtil.reload();
      const isLoginPage = await puppeteerUtil.checkLogin();
      let repeatCount = 50;

      while (1) {
        try {
          let _config = _.cloneDeep(CONFIG);
          _config['model_id'] = data.model_id;
          _config['platform_id'] = data.platform_id;
          let isLoggedIn = false;
          if (!data.username) break;
          if (isLoginPage) {
            _config.login.idValue = _config.login.idValue.replace(
              '$value',
              data.username,
            );
            _config.login.passwordValue = _config.login.passwordValue.replace(
              '$value',
              data.password,
            );
            isLoggedIn = await puppeteerUtil.login(_config);
          } else {
            console.log('----------------- Login Success -----------------');
            isLoggedIn = true;
          }
          if (isLoggedIn) {
            //start cron
            console.log('----------------- Start cron -----------------');
            const groupsWithMessages = data.groupsWithMessages;

            for (let i = 0; i < groupsWithMessages.length; i++) {
              const scheduledDate = new Date();
              // if (data.scheduled_date)
              //   scheduledDate = new Date(data.scheduled_date);
              // else {
              //   scheduledDate = new Date();
              // }
              const group = groupsWithMessages[i];
              for (let j = 0; j < group.messages.length; j++) {
                _config = null;
                _config = _.cloneDeep(CONFIG);
                try {
                  const msg = group.messages[j];
                  const [_hour, minutes, secs] = msg.message_time?.split(':');
                  const hour = ((parseInt(_hour) % 13) + _hour / 13) | 0;
                  const suffix = parseInt(_hour) >= 12 ? 'pm' : 'am';

                  let free_previews =
                    (msg.content?.split(',') || []).length <= msg.free_preview
                      ? msg.free_preview - 1
                      : msg.free_preview;
                  free_previews = free_previews > 0 ? free_previews : 0;
                  if (msg.price === 0) {
                    free_previews = 0;
                  }

                  scheduledDate.setDate(scheduledDate.getDate() + i + 1);
                  console.log(
                    `Message Date : ${
                      scheduledDate.getMonth() + 1
                    }: ${scheduledDate.getDate()},  Time: ${hour}:${minutes}:${suffix}`,
                  );
                  const msgData = {
                    message: msg.message,
                    message_month: scheduledDate.getMonth() + 1,
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
                    free_preview:
                      free_previews > 0
                        ? Array.from(
                            { length: free_previews },
                            (_, k) => k + 1,
                          ).join(',')
                        : '',
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
            }

            console.log('Work Finished');
            break;
          } else {
            continue;
          }
        } catch (error) {
          console.log('Error: ', error);
          repeatCount--; // IF error occurs over 50 times, break and exit;
          if (repeatCount < 0) break;
          continue;
        }
      }
      await puppeteerUtil.closeBrowser();
    } catch (err) {
      console.error('Error: ', err);
    }
  }
}
