// src/automate/utils/puppeteer-utils.ts

import { executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import _fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();
import * as process from 'node:process';

const fs = _fs.promises;

// ==== Ваши «модули» ====
import { performLoginWithRetries } from './_functions/login-utils';
import { RecaptchaUtil, handleCaptchaBeforeClick, checkLoginError, startCaptchaExtension } from './_functions/recaptcha-utils';
import { acceptCookie, saveCookieToFile, loadCookiesFromFile, setCookie } from './_functions/cookies-utils';
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

  setConfig(cfg?: any) {
    // Если передали пользовательский конфиг, берём его, иначе клонируем DEFAULT_CONFIG
    this._config = cfg ? { ...cfg } : { ...DEFAULT_CONFIG };
  }

  async openBrowser() {
    if (!this._puppeteer) this.initialize();

    // Диагностика
    console.log('HEADLESS_MODE =', process.env.HEADLESS_MODE);
    console.log('DISPLAY     =', process.env.DISPLAY);
    console.log('Chrome bin  =', process.env.PUPPETEER_EXECUTABLE_PATH);

    // Определяем headless из .env
    const raw = (process.env.HEADLESS_MODE || 'true').toLowerCase().trim();
    const headlessMode = raw === 'false' || raw === '0' ? false : true;
    this.headless = headlessMode;
    console.log('>>> [DEBUG] HEADLESS_MODE =', process.env.HEADLESS_MODE, '→ headless =', headlessMode);

    // Путь к хрому
    const exePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || executablePath();
    console.log('>>> [DEBUG] executablePath =', exePath);

    // Загружаем расширение капчи
    const ext = path.resolve(__dirname, '../extensions/hcapt/0.4.1_0');
    console.log('>>> Я точно собираюсь запустить Puppeteer.launch() …');
    this._browser = await this._puppeteer.launch({
      headless: this.headless,
      slowMo: 100,
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

    this._browser.on('disconnected', () => {
      this._isclosed = true;
    });

    this._page = await this._browser.newPage();
    // Чтобы не закрыть окно мгновенно (для отладки), ждём 5 секунд
    console.log('>>> Жду 5 секунд перед дальнейшими действиями');
    await this._page.waitForTimeout(5000);
  }

  async setCookie(name: string, value: string, domain: string) {
    if (!this._page) throw new Error('Page is not initialized');
    // Пример: установить cookie
    await this._page.setCookie({ name, value, domain });
  }

  async openPage(pageUrl: string) {
    if (!this._page) throw new Error('Page is not initialized');
    await this._page.goto(pageUrl, { timeout: 100000, waitUntil: 'networkidle2' });
    // Сразу принимаем cookie баннер
    await acceptCookie(this._page);
  }

  async checkLogin(): Promise<boolean> {
    if (!this._page || !this._config) throw new Error('Page or config is not initialized');
    try {
      const sel = this._config.login?.pageSelector;
      const element = await this._page.$(sel);
      if (element) {
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

  async waitFor(ms: number) {
    if (!this._page) return;
    await this._page.waitForTimeout(ms);
  }

  async login(username: string, password: string): Promise<boolean> {
    if (!this._page || !this._config) throw new Error('Page or config is not initialized');

    // Сохраняем файл куки перед началом
    const cookieFileName = `user_${this._config.login.idValue || username}`;
    await loadCookiesFromFile(this._page, cookieFileName);

    // Выполняем логику входа с капчей
    const success = await performLoginWithRetries(this._page, this._config, username, password);
    if (success) {
      console.log('✅ Login прошёл успешно, сохраняем куки');
      await saveCookieToFile(this._page, cookieFileName);
      return true;
    } else {
      console.log('❌ Login не удался');
      return false;
    }
  }

  async work(tasks?: any[]) {
    if (!this._page) throw new Error('Page is not initialized');
    if (!tasks || !tasks.length) {
      console.log('Нет задач для выполнения');
      return;
    }
    try {
      // Предполагаем, что work(tasks) проставлено в виде массива шагов
      await work(this._page, tasks);
    } catch (err) {
      console.log('Ошибка в work():', err);
    }
  }

  async reload() {
    if (!this._page) return;
    try {
      await this._page.reload({ waitUntil: 'networkidle2' });
      await this._page.waitForTimeout(10000);
    } catch (err) {
      console.log('Error in reload : ', err);
    }
  }

  async closeBrowser() {
    if (!this._browser) return;
    await this._browser.close();
    this._isclosed = true;
  }

  isBrowserClosed(): boolean {
    return this._isclosed;
  }

  destroy() {
    this._puppeteer = null;
    this._browser = null;
    this._page = null;
    this._config = null;
  }
}
