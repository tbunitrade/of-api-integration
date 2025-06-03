// src/automate/utils/puppeteer-utils.ts

import { executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import _fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();
import * as process from "node:process";
const fs = _fs.promises;

//modules
import { performLoginOnce, performLoginWithRetries } from './_functions/login-utils';
import { RecaptchaUtil, handleCaptchaBeforeClick, checkLoginError, startCaptchaExtension } from './_functions/recaptcha-utils';
import { acceptCookie, setCookie, getCookie, saveCookieToFile, loadCookiesFromFile,  } from './_functions/cookies-utils';
import { CONFIG } from './config/step-config'
import { work } from './_functions/work-utils';

/*
initialize
openBrowser
setCookie
openPage
checkLogin
login
work
close
*/
export class PuppeteerUtil {
  private _puppeteer;
  private _browser;
  private _page;
  private _config;
  private _isclosed;
  private headless: boolean;

  constructor() {
    this._puppeteer = null;
    this._browser = null;
    this._page = null;
    this._config = null;
    this._isclosed = true;
    // Перед созданием браузера логируем, какой у нас DISPLAY
    console.log('▶ PuppeteerUtil.constructor: HEADLESS_MODE=', process.env.HEADLESS_MODE || '(undefined)');
  }

  initialize() {
    this._puppeteer = puppeteer;
    this._puppeteer.use(StealthPlugin());
  }

  setConfig(_config?: any) {
    //this._config = _config || { ...CONFIG };
    // Копируем CONFIG, чтобы не затирать оригинал:
    this._config = cfg ? { ...cfg } : { ...CONFIG };
  }
  async openBrowser() {
    if (!this._puppeteer) this.initialize();

    // Внутри openBrowser() добавьте диагностику:
    console.log("HEADLESS_MODE =", process.env.HEADLESS_MODE);
    console.log("DISPLAY     =", process.env.DISPLAY);
    console.log("Chrome bin  =", process.env.PUPPETEER_EXECUTABLE_PATH);

    // 1) Определяем headless из .env
    const raw = (process.env.HEADLESS_MODE || 'true').toLowerCase().trim();
    const headless = raw === 'false' || raw === '0' ? false : true;
    console.log(">>> [DEBUG] HEADLESS_MODE =", process.env.HEADLESS_MODE, " → headless =", headless);
    console.log(">>> [DEBUG] DISPLAY =", process.env.DISPLAY);

    // 2) Определяем путь к бинарнику из .env или дефолт
    const exePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || executablePath();
    console.log(">>> [DEBUG] executablePath =", exePath);

    // 3) подключаем нашу капчу
    const ext = path.resolve(__dirname, '../extensions/hcapt/0.4.1_0');
    console.log(">>> Я точно собираюсь запустить Puppeteer.launch() …");
    this._browser = await this._puppeteer.launch({
      headless:  this.headless,
      slowMo: 100,
      args: [
        `--no-sandbox`,
        `--disable-gpu`,
        `--disable-setuid-sandbox`,
        `--disable-extensions-except=${ext}`,
        `--load-extension=${ext}`,
        `--window-size=1920,1080`,
      ],
      //executablePath: executablePath(),
      executablePath: exePath,
      defaultViewport: null,
      dumpio: true,
    });
    console.log('>>> Puppeteer запустил браузер, PID=', this._browser.process().pid);
    this._browser.on('disconnected', () => {
      this._isclosed = true;

    });
    this._page = await this._browser.newPage();
    // Чтобы окно не закрылось мгновенно, добавим паузу:
    console.log('>>> Жду 30 секунд перед закрытием браузера, чтобы увидеть окно');
    await this._page.waitForTimeout(30000);
    console.log('>>> Браузер закрыт');
  }

  async openPage(pageUrl: string) {
    await this._page.goto(pageUrl, { timeout: 100000 });
    await this._page.addStyleTag({
      content:
        'img{-webkit-filter: blur(113px);-moz-filter: blur(113px);-o-filter: blur(113px);-ms-filter: blur(113px);filter: blur(113px);  }',
    });
  }

  async checkLogin() {
    try {
      const elementExists = await this._page.$(
        this._config.login?.pageSelector,
      );
      if (elementExists) {
        console.log(
          `async checkLogin() Login Selector "${this._config.login?.pageSelector}" found on the page`,
        );
        return true;
      } else {
        console.log(
          `async checkLogin() Login Selector "${this._config.login?.pageSelector}" not found on the page`,
        );
        return false;
      }
    } catch (error) {
      console.log('async checkLogin() Error : ', error);
      return false;
    }
  }

  async waitFor(miliSec: number) {
    try {
      await this._page.waitForTimeout(miliSec);
    } catch (error) {}
  }

  async login(cfg?: any) {
    const config = cfg || this._config;
    try {
      for (let i = 0; i < config.login_workflow.length; i++) {
        const _configKey = config.login_workflow[i];
        const _config = config[_configKey];
        const recaptchaUtil = new RecaptchaUtil();
        if (_config.isReload) {
          await this.reload();
        } else if (_config.isCheckPage) {
          try {
            await this._page.waitForTimeout(10000);
            await this._page.waitForSelector(_config.pageSelector, {
              timeout: 10000,
            });
            // if (i > 2) {
            const cookieFileName =
              'user_' + config.model_id + '.' + config.platform_id;
            await this.saveCookieToFile(cookieFileName);
            // }
            await this._page.addStyleTag({
              content:
                'img{-webkit-filter: blur(113px);-moz-filter: blur(113px);-o-filter: blur(113px);-ms-filter: blur(113px);filter: blur(113px);  }',
            });
            console.log('----------------- Login async login puppeteer Success -----------------');
            return true;
          } catch (error) {
            console.log(
              `Check selector "${_config?.pageSelector}" not found on the page`,
            );
          }
        } else if (_config.isRecaptcha) {
          await this._page.waitForSelector(_config.pageSelector, {
            timeout: 10000,
          });
          let captchaSolution: any = null;
          if (_config.hasDefaultCaptcha) {
            // captchaSolution = await solveRecaptcha(
            //   _config.defaultCaptchaType,
            //   _config.defaultCaptchaKey,
            //   await this._page.url(),
            // );
            // const siteUrl = await this._page.url();
            // captchaSolution = await resolveCaptchaV3(
            //   siteUrl,
            //   _config.defaultCaptchaKey,
            // );
            await this._page.waitForTimeout(200000);
            captchaSolution = await recaptchaUtil.resolveRecaptcha2(
              _config.defaultCaptchaKey,
              await this._page.url(),
              30,
              _config.defaultCaptchaVersion,
            );
            if (_config.defaultCaptchaVersion === 2) {
              // this is for V2
              const recaptchaHandle = await this._page.$x(
                '//*[@name="g-recaptcha-response"]',
              );
              await recaptchaHandle[0].evaluate(
                (elem: any, captchaSolution: any) => {
                  elem.style.display = 'block';
                  elem.style.position = 'relative';
                  elem.style.top = '200px';
                  elem.style.left = '5px';
                  elem.style.width = '70%';
                  elem.style.height = '80px';
                  elem.innerHTML = captchaSolution;
                  return elem;
                },
                captchaSolution,
              );
              console.log('Done.');
              await this._page.waitForTimeout(3000);
            }
            await this._page.evaluate(
              ({ captchaSolution, captchaVersion }) => {
                const captchaDOM = document.getElementsByClassName('m-captcha');
                if (captchaDOM.length > 0) {
                  const ele = captchaDOM[0];
                  if (captchaVersion === 3)
                    ele['__vue__']._props.data['e-recaptcha-response'] =
                      captchaSolution;
                  if (captchaVersion === 2)
                    ele['__vue__']._props.data['ec-recaptcha-response'] =
                      captchaSolution;
                } else {
                  console.log(
                    'No elements found with the specified class name: ',
                    'm-captcha',
                  );
                }
              },
              {
                captchaSolution,
                captchaVersion: _config.defaultCaptchaVersion,
              },
            );
          }

          const iframeHandle = await this._page.$(_config.captchaSelector);
          const iframeSrc = await iframeHandle.evaluate((iframe) => iframe.src);
          const iframeUrl = new URL(iframeSrc);
          const urlParams = iframeUrl.searchParams;
          const siteKey = urlParams.get('k');
          // captchaSolution = await solveRecaptcha(
          //   _config.captchaType,
          //   siteKey,
          //   await this._page.url(),
          // );
          const siteUrl = await this._page.url();
          // const stoken = urlParams.get('');
          //ar=1&k=6LddGoYgAAAAAHD275rVBjuOYXiofr1u4pFS5lHn&co=aHR0cHM6Ly9vbmx5ZmFucy5jb206NDQz&hl=en&v=rz4DvU-cY2JYCwHSTck0_qm-&theme=light&size=normal&badge=inline&sa=login&cb=odl8pjyrwaxr
          // const additionalParams = {
          //   action: 'login',
          //   badge: 'inline',
          //   theme: 'light',
          //   ar: 1,
          //   k: '6LddGoYgAAAAAHD275rVBjuOYXiofr1u4pFS5lHn',
          //   co: 'aHR0cHM6Ly9vbmx5ZmFucy5jb206NDQz',
          //   hl: 'en',
          //   v: 'rz4DvU-cY2JYCwHSTck0_qm-',
          //   size: 'normal',
          //   sa: 'login',
          //   cb: 'odl8pjyrwaxr',
          //   s: 'aHR0cHM6Ly9vbmx5ZmFucy5jb206NDQz',
          // };
          // await this._page.waitForTimeout(20000);
          // captchaSolution = await resolveCaptcha(siteUrl, siteKey);

          // await this._page.waitForTimeout(20000);
          // const res = await solver.recaptcha({
          //   pageurl: siteUrl,
          //   googlekey: siteKey,
          // });

          // console.log(res);

          // captchaSolution = res.data;

          await this._page.waitForTimeout(200000);
          captchaSolution = await recaptchaUtil.resolveRecaptcha2(
            siteKey,
            await this._page.url(),
            30,
            _config.captchaVersion,
          );

          if (_config.captchaVersion === 2) {
            // this is for V2
            const recaptchaHandle = await this._page.$x(
              '//*[@name="g-recaptcha-response"]',
            );
            await recaptchaHandle[0].evaluate(
              (elem: any, captchaSolution: any) => {
                elem.style.display = 'block';
                elem.style.position = 'relative';
                elem.style.top = '200px';
                elem.style.left = '5px';
                elem.style.width = '70%';
                elem.style.height = '80px';
                elem.innerHTML = captchaSolution;
                return elem;
              },
              captchaSolution,
            );
            console.log('Done.');
            await this._page.waitForTimeout(9000);
          }
          await this._page.evaluate(
            ({ captchaSolution, captchaVersion }) => {
              const captchaDOM = document.getElementsByClassName('m-captcha');
              if (captchaDOM.length > 0) {
                const ele = captchaDOM[0];
                if (captchaVersion === 3)
                  ele['__vue__']._props.data['e-recaptcha-response'] =
                    captchaSolution;
                if (captchaVersion === 2)
                  ele['__vue__']._props.data['ec-recaptcha-response'] =
                    captchaSolution;
              } else {
                console.log(
                  'No elements found with the specified class name: ',
                  'm-captcha',
                );
              }
            },
            { captchaSolution, captchaVersion: _config.captchaVersion },
          );

          //   // Click on the "Check" button to check the successful solution of the captcha.
          await this._page.evaluate(
            ({ submitSelector }) => {
              // Replace 'your-button-selector' with the actual selector of your disabled button
              const disabledButton = document.querySelector(submitSelector);

              if (disabledButton) {
                // Remove the 'disabled' attribute to enable the button
                disabledButton.removeAttribute('disabled');
              }
            },
            { submitSelector: _config.submitSelector },
          );
          await this._page.click(_config.submitSelector);
        } else if (_config.isRecaptchaExtension) {
          await this._page.waitForSelector(_config.pageSelector, {
            timeout: 10000,
          });
          await this._page.bringToFront();
          const workerTarget = await this._browser.waitForTarget(
            // Assumes that there is only one service worker created by the extension and its URL ends with background.js.
            (target) =>
              target.type() === 'service_worker' &&
              target.url().endsWith('background.js'),
          );

          const worker = await workerTarget.worker();
          // Open a popup (available for Canary channels).
          await worker.evaluate('chrome.action.openPopup();');
          try {
            let popupTarget;
            try {
              popupTarget = await this._browser.waitForTarget(
                // Assumes that there is only one page with the URL ending with popup.html and that is the popup created by the extension.
                (target) => {
                  return (
                    target.type() === 'page' &&
                    target.url().includes('popup.html')
                  );
                },
              );
            } catch (error) {}

            const popupPage = await popupTarget.asPage();
            // await popupPage.waitForSelector('#id_pro_setting', {
            //   timeout: 1000,
            // });
            // await popupPage.click('#id_pro_setting');
            // await popupPage.waitForTimeout(1000);
            if (_config.proKey) {
              await popupPage.evaluate(() => {
                const btn: any = document.querySelector('#id_pro_setting');
                if (btn) {
                  btn.click();
                }
              });
              await popupPage.waitForSelector(_config.proKeySelector, {
                timeout: 10000,
              });
              await popupPage.type(_config.proKeySelector, _config.proKey);
              await this._page.evaluate(
                ({ selector, value }) => {
                  const elements = Array.from(
                    document.querySelectorAll(selector),
                  );
                  const eles = elements.filter((ele) =>
                    ele.textContent.toLowerCase().includes(value.toLowerCase()),
                  );
                  if (eles.length > 0) {
                    eles[0].click();
                  }
                },
                { selector: 'button', value: 'Bind' },
              );
            }
          } catch (error) {
            console.log('Error: ', error);
          }

          let isLoginBtnValid = false;
          while (!isLoginBtnValid) {
            await this._page.waitForTimeout(1000);
            try {
              const disabledBtn = await this._page.waitForSelector(
                _config.disabledSelector,
                { timeout: 1000 },
              );
              console.log('DisabledButton: ', disabledBtn);
            } catch (error) {
              isLoginBtnValid = true;
            }
          }
          await this._page.waitForSelector(_config.submitSelector, {
            timeout: 10000,
          });
          await this._page.click(_config.submitSelector);
        } else {
          await this._page.waitForSelector(_config.pageSelector, {
            timeout: 10000,
          });
          await this._page.evaluate(
            ({ idSelector }) => {
              const ele = document.querySelector(idSelector);
              ele.value = '';
              ele.dispatchEvent(new Event('input', { bubbles: true })); // As this is vue website, it doens't chagne state value though we set value on input box
            },
            { idSelector: _config.idSelector },
          );
          await this._page.evaluate(
            ({ passwordSelector }) => {
              const ele = document.querySelector(passwordSelector);
              ele.value = '';
              ele.dispatchEvent(new Event('input', { bubbles: true })); // As this is vue website, it doens't chagne state value though we set value on input box
            },
            { passwordSelector: _config.passwordSelector },
          );
          await this._page.type(_config.idSelector, _config.idValue);
          await this._page.type(
            _config.passwordSelector,
            _config.passwordValue,
          );
          await this._page.click(_config.submitSelector);
          await this._page.waitForTimeout(5000);
        }
      }
    } catch (error) {
      console.log('Error: ', error);
    }
    return false;
  }


  isBrowserClosed() {
    return this._isclosed;
  }

  async typeWithShiftEnter(text) {
    const parts = text.split('\n'); // Split the text by Enter key
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        // Simulate Shift + Enter for newline
        await this._page.keyboard.down('Shift');
        await this._page.keyboard.press('Enter');
        await this._page.keyboard.up('Shift');
      }
      // Type the current part of the text
      await this._page.keyboard.type(parts[i]);
    }
  }

  async reload() {
    try {
      await this._page.reload();
      await this._page.waitForTimeout(10000);
    } catch (err) {
      console.log('Error in reload : ', err);
    }
  }

  async closeBrowser() {
    await this._browser.close();
  }

  destroy() {
    this._puppeteer = null;
    this._browser = null;
    this._page = null;
    this._config = null;
  }
}
