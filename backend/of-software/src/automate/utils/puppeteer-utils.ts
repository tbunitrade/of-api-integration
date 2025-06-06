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

const fs = _fs.promises;

// ==== Ваши «модули» ====
import { performLoginWithRetries } from './_functions/login-utils';
import { RecaptchaUtil, handleCaptchaBeforeClick, checkLoginError, startCaptchaExtension } from './_functions/recaptcha-utils';
import { acceptCookie, saveCookieToFile, loadCookiesFromFile, setCookie, getCookie } from './_functions/cookies-utils';
import { CONFIG as DEFAULT_CONFIG } from './config/step-config';
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

  private _username: string;
  private _password: string;

  constructor() {
    this._puppeteer = null;
    this._browser = null;
    this._page = null;
    this._config = null;
    this._isclosed = true;
    console.log('▶ PuppeteerUtil.constructor: HEADLESS_MODE=', process.env.HEADLESS_MODE || '(undefined)');
  }

  // 1) Инициализируем puppeteer-extra с stealth-плагином
  initialize() {
    this._puppeteer = puppeteer;
    this._puppeteer.use(StealthPlugin());
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
    const headlessMode = raw === 'false' || raw === '0' ? false : true;
    this.headless = headlessMode;
    console.log('>>> [DEBUG] HEADLESS_MODE =', process.env.HEADLESS_MODE, '→ headless =', headlessMode);

    const exePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || executablePath();
    console.log('>>> [DEBUG] executablePath =', exePath);

    const ext = path.resolve(__dirname, '../../../extensions/hcapt/0.4.1_0');
    console.log('EXTENSION PATH for extensions/hcapt/0.4.1_0:', ext);
    console.log('>>> Я точно собираюсь запустить Puppeteer.launch() …');
    this._browser = await this._puppeteer.launch({
      headless: this.headless,
      slowMo: 50,
      args: [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-setuid-sandbox',
        `--disable-extensions-except=${ext}`,
        `--load-extension=${ext}`,
        '--window-size=1920,1080',
      ],
      executablePath: exePath,
      defaultViewport: null,
      dumpio: true,
    });
    console.log('>>> Puppeteer запустил браузер, PID=', this._browser.process().pid);

    const targets = await this._browser.targets();
    console.log('All targets:', targets.map(t => t.url()));

    this._browser.on('disconnected', () => {
      this._isclosed = true;
    });

    this._page = await this._browser.newPage();
    // Небольшая пауза (для отладки)
    console.log('>>> Жду 5 секунд перед дальнейшими действиями');
    //await this._page.setTimeout(5000);
    await setTimeout(5000);
  }

  // 4) Установка одного cookie (если нужно вручную)
  async setCookie(name: string, value: string, domain: string) {
    if (!this._page) throw new Error('Page is not initialized');
    await this._page.setCookie({ name, value, domain });
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
  async login(username: string, password: string, cookieFileName: string): Promise<boolean> {

    this._username = username;
    this._password = password;

    console.log('[LOGIN] Username:', this._username);
    console.log('[LOGIN] Password:', this._password);


    if (!this._page || !this._config) throw new Error('Page or config is not initialized');

    //const cookieFileName = `user_${username}_cookie.json`;
    try {
      await loadCookiesFromFile.call(this, cookieFileName);
    } catch (error) {
      console.log('Не удалось загрузить файл "${cookieFileName}", продолжим без него:', error)
    }

    const success = await performLoginWithRetries(this._page, this._config, username, password);
    if (success) {
      console.log('✅ Login прошёл успешно, сохраняем куки');
      await saveCookieToFile.call(this, cookieFileName);
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

  // 10) Перезагрузка текущей страницы
  async reload() {
    if (!this._page) return;
    try {
      await this._page.reload({ waitUntil: 'networkidle2' });
      //await this._page.setTimeout(10000);
      await setTimeout(10000);
    } catch (err) {
      console.log('Error in reload : ', err);
    }
  }

  // 11) Закрытие браузера
  async closeBrowser() {
    if (!this._browser) return;
    await this._browser.close();
    this._isclosed = true;
  }

  // 12) Проверка, закрылся ли браузер (используется внутри work-utils)
  isBrowserClosed(): boolean {
    return this._isclosed;
  }

  // 13) Очищаем ссылки на puppeteer/браузер/страницу/конфиг
  destroy() {
    this._puppeteer = null;
    this._browser = null;
    this._page = null;
    this._config = null;
  }
}
