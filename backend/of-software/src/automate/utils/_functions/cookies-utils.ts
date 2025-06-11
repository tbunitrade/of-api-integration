// src/_functions/cookies-utils.ts
import type { Page } from 'puppeteer';
import { promises as fs } from 'fs';
import { setTimeout } from 'node:timers/promises';
import _fs from 'fs';
import { PuppeteerUtil } from "../puppeteer-utils";
import * as path from 'path';

console.log('cookies-utils __dirname:', __dirname);
console.log('cookies-utils  cwd:', process.cwd());
console.log(`[cookies-utils] loaded at ${new Date().toISOString()}, __dirname = ${__dirname}`);

const cookiesDir = path.join(process.cwd(), 'cookies');
console.log('[cookies-utils] cookiesDir =', cookiesDir);
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
  console.log('[cookies-utils] saveCookieToFile called');
  //throw new Error('Test log from cookies-utils');


  const page = (this as any)._page;
  const cookies = await getCookie.call(this);
  console.log('[saveCookieToFile] Cookies from page:', cookies);
  const localStorageData = await page.evaluate(() => JSON.stringify( localStorage ));
  const sessionStorageData = await page.evaluate(() => JSON.stringify( sessionStorage ));

  if (!_fs.existsSync(cookiesDir)) {
    _fs.mkdirSync(cookiesDir, {recursive: true});
  }

  const baseName = fileName.endsWith('.json') ? fileName.slice(0, -5) : fileName;
  const basePath = path.join(cookiesDir, baseName);
  console.log('[cookies-utils] Сохраняем куки в базу:', basePath);
  console.log('[COOKIE]', 'process.cwd() =', process.cwd());
  console.log('[COOKIE]', 'cookiesDir =', cookiesDir);

  console.log('[COOKIES] 📄 Пишем cookies в:', `${basePath}_cookie.json`);
  console.log('[COOKIES] 📄 Пишем localStorage в:', `${basePath}_localstorage.json`);
  console.log('[COOKIES] 📄 Пишем sessionStorage в:', `${basePath}_sessionstorage.json`);

  // const filteredCookies = cookies.map(({name, value, domain, path, expires, httpOnly, secure, sameSite}) => ({
  //   name,
  //   value,
  //   domain,
  //   path,
  //   expires: expires ? Math.floor(expires) : undefined,
  //   httpOnly,
  //   secure,
  //   sameSite
  // }));
  console.log('[saveCookieToFile] 🔬 Ключи в cookie:', cookies.map(c => Object.keys(c)));
  const filteredCookies = cookies.map((cookie) => {
    return {
      name: String(cookie.name),
      value: String(cookie.value),
      domain: String(cookie.domain),
      path: String(cookie.path),
      expires: typeof cookie.expires === 'number' ? Math.floor(cookie.expires) : undefined,
      httpOnly: !!cookie.httpOnly,
      secure: !!cookie.secure,
      sameSite: cookie.sameSite || undefined, // strict, lax, none
    };
  });
  await fs.writeFile(`${basePath}_cookie.json`, JSON.stringify(filteredCookies));
  //await fs.writeFile(`${basePath}_cookie.json`, JSON.stringify(cookies));
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
    const localPath = path.join(cookiesDir, `${fileName}_localstorage.json`);
    const sessionPath = path.join(cookiesDir, `${fileName}_sessionstorage.json`);

    console.log ('check loadCookies From File 00', fileName);

    const cookiesString = await fs.readFile(cookiePath, { encoding: 'utf-8' });
    const localStorageData = await fs.readFile(localPath, { encoding: 'utf-8' });
    const sessionStorageData = await fs.readFile(sessionPath, { encoding: 'utf-8' });

    if ( cookiesString ) {
      const cookies = JSON.parse(cookiesString);
      console.log('[loadCookiesFromFile] Parsed cookies:', cookies);
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
    if (cookies && Array.isArray(cookies)) {
      console.log('[setCookie] Cookies to set:', cookies);

      // for (const c of cookies) {
      //   if (typeof c.name !== 'string') {
      //     //console.error('[setCookie] Invalid cookie name:', c);
      //     //throw new Error(`Cookie with invalid name: ${JSON.stringify(c)}`);
      //     console.error('[setCookie] Invalid cookie name:', c);
      //     // Вместо throw, просто логируем и выходим
      //     return;
      //   }
      // }
      // await this._page.setCookie(...cookies);

      // Отфильтровать куки, у которых есть валидное имя (строка непустая)
      //const validCookies = cookies.filter(c => typeof c.name === 'string' && c.name.trim() !== '');
      const validCookies = cookies.filter(c =>
        c &&
        typeof c === 'object' &&
        typeof c.name === 'string' && c.name.trim() !== '' &&
        typeof c.value === 'string' && c.value.length > 0 &&
        typeof c.domain === 'string' && c.domain.trim() !== '' &&
        typeof c.path === 'string' && c.path.trim() !== ''
      );

      if (validCookies.length !== cookies.length) {
        console.warn(`[setCookie] Отфильтровано ${cookies.length - validCookies.length} куки с некорректным именем.`);
      }

      if (validCookies.length === 0) {
        console.warn('[setCookie] Нет валидных куков для установки, выходим.');
        return;
      }

      // Перед установкой: удалить из каждого куки поля, которые Puppeteer не принимает (например, size, session, sourceScheme, sourcePort)
      // const cleanedCookies = validCookies.map(({name, value, domain, path, expires, httpOnly, secure, sameSite}) => ({
      //   name,
      //   value,
      //   domain,
      //   path,
      //   expires: expires ? Math.floor(expires) : undefined,
      //   httpOnly,
      //   secure,
      //   sameSite
      // }));

      const cleanedCookies = validCookies.map((cookie) => ({
        name: String(cookie.name),
        value: String(cookie.value),
        domain: String(cookie.domain),
        path: String(cookie.path),
        expires: typeof cookie.expires === 'number' ? Math.floor(cookie.expires) : undefined,
        httpOnly: !!cookie.httpOnly,
        secure: !!cookie.secure,
        sameSite: typeof cookie.sameSite === 'string' ? cookie.sameSite : undefined,
      }));
      console.log('[setCookie] Устанавливаем куки:', cleanedCookies.map(c => ({name: c.name, expires: c.expires})));
      // Устанавливаем только валидные куки
      console.log('[DEBUG] Проверка куки перед установкой:');
      for (const c of cleanedCookies) {
        console.log(`[cookie] name=${c.name} (${typeof c.name}), domain=${c.domain} (${typeof c.domain}), path=${c.path} (${typeof c.path})`);
      }

      // for (const c of cleanedCookies) {
      //   if (typeof c.name !== 'string') {
      //     console.warn('[WARN] ❗️Invalid cookie name detected before setCookie:', c);
      //   }
      // }

      for (const c of cleanedCookies) {
        if (typeof c.name !== 'string' || typeof c.domain !== 'string' || typeof c.path !== 'string') {
          console.warn('[WARN] ❗️Invalid cookie fields before setCookie:', {
            name: c.name,
            domain: c.domain,
            path: c.path,
            cookie: c,
          });
        }
      }
      await this._page.setCookie(...cleanedCookies);
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




