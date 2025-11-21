# post_steps.py — актуально под DOM от 2025-11

POST_STEPS = [
    # ----------------------------------------------------------
    # 0) Safety
    # ----------------------------------------------------------
    { "type": "waitForTime", "value": "800" },
    { "type": "click", "value": "#ModalAlert button", "safeguard": True },

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
    #{ "type": "type", "selector" : ".js-text-editor", "value": "$value" },
    { "type": "waitForTime", "value": "600" },



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