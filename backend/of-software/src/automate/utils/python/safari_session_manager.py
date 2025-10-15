# safari_session_manager.py
from selenium import webdriver
from selenium.webdriver.safari.options import Options
from selenium.common.exceptions import InvalidSessionIdException, NoSuchWindowException

_sessions = {}

def get_driver(model_id):
    """Возвращает активную Safari-сессию для модели"""
    if model_id in _sessions:
        try:
            _ = _sessions[model_id].current_url
            print(f"♻️ Reusing existing Safari session for model {model_id}")
            return _sessions[model_id]
        except (InvalidSessionIdException, NoSuchWindowException):
            print(f"⚠️ Session for model {model_id} is dead, restarting...")
            try:
                _sessions[model_id].quit()
            except Exception:
                pass
            del _sessions[model_id]

    print(f"🚀 Starting new Safari session for model {model_id}")
    options = Options()
    options.use_technology_preview = True
    driver = webdriver.Safari(options=options)
    driver.set_window_size(1280, 900)
    _sessions[model_id] = driver
    return driver