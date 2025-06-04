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
  work: [
    {
      type: 'waitForTime',
      value: '30000',
    },
    {
      type: 'click', // New message => Send To => View All
      value: '#ModalAlert button',
    },
    {
      type: 'waitForSelector',
      value: '#content .b-chats .b-chats__conversations-list',
    },
    {
      type: 'waitForTime',
      value: '500',
    },
    {
      type: 'loop',
      key: 'message_list',
      value: '$value',
      childs: [
        {
          type: 'type',
          value: '$value',
          selector:
            '#content .b-chats__conversations-list form.b-search-users-form .b-search-users-form__input',
        },
        {
          type: 'waitForTime',
          value: '5000',
        },
        {
          type: 'clickForValue',
          value: '$value',
          selector:
            '#content .b-chats__conversations-list .b-available-users__list .b-rows-lists label.b-chats__item',
        },
        {
          type: 'click',
          value:
            '#content .b-chats__conversations-list form.b-search-users-form button.b-search-users-form__clear',
        },
      ],
    },
  ],
  post: [
    {
      type: 'waitForTime',
      value: '30000',
    },
    {
      type: 'click', // New message => Send To => View All
      value: '#ModalAlert button',
    },
    {
      type: 'waitForSelector',
      value: '#content .b-feed',
    },
    {
      type: 'waitForSelector', // New message => Send To => View All
      value: '.b-feed .b-make-post__actions button#attach_file_photo',
    },

    // 'waitForSelector: #content .b-feed ',
    // 'waitandclickforappendmedia: .b-feed .b-make-post__actions button#attach_file_photo',
    // 'addtext: .b-feed #make_post_form .b-make-post__main-wrapper .b-make-post__textarea-wrapper textarea#new_post_text_input',
    // 'waitandclick: .b-feed .b-make-post__actions button.b-make-post__datepicker-btn',
    // 'waitforDateTimePicker: .b-make-post__datepicker-input', //same for otehr datetimepicker
    // 'clickScheduleBtn: .b-feed .g-page__header button[at-attr="submit_post"]',
  ],
};
