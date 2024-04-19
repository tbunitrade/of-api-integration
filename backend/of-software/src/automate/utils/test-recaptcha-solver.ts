//@ts-nocheck
import { executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { RecaptchaUtil } from './recaptcha';
import { resolveCaptcha, resolveCaptchaV3 } from './anticaptcha';
import * as path from 'path';
import { Solver } from '2captcha-ts';
const APIKEY = '1f98aeffff33253bdcbe8b92bc9f7d3f';
const solver = new Solver(APIKEY);

const pathToExtension = path.join(
  __dirname + '/../../../../',
  '2captcha-solver',
);

const testRecaptchaSolver = async () => {
  puppeteer.use(StealthPlugin());
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 10,
    args: [
      // `--disable-extensions-except=${pathToExtension}`,
      // `--load-extension=${pathToExtension}`,
      `--window-size=1920,1080`,
    ],
    executablePath: executablePath(),
  });

  const page = await browser.newPage();
  // await page.setViewport({ width: 1080, height: 1024 });

  await page.goto('https://2captcha.com/demo/recaptcha-v2-enterprise', {
    timeout: 500000,
  });
  await page.waitForSelector('.g-recaptcha');

  // Extract the `sitekey` parameter from the page.
  const sitekey = await page.evaluate(() => {
    return document.querySelector('.g-recaptcha').getAttribute('data-sitekey');
  });

  // Get actual page url
  const pageurl = await page.url();

  // Submitting the captcha for solution to the service
  // const recaptchaUtil = new RecaptchaUtil();
  // const res = await recaptchaUtil.resolveRecaptcha2(sitekey, pageurl, 20, 2);
  // const res = await resolveCaptcha(pageurl, sitekey);

  // Getting a captcha response including a captcha answer
  // const captchaAnswer = res;

  const res = await solver.recaptcha({
    pageurl: pageurl,
    googlekey: sitekey,
  });

  console.log(res);

  const captchaAnswer = res.data;

  // Use captcha answer
  const setAnswer = await page.evaluate((captchaAnswer) => {
    // It is not necessary to make this block visible, it is done here for clarity.
    document.querySelector('#g-recaptcha-response').style.display = 'block';
    document.querySelector('#g-recaptcha-response').value = captchaAnswer;
  }, captchaAnswer);

  // Press the button to check the result.
  await page.click('button[type="submit"]');

  // Check result
  await page.waitForSelector('form div p');

  const resultBlockSelector = 'form div p';
  const statusSolving = await page.evaluate((selector) => {
    return document.querySelector(selector).innerText;
  }, resultBlockSelector);

  console.log('Token: ', statusSolving);
  // statusSolving = JSON.parse(statusSolving);
  if (statusSolving) {
    console.log('Captcha solved successfully!!!');
  }

  await page.waitForTimeout(5000);
  browser.close();
};
export default testRecaptchaSolver;
