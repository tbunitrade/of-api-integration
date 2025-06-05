// src/_functions/cookies-utils.ts
import type { Page } from 'puppeteer';
import { promises as fs } from 'fs';
import { setTimeout } from 'node:timers/promises';
import _fs from 'fs';
import { PuppeteerUtil } from "../puppeteer-utils";
import * as path from 'path';
console.log('cookies-utils __dirname:', __dirname);
console.log('cookies-utils  cwd:', process.cwd());

/**
 * Закрывает баннер «Accept All» через механизм work(...)
 * (будет вызвано с контекстом PuppeteerUtil, где this._page и this.work уже определены).
 */
export async function acceptCookie(this: PuppeteerUtil) {
  const acceptCookieWork = [
    {
      type: 'waitForSelector',
      value: '.b-cookies-informer__container .b-cookies-informer__nav button',
    },
    {
      type: 'clickForValue',
      value: 'Accept All',
      selector:
        '.b-cookies-informer__container .b-cookies-informer__nav button',
    },
  ];
  await this.work( acceptCookieWork );
}

/**
 * Сохраняем cookie в файл (парочку JSON-ок)
 */
export async function  saveCookieToFile(this: PuppeteerUtil, fileName: string) {
  const page = (this as any)._page;
  const cookies = await getCookie.call(this);
  const localStorageData = await page.evaluate(() => JSON.stringify( localStorage ));
  const sessionStorageData = await page.evaluate(() => JSON.stringify( sessionStorage ));

  const cookiesDir = path.resolve(__dirname, '../../../../cookies');
  if (!_fs.existsSync(cookiesDir)) {
    _fs.mkdirSync(cookiesDir, {recursive: true});
  }

  const cookiePath = path.join(cookiesDir, `${fileName}_cookie.json`);
  const localPath = path.join(cookiesDir, `${fileName}_localstorage.json`);
  const sessionPath = path.join(cookiesDir, `${fileName}_sessionstorage.json`);

  await fs.writeFile(cookiePath, JSON.stringify(cookies));
  await fs.writeFile(localPath, JSON.stringify( localStorageData ));
  await fs.writeFile(sessionPath, JSON.stringify( sessionStorageData ));

  console.log('Cookies saved to file:', `./${fileName}_***.json`);
  console.log('saveCookieToFile:  [cwd]', process.cwd())
}

/**
 * Загружаем cookie из файлов и правим localStorage / sessionStorage
 */
export async function  loadCookiesFromFile(this: PuppeteerUtil, fileName: string) {
  const page = (this as any)._page;
  try {
    const cookiesString = await fs.readFile(
      `./cookies/${fileName}_cookie.json`,
      { encoding: 'utf-8' },
    );

    if ( cookiesString ) {
      const cookies = JSON.parse(cookiesString);
      await this.setCookie.call(cookies);
      console.log(
        'Cookies loaded from file:',
        `./cookies/${fileName}_cookie.json`,
      );
    }

    const localStorageData = await fs.readFile(
      `./cookies/${fileName}_localstorage.json`,
      {
        encoding: 'utf-8',
      },
    );
    const sessionStorageData = await fs.readFile(
      `./cookies/${fileName}_sessionstorage.json`,
      {
        encoding: 'utf-8',
      },
    );

    if (!!localStorageData && !!sessionStorageData) {
      await page.evaluate(
        ( data ) => {
          localStorage.clear();
          sessionStorage.clear();
          const parsedLocalStorageData = JSON.parse( data.localStorageData );
          const parsedSessionStorageData = JSON.parse( data.sessionStorageData );
          for (const key in parsedLocalStorageData) { localStorage.setItem(key, parsedLocalStorageData[key]); }
          for (const key in parsedSessionStorageData) { sessionStorage.setItem(key, parsedSessionStorageData[key]); }
        },
        { localStorageData, sessionStorageData },
      );
    }
  } catch (error) {
    console.error('Error loading cookies from file:', error);
  }
}

/**
 * Устанавливает cookie в текущей странице
 */
export async function  setCookie(this:any, cookies?: any[]) {
  try {
    if (cookies) {
      await this._page.setCookie(...cookies);
    }
  } catch (error) {
    console.log('Error setting cookies : ', error);
  }
}

/**
 * Получаем список cookie из текущей страницы
 */
export async function  getCookie(this: any) {
  try {
    if (this._page) {
      return this._page.cookies()
    }
  } catch (error) {
    console.log('Error getting cookies: ', error);
  }
  return [];
}




