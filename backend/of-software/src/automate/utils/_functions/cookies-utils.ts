// src/_functions/cookies-utils.ts
import type { Page } from 'puppeteer';
import { promises as fs } from 'fs';
import { setTimeout } from 'node:timers/promises';
import _fs from 'fs';

export async function acceptCookie() {
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
  await this.work(acceptCookieWork);
}

export async function  setCookie(cookies?: any) {
  try {
    if (cookies) {
      await this._page.setCookie(...cookies);
    }
  } catch (error) {
    console.log('Error : ', error);
  }
}
export async function  getCookie() {
  try {
    const cookies = await this._page.cookies();
    return cookies;
  } catch (error) {
    console.log('Error: ', error);
  }
}

export async function  saveCookieToFile(fileName: string) {
  const cookies = await this.getCookie();
  const localStorageData = await this._page.evaluate(() =>
    JSON.stringify(localStorage),
  );
  const sessionStorageData = await this._page.evaluate(() =>
    JSON.stringify(sessionStorage),
  );
  if (!_fs.existsSync('./cookies')) {
    _fs.mkdirSync('./cookies', { recursive: true });
  }
  await fs.writeFile(
    `./cookies/${fileName}_cookie.json`,
    JSON.stringify(cookies),
  );
  await fs.writeFile(
    `./cookies/${fileName}_localstorage.json`,
    JSON.stringify(localStorageData),
  );
  await fs.writeFile(
    `./cookies/${fileName}_sessionstorage.json`,
    JSON.stringify(sessionStorageData),
  );
  console.log('Cookies saved to file:', `./${fileName}_***.json`);
}

export async function  loadCookiesFromFile(fileName: string) {
  try {
    const cookiesString = await fs.readFile(
      `./cookies/${fileName}_cookie.json`,
      {
        encoding: 'utf-8',
      },
    );

    if (cookiesString) {
      const cookies = JSON.parse(cookiesString);
      await this.setCookie(cookies);
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
      await this._page.evaluate(
        (data) => {
          localStorage.clear();
          sessionStorage.clear();
          const parsedLocalStorageData = JSON.parse(data.localStorageData);
          const parsedSessionStorageData = JSON.parse(
            data.sessionStorageData,
          );
          for (const key in parsedLocalStorageData) {
            localStorage.setItem(key, parsedLocalStorageData[key]);
          }
          for (const key in parsedSessionStorageData) {
            sessionStorage.setItem(key, parsedSessionStorageData[key]);
          }
        },
        { localStorageData, sessionStorageData },
      );
    }
  } catch (error) {
    console.error('Error loading cookies from file:', error);
  }
}
