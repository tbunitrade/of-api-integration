import { executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as path from 'path';
import { solveRecaptcha } from './nopecha';
import _fs from 'fs';
import { RecaptchaUtil } from './recaptcha';
const fs = _fs.promises;
const pathToExtension = path.join(
  __dirname + '/../../../../',
  '2captcha-solver',
);

/**
 * Config variables*/
export const CONFIG = {
  login_workflow: ['login', 'check_page', 'login_captcha', 'check_page'],
  login: {
    pageSelector: '.login_content',
    idSelector: 'input[name="email"]',
    passwordSelector: 'input[name="password"]',
    submitSelector: '.b-loginreg__form button[type="submit"]',
    idValue: '$value',
    passwordValue: '$value',
  },
  check_page: {
    isCheckPage: true,
    pageSelector: '#app #content',
  },
  login_captcha: {
    isRecaptcha: true,
    hasDefaultCaptcha: true,
    captchaSelector: 'div.captcha_wrapper iframe',
    defaultCaptchaKey: '6LcvNcwdAAAAAMWAuNRXH74u3QePsEzTm6GEjx0J',
    captchaKind: 'g_recaptcha',
    defaultCaptchaType: 'recaptcha3',
    defaultCaptchaVersion: 3,
    captchaVersion: 2,
    captchaType: 'recaptcha2',
    pageSelector: '.login_content',
    idSelector: 'input[name="email"]',
    passwordSelector: 'input[name="password"]',
    submitSelector: '.b-loginreg__form button[type="submit"]',
  },
  work: [
    {
      type: 'waitForTime',
      value: '30000',
    },
    {
      type: 'waitForSelector',
      value: '#content .b-chats .b-chats__conversations-list',
    },
    {
      type: 'waitForSelector', // New message => Send To => View All
      value:
        '.b-chats__conversations.m-create-chat .b-chats__conversations-list .b-content-filter button.m-link',
    },
    {
      type: 'click', // New message => Send To => View All
      value:
        '.b-chats__conversations.m-create-chat .b-chats__conversations-list .b-content-filter button.m-link',
    },
    {
      type: 'waitForTime',
      value: '1000',
    },
    {
      type: 'waitForSelector',
      value:
        '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_body_ .m-collections-list',
    },
    {
      type: 'loop',
      key: 'message_list',
      value: '$value',
      childs: [
        {
          type: 'waitForSelector',
          value:
            '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .modal-header__btns-group button',
        },
        {
          type: 'click',
          value:
            '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .modal-header__btns-group button',
        },
        {
          type: 'waitForTime',
          value: '500',
        },
        {
          type: 'type',
          value: '$value',
          selector:
            '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .b-chat__search-input',
        },
        {
          type: 'click',
          value:
            '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .modal-header__btns-group button',
        },

        {
          type: 'waitForTime',
          value: '5000',
        },
        {
          type: 'clickForValue',
          value: '$value',
          selector:
            '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_body_ .b-rows-lists .b-rows-lists__item__label',
        },
      ],
    },

    {
      type: 'click',
      value:
        '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_footer_ button',
    },
    {
      type: 'waitForTime',
      value: '1000',
    },

    {
      type: 'click', // New message => Exclude => View All
      value:
        '.b-chats__conversations.m-create-chat .b-chats__conversations-list .b-chats__collapse-section button.m-link',
    },
    {
      type: 'waitForTime',
      value: '1000',
    },
    {
      type: 'waitForSelector',
      value:
        '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_body_ .m-collections-list',
    },
    {
      type: 'loop',
      key: 'message_exclude_list',
      value: '$value',
      childs: [
        {
          type: 'waitForSelector',
          value:
            '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .modal-header__btns-group button',
        },
        {
          type: 'click',
          value:
            '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .modal-header__btns-group button',
        },
        {
          type: 'waitForTime',
          value: '500',
        },
        {
          type: 'type',
          value: '$value',
          selector:
            '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .b-chat__search-input',
        },
        {
          type: 'click',
          value:
            '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .modal-header__btns-group button',
        },

        {
          type: 'waitForTime',
          value: '5000',
        },
        {
          type: 'clickForValue',
          value: '$value',
          selector:
            '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_body_ .b-rows-lists .b-rows-lists__item__label',
        },
      ],
    },
    {
      type: 'click',
      value:
        '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_footer_ button',
    },
    {
      type: 'waitForTime',
      value: '1000',
    },
    {
      type: 'type',
      key: 'message',
      selector:
        '.b-chats__conversations-content #make_post_form #new_post_text_input',
      value: '$value',
    },
    {
      type: 'click', // Schedule Message Btn
      value:
        '.b-chats__conversations-content form#make_post_form .b-make-post__actions .b-make-post__datepicker-btn',
    },
    {
      type: 'waitForTime',
      value: '1000',
    },
    {
      type: 'waitForSelector',
      value: '.b-make-post__datepicker-input .vdatetime-popup',
    },
    {
      type: 'compareValue',
      key: 'message_month',
      value: '$value',
      selector:
        '.b-make-post__datepicker-input .vdatetime-calendar__current--month',
    },
    {
      type: 'condition',
      childs: {
        yes: null,
        no: {
          type: 'click',
          value:
            '.b-make-post__datepicker-input .vdatetime-calendar__navigation--next',
        },
      },
    },
    {
      type: 'waitForTime',
      value: '1000',
    },
    {
      type: 'clickForValue',
      key: 'message_date',
      selector:
        '.b-make-post__datepicker-input .vdatetime-calendar .vdatetime-calendar__month__day',
      value: '$value',
    },
    {
      type: 'click',
      value: '.b-make-post__datepicker-input .vdatetime-popup__tab.time',
    },
    {
      type: 'waitForTime',
      value: '500',
    },
    {
      type: 'clickForValue',
      key: 'message_hour',
      selector:
        '.b-make-post__datepicker-input .vdatetime-time-picker__list.vdatetime-time-picker__list--hours .vdatetime-time-picker__item',
      value: '$value',
    },

    {
      type: 'clickForValue',
      key: 'message_minute',
      selector:
        '.b-make-post__datepicker-input .vdatetime-time-picker__list.vdatetime-time-picker__list--minutes .vdatetime-time-picker__item',
      value: '$value',
    },
    {
      type: 'clickForValue',
      key: 'message_time_suffix',
      value: '$value',
      selector:
        '.b-make-post__datepicker-input .vdatetime-time-picker__list.vdatetime-time-picker__list--suffix .vdatetime-time-picker__item',
    },
    {
      type: 'waitForTime',
      value: '1000',
    },
    {
      type: 'click',
      value:
        '.b-make-post__datepicker-input .vdatetime-popup__actions .vdatetime-popup__actions__button--confirm button',
    },
    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'click', // Release tags
      value:
        '.b-chats__conversations-content form#make_post_form .b-make-post__actions button[at-attr="release_forms_btn"]',
    },
    {
      type: 'waitForTime',
      value: '1000',
    },
    {
      type: 'waitForSelector',
      value:
        '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form--items',
    },
    {
      type: 'waitForSelector',
      value:
        '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_header_ .b-content-filter__group-btns>button',
    },
    {
      type: 'click',
      value:
        '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_header_ .b-content-filter__group-btns>button',
    },
    {
      type: 'loop',
      key: 'release_user_tags',
      value: '$value',
      childs: [
        {
          type: 'waitForTime',
          value: '500',
        },
        {
          type: 'type',
          value: '$value',
          selector:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form--items .b-search-form .b-search-form__input',
        },
        {
          type: 'click',
          value:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form--items .b-search-form button[type="submit"]',
        },

        {
          type: 'waitForTime',
          value: '5000',
        },
        {
          type: 'click',
          value:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form__docs .b-rows-lists .b-rows-lists__item__label',
        },
      ],
    },

    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'click', //click "add" button on release form/user tags.
      value:
        '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form--items .b-tabs__nav button.b-tabs__nav__item:not(.m-current)',
    },

    {
      type: 'waitForTime',
      value: '5000',
    },

    {
      type: 'loop',
      key: 'release_form_tags',
      value: '$value',
      childs: [
        // {
        //   type: 'waitForSelector', // wait for search button.
        //   value:
        //     '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_header_ .b-content-filter__group-btns>button',
        // },
        // {
        //   type: 'click', // click search button.
        //   value:
        //     '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_header_ .b-content-filter__group-btns>button',
        // },
        {
          type: 'waitForTime',
          value: '500',
        },
        {
          type: 'type', // type search string.
          value: '$value',
          selector:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form--items .b-search-form .b-search-form__input',
        },
        {
          type: 'click', //click search button again after typing.
          value:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form--items .b-search-form button[type="submit"]',
        },

        {
          type: 'waitForTime',
          value: '5000',
        },
        {
          type: 'clickForValue', //click label including value from search result.
          value: '$value',
          selector:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form__docs .b-rows-lists .b-rows-lists__item__label',
        },
      ],
    },

    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'click', //click "add" button on release form/user tags.
      value:
        '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-placeholder-item-selected .b-wrapper-selected .b-row-selected__controls button',
    },

    {
      type: 'click', //click "close" button on release form/user tags if not exist add button.
      value:
        '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_footer_ button[type="button"]',
    },

    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'appendMedias', // click add image button and add images
      key: 'content',
      value: '$value', // url list separted by ','. Ex: http://example.com/upload/aaa.png,http://example.com/upload/bbb.svg,http://example.com/upload/ccc.jpg
      selector:
        '.b-chats__conversations-content .b-chat #make_post_form .b-make-post__actions button#attach_file_photo',
    },

    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'click', // Click Message Price
      value:
        '.b-chats__conversations-content .b-chat #make_post_form .b-make-post__actions button[at-attr="price_btn"]',
    },

    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'type', // typing price
      value: '$value',
      key: 'message_price',
      selector:
        '#ModalPostPrice___BV_modal_outer_ #ModalPostPrice #ModalPostPrice___BV_modal_content_ #ModalPostPrice___BV_modal_body_ input',
    },

    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'clickForValue', // Click Save button on Message Price dialog
      selector:
        '#ModalPostPrice___BV_modal_outer_ #ModalPostPrice #ModalPostPrice___BV_modal_content_ #ModalPostPrice___BV_modal_footer_ button',
      value: 'Save',
    },

    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'clickForValue', // Click Cancel button on Message Price dialog if Save button is not clicked
      selector:
        '#ModalPostPrice___BV_modal_outer_ #ModalPostPrice #ModalPostPrice___BV_modal_content_ #ModalPostPrice___BV_modal_footer_ button',
      value: 'Cancel',
    },

    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'click', // Click left bar once.
      value:
        '#content .b-chats__conversations .b-chats__conversations-content .m-chat-footer #make_post_form .b-make-post__main-wrapper .b-make-post__media-slider.m-free.m-empty button.b-make-post__sort-btns',
    },

    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'loop',
      key: 'free_preview',
      value: '$value', // 1,2,3
      childs: [
        {
          type: 'click', // Click check boxes.
          value:
            '#content .b-chats__conversations .b-chats__conversations-content .m-chat-footer #make_post_form .b-make-post__main-wrapper .b-make-post__media-slider.m-paid .b-make-post__media-slider__inner .b-make-post__media-photos .b-make-post__preview:nth-child($value) button.checkbox-item',
        },
        {
          type: 'waitForTime',
          value: '500',
        },
      ],
    },

    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'condition',
      childs: {
        no: null,
        yes: {
          type: 'click', // Click left bar once.
          value:
            '#content .b-chats__conversations .b-chats__conversations-content .m-chat-footer #make_post_form .b-make-post__main-wrapper .b-make-post__sort-btns button.b-make-post__sort-btn:nth-child(1)',
        },
      },
    },

    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'click', // Click Done button.
      value:
        '#content .b-chats__conversations .b-chats__conversations-content .m-chat-footer #make_post_form .b-make-post__main-wrapper .b-make-post__sort-btns button.b-make-post__sort-done-btn',
    },

    {
      type: 'waitForTime',
      value: '500',
    },

    {
      type: 'click', // Click Send Button
      value:
        '.b-chats__conversations-content form#make_post_form button.b-chat__btn-submit',
    },
    {
      type: 'waitForTime',
      value: '500',
    },
    {
      type: 'clickForValue',
      value: 'Yes',
      selector: '.modal-dialog-centered footer button',
    },
    {
      type: 'waitForTime',
      value: '1000',
    },
    {
      type: 'waitForNavigation',
      value: '',
    },
    {
      type: 'waitForSelector',
      value: '.queue-main',
    },
    {
      type: 'click',
      value: '#app .l-header nav a[data-name="Chats"]',
    },
    {
      type: 'waitForSelector',
      value: '#content .b-chats__header a[href="/my/chats/send"]',
    },
    {
      type: 'click',
      value: '#content .b-chats__header a[href="/my/chats/send"]',
    },
  ],
};

