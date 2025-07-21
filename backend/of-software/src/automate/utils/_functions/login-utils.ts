// src/_functions/login-utils.ts
import type { Page } from 'puppeteer';
import { CONFIG } from '../config/step-config';
import {
  triggerRecaptcha,
  triggerTurnstile,
  startCaptchaExtension,
  handleCaptchaBeforeClick,
  resetCaptchaFlag,
  markCaptchaSolved,
  checkLoginError,
} from './recaptcha-utils';
import { setTimeout } from 'node:timers/promises';
import { acceptCookie, saveCookieToFile, loadCookiesFromFile  } from './cookies-utils';

/**
 * Один проход логина с поддержкой нескольких капч:
 * 1) Заполняем поля email и password
 * 2) Ждём разблокировки кнопки или появления ошибки (10 с)
 * 3) Кратко проверяем, не появилась ли капча (7 с)
 * 4) Решаем Turnstile → при ошибке пробуем reCAPTCHA
 * 5) Проверяем сразу же ошибку логина и, если её нет — решаем капчу
 * 6) Первый клик по Login
 * 7) Race: feed / ошибка / кнопка разблокилась (5 с)
 *    • Если сразу в ленте → успех
 *    • Если ошибка «Wrong…»/«Too many…» → выход
 *    • Иначе (кнопка всё ещё disabled) — запускаем polling (4×15 с):
 *         – проверяем ленту → успех
 *         – проверяем ошибку → выход
 *         – ждём 15 с → повтор
 *    • Если polling закончился без результата → extension-fallback
 * 8) После extension — финальный клик и проверка результата (60 с)
 */
