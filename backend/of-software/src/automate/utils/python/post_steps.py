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
    { "type": "waitForTime", "value": "600" },
    # ----------------------------------------------------------
    # 2) Медиа
    # ----------------------------------------------------------
    {
        "type": "runScript",
        "key": "content_base64",
        "value": """
        const base64 = arguments[0];
        if (!base64) {
            console.log('❌ No base64 in arguments[0]');
            return;
        }
    
        const filename = "image.jpg";
        const mime = "image/jpeg";
    
        function base64ToFile(b64, filename, mimeType) {
            const byteString = atob(b64);
            const uint8Array = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
                uint8Array[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([uint8Array], { type: mimeType });
            return new File([blob], filename, { type: mimeType });
        }
    
        const file = base64ToFile(base64, filename, mime);
        const dt = new DataTransfer();
        dt.items.add(file);
    
        const zone = document.querySelector('.b-make-post__wrapper');
        if (!zone) {
            console.log('❌ Drop zone not found');
            return;
        }
    
        const rect = zone.getBoundingClientRect();
        const ev = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
            clientX: rect.left + 20,
            clientY: rect.top + 20
        });
    
        zone.dispatchEvent(ev);
        console.log('📸 Dropped image via base64:', filename);
    """
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