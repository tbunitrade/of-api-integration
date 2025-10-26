# safari_session_manager.py
from selenium import webdriver
from selenium.webdriver.safari.options import Options
from selenium.common.exceptions import InvalidSessionIdException, NoSuchWindowException
import json, os, time

_sessions = {}
COOKIES_DIR = os.path.join(os.path.dirname(__file__), "cookies")
os.makedirs(COOKIES_DIR, exist_ok=True)

def _cookies_path(model_id, platform_id):
    return os.path.join(COOKIES_DIR, f"user_{model_id}_{platform_id}_cookies.json")

def _save_cookies(driver, model_id, platform_id):
    try:
        cookies = driver.get_cookies()
        with open(_cookies_path(model_id, platform_id), "w") as f:
            json.dump(cookies, f)
        print(f"🍪 Cookies saved for model {model_id} / platform {platform_id}")
    except Exception as e:
        print(f"⚠️ Failed to save cookies: {e}")

def _load_cookies(driver, model_id, platform_id):
    path = _cookies_path(model_id, platform_id)
    if not os.path.exists(path):
        print(f"ℹ️ No saved cookies for model {model_id} / platform {platform_id}")
        return False
    try:
        with open(path, "r") as f:
            cookies = json.load(f)
        driver.get("https://onlyfans.com")
        time.sleep(2)
        for cookie in cookies:
            if "sameSite" in cookie and cookie["sameSite"] not in ["Strict", "Lax", "None"]:
                cookie["sameSite"] = "Lax"
            driver.add_cookie(cookie)
        print(f"🍪 Cookies loaded for model {model_id} / platform {platform_id}")
        driver.refresh()
        return True
    except Exception as e:
        print(f"⚠️ Failed to load cookies: {e}")
        return False

def get_driver(model_id):
    """Возвращает активную Safari-сессию для модели"""
    if model_id in _sessions:
        try:
            _ = _sessions[model_id].current_url
            print(f"♻️ Reusing existing Safari session for model {model_id}")
            return _sessions[model_id]
        except (InvalidSessionIdException, NoSuchWindowException):
            print(f"⚠️ Session for model {model_id} is dead, restarting…")
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

def save_cookies_after_login(driver, model_id, platform_id):
    _save_cookies(driver, model_id, platform_id)

def load_cookies_before_login(driver, model_id, platform_id):
    return _load_cookies(driver, model_id, platform_id)