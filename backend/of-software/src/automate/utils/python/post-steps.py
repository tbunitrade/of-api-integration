# post-steps.py

POST_STEPS = [
    {"type": "waitForTime", "value": "30000"},
    {"type": "click", "value": "#ModalAlert button"},
    {"type": "waitForSelector", "value": "#content .b-feed"},
    {"type": "waitForSelector", "value": ".b-feed .b-make-post__actions button#attach_file_photo"},
    {"type": "click", "value": ".b-feed #make_post_form .b-make-post__main-wrapper .b-make-post__textarea-wrapper .b-text-editor.js-text-editor p"},
    {"type": "waitForTime", "value": "500"},
    {"type": "click", "value": ".b-feed .b-make-post__actions button.b-make-post__datepicker-btn"},
]