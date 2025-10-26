# post_steps.py
POST_STEPS = [
    {"type": "waitForTime", "value": "30000"},
    {"type": "click", "value": "#ModalAlert button"},
    {"type": "waitForSelector", "value": "#content .b-feed"},
    {"type": "waitForSelector", "value": ".b-feed .b-make-post__actions button#attach_file_photo"},
    {
        "type": "click",
        "value": ".b-feed #make_post_form .b-make-post__main-wrapper "
                 ".b-make-post__textarea-wrapper .b-text-editor.js-text-editor p",
    },
    {"type": "waitForTime", "value": "500"},
    {
        "type": "click",
        "value": ".b-feed .b-make-post__actions button.b-make-post__datepicker-btn",
    },
    {"type": "waitForTime", "value": "500"},
    {
        "type": "waitForSelector",
        "value": ".m-vdatetime-tabs",
    },
    {"type": "click", "value": ".vdatetime-popup__tab.date"},
    {
        "type": "clickUntil",
        "key": "message_month",
        "value": "$value",
        "selector": ".vdatetime-calendar__current--month",
        "btnSelector": ".vdatetime-calendar__navigation--next",
        "retry": 3,
    },
    {"type": "waitForTime", "value": "1000"},
]