/*
initialize
openBrowser
setCookie
openPage
checkLogin
login
work
close
*/
export class PuppeteerUtil {
  private _puppeteer;
  private _browser;
  private _page;
  private _config;

  constructor() {
    this._puppeteer = null;
    this._browser = null;
    this._page = null;
    this._config = null;
  }

  initialize() {
    this._puppeteer = puppeteer;
    this._puppeteer.use(StealthPlugin());
  }

  setConfig(_config?: any) {
    this._config = _config || CONFIG;
  }

  async openBrowser() {
    try {
      this._browser = await this._puppeteer.launch({
        headless: true,
        slowMo: 10,
        args: [
          `--disable-extensions-except=${pathToExtension}`,
          `--load-extension=${pathToExtension}`,
        ],
        executablePath: executablePath(),
      });
      this._page = await this._browser.newPage();
    } catch (error) {
      console.log('Error : ', error);
    }
  }

  async setCookie(cookies?: any) {
    try {
      if (cookies) {
        await this._page.setCookie(...cookies);
      }
    } catch (error) {
      console.log('Error : ', error);
    }
  }
  async getCookie() {
    try {
      const cookies = await this._page.cookies();
      return cookies;
    } catch (error) {
      console.log('Error: ', error);
    }
  }

  async saveCookieToFile(fileName: string) {
    const cookies = await this.getCookie();
    const localStorageData = await this._page.evaluate(() =>
      JSON.stringify(localStorage),
    );
    const sessionStorageData = await this._page.evaluate(() =>
      JSON.stringify(sessionStorage),
    );
    await fs.writeFile(`./${fileName}_cookie.json`, JSON.stringify(cookies));
    await fs.writeFile(
      `./${fileName}_localstorage.json`,
      JSON.stringify(localStorageData),
    );
    await fs.writeFile(
      `./${fileName}_sessionstorage.json`,
      JSON.stringify(sessionStorageData),
    );
    console.log('Cookies saved to file:', './testCookie.json');
  }

