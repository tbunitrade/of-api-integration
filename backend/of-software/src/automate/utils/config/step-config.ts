//src/automate/utils/config/step-config.ts
import { postSteps } from './post-steps';
import { workSteps } from './work-steps';

export interface SelectorsConfig {
  loginErrorMessage: string;
  profileContainer: string;
  profileFeed: string;
}

/**
 * Config variables*/
export const CONFIG = {
  login_workflow: [
    'reload',
    'check_page',
    'login',
    'check_page',
    'login_captcha',
    'check_page',
  ],
  selectors: {
    loginErrorMessage: '.v-text-field__details .v-messages__message',
    profileContainer: '#app.main-wrapper #content',
    profileFeed: '#app.main-wrapper #content .b-feed'
  } as SelectorsConfig,
  login: {
    pageSelector: '.login_content',
    idSelector: 'input[name="email"]',
    passwordSelector: 'input[name="password"]',
    submitSelector: '.b-loginreg__form button[type="submit"]',
    idValue: '$value',             // сюда, при вызове login(...), заменяется на реальный username
    passwordValue: '$value',
  },
  reload: {
    isReload: true,
  },
  check_page: {
    isCheckPage: true,
    pageSelector: '#app #content',
  },
  login_captcha: {
    isRecaptcha: true,
    hasDefaultCaptcha: false,
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
  login_captcha_extension: {
    isRecaptchaExtension: true,
    pageSelector: '.login_content',
    submitSelector: '.b-loginreg__form button[type="submit"]',
    disabledSelector: '.b-loginreg__form button[type="submit"]:disabled',
    proKey: '$value',
    proKeySelector: 'input[placeholder="INPUT PRO KEY"]',
  },
  post: postSteps,
  work: workSteps,
};
