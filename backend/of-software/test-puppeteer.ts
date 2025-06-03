import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto('https://example.com');
  console.log('Страница открыта. Закройте окно браузера, чтобы завершить.');
  // Ждём, пока вы сами закроете браузер:
  await browser.waitForTarget(t => false);
})();