  async loadCookiesFromFile(fileName: string) {
    try {
      const cookiesString = await fs.readFile(`./${fileName}_cookie.json`, {
        encoding: 'utf-8',
      });

      if (cookiesString) {
        const cookies = JSON.parse(cookiesString);
        await this.setCookie(cookies);
        console.log('Cookies loaded from file:', './testCookie.json');
      }

      const localStorageData = await fs.readFile(
        `./${fileName}_localstorage.json`,
        {
          encoding: 'utf-8',
        },
      );
      const sessionStorageData = await fs.readFile(
        `./${fileName}_sessionstorage.json`,
        {
          encoding: 'utf-8',
        },
      );

      await this._page.evaluate(
        (data) => {
          localStorage.clear();
          sessionStorage.clear();
          const parsedLocalStorageData = JSON.parse(data.localStorageData);
          const parsedSessionStorageData = JSON.parse(data.sessionStorageData);
          for (const key in parsedLocalStorageData) {
            localStorage.setItem(key, parsedLocalStorageData[key]);
          }
          for (const key in parsedSessionStorageData) {
            sessionStorage.setItem(key, parsedSessionStorageData[key]);
          }
        },
        { localStorageData, sessionStorageData },
      );
    } catch (error) {
      console.error('Error loading cookies from file:', error);
    }
  }