export async function performLoginOnce(
  page: Page,
  config: typeof CONFIG,
  username: string,
  password: string
): Promise<boolean> {
  const { idSelector, passwordSelector, submitSelector } = config.login;
  const { loginErrorMessage: errorSel, profileFeed: feedSel } = config.selectors;

  resetCaptchaFlag();

  // 1) вводим email + password
  await page.type(idSelector, username, { delay: 130 });
  await page.type(passwordSelector, password, { delay: 200 });

  // === Первый клик ===
  await setTimeout(5000);
  // await page.click(submitSelector);
  // console.log('▶️ Первый клик по Login');
  // await setTimeout(5000);

  // 2) ждём кнопку или ошибку (10 с)
  const phase1 = await Promise.race<'failure' | 'enabled'>([
    page.waitForSelector(errorSel, { timeout: 10_000 }).then(() => 'failure'),
    page.waitForSelector(`${submitSelector}:not([disabled])`, { timeout: 10_000 }).then(() => 'enabled'),
  ]);
  if (phase1 === 'failure') {
    const msg = await page.$eval(errorSel, el => el.textContent?.trim() || '');
    console.log(`❌ Ошибка до клика: "${msg}"`);
    return false;
  }

  // 3) краткая проверка капчи (7 с)
  const [capRecap, capTurn] = await Promise.all([
    page.waitForSelector('.captcha_wrapper iframe[title="reCAPTCHA"]', { timeout: 3_500 })
      .then(() => true).catch(() => false),
    page.waitForSelector('iframe[title*="challenge"]', { timeout: 3_500 })
      .then(() => true).catch(() => false),
  ]);

  // 4) решаем встроенные капчи
  if (capTurn) {
    console.log('🔄 Решаем Turnstile до клика…');
    try {
      await triggerTurnstile(page);
    } catch {
      console.log('⚠️ Turnstile упал — решаем reCAPTCHA');
      await triggerRecaptcha(page);
    }
  } else if (capRecap) {
    console.log('🔐 Решаем reCAPTCHA до клика…');
    await triggerRecaptcha(page);
  }


  // 5) проверяем ошибку логина перед кликом
  const preError = await checkLoginError(page, errorSel);
  if (preError) {
    console.error(`🚨 Ошибка перед кликом: "${preError}"`);
    return false;
  }

  // 6) перед кликом решаем капчу, если она ещё не решена
  await handleCaptchaBeforeClick(page);
  console.log('▶️ handleCaptchaBeforeClick');
  // === Второй клик ===
  await page.click(submitSelector);
  console.log('▶️ Второй клик по Login');

  // === Race: feed / error / кнопка разблокилась (5 с) ===
  const result = await Promise.race<'success'|'error'|'button'>([

    page.waitForSelector(feedSel, { timeout: 5000 }).then(() => 'success'),
    page.waitForSelector(errorSel, { timeout: 5000 }).then(() => 'error'),
    page.waitForSelector(`${submitSelector}:not([disabled])`, { timeout: 5000 }).then(() => 'button'),
  ]).catch(() => 'button');

  console.log('result ->',result);
  if (result === 'success') {
    console.log('✅ Залогинились сразу после первого клика');
    return true;
  }
  if (result === 'error') {
    const errText = await page.$eval(errorSel, el => el.textContent?.trim() || '');
    console.error(`🚨 Ошибка после клика: "${errText}"`);

    if (errText.includes('Wrong email') || errText.includes('is not valid')) {
      console.error('🚫 Неверный email или пароль — прекращаем попытку');
      return false;
    }
    if (errText.includes('Too many requests')) {
      console.warn('⏱ Ограничение запросов — ждём 5 сек');
      await setTimeout(5000);
      return false;
    }
  }

  console.warn('empty result -> ',result);
  let elapsed = 0;
  while (elapsed < 20_000) {
    if (await page.$(feedSel)) {
      console.log('✅ Лента появилась в polling, считаем логин успешным');
      return true;
    }
    const postErr = await checkLoginError(page, errorSel);
    if (postErr) {
      console.error(`🚨 Ошибка в polling: "${postErr}" — выходим`);
      return false;
    }
    console.log('⏱ Ещё не в ленте, ждём 10 сек…');
    await setTimeout(10_000);
    elapsed += 10_000;
  }

  console.warn('⚠️ Таймаут ожидания ленты/ошибки после первого клика');
  console.log('🔧 Запускаем HCAPT-extension…');

  await startCaptchaExtension(page);

  markCaptchaSolved();

  // === После extension: финальный клик ===
  await page.waitForSelector(`${submitSelector}:not([disabled])`, { timeout: 200_000 }).catch(() => {});
  await setTimeout(1_000);
  await handleCaptchaBeforeClick(page);
  console.log('▶️ Click after extension');
  await page.click(submitSelector);
  console.log('▶️ Финальный клик по Login -> Start delay 55 sec');
  await setTimeout(55_000);
  // После успешного логина перед getCookie
  console.log('[saveCookieToFile] ⏳ Ждём появления ключевых cookies...');

  // === Проверка результата (60 с) ===
  const success = await Promise.race<boolean>([
    page.waitForSelector(feedSel, { timeout: 60_000 }).then(() => true),
    page.waitForSelector(errorSel, { timeout: 60_000 }).then(() => false),
  ]);
  if (!success) {
    console.log('❌ Финальная ошибка:', await page.$eval(errorSel, el => el.textContent?.trim()));
  }
  return success;
}

/**
 * Повторяем performLoginOnce до maxAttempts:
 * при неудаче — очищаем форму, перезагружаем страницу и принимаем куки заново.
 */
export async function performLoginWithRetries(
  page: Page,
  config: typeof CONFIG,
  username: string,
  password: string,
  maxAttempts = 3
): Promise<boolean> {
  const { loginErrorMessage: errorSel } = config.selectors;
  for (let i = 1; i <= maxAttempts; i++) {
    console.log(`🔑 Попытка входа #${i}…`);
    const ok = await performLoginOnce(page, config, username, password);
    if (ok) {
      console.log('✅ Успешно вошли');
      return true;
    }
    // если «Wrong email or password» — сразу прекратить
    const err = await page.$eval(errorSel, el => el.textContent?.trim()).catch(() => '');
    if (err.includes('Wrong email or password')) {
      console.error('🚨 Неверный email или пароль — прекращаем попытки');
      return false;
    }
    console.log('❌ Сброс формы и перезагрузка…');

    await page.evaluate(() => {
      (document.querySelector('input[name="email"]') as HTMLInputElement).value = '';
      (document.querySelector('input[name="password"]') as HTMLInputElement).value = '';
    });
    await setTimeout(1_000);
    await page.reload({ waitUntil: 'networkidle2' });
    await acceptCookie.call(this); // ✅ this = PuppeteerUtil
  }
  console.error('⛔ Не удалось войти за все попытки');
  return false;
}
