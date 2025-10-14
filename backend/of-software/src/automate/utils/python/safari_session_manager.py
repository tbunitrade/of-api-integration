from selenium import webdriver
from selenium.webdriver.safari.options import Options
from selenium.common.exceptions import InvalidSessionIdException

_sessions = {}

def get_driver(model_id):
    """Возвращает активную Safari-сессию для модели"""
    if model_id in _sessions:
        try:
            # Проверяем, жива ли сессия
            _ = _sessions[model_id].current_url
            print(f"♻️ Reusing existing Safari session for model {model_id}")
            return _sessions[model_id]
        except InvalidSessionIdException:
            print(f"⚠️ Session for model {model_id} is dead, restarting...")
            del _sessions[model_id]
        except Exception as e:
            print(f"⚠️ Unexpected error for model {model_id}: {e}")
            del _sessions[model_id]

    print(f"🚀 Starting new Safari session for model {model_id}")
    options = Options()
    options.use_technology_preview = True
    driver = webdriver.Safari(options=options)
    driver.set_window_size(1280, 900)

    _sessions[model_id] = driver
    return driver


def close_driver(model_id):
    """Закрывает сессию конкретной модели"""
    if model_id in _sessions:
        try:
            _sessions[model_id].quit()
            print(f"🧹 Closed Safari session for model {model_id}")
        except Exception as e:
            print(f"⚠️ Error closing Safari session for model {model_id}: {e}")
        finally:
            del _sessions[model_id]


def close_all():
    """Закрывает все активные Safari-сессии"""
    for mid in list(_sessions.keys()):
        close_driver(mid)