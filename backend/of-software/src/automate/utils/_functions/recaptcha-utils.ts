// src/_functions/recaptcha-utils.ts
import type { Page } from 'puppeteer';

let captchaAlreadySolved = false;

/**
 * Экспортируем класс, чтобы его можно было
 * импортировать в старом файле login(...).
 */
export class RecaptchaUtil {
  /**
   * Эмулирует ожидание решения reCAPTCHA v2/v3.
   * Поскольку вы используете бесплатный плагин, он сам «поднимает» капчу
   * и решает её, поэтому тут достаточно просто сделать setTimeout.
   *
   * @param siteKey – ключ капчи (из URL iframe)
   * @param pageUrl – текущая страница (для логов, если нужно)
   * @param timeoutSec – сколько секунд ждать (например, 30)
   * @param version – 2 или 3
   */
  public async resolveRecaptcha2(
    siteKey: string,
    pageUrl: string,
    timeoutSec: number,
    version: number
  ): Promise<string> {
    console.log(`⏳ RecaptchaUtil: ждём ${timeoutSec} сек. для решения reCAPTCHA v${version} (siteKey=${siteKey})`);
    await new Promise((res) => setTimeout(res, timeoutSec * 1000));
    console.log('✔️ RecaptchaUtil: капча, судя по всему, решена (или пропущена плагином).');
    return '';
  }
}


// ---- Ниже идут старые функции «по работе с капчей».
//     Они экспортируются, чтобы их можно было вызывать
//     в вашей «fallback» логике, если потребуется.

export function resetCaptchaFlag(): void {
  captchaAlreadySolved = false;
}

export function markCaptchaSolved(): void {
  captchaAlreadySolved = true;
}

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

export async function handleCaptchaBeforeClick(page: Page): Promise<void> {
  console.log('handleCaptchaBeforeClick');
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
  console.log('✔️ reCAPTCHA решена');
  markCaptchaSolved();
}

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
  console.log('✔️ Turnstile решён');
}

export async function startCaptchaExtension(page: Page): Promise<void> {
  console.log('>>> startCaptchaExtension called');

  const browser = page.browser();// синхронно получаем браузер
  const targets = await browser.targets(); // асинхронно получаем targets
  //const extTarget = (await browser.targets()).find(
  const extTarget = targets.find(
    (t) => t.url().startsWith('chrome-extension://') && ['background_page','service_worker'].includes(t.type())
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
    throw new Error('Не удалось загрузить манифест HCAPT  if (!resp || resp.status() !== 200) await mf.close();');
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

  try {
    const btn = await popup.waitForSelector('#hcapt-solve-btn', { visible: true, timeout: 5_000 });
    await btn.click();
    console.log('🔧 HCAPT Solve clicked');
  } catch {
    console.warn('HCAPT Solve button не найден');
  }
  await popup.close();
}
