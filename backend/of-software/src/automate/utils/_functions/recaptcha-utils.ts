// src/_functions/recaptcha-utils.ts
import type { Page } from 'puppeteer';
let captchaAlreadySolved = false;

/**
 * Сбрасывает флаг решения капчи.
 * Вызывается в начале каждой новой попытки логина.
 */
export function resetCaptchaFlag(): void {
  captchaAlreadySolved = false;
}

/**
 * Отмечает, что капча уже решена в этой попытке.
 */
export function markCaptchaSolved(): void {
  captchaAlreadySolved = true;
}

/**
 * Проверяет, есть ли на странице сообщение об ошибке логина.
 * @returns текст ошибки или null, если сообщения нет.
 */
export async function checkLoginError(
  page: Page,
  errorSelector: string
): Promise<string | null> {
  try {
    const txt = await page.$eval(errorSelector, (el) => el.textContent?.trim() || '');
    return txt || null;
  } catch {
    return null;
  }
}

/**
 * Если ещё не решали капчу в этой попытке, то:
 * - детектит Turnstile и решает его,
 * - или детектит reCAPTCHA и решает её,
 * иначе — продолжает дальше.
 */
export async function handleCaptchaBeforeClick(page: Page): Promise<void> {
  console.log('handleCaptchaBeforeClick check ', captchaAlreadySolved);
  if (captchaAlreadySolved) return;

  const [hasRecap, hasTurn] = await Promise.all([
    page.$('.captcha_wrapper iframe[title="reCAPTCHA"]').then((el) => !!el).catch(() => false),
    page.$('iframe[title*="challenge"]').then((el) => !!el).catch(() => false),
  ]);

  if (hasTurn) {
    console.log('🔄 handleCaptcha: Turnstile обнаружен → решаем…');
    try {
      await triggerTurnstile(page);
    } catch {
      console.log('⚠️ Turnstile упал — переключаемся на reCAPTCHA');
      await triggerRecaptcha(page);
    }
    markCaptchaSolved();
  } else if (hasRecap) {
    console.log('🔐 handleCaptcha: reCAPTCHA обнаружена → решаем…');
    await triggerRecaptcha(page);
    markCaptchaSolved();
  }
}

/**
 * Решает Google reCAPTCHA:
 * 1) Находит iframe → кликает чекбокс → ждёт заполнения textarea.
 */
export async function triggerRecaptcha(page: Page): Promise<void> {
  console.log('export async function triggerRecaptcha');
  const iframe = await page.waitForSelector(
    '.captcha_wrapper iframe[title="reCAPTCHA"]',
    { timeout: 10_000 }
  );
  const frame = await iframe.contentFrame();
  if (!frame) throw new Error('Не удалось получить reCAPTCHA iframe');

  await (await frame.waitForSelector('#recaptcha-anchor', {
    visible: true, timeout: 10_000
  })).click();

  await page.waitForFunction(
    () => !!document
      .querySelector<HTMLTextAreaElement>('#g-recaptcha-response')
      ?.value.trim(),
    { polling: 500, timeout: 5 * 60_000 }
  );

  markCaptchaSolved();
  console.log('✔️ reCAPTCHA решена captchaAlreadySolvedv->', captchaAlreadySolved);
}

/**
 * Решает Cloudflare Turnstile:
 * 1) Находит iframe → кликает чекбокс/button → ждёт появления ответа.
 */
export async function triggerTurnstile(page: Page): Promise<void> {
  console.log('🔄 Turnstile обнаружен, решаем…');

  //setTimeout(1000);
  const iframe = await page.waitForSelector('iframe[title*="challenge"]', { timeout: 10_000 });
  const frame = await iframe.contentFrame();
  if (!frame) throw new Error('Не удалось получить Turnstile iframe');

  await (await frame.waitForSelector(
    '.cf-turnstile-checkbox, #cf-submit, button',
    { visible: true, timeout: 10_000 }
  )).click();

  await page.waitForFunction(
    () => {
      const t =
        document.querySelector<HTMLTextAreaElement>('textarea[name="cf-turnstile-response"]')
        || document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]');
      return !!t?.value;
    },
    { polling: 500, timeout: 120_000 }
  );
  markCaptchaSolved();
  console.log('✔️ Turnstile решён captchaAlreadySolvedv->', captchaAlreadySolved);
  //console.log('✔️ Turnstile решён');
}

export async function startCaptchaExtension(page: Page): Promise<void> {
  console.log('>>> startCaptchaExtension called');

  const browser = page.browser();
  await new Promise((res) => setTimeout(res, 700)); // ждём 700 мс для загрузки targets
  const targets = await browser.targets();
  const extTarget = targets.find(t =>
    t.url().startsWith('chrome-extension://') &&
    ['background_page','service_worker'].includes(t.type())
  );
  if (!extTarget) {
    console.warn('HCAPT-extension не найден среди targets');
    return;
  }
  const extensionId = extTarget.url().split('/')[2];

  // Загружаем manifest.json, чтобы узнать default_popup
  const mf = await browser.newPage();
  const resp = await mf.goto(
    `chrome-extension://${extensionId}/manifest.json`,
    { waitUntil: 'networkidle2' }
  );
  if (!resp || resp.status() !== 200) {
    await mf.close();
    throw new Error('Не удалось загрузить манифест HCAPT: status != 200');
  }
  const manifest = JSON.parse(await mf.evaluate(() => document.body.innerText));
  await mf.close();

  const popupPath = manifest.action?.default_popup || manifest.browser_action?.default_popup;
  if (!popupPath) throw new Error('default_popup не найден в манифесте HCAPT');

  const candidates = [popupPath, `popup/${popupPath}`, 'popup/index.html', 'popup/popup.html'];
  let popup: Page | null = null, lastErr: any = null;
  for (const p of candidates) {
    try {
      popup = await browser.newPage();
      await popup.goto(`chrome-extension://${extensionId}/${p}`, { waitUntil: 'networkidle2' });
      break;
    } catch (e) {
      lastErr = e;
      if (popup) { await popup.close(); popup = null; }
    }
  }
  if (!popup) throw new Error(`HCAPT popup не найден: ${lastErr?.message}`);

  // try {
  //   const btn = await popup.waitForSelector('#hcapt-solve-btn', { visible: true, timeout: 5_000 });
  //   if (btn) {
  //     await btn.click();
  //     console.log('🔧 HCAPT Solve clicked');
  //   } else {
  //     console.log('Skipped HCAPT Solve click');
  //   }
  //
  //
  // } catch (e){
  //   console.warn('HCAPT Solve button не найден', e);
  // }
  await popup.close();
}
