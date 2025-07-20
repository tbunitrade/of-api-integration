// post-steps.ts
import type { Step } from './step-types';

export const postSteps: Step[] = [
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
  {
    type: 'appendMedias', // click add image button and add images
    key: 'content',
    value: '$value', // url list separted by ','. Ex: http://example.com/upload/aaa.png,http://example.com/upload/bbb.svg,http://example.com/upload/ccc.jpg
    selector: '.b-feed .b-make-post__actions button#attach_file_photo',
  },
  {
    type: 'waitForTime',
    value: '1000',
  },
  {
    type: 'click', // Enter caption text
    value:
      '.b-feed #make_post_form .b-make-post__main-wrapper .b-make-post__textarea-wrapper .b-text-editor.js-text-editor p',
  },
  // {
  //   type: 'type',
  //   key: 'message',
  //   selector:
  //     // '.b-feed #make_post_form .b-make-post__main-wrapper .b-make-post__textarea-wrapper textarea#new_post_text_input',
  //     '.b-feed #make_post_form .b-make-post__main-wrapper .b-make-post__textarea-wrapper .b-text-editor.js-text-editor p',
  //   value: '$value',
  // },
  {
    type: 'keyboardType',
    key: 'message',
    value: '$value',
  },

  {
    type: 'waitForTime',
    value: '500',
  },
  {
    type: 'click', // Schedule Btn
    value: '.b-feed .b-make-post__actions button.b-make-post__datepicker-btn',
  },
  {
    type: 'waitForTime',
    value: '500',
  },
  {
    type: 'waitForSelector',
    value: '.m-vdatetime-tabs',
  },
  {
    type: 'clickUntil',
    key: 'message_month',
    value: '$value',
    selector: '.vdatetime-popup__tab.date.active',
    btnSelector: '.vdatetime-calendar__navigation--next',
  },
  {
    type: 'waitForTime',
    value: '1000',
  },
  {
    type: 'clickForValue',
    key: 'message_date',
    selector: '.vdatetime-calendar__month__day',
    value: '$value',
  },
  {
    type: 'click',
    value: '.vdatetime-popup__tab.time',
  },
  {
    type: 'waitForTime',
    value: '500',
  },
  {
    type: 'clickForValue',
    key: 'message_hour',
    selector:
      '.vdatetime-time-picker__list--hours .vdatetime-time-picker__item',
    value: '$value',
  },

  {
    type: 'clickForValue',
    key: 'message_minute',
    selector:
      '.vdatetime-time-picker__list--minutes .vdatetime-time-picker__item',
    value: '$value',
  },
  {
    type: 'clickForValue',
    key: 'message_time_suffix',
    value: '$value',
    selector:
      '.vdatetime-time-picker__list--suffix .vdatetime-time-picker__item',
  },
  {
    type: 'waitForTime',
    value: '1000',
  },
  {
    type: 'click',
    value:
      //' .vdatetime-popup__actions .vdatetime-popup__actions__button--confirm button',
      '.vdatetime-popup__actions__button.vdatetime-popup__actions__button--confirm',
  },
  {
    type: 'waitForTime',
    value: '500',
  },

  {
    type: 'click', // Release tags
    value:
      '.b-page-content form#make_post_form .b-make-post__actions button[at-attr="release_forms_btn"]',
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
    childs: {
      yes : [
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
          type: 'waitForSelector',
          value:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form__docs .b-rows-lists .b-rows-lists__item',
        },
        {
          type: 'waitForTime',
          value: '1000',
        },
        {
          type: 'click',
          value:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form__docs .b-rows-lists .b-rows-lists__item',
        },
        {
          type: 'waitForTime',
          value: '1000',
        },
        {
          type: 'waitForSelector',
          value:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-row-selected__controls .g-btn',
        },
        {
          type: 'waitForTime',
          value: '1000',
        },
        {
          type: 'click',
          value:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-row-selected__controls .g-btn',
        },
      ],
    },
  },
  {
    type: 'checkValue',
    key: 'release_form_tags',
  },
  {
    type: 'condition',
    childs: {
      yes: [
        {
          type: 'waitForTime',
          value: '5000',
        },
        {
          type: 'click', // Снова открыть модалку
          value:
            '.b-page-content form#make_post_form .b-make-post__actions button[at-attr="release_forms_btn"]',
        },
        {
          type: 'waitForSelector',
          value:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-tabs__nav',
        },
        {
          type: 'waitForTime',
          value: '5000',
        },
        {
          type: 'waitForSelector',
          value:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-tabs__nav .b-tabs__nav__item:nth-child(2) button',
        },
        {
          type: 'waitForTime',
          value: '5000',
        },
        {
          type: 'click',
          value:
            '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-tabs__nav .b-tabs__nav__item:nth-child(2) button',
        },
        {
          type: 'loop',
          key: 'release_form_tags',
          value: '$value',
          childs: {
            yes: [
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
                type: 'clickForValue',
                value: '$value',
                selector:
                  '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form__docs .b-rows-lists .b-rows-lists__item__label',
              },
            ],
          },
        },
      ],
    },
  },
  {
    type: 'waitForTime',
    value: '500',
  },
  {
    type: 'click',
    value:
      '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-placeholder-item-selected .b-wrapper-selected .b-row-selected__controls button',
  },
  {
    type: 'click',
    value:
      '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_footer_ button[type="button"]',
  },

  {
    type: 'waitForTime',
    value: '500',
  },

  {
    type: 'click', // Click schedule button
    value: '.b-feed .g-page__header button[at-attr="submit_post"]',
  },
  {
    type: 'waitForTime',
    value: '1000',
  },
  {
    type: 'click', // Click calendar nav button in case message not posted automatically.
    value: '.l-header a[href="/"]',
  },
  {
    type: 'waitForTime',
    value: '1000',
  },

// 'waitForSelector: #content .b-feed ',
// 'waitandclickforappendmedia: .b-feed .b-make-post__actions button#attach_file_photo',
// 'addtext: .b-feed #make_post_form .b-make-post__main-wrapper .b-make-post__textarea-wrapper textarea#new_post_text_input',
// 'waitandclick: .b-feed .b-make-post__actions button.b-make-post__datepicker-btn',
// 'waitforDateTimePicker: .b-make-post__datepicker-input', //same for otehr datetimepicker DEPRECATED!!!!
// 'clickScheduleBtn: .b-feed .g-page__header button[at-attr="submit_post"]',
]
