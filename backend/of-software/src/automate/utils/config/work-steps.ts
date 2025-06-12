// work-steps.ts
import type { Step } from './step-types';

/**
 * Config variables*/
export const workSteps: Step[] = [
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
    // {
    //   type: 'waitForSelector', // New message => Send To => View All
    //   value:
    //     '.b-chats__conversations.m-create-chat .b-chats__conversations-list .b-content-filter button.m-link',
    // },
    // {
    //   type: 'click', // New message => Send To => View All
    //   value:
    //     '.b-chats__conversations.m-create-chat .b-chats__conversations-list .b-content-filter button.m-link',
    // },
    {
      type: 'waitForTime',
      value: '500',
    },
    // {
    //   type: 'waitForSelector',
    //   value:
    //     '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_body_ .m-collections-list',
    // },
    {
      type: 'loop',
      key: 'message_list',
      value: '$value',
      childs: {
        yes : [
          // {
          //   type: 'waitForSelector',
          //   value:
          //     '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .modal-header__btns-group button',
          // },
          // {
          //   type: 'click',
          //   value:
          //     '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .modal-header__btns-group button',
          // },
          // {
          //   type: 'waitForTime',
          //   value: '500',
          // },
          // {
          //   type: 'type',
          //   value: '$value',
          //   selector:
          //     '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .b-chat__search-input',
          // },
          {
            type: 'type',
            value: '$value',
            selector:
              '#content .b-chats__conversations-list form.b-search-users-form .b-search-users-form__input',
          },
          // {
          //   type: 'click',
          //   value:
          //     '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .modal-header__btns-group button',
          // },

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
    },

    // {
    //   type: 'click',
    //   value:
    //     '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_footer_ button',
    // },

    {
      type: 'waitForTime',
      value: '500',
    },

    // {
    //   type: 'click', // New message => Exclude => View All
    //   value:
    //     '.b-chats__conversations.m-create-chat .b-chats__conversations-list .b-chats__collapse-section button.m-link',
    // },

    {
      type: 'clickForValue',
      value: 'exclude',
      selector: '#content .b-chats__conversations-list .b-tabs__nav ul li a',
    },
    {
      type: 'waitForTime',
      value: '500',
    },
    // {
    //   type: 'waitForSelector',
    //   value:
    //     '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_body_ .m-collections-list',
    // },
    {
      type: 'loop',
      key: 'message_exclude_list',
      value: '$value',
      childs: {
        yes : [
          // {
          //   type: 'waitForSelector',
          //   value:
          //     '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .modal-header__btns-group button',
          // },
          // {
          //   type: 'click',
          //   value:
          //     '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .modal-header__btns-group button',
          // },
          // {
          //   type: 'waitForTime',
          //   value: '500',
          // },
          // {
          //   type: 'type',
          //   value: '$value',
          //   selector:
          //     '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .b-chat__search-input',
          // },
          {
            type: 'type',
            value: '$value',
            selector:
              '#content .b-chats__conversations-list form.b-search-users-form .b-search-users-form__input',
          },
          // {
          //   type: 'click',
          //   value:
          //     '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_header_ .modal-header__btns-group button',
          // },

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
    },
    // {
    //   type: 'click',
    //   value:
    //     '#ModalUsersLists___BV_modal_content_ #ModalUsersLists___BV_modal_footer_ button',
    // },
    {
      type: 'waitForTime',
      value: '500',
    },
    // {
    //   type: 'type',
    //   key: 'message',
    //   selector:
    //     '.b-chats__conversations-content #make_post_form #new_post_text_input',
    //   value: '$value',
    // },

    {
      type: 'click',
      value:
        '.b-chats__conversations-content #make_post_form .b-text-editor.js-text-editor p',
    },
    {
      type: 'waitForTime',
      value: '500',
    },
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
      type: 'clickForValue',
      value: 'Cancel',
      selector: '.modal-dialog-centered footer button',
    },
    {
      type: 'waitForTime',
      value: '500',
    },
    {
      type: 'click', // Schedule Message Btn
      value:
        '.b-chats__conversations-content form#make_post_form .b-make-post__actions .b-make-post__datepicker-btn',
    },
    {
      type: 'waitForTime',
      value: '500',
    },
    {
      type: 'waitForSelector',
      value: '.b-make-post__datepicker-input .vdatetime-popup',
    },
    {
      type: 'waitForTime',
      value: '500',
    },
    {
      type: 'clickUntil',
      key: 'message_month',
      value: '$value',
      selector:
        '.b-make-post__datepicker-input .vdatetime-calendar__current--month',
      btnSelector:
        '.b-make-post__datepicker-input .vdatetime-calendar__navigation--next',
    },
    // {
    //   type: 'compareValue',
    //   key: 'message_month',
    //   value: '$value',
    //   selector:
    //     '.b-make-post__datepicker-input .vdatetime-calendar__current--month',
    // },
    // {
    //   type: 'condition',
    //   childs: {
    //     yes: null,
    //     no: {
    //       type: 'click',
    //       value:
    //         '.b-make-post__datepicker-input .vdatetime-calendar__navigation--next',
    //     },
    //   },
    // },
    {
      type: 'waitForTime',
      value: '500',
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
      value: '500',
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
      value: '500',
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
            type: 'click',
            value:
              '#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form__docs .b-rows-lists .b-rows-lists__item__label',
          },
        ],
      },
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
      value: '1000',
    },

    {
      type: 'loop',
      key: 'release_form_tags',
      value: '$value',
      childs: {
        yes: [
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
      childs: {
        yes :[
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
      }
    },

    {
      type: 'waitForTime',
      value: '500',
    },
    {
      type: 'compareValue',
      value: '1',
      selector:
        '#content .b-chats__conversations .b-chats__conversations-content .m-chat-footer #make_post_form .b-make-post__main-wrapper .b-make-post__media-slider.m-paid .b-make-post__media-slider__inner .checkbox-item__inside span.checkbox-item__num',
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
    // { type: 'runScript', value: 'window.alert=function(){};' },

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
      value: '500',
    },
    {
      type: 'click', // Click calendar nav button in case message not posted automatically.
      value: '.l-header a[href="/my/queue"]',
    },
    {
      type: 'waitForTime',
      value: '500',
    },
    {
      type: 'waitForTime',
      value: '15000',
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
      type: 'waitForTime',
      value: '5000',
    },
    {
      type: 'waitForSelector',
      value: '#content .b-chats__header a[href="/my/chats/send"]',
    },
    {
      type: 'click',
      value: '#content .b-chats__header a[href="/my/chats/send"]',
    },
  ];