  async openPage(pageUrl: string) {
    try {
      await this._page.goto(pageUrl, { waitUntil: 'networkidle0' });
      await this._page.addStyleTag({
        content:
          'img{-webkit-filter: blur(113px);-moz-filter: blur(113px);-o-filter: blur(113px);-ms-filter: blur(113px);filter: blur(113px);  }',
      });
    } catch (error) {
      console.log('Error : ', error);
    }
  }

  async checkLogin() {
    try {
      const elementExists = await this._page.$(
        this._config.login?.pageSelector,
      );
      if (elementExists) {
        console.log(
          `Login Selector "${this._config.login?.pageSelector}" found on the page`,
        );
        return true;
      } else {
        console.log(
          `Login Selector "${this._config.login?.pageSelector}" not found on the page`,
        );
        return false;
      }
    } catch (error) {
      console.log('Error : ', error);
      return false;
    }
  }

  async login(cfg?: any) {
    const config = cfg || this._config;
    try {
      for (let i = 0; i < config.login_workflow.length; i++) {
        const _configKey = config.login_workflow[i];
        const _config = config[_configKey];
        const recaptchaUtil = new RecaptchaUtil();
        if (_config.isCheckPage) {
          try {
            await this._page.waitForTimeout(10000);
            await this._page.waitForSelector(_config.pageSelector, {
              timeout: 5000,
            });
            if (i > 2) {
              const cookieFileName =
                'user_' + config.model_id + config.platform_id;
              await this.saveCookieToFile(cookieFileName);
            }
            await this._page.addStyleTag({
              content:
                'img{-webkit-filter: blur(113px);-moz-filter: blur(113px);-o-filter: blur(113px);-ms-filter: blur(113px);filter: blur(113px);  }',
            });
            console.log('----------------- Login Success -----------------');
            return true;
          } catch (error) {
            console.log(
              `Check selector "${_config?.pageSelector}" not found on the page`,
            );
          }
        } else if (_config.isRecaptcha) {
          await this._page.waitForSelector(_config.pageSelector, {
            timeout: 10000,
          });
          let captchaSolution: any = null;
          if (_config.hasDefaultCaptcha) {
            // captchaSolution = await solveRecaptcha(
            //   _config.defaultCaptchaType,
            //   _config.defaultCaptchaKey,
            //   await this._page.url(),
            // );
            captchaSolution = await recaptchaUtil.resolveRecaptcha2(
              _config.defaultCaptchaKey,
              await this._page.url(),
              6,
              _config.defaultCaptchaVersion,
            );
            if (_config.defaultCaptchaVersion === 2) {
              // this is for V2
              const recaptchaHandle = await this._page.$x(
                '//*[@name="g-recaptcha-response"]',
              );
              await recaptchaHandle[0].evaluate(
                (elem: any, captchaSolution: any) => {
                  elem.style.display = 'block';
                  elem.style.position = 'relative';
                  elem.style.top = '200px';
                  elem.style.left = '5px';
                  elem.style.width = '70%';
                  elem.style.height = '80px';
                  elem.innerHTML = captchaSolution;
                  return elem;
                },
                captchaSolution,
              );
              console.log('Done.');
              await this._page.waitForTimeout(3000);
            }
            await this._page.evaluate(
              ({ captchaSolution, captchaVersion }) => {
                const captchaDOM = document.getElementsByClassName('m-captcha');
                if (captchaDOM.length > 0) {
                  const ele = captchaDOM[0];
                  if (captchaVersion === 3)
                    ele['__vue__']._props.data['e-recaptcha-response'] =
                      captchaSolution;
                  if (captchaVersion === 2)
                    ele['__vue__']._props.data['ec-recaptcha-response'] =
                      captchaSolution;
                } else {
                  console.log(
                    'No elements found with the specified class name: ',
                    'm-captcha',
                  );
                }
              },
              {
                captchaSolution,
                captchaVersion: _config.defaultCaptchaVersion,
              },
            );
          }

          const iframeHandle = await this._page.$(_config.captchaSelector);
          const iframeSrc = await iframeHandle.evaluate((iframe) => iframe.src);
          const iframeUrl = new URL(iframeSrc);
          const urlParams = iframeUrl.searchParams;
          const siteKey = urlParams.get('k');
          // captchaSolution = await solveRecaptcha(
          //   _config.captchaType,
          //   siteKey,
          //   await this._page.url(),
          // );
          captchaSolution = await recaptchaUtil.resolveRecaptcha2(
            siteKey,
            await this._page.url(),
            6,
            _config.captchaVersion,
          );
          if (_config.captchaVersion === 2) {
            // this is for V2
            const recaptchaHandle = await this._page.$x(
              '//*[@name="g-recaptcha-response"]',
            );
            await recaptchaHandle[0].evaluate(
              (elem: any, captchaSolution: any) => {
                elem.style.display = 'block';
                elem.style.position = 'relative';
                elem.style.top = '200px';
                elem.style.left = '5px';
                elem.style.width = '70%';
                elem.style.height = '80px';
                elem.innerHTML = captchaSolution;
                return elem;
              },
              captchaSolution,
            );
            console.log('Done.');
            await this._page.waitForTimeout(9000);
          }
          await this._page.evaluate(
            ({ captchaSolution, captchaVersion }) => {
              const captchaDOM = document.getElementsByClassName('m-captcha');
              if (captchaDOM.length > 0) {
                const ele = captchaDOM[0];
                if (captchaVersion === 3)
                  ele['__vue__']._props.data['e-recaptcha-response'] =
                    captchaSolution;
                if (captchaVersion === 2)
                  ele['__vue__']._props.data['ec-recaptcha-response'] =
                    captchaSolution;
              } else {
                console.log(
                  'No elements found with the specified class name: ',
                  'm-captcha',
                );
              }
            },
            { captchaSolution, captchaVersion: _config.captchaVersion },
          );

          //   // Click on the "Check" button to check the successful solution of the captcha.
          await this._page.evaluate(
            ({ submitSelector }) => {
              // Replace 'your-button-selector' with the actual selector of your disabled button
              const disabledButton = document.querySelector(submitSelector);

              if (disabledButton) {
                // Remove the 'disabled' attribute to enable the button
                disabledButton.removeAttribute('disabled');
              }
            },
            { submitSelector: _config.submitSelector },
          );
          await this._page.click(_config.submitSelector);
        } else {
          await this._page.waitForSelector(_config.pageSelector, {
            timeout: 10000,
          });
          await this._page.evaluate(
            ({ idSelector }) => {
              const ele = document.querySelector(idSelector);
              ele.value = '';
              ele.dispatchEvent(new Event('input', { bubbles: true })); // As this is vue website, it doens't chagne state value though we set value on input box
            },
            { idSelector: _config.idSelector },
          );
          await this._page.evaluate(
            ({ passwordSelector }) => {
              const ele = document.querySelector(passwordSelector);
              ele.value = '';
              ele.dispatchEvent(new Event('input', { bubbles: true })); // As this is vue website, it doens't chagne state value though we set value on input box
            },
            { passwordSelector: _config.passwordSelector },
          );
          await this._page.type(_config.idSelector, _config.idValue);
          await this._page.type(
            _config.passwordSelector,
            _config.passwordValue,
          );
          await this._page.click(_config.submitSelector);
          await this._page.waitForTimeout(5000);
        }
      }
    } catch (error) {
      console.log('Error: ', error);
    }
    return false;
  }
  async work(_config: any = null) {
    //wait for page loaded
    let compareResultValue = null;
    let workConfig = _config;
    if (!Array.isArray(_config)) {
      workConfig = [_config];
    }
    for (let i = 0; i < workConfig.length; i++) {
      await this._page.waitForTimeout(1000);
      compareResultValue = null;
      const step = workConfig[i];
      console.log(`Step: ${step.type}, Value: ${step.value}`);
      switch (step.type) {
        case 'click':
          const ele = await this._page.$(step.value);
          if (ele) {
            await ele.click();
          }

          break;
        case 'waitForSelector':
          await this._page.waitForSelector(step.value, {
            timeout: 10000,
          });
          break;
        case 'loop':
          const messageListStr = step.value;
          const _messageList = messageListStr ? messageListStr.split(',') : [];
          if (_messageList.length === 0) compareResultValue = false;
          const messageList = _messageList.map((m) => m.trim());
          for (let mi = 0; mi < messageList.length; mi++) {
            const msg = messageList[mi];
            for (let li = 0; li < step.childs.length; li++) {
              const _step = { ...step.childs[li] };
              if (_step.value) {
                _step.value = _step.value.replaceAll('$value', msg);
              }

              await this.work(_step);
            }
          }

          break;

        case 'type':
          await this._page.evaluate((selector) => {
            const ele = document.querySelector(selector);
            ele.value = '';
            ele.dispatchEvent(new Event('input', { bubbles: true })); // As this is vue website, it doens't chagne state value though we set value on input box
          }, step.selector);
          await this._page.type(step.selector, step.value);
          break;
        case 'clickForValue':
          await this._page.evaluate(
            ({ selector, value }) => {
              debugger;
              const elements = Array.from(document.querySelectorAll(selector));
              const eles = elements.filter((ele) =>
                ele.textContent.toLowerCase().includes(value.toLowerCase()),
              );
              if (eles.length > 0) {
                eles[0].click();
              }
            },
            { selector: step.selector, value: step.value },
          );

          // await this._page.click(`${step.selector}:contains("${step.value})`);
          break;

        case 'appendMedias':
          const [fileChooser] = await Promise.all([
            this._page.waitForFileChooser(),
            this._page.$eval(step.selector, (element) => element.click()),
          ]);
          const fileNameList = step.value.split(',') || [];
          const filePathList = fileNameList.map((it) => {
            const url = new URL(it);
            const pathName = url.pathname;
            const fileName = pathName.substring(pathName.lastIndexOf('/') + 1);
            return `${process.env.UPLOAD_FOLDER_URL}/${fileName}`;
          });
          await fileChooser.accept(filePathList);
          await this._page.waitForTimeout(500);
          await this._page.waitForSelector('button.b-dropzone__preview__edit', {
            timeout: 60000,
          });
          break;
        case 'waitForTime':
          await this._page.waitForTimeout(step.value);
          break;
        case 'compareValue':
          const actualValue = await this._page.evaluate((selector) => {
            const div = document.querySelector(selector);
            return div ? div.textContent.trim() : null;
          }, step.selector);
          compareResultValue =
            actualValue.toLowerCase() === step.value.toLowerCase();
          break;
        case 'condition':
          const conditions = step.childs;
          if (compareResultValue === true) {
            await this.work(conditions['yes']);
          }
          if (compareResultValue === false) {
            await this.work(conditions['no']);
          }
          break;
        case 'waitForNavigation':
          await this._page.waitForNavigation();
          break;
        case 'close':
          await this._browser.close();
          break;
        default:
          break;
      }
    }
  }

  async closeBrowser() {
    await this._browser.close();
  }

  destroy() {
    this._puppeteer = null;
    this._browser = null;
    this._page = null;
    this._config = null;
  }
}
