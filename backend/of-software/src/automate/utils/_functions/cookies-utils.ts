// src/_functions/cookies-utils.ts
import type { Page } from 'puppeteer';
import { promises as fs } from 'fs';
import { setTimeout } from 'node:timers/promises';
import _fs from 'fs';
import { PuppeteerUtil } from "../puppeteer-utils";
import * as path from 'path';

console.log('cookies-utils __dirname:', __dirname);
console.log('cookies-utils  cwd:', process.cwd());

//Absolute path for cookies dir
const cookiesDir = path.resolve(__dirname, '../../../../cookies');

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

  const fullPath = path.join(__dirname, '../cookies', fileName);
  console.log('[cookies-utils] Сохраняем куки в файл:', fullPath);
  console.log('[COOKIES] saveCookieToFile -> START, fileName =', fileName);


  const page = (this as any)._page;
  const cookies = await getCookie.call(this);
  const localStorageData = await page.evaluate(() => JSON.stringify( localStorage ));
  const sessionStorageData = await page.evaluate(() => JSON.stringify( sessionStorage ));

  if (!_fs.existsSync(cookiesDir)) {
    _fs.mkdirSync(cookiesDir, {recursive: true});
  }

  const basePath = path.join(cookiesDir, fileName);
  console.log('[cookies-utils] Сохраняем куки в базу:', basePath);
  console.log('[COOKIE]', 'process.cwd() =', process.cwd());
  console.log('[COOKIE]', 'cookiesDir =', cookiesDir);

  console.log('[COOKIES] 📄 Пишем cookies в:', `${basePath}_cookie.json`);
  console.log('[COOKIES] 📄 Пишем localStorage в:', `${basePath}_localstorage.json`);
  console.log('[COOKIES] 📄 Пишем sessionStorage в:', `${basePath}_sessionstorage.json`);

  await fs.writeFile(`${basePath}_cookie.json`, JSON.stringify(cookies));
  await fs.writeFile(`${basePath}_localstorage.json`, JSON.stringify(localStorageData));
  await fs.writeFile(`${basePath}_sessionstorage.json`, JSON.stringify(sessionStorageData));

  console.log('[COOKIES] ✅ Все файлы успешно записаны для', fileName);

  // const cookiePath = path.join(cookiesDir, `${fileName}_cookie.json`);
  // const localPath = path.join(cookiesDir, `${fileName}_localstorage.json`);
  // const sessionPath = path.join(cookiesDir, `${fileName}_sessionstorage.json`);

  // await fs.writeFile(cookiePath, JSON.stringify(cookies));
  // await fs.writeFile(localPath, JSON.stringify( localStorageData ));
  // await fs.writeFile(sessionPath, JSON.stringify( sessionStorageData ));

  //console.log('Cookies saved to file:', `./${fileName}_***.json`);
  console.log('[cookies-utils] ✅ Cookies сохранены:', `${basePath}_***.json`);
  console.log('[cookies-utils] cookies:', cookies);
  console.log('[cookies-utils] localStorageData:', localStorageData);
  console.log('[cookies-utils] sessionStorageData:', sessionStorageData);
}

/**
 * Загружаем cookie из файлов и правим localStorage / sessionStorage
 */
export async function  loadCookiesFromFile(this: PuppeteerUtil, fileName: string) {
  const page = (this as any)._page;
  try {
    const cookiePath = path.join(cookiesDir, `${fileName}_cookie.json`);
    const localPath = path.join(cookiesDir, `${fileName}_localstorage.json`);;
    const sessionPath = path.join(cookiesDir, `${fileName}_sessionstorage.json`);

    console.log ('check loadCookies From File ', fileName);

    const cookiesString = await fs.readFile(cookiePath, { encoding: 'utf-8' });
    const localStorageData = await fs.readFile(localPath, { encoding: 'utf-8' });
    const sessionStorageData = await fs.readFile(sessionPath, { encoding: 'utf-8' });

    if ( cookiesString ) {
      const cookies = JSON.parse(cookiesString);
      await this.setCookie.call(this, cookies);
      //await this.setCookie();
      console.log('Cookies loaded from file:', cookiePath);
    }

    //const localStorageData = await fs.readFile(cookiePath, { encoding: 'utf-8' });
    //const sessionStorageData = await fs.readFile(cookiePath, { encoding: 'utf-8' });

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
export async function setCookie(this:any, cookies?: any[]) {
  try {
    if (cookies) {
      const context = this._page.browserContext();
      await context.setCookie(...cookies);
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




