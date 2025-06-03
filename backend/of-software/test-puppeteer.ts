import puppeteer from 'puppeteer-extra';
import { executablePath } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
  puppeteer.use(StealthPlugin());

  // Берём путь к локально скачанному Chromium (в ~/.cache/puppeteer)
  const exePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || executablePath();
  console.log('→ test-puppeteer: запускаем Chrome по пути:', exePath);

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: exePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--window-size=1280,720',
    ],
    defaultViewport: null,
    dumpio: true, // чтобы логи Chromium шли в stdout/stderr
  });

  const page = await browser.newPage();
  await page.goto('https://example.com');
  console.log('→ Окно браузера должно появиться в RDP, жду 15 сек...');
  await page.waitForTimeout(15000);
  await browser.close();
  console.log('→ Браузер закрыт, тест завершён.');
})();
