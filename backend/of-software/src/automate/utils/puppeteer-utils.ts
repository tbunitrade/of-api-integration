// src/automate/utils/puppeteer-utils.ts

import { executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import _fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();
import * as process from 'node:process';
import { setTimeout } from 'node:timers/promises';

//const fs = _fs.promises;

// ==== Ваши «модули» ====
import { performLoginWithRetries } from './_functions/login-utils';
import { acceptCookie, saveCookieToFile, loadCookiesFromFile,} from './_functions/cookies-utils';
import { CONFIG as DEFAULT_CONFIG } from './config/step-config';
import { work } from './_functions/work-utils';
import {handleCaptchaBeforeClick, resetCaptchaFlag} from "./_functions/recaptcha-utils";

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

  private _username: string;
  private _password: string;

  constructor() {
    this._puppeteer = null;
    this._browser = null;
    this._page = null;
    this._config = null;
    this._isclosed = false;
    console.log('▶ PuppeteerUtil.constructor: HEADLESS_MODE=', process.env.HEADLESS_MODE || '(undefined)');
  }

  public async acceptCookie() {
    return await acceptCookie.call(this);
  }

  async validateCookies(): Promise<boolean> {
    const cookies = await this._page.cookies();
    const authCookie = cookies.find(c => c.name === 'sess');
    const csrf = cookies.find(c => c.name === 'csrf');

    const isValid = !!(authCookie?.value && csrf?.value);

    console.log('[validateCookies] isValid:', isValid, '→ sess:', authCookie?.value, 'csrf:', csrf?.value);
    return isValid;
  }

  async clearCookies() {
    const client = await this._page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    console.log('🧹 Cookies очищены через CDP');
  }

  // 1) Инициализируем puppeteer-extra с stealth-плагином
  initialize() {
    this._puppeteer = puppeteer;
    const stealth = StealthPlugin();
    stealth.enabledEvasions.delete('sourceurl'); // ❗️отключаем sourceurl, он вызывает баг с deleteCookies
    console.log('[STEALTH] Active evasions:', [...stealth.enabledEvasions]);
    this._puppeteer.use(stealth);
  }//this._puppeteer.use(StealthPlugin());

  public get page() {
    return this._page;
  }


  // 2) Устанавливаем конфиг (если нужно свой, передайте в setConfig; иначе будет DEFAULT_CONFIG)
  setConfig(cfg?: any) {
    this._config = cfg ? { ...cfg } : { ...DEFAULT_CONFIG };
  }

  // 3) Запуск браузера с расширением HCAPTCHA
  async openBrowser() {
    if (!this._puppeteer) this.initialize();

    console.log('HEADLESS_MODE =', process.env.HEADLESS_MODE);
    console.log('DISPLAY     =', process.env.DISPLAY);
    console.log('Chrome bin  =', process.env.PUPPETEER_EXECUTABLE_PATH);

    const raw = (process.env.HEADLESS_MODE || 'true').toLowerCase().trim();
    //const headlessMode = !(raw === 'false' || raw === '0');
    const headlessMode = raw === 'false' || raw === '0' ? false : true;
    this.headless = headlessMode;
    console.log('>>> [DEBUG] HEADLESS_MODE =', process.env.HEADLESS_MODE, '→ headless =', headlessMode);

    const exePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || executablePath();
    console.log('>>> [DEBUG] executablePath =', exePath);

    const ext = path.resolve(__dirname, '../../../extensions/hcapt/0.4.1_0');
    console.log('EXTENSION PATH for extensions/hcapt/0.4.1_0:', ext);
    this._browser = await this._puppeteer.launch({
      headless: this.headless,
      slowMo: 40,
      args: [
        `--no-sandbox`,
        //`--disable-gpu`,
        `--disable-setuid-sandbox`,
        `--disable-extensions-except=${ext}`,
        `--load-extension=${ext}`,
        `--window-size=1728,1080`,
      ],
      executablePath: exePath,

    });
    // defaultViewport: null,
    // dumpio: true,


    console.log('>>> Puppeteer запустил браузер, PID=', this._browser.process().pid);

    const targets = await this._browser.targets();
    console.log('All targets:', targets.map(t => t.url()));
    this._isclosed = false;
    this._browser.on('disconnected', () => {
      this._isclosed = true;
    });

    this._page = await this._browser.newPage();

    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:92.0) Gecko/20100101 Firefox/92.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];

    const index = new Date().getSeconds() % userAgents.length;
    const selectedUA = userAgents[index];
    console.log('👉 Set user-agent:', selectedUA);

    await this._page.setUserAgent(selectedUA);

    await this._page.setViewport({ width: 1920, height: 1080 });
    // Небольшая пауза (для отладки)
    console.log('>>> Жду 5 секунд перед дальнейшими действиями');
    //await this._page.setTimeout(5000);
    await setTimeout(5000);
  }

  // 4) Установка одного cookie (если нужно вручную)
  async setCookie(name: string, value: string, domain: string) {
    if (!this._page) throw new Error('Page is not initialized');
    // const context = this._page.browserContext();
    // context.setCookie({ name, value, domain });
    await this._page.setCookie({ name, value, domain });
    console.log(`[setCookie] Set cookie: ${name}=${value} for domain ${domain}`);
  }

  // 5) Переход на любую страницу + сразу закрытие баннера cookie
  async openPage(pageUrl: string) {
    if (!this._page) throw new Error('Page is not initialized');
    await this._page.goto(pageUrl, { timeout: 100000, waitUntil: 'networkidle2' });
    // Закрываем баннер «Accept All» через хелпер acceptCookie
    await acceptCookie.call(this);
  }

  // 6) Проверка, есть ли на странице селектор логина (т.е. мы ещё не залогинены)
  async checkLogin(): Promise<boolean> {
    if (!this._page || !this._config) throw new Error('Page or config is not initialized');
    try {
      const sel = this._config.login?.pageSelector;
      const el = await this._page.$(sel);
      if (el) {
        console.log(`async checkLogin() Login Selector "${sel}" найден на странице`);
        return true;
      } else {
        console.log(`async checkLogin() Login Selector "${sel}" не найден на странице`);
        return false;
      }
    } catch (error) {
      console.log('async checkLogin() Error : ', error);
      return false;
    }
  }

  // 7) Простой метод-пауза
  async waitFor(ms: number) {
    if (!this._page) return;
    //await this._page.setTimeout(ms);
    await setTimeout(ms);
  }

  // 8) Логика входа: сначала loadCookiesFromFile, потом performLoginWithRetries, потом saveCookieToFile
  async login(username: string, password: string, cookieFileName: string, skipLoadCookies = false): Promise<boolean> {

    this._username = username;
    this._password = password;

    console.log('[LOGIN] Username:', this._username);
    console.log('[LOGIN] Password:', this._password);


    if (!this._page || !this._config) throw new Error('Page or config is not initialized');

    //const cookieFileName = `user_${username}_cookie.json`;
    try {
      if (!skipLoadCookies) {
        await loadCookiesFromFile.call(this, cookieFileName);
      }
    } catch (error) {
      console.log('Не удалось загрузить файл "${cookieFileName}", продолжим без него:', error)
    }
    resetCaptchaFlag();
    const success = await performLoginWithRetries(this._page, this._config, username, password);
    if (success) {
      console.log('✅ Login прошёл успешно, сохраняем куки - создаем файл?');
      console.log('[LOGIN] ✅ Успешный вход. Готовимся вызвать saveCookieToFile');
      await saveCookieToFile.call(this, cookieFileName);
      console.log('[LOGIN] ✅ saveCookieToFile завершён. Проверяем наличие файла:', cookieFileName);
      console.log('✅ File creation -> ', cookieFileName);
      return true;
    } else {
      console.log('❌ Login не удался');
      return false;
    }
  }

  // 9) Позволяет выполнить любые «рабочие» шаги (клики/ввод/ожидания) из work-utils.ts
  async work(tasks?: any[]) {
    if (!this._page) throw new Error('Page is not initialized');
    if (!tasks || !tasks.length) {
      console.log('Нет задач для выполнения');
      return;
    }
    try {
      await work.call(this, tasks);
    } catch (err) {
      console.log('Ошибка в work():', err);
    }
  }

  // 10) reload current page  Перезагрузка текущей страницы
  async reload() {
    if (!this._page) return;
    try {
      await this._page.reload({ waitUntil: 'networkidle2' });
      //await this._page.setTimeout(10000);

      // Ждём немного для появления капчи
      await setTimeout(1500);

      // Проверяем и решаем капчу, если она есть
      await handleCaptchaBeforeClick(this._page);

      // Add a additional delay
      await setTimeout(1500);

    } catch (err) {
      console.log('Error in reload : ', err);
    }
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

  // 11) Closing the browser
  async closeBrowser() {
    if (!this._browser) return;
    await this._browser.close();
    this._isclosed = true;
  }

  // 12) Checking if the browser has closed (used internally by work-utils)
  isBrowserClosed(): boolean {
    return this._isclosed;
  }

  // 13) Clear links to puppeteer/browser/page/config
  destroy() {
    this._puppeteer = null;
    this._browser = null;
    this._page = null;
    this._config = null;
  }
}
