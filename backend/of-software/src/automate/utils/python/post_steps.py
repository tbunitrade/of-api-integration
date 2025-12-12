# post_steps.py — актуально под DOM от 2025-11

POST_STEPS = [
    # ----------------------------------------------------------
    # 0) Safety
    # ----------------------------------------------------------
    # { "type": "waitForTime", "value": "800" },
    # { "type": "click", "value": "#ModalAlert button", "safeguard": True },

    # ----------------------------------------------------------
    # 1) Ожидаем и наводим фокус для ввода caption text
    # ----------------------------------------------------------
    { "type": "waitForSelector", "value": "form#make_post_form" },
    { "type": "waitForTime", "value": "600" },

    # Caption
    { "type": "click", "value": "form#make_post_form .js-text-editor", "safeguard": True },
    { "type" : "runScript", "value": "document.querySelector('.js-text-editor').focus();" },
    { "type" : "runScript",
      "key": "message",
      "value": """
        const text = arguments[0];
        const sel = 'form#make_post_form .js-text-editor';

        document.querySelector(sel).innerHTML = '<p>' + text + '</p>';
        document.querySelector(sel).dispatchEvent(
            new InputEvent('input', { bubbles: true })
        );
    """},
    { "type": "waitForTime", "value": "600" },
    # ----------------------------------------------------------
    # 2) Медиа
    # ----------------------------------------------------------

    {
        "type": "appendMedias",
        "selector": "input[type='file']",
        "key": "content_path",
    },
    {
        "type": "waitForSelector",
        "value": ".b-dropzone__preview, .b-dropzone__item, .b-dropzone__video",
        "timeout": 5000,
    },

    # 🔁 Дополнительная пауза, чтобы OnlyFans проглотил видео до конца
    { "type": "waitForTime", "value": "1000" },

    # ----------------------------------------------------------
    # 3) Schedule post — POPUP
    # ----------------------------------------------------------

    # ⛔ Важно — открывать ТОЛЬКО sticky panel кнопку
    { "type": "click", "value": ".b-make-post__sticky-panel button[at-attr='scheduled_msg']", "safeguard": True },
    { "type": "waitForTime", "value": "900" },
    { "type": "waitForSelector", "value": ".vdatetime-popup" },

    # Tabs
    { "type": "waitForSelector", "value": ".vdatetime-popup__tab.date, .vdatetime-popup__tab--date" },
    { "type": "click", "value": ".vdatetime-popup__tab.date, .vdatetime-popup__tab--date", "safeguard": True },
    { "type": "waitForTime", "value": "500" },

    # ----------------------------------------------------------
    # 3.1) Month — replaced clickUntil (Safari-friendly)
    # ----------------------------------------------------------
    {
        "type": "clickUntil",
        "key": "message_month",
        "value": "$value",
        "selector": ".vdatetime-calendar__current--month",
        "btnSelector": ".vdatetime-calendar__navigation--next",
        "retry": 24
    },

    { "type": "waitForTime", "value": "500" },

    # ----------------------------------------------------------
    # 3.2) Day — Safari DOM → need span/span
    # ----------------------------------------------------------
    {
        "type": "clickForValue",
        "key": "message_date",
        "selector": ".vdatetime-calendar__month__day span span",
        "value": "$value",
        "safeguard": True
    },

    { "type": "waitForTime", "value": "500" },

    # ----------------------------------------------------------
    # 3.3) Time Время — переключение таба
    # ----------------------------------------------------------
    { "type": "click", "value": ".vdatetime-popup__tab.time", "safeguard": True },
    { "type": "waitForTime", "value": "400" },

    # 3.4 AM / PM
    {
        "type": "clickForValue",
        "key": "message_time_suffix",
        "selector": ".vdatetime-time-picker__list--suffix .vdatetime-time-picker__item",
        "value": "$value",
        "safeguard": True
    },

    # 3.5 Hour
    {
        "type": "clickForValue",
        "key": "message_hour",
        "selector": ".vdatetime-time-picker__list--hours .vdatetime-time-picker__item",
        "value": "$value",
        "safeguard": True
    },

    # 3.6 Minute
    {
        "type": "clickForValue",
        "key": "message_minute",
        "selector": ".vdatetime-time-picker__list--minutes .vdatetime-time-picker__item",
        "value": "$value",
        "safeguard": True
    },

    # ----------------------------------------------------------
    # 3.7) Done NEXT button
    # ----------------------------------------------------------
    { "type": "waitForTime", "value": "500" },
    {
        "type": "click",
        "value": ".vdatetime-popup__actions__button--confirm button",
        "safeguard": True
    },

    { "type": "waitForTime", "value": "900" },

    # ----------------------------------------------------------
    # 4) RELEASE FORMS / TAGGING
    # 4.0 Проверяем, есть ли вообще какие-либо release-теги
    # ----------------------------------------------------------
    { "type": "checkValue", "key": "has_release_tags" },
    {
        "type": "condition",
        "childs": {
            "yes": [
                { "type": "click", "value": "form#make_post_form button[at-attr='release_forms_btn']", "safeguard": True },
                { "type": "waitForTime", "value": "600" },
                { "type": "waitForSelector", "value": "#ReleaseFormsModal___BV_modal_content_" },
                # 4.1 LOOP user tags (Tab: "Tag user")
                {
                    "type": "loop",
                    "key": "release_user_tags",
                    "value": "$value",
                    "childs": {
                        "yes": [
                            { "type": "waitForSelector", "value": "#ReleaseFormsModal___BV_modal_content_" },
                            { "type": "waitForTime", "value": "300" },
                            {
                                "type": "type",
                                "value": "$value",
                                "selector": "#ReleaseFormsModal___BV_modal_content_ .b-search-form__input"
                            },
                            {
                                "type": "click",
                                "value": "#ReleaseFormsModal___BV_modal_content_ .b-search-form button[type='submit']"
                            },
                            { "type": "waitForTime", "value": "900" },
                            {
                                "type": "click",
                                "value": "#ReleaseFormsModal___BV_modal_content_ .b-rows-lists__item"
                            }
                        ]
                    }
                },

                { "type": "waitForTime", "value": "400" },

                # 4.2 Переключаемся на таб "Release form"
                {
                    "type": "click",
                    "value": "#ReleaseFormsModal___BV_modal_content_ #Release-form",
                    "safeguard": True
                },
                { "type": "waitForTime", "value": "300" },

                # 4.3 LOOP release form tags (Tab: "Release form")
                {
                    "type": "loop",
                    "key": "release_form_tags",
                    "value": "$value",
                    "childs": {
                        "yes": [
                            { "type": "waitForSelector", "value": "#ReleaseFormsModal___BV_modal_content_" },
                            { "type": "waitForTime", "value": "300" },
                            {
                                "type": "type",
                                "value": "$value",
                                "selector": "#ReleaseFormsModal___BV_modal_content_ .b-search-form__input"
                            },
                            {
                                "type": "click",
                                "value": "#ReleaseFormsModal___BV_modal_content_ .b-search-form button[type='submit']"
                            },
                            { "type": "waitForTime", "value": "900" },
                            {
                                "type": "runScript",
                                "value": """
                                    const root = document.querySelector('#ReleaseFormsModal___BV_modal_content_');
                                    if (!root) return;
                                    const item = root.querySelector('.b-rows-lists__item');
                                    if (!item) return;
                                    const checkbox = item.querySelector('input[type="checkbox"]');
                                    if (checkbox && !checkbox.checked) {
                                      checkbox.click();
                                    } else {
                                      item.click();
                                    }
                                """
                            },
                            { "type": "waitForTime", "value": "400" }
                        ]
                    }
                },
                # 4.4 APPLY + CLOSE
                # CLOSE MODAL
                {
                    "type": "click",
                    "value": "#ReleaseFormsModal___BV_modal_content_ .b-row-selected__controls button",
                    "safeguard": True
                },
                {
                    "type": "click",
                    "value": "#ReleaseFormsModal___BV_modal_footer_ button[type='button']",
                    "safeguard": True
                },
                # # ----------------------------------------------------------
                # # 4.5) Add to list
                # # ----------------------------------------------------------
                # { "type": "waitForTime", "value": "300" },
                # { "type": "click", "value": "form#make_post_form button[at-attr='add_to_list']", "safeguard": False },
                # { "type": "waitForTime", "value": "400" },
            ]
        }
    },

    # ----------------------------------------------------------
    # 10) Publish
    # ----------------------------------------------------------
    { "type": "click", "value": "button[at-attr='submit_post']", "safeguard": True },
    { "type": "waitForTime", "value": "1500" },
    # ----------------------------------------------------------
    # 11) Back to the main page
    # ----------------------------------------------------------
    { "type": "click", "value": '.l-header a[href="/"]', "safeguard": True },
    { "type": "waitForTime", "value": "800" },
]