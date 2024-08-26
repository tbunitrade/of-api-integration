import { Injectable } from '@nestjs/common';
import { PuppeteerUtil, CONFIG } from './utils/puppeteer-utils';
import * as _ from 'lodash';
import testRecaptchaSolver from './utils/test-recaptcha-solver';
import { getRandomNumber } from 'src/cron/utils';
import { ModelPlatform } from 'src/modelPlatform/model_platform.entity';
import { PostTime } from 'src/postTime/post_time.entity';
import { PostFile } from 'src/postFile/post_file.entity';
import { Post } from 'src/post/post.entity';

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
  async startMessage(data: any = {}, manualStart = false) {
    let scheduledCount = 0;
    try {
      const isExpired = checkIfExpired(
        data.number_of_days,
        data.scheduled_date,
      );
      if (!isExpired && !manualStart) return false;
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
      let repeatCount = 10;

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
              let scheduledDate = new Date();
              if (data.scheduled_date && manualStart)
                scheduledDate =
                  manualStart && new Date(data.scheduled_date) > new Date()
                    ? new Date(data.scheduled_date)
                    : new Date();
              else {
                scheduledDate = new Date();
              }
              scheduledDate.setDate(scheduledDate.getDate() + i + 1);
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

                  console.log(
                    `Message Date : ${
                      scheduledDate.getMonth() + 1
                    }: ${scheduledDate.getDate()},  Time: ${hour}:${minutes}:${suffix}`,
                  );
                  const msgData = {
                    message: msg.message,
                    message_month: scheduledDate.toLocaleString('default', {
                      month: 'long',
                    }),
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
                  // scheduledCount++;
                  // if (
                  //   j === group.messages.length - 1 &&
                  //   scheduledCount !== group.messages.length
                  // ) {
                  //   scheduledCount = group.messages.length;
                  // }
                } catch (error) {
                  console.log('Error : ', error);
                  continue;
                }
              }
            }

            console.log('Work Finished');
            await puppeteerUtil.closeBrowser();
            return true;
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
      return true;
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
    },
    manualStart = false,
  ) {
    const {
      modelPlatform,
      postWithTimesAndCaptions,
      postFiles,
      scheduledDate,
      numberOfDays,
    } = allData;
    try {
      // const isExpired = checkIfExpired(
      //   modelPlatform.number_of_days,
      //   modelPlatform.scheduled_date,
      // );
      // if (!isExpired && !manualStart) return false;
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
      const cookieFileName =
        'user_' + modelPlatform.model_id + '.' + modelPlatform.platform_id;
      await puppeteerUtil.openPage('https://onlyfans.com/posts/create');
      await puppeteerUtil.acceptCookie();
      await puppeteerUtil.loadCookiesFromFile(cookieFileName);
      await puppeteerUtil.reload();
      const isLoginPage = await puppeteerUtil.checkLogin();
      let repeatCount = 10;

      while (1) {
        try {
          let _config = _.cloneDeep(CONFIG);
          _config['model_id'] = modelPlatform.model_id;
          _config['platform_id'] = modelPlatform.platform_id;
          let isLoggedIn = false;
          if (!modelPlatform.username) break;
          if (isLoginPage) {
            _config.login.idValue = _config.login.idValue.replace(
              '$value',
              modelPlatform.username,
            );
            _config.login.passwordValue = _config.login.passwordValue.replace(
              '$value',
              modelPlatform.password,
            );
            isLoggedIn = await puppeteerUtil.login(_config);
          } else {
            console.log('----------------- Login Success -----------------');
            isLoggedIn = true;
          }
          if (isLoggedIn) {
            //start cron
            console.log('----------------- Start cron -----------------');

            const postCaptions = postWithTimesAndCaptions.captions;

            if (!postCaptions) return;
            if (postCaptions.length === 0) return;
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
              for (
                let j = 0;
                j < postWithTimesAndCaptions.post_times.length;
                j++
              ) {
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
                  _config = _.cloneDeep(CONFIG);
                  const postTime = postWithTimesAndCaptions.post_times[j];
                  if (!postTime) continue;
                  const [_hour, minutes, secs] = postTime.time?.split(':');
                  const hour =
                    ((parseInt(_hour) % 13) + parseInt(_hour) / 13) | 0;
                  const suffix = parseInt(_hour) >= 12 ? 'pm' : 'am';
                  const randNumber = getRandomNumber(fileIndexes.length ?? 0);
                  const postFile = postFiles[fileIndexes[randNumber]]?.url;
                  fileIndexes.splice(randNumber, 1);
                  const randNC = getRandomNumber(captionIndexes.length ?? 0);
                  const postCaption = postCaptions[captionIndexes[randNC]];
                  captionIndexes.splice(randNC, 1);
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
            }

            console.log('Work Finished');
            await puppeteerUtil.closeBrowser();
            return true;
          } else {
            repeatCount--;
            if (repeatCount < 0) break;
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
      return true;
    } catch (err) {
      console.error('Error: ', err);
      return false;
    }
  }
}
