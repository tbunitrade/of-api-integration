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
        "timeout": 15000,
    },

    # {
    #     "type": "runScript",
    #     "key": "content_url",
    #     "value": """
    #     const fileUrl = arguments[0];
    #     if (!fileUrl) {
    #         console.log('❌ No fileUrl passed to step.');
    #         return;
    #     }
    #
    #     fetch(fileUrl)
    #       .then(res => {
    #         const contentType = res.headers.get("Content-Type") || "application/octet-stream";
    #         return res.blob().then(blob => ({ blob, contentType }));
    #       })
    #       .then(({ blob, contentType }) => {
    #         const extension = contentType.split("/")[1] || "media";
    #         const file = new File([blob], `media.${extension}`, { type: contentType });
    #
    #         const dt = new DataTransfer();
    #         dt.items.add(file);
    #
    #         const zone = document.querySelector('.b-make-post__wrapper');
    #         if (!zone) {
    #             console.log('❌ Drop zone not found');
    #             return;
    #         }
    #
    #         const rect = zone.getBoundingClientRect();
    #         const ev = new DragEvent('drop', {
    #           bubbles: true,
    #           cancelable: true,
    #           dataTransfer: dt,
    #           clientX: rect.left + 20,
    #           clientY: rect.top + 20
    #         });
    #
    #         zone.dispatchEvent(ev);
    #         console.log('📸 Dropped media via fetch:', file.name, 'MIME:', contentType);
    #       })
    #       .catch(err => {
    #         console.log('❌ Failed to fetch media:', err);
    #       });
    #
    # """
    # },

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