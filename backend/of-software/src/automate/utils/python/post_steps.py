# post_steps.py — converted from post-steps.ts

# post-steps.ts

# "type": ignore
# NOTE: This file is a data config (steps), not executable code.

POST_STEPS = [
  {
    "type": "waitForTime",
    "value": "30000",
  },
  {
    "type": "click",
    "value": "#ModalAlert button",
    "safeguard": True,
  },
  {
    "type": "waitForSelector",
    "value": "#content .b-feed",
  },
  {
    "type": "waitForSelector",
    "value": ".b-feed .b-make-post__actions button#attach_file_photo",
  },
  {
    "type": "appendMedias",
    "key": "content",
    "value": "$value",
    "selector": ".b-feed .b-make-post__actions button#attach_file_photo",
    "fallback": True,
  },
  {
    "type": "waitForTime",
    "value": "1000",
  },
  {
    "type": "click",
    "value": ".b-feed #make_post_form .b-make-post__main-wrapper .b-make-post__textarea-wrapper .b-text-editor.js-text-editor p",
    "safeguard": True,
  },
  {
    "type": "keyboardType",
    "key": "message",
    "value": "$value",
  },

  {
    "type": "waitForTime",
    "value": "500",
  },
  {
    "type": "click",
    "value": ".b-feed .b-make-post__actions button.b-make-post__datepicker-btn",
    "safeguard": True,
  },
  {
    "type": "waitForTime",
    "value": "500",
  },
  {
    "type": "waitForSelector",
    "value": ".m-vdatetime-tabs",
  },
  {
    "type": "click",
    "value": ".vdatetime-popup__tab.date",
  },
  {
    "type": "clickUntil",
    "key": "message_month",
    "value": "$value",
    "selector": ".vdatetime-calendar__current--month",
    "btnSelector": ".vdatetime-calendar__navigation--next",
    "retry": 3,
  },
  {
    "type": "waitForTime",
    "value": "1000",
  },
  {
    "type": "clickForValue",
    "key": "message_date",
    "selector": ".vdatetime-calendar__month__day",
    "value": "$value",
    "safeguard": True,
  },
  {
    "type": "click",
    "value": ".vdatetime-popup__tab.time",
    "safeguard": True,
  },
  {
    "type": "waitForTime",
    "value": "500",
  },
  {
    "type": "clickForValue",
    "key": "message_time_suffix",
    "value": "$value",
    "selector": ".vdatetime-time-picker__list--suffix .vdatetime-time-picker__item",
    "safeguard": True,
  },
  {
    "type": "waitForTime",
    "value": "1500",
  },
  {
    "type": "clickForValue",
    "key": "message_hour",
    "selector": ".vdatetime-time-picker__list--hours .vdatetime-time-picker__item",
    "value": "$value",
    "safeguard": True,
  },

  {
    "type": "clickForValue",
    "key": "message_minute",
    "selector": ".vdatetime-time-picker__list--minutes .vdatetime-time-picker__item",
    "value": "$value",
    "safeguard": True,
  },
  {
    "type": "waitForTime",
    "value": "1000",
  },
  {
    "type": "click",
    "value": ".vdatetime-popup__actions__button.vdatetime-popup__actions__button--confirm",
    "safeguard": True,
  },
  {
    "type": "waitForTime",
    "value": "500",
  },

  {
    "type": "click",
    "value": ".b-page-content form#make_post_form .b-make-post__actions button[at-attr=\"release_forms_btn\"]",
    "safeguard": True,
  },
  {
    "type": "waitForTime",
    "value": "1000",
  },
  {
    "type": "waitForSelector",
    "value": "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form--items",
  },
  {
    "type": "waitForSelector",
    "value": "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_header_ .b-content-filter__group-btns>button",
  },
  {
    "type": "click",
    "value": "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_header_ .b-content-filter__group-btns>button",
    "safeguard": True,
  },
  {
    "type": "loop",
    "key": "release_user_tags",
    "value": "$value",
    "childs": {
      "yes": [
        {
          "type": "waitForTime",
          "value": "500",
        },
        {
          "type": "type",
          "value": "$value",
          "selector":
            "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form--items .b-search-form .b-search-form__input",
        },
        {
          "type": "click",
          "value":
            "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form--items .b-search-form button[type=\"submit\"]",
        },

        {
          "type": "waitForTime",
          "value": "5000",
        },
        {
          "type": "waitForSelector",
          "value":
            "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form__docs .b-rows-lists .b-rows-lists__item",
        },
        {
          "type": "waitForTime",
          "value": "1000",
        },
        {
          "type": "click",
          "value":
            "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form__docs .b-rows-lists .b-rows-lists__item",
        },
        {
          "type": "waitForTime",
          "value": "1000",
        },
        {
          "type": "waitForSelector",
          "value": "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-row-selected__controls .g-btn",
        },
        {
          "type": "waitForTime",
          "value": "1000",
        },
        {
          "type": "click",
          "value": "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-row-selected__controls .g-btn",
        },
      ],
    },
  },
  {
    "type": "waitForTime",
    "value": "500",
  },
  {
    "type": "checkValue",
    "key": "release_form_tags",
  },
  {
    "type": "waitForTime",
    "value": "500",
  },
  {
    "type": "condition",
    "childs": {
      "yes": [
        {
          "type": "waitForTime",
          "value": "5000",
        },
        {
          "type": "click",
          "value":
            ".b-page-content form#make_post_form .b-make-post__actions button[at-attr=\"release_forms_btn\"]",
        },
        {
          "type": "waitForSelector",
          "value":
            "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-tabs__nav",
        },
        {
          "type": "waitForTime",
          "value": "5000",
        },
        {
          "type": "waitForSelector",
          "value":
            "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-tabs__nav .b-tabs__nav__item:nth-child(2) button",
        },
        {
          "type": "waitForTime",
          "value": "5000",
        },
        {
          "type": "click",
          "value":
            "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-tabs__nav .b-tabs__nav__item:nth-child(2) button",
        },
        {
          "type": "loop",
          "key": "release_form_tags",
          "value": "$value",
          "childs": {
            "yes": [
              {
                "type": "waitForSelector",
                "value":
                  "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_header_ .b-content-filter__group-btns>button",
              },
              {
                "type": "click",
                "value":
                  "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_header_ .b-content-filter__group-btns>button",
              },
              {
                "type": "waitForTime",
                "value": "500",
              },
              {
                "type": "type",
                "value": "$value",
                "selector":
                  "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form--items .b-search-form .b-search-form__input",
              },
              {
                "type": "click",
                "value":
                  "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form--items .b-search-form button[type=\"submit\"]",
              },
              {
                "type": "waitForTime",
                "value": "5000",
              },
              {
                "type": "clickForValue",
                "value": "$value",
                "selector":
                  "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-release-form__docs .b-rows-lists .b-rows-lists__item__label",
              },
            ],
          },
        },
      ],
    },
  },
  {
    "type": "waitForTime",
    "value": "500",
  },
  {
    "type": "click",
    "value":
      "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_body_ .b-placeholder-item-selected .b-wrapper-selected .b-row-selected__controls button",
    "safeguard": True,
  },
  {
    "type": "click",
    "value":
      "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_footer_ button[type=\"button\"]",
    "safeguard": True,
  },

  {
    "type": "waitForTime",
    "value": "500",
  },

  {
    "type": "click",
    "value": ".b-feed .g-page__header button[at-attr=\"submit_post\"]",
    "safeguard": True,
  },
  {
    "type": "waitForTime",
    "value": "1000",
  },
  {
    "type": "click",
    "value": ".l-header a[href="/"]",
    "safeguard": True,
  },
  {
    "type": "waitForTime",
    "value": "1000",
  },

# 'waitFor"selector": #content .b-feed ',
# 'waitandclickforappendmedia: .b-feed .b-make-post__actions button#attach_file_photo',
# 'addtext: .b-feed #make_post_form .b-make-post__main-wrapper .b-make-post__textarea-wrapper textarea#new_post_text_input',
# 'waitandclick: .b-feed .b-make-post__actions button.b-make-post__datepicker-btn',
# 'waitforDateTimePicker: .b-make-post__datepicker-input', //same for otehr datetimepicker DEPRECATED!!!!
# 'clickScheduleBtn: .b-feed .g-page__header button[at-attr="submit_post"]',
]
