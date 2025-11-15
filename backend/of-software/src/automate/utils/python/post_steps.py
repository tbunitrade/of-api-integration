# post_steps.py — актуализировано под DOM (2025-11)
# ВНИМАНИЕ: схема не менялась, используем ключ "type"

POST_STEPS = [
    # 0) Страховочный клик модального алерта (если его нет — safeguard защитит)
    { "type": "waitForTime", "value": "800" },
    { "type": "click", "value": "#ModalAlert button", "safeguard": True },

    # 1) Ожидаем форму поста
    { "type": "waitForSelector", "value": "form#make_post_form" },
    { "type": "waitForTime", "value": "700" },

    # 2) Фокус в редактор, печатаем caption
    { "type": "click", "value": "form#make_post_form .js-text-editor", "safeguard": True },
    { "type": "keyboardType", "key": "message", "value": "$value" },
    { "type": "waitForTime", "value": "600" },

    # 3) Прикрепить медиа (если путь локальный; если URL — твой обработчик просто скипнет)
    {
        "type": "waitForSelector",
        "value": ".b-make-post__actions button#attach_file_photo"
    },
    {
        "type": "appendMedias",
        "key": "content",
        "value": "$value",
        "selector": ".b-make-post__actions button#attach_file_photo",
        "fallback": True
    },
    { "type": "waitForTime", "value": "1200" },

    # 4) Планировщик: открыть попап
    { "type": "click", "value": 'form#make_post_form button[at-attr="scheduled_msg"]', "safeguard": True },
    { "type": "waitForTime", "value": "400" },
    { "type": "waitForSelector", "value": ".vdatetime-popup" },
    { "type": "waitForTime", "value": "1000" },
    { "type": "waitForSelector", "value": ".vdatetime-popup__tab.date" },
    { "type": "click", "value": ".vdatetime-popup__tab.date" },

    # 5) Месяц (фикс clickUntil: читаем key=message_month, нормализуем регистр/включение)
    {
        "type": "clickUntil",
        "key": "message_month",
        "value": "$value",
        "selector": ".vdatetime-calendar__current--month",
        "btnSelector": ".vdatetime-calendar__navigation--next",
        "retry": 24
    },
    { "type": "waitForTime", "value": "500" },

    # 6) День
    {
        "type": "clickForValue",
        "key": "message_date",
        "selector": ".vdatetime-calendar__month__day",
        "value": "$value",
        "safeguard": True
    },

    # 7) Вкладка «время»
    { "type": "click", "value": ".vdatetime-popup__tab.time", "safeguard": True },
    { "type": "waitForTime", "value": "400" },

    # 8) AM/PM
    {
        "type": "clickForValue",
        "key": "message_time_suffix",
        "selector": ".vdatetime-time-picker__list--suffix .vdatetime-time-picker__item",
        "value": "$value",
        "safeguard": True
    },
    { "type": "waitForTime", "value": "600" },

    # 9) Часы / минуты
    {
        "type": "clickForValue",
        "key": "message_hour",
        "selector": ".vdatetime-time-picker__list--hours .vdatetime-time-picker__item",
        "value": "$value",
        "safeguard": True
    },
    {
        "type": "clickForValue",
        "key": "message_minute",
        "selector": ".vdatetime-time-picker__list--minutes .vdatetime-time-picker__item",
        "value": "$value",
        "safeguard": True
    },

    # 10) Подтвердить дату/время
    { "type": "waitForTime", "value": "500" },
    { "type": "click", "value": ".vdatetime-popup__actions__button.vdatetime-popup__actions__button--confirm", "safeguard": True },
    { "type": "waitForTime", "value": "700" },

    # 11) Release forms (tag creators) — как и раньше, только селекторы свежие
    { "type": "click", "value": 'form#make_post_form button[at-attr="release_forms_btn"]', "safeguard": True },
    { "type": "waitForTime", "value": "600" },

    # Поиск по user_tags (loop — если есть значения, берём из "release_user_tags")
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
                    "selector": "#ReleaseFormsModal___BV_modal_content_ .b-release-form--items .b-search-form .b-search-form__input"
                },
                {
                    "type": "click",
                    "value": "#ReleaseFormsModal___BV_modal_content_ .b-release-form--items .b-search-form button[type=\"submit\"]"
                },
                { "type": "waitForTime", "value": "1200" },
                {
                    "type": "waitForSelector",
                    "value": "#ReleaseFormsModal___BV_modal_content_ .b-release-form__docs .b-rows-lists .b-rows-lists__item"
                },
                { "type": "click", "value": "#ReleaseFormsModal___BV_modal_content_ .b-release-form__docs .b-rows-lists .b-rows-lists__item" },
                { "type": "waitForTime", "value": "400" },
                { "type": "click", "value": "#ReleaseFormsModal___BV_modal_content_ .b-row-selected__controls .g-btn" }
            ]
        }
    },

    # Переключение на вкладку release forms (если нужны form_tags)
    { "type": "waitForTime", "value": "300" },
    { "type": "checkValue", "key": "release_form_tags" },
    {
        "type": "condition",
        "childs": {
            "yes": [
                { "type": "waitForSelector", "value": "#ReleaseFormsModal___BV_modal_content_ .b-tabs__nav .b-tabs__nav__item:nth-child(2) button" },
                { "type": "click", "value": "#ReleaseFormsModal___BV_modal_content_ .b-tabs__nav .b-tabs__nav__item:nth-child(2) button" },
                {
                    "type": "loop",
                    "key": "release_form_tags",
                    "value": "$value",
                    "childs": {
                        "yes": [
                            { "type": "waitForTime", "value": "300" },
                            {
                                "type": "type",
                                "value": "$value",
                                "selector": "#ReleaseFormsModal___BV_modal_content_ .b-release-form--items .b-search-form .b-search-form__input"
                            },
                            {
                                "type": "click",
                                "value": "#ReleaseFormsModal___BV_modal_content_ .b-release-form--items .b-search-form button[type=\"submit\"]"
                            },
                            { "type": "waitForTime", "value": "1000" },
                            {
                                "type": "clickForValue",
                                "value": "$value",
                                "selector": "#ReleaseFormsModal___BV_modal_content_ .b-release-form__docs .b-rows-lists .b-rows-lists__item__label"
                            }
                        ]
                    }
                }
            ]
        }
    },

    # Применить/закрыть модалку
    { "type": "waitForTime", "value": "400" },
    {
        "type": "click",
        "value": "#ReleaseFormsModal___BV_modal_content_ .b-placeholder-item-selected .b-wrapper-selected .b-row-selected__controls button",
        "safeguard": True
    },
    {
        "type": "click",
        "value": "#ReleaseFormsModal___BV_modal_content_ #ReleaseFormsModal___BV_modal_footer_ button[type=\"button\"]",
        "safeguard": True
    },

    # 12) Labels (по кнопке Add labels — опционально, шаг не критичный)
    { "type": "waitForTime", "value": "300" },
    { "type": "click", "value": 'form#make_post_form button[at-attr="add_to_list"]', "safeguard": False },
    { "type": "waitForTime", "value": "300" },

    # 13) Публикация
    { "type": "click", "value": 'form#make_post_form button[at-attr="submit_post"]', "safeguard": True },
    { "type": "waitForTime", "value": "1500" },

    # 14) Возврат на главную (не критично; safeguard)
    { "type": "click", "value": '.l-header a[href="/"]', "safeguard": True },
    { "type": "waitForTime", "value": "800" },
]