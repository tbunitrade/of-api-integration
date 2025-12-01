# safari_session_manager.py
from selenium import webdriver
from selenium.webdriver.safari.options import Options
from selenium.common.exceptions import InvalidSessionIdException, NoSuchWindowException
import json, os, time

_sessions = {}

# БАЗОВАЯ ПАПКА ПРОЕКТА: of-software/
BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
)

#COOKIES_DIR = os.path.join(os.path.dirname(__file__), "cookies")
# ЕДИНАЯ ПАПКА ДЛЯ КУКОВ: of-software/cookies
COOKIES_DIR = os.path.join(BASE_DIR, "cookies")
os.makedirs(COOKIES_DIR, exist_ok=True)

print(f"[safari_session_manager] COOKIES_DIR = {COOKIES_DIR}")

def _cookies_path(model_id, platform_id):
    if model_id is None or platform_id is None:
        print(
            f"⚠️ _cookies_path called with None: model_id={model_id}, platform_id={platform_id}"
        )
    return os.path.join(COOKIES_DIR, f"user_{model_id}_{platform_id}_cookies.json")

def _save_cookies(driver, model_id, platform_id):
    try:
        cookies = driver.get_cookies()
        path = _cookies_path(model_id, platform_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cookies, f)
        print(f"🍪 Cookies saved for model {model_id} / platform {platform_id} at {path}")
    except Exception as e:
        print(f"⚠️ Failed to save cookies: {e}")

def _load_cookies(driver, model_id, platform_id):
    path = _cookies_path(model_id, platform_id)
    if not os.path.exists(path):
        print(f"ℹ️ No saved cookies for model {model_id} / platform {platform_id} (path={path})")
        return False

    try:
        with open(path, "r", encoding="utf-8") as f:
            cookies = json.load(f)
    except Exception as e:
        print(f"⚠️ Failed to read cookies file {path}: {e}")
        return False

    if not isinstance(cookies, list):
        print(f"⚠️ Cookies file has invalid format ({type(cookies)}) at {path}")
        return False

    try:
        driver.get("https://onlyfans.com")
        time.sleep(2)

        for cookie in cookies:
            try:
                if "sameSite" in cookie and cookie["sameSite"] not in ["Strict", "Lax", "None"]:
                    cookie["sameSite"] = "Lax"
                driver.add_cookie(cookie)
            except Exception as e:
                print(f"⚠️ Failed to add cookie {cookie.get('name')}: {e}")

        print(f"🍪 Cookies loaded for model {model_id} / platform {platform_id}")
        driver.refresh()
        return True
    except Exception as e:
        print(f"⚠️ Failed to load cookies into driver: {e}")
        return False

def get_driver(model_id):
    """Возвращает активную Safari-сессию для модели"""
    if model_id in _sessions:
        try:
            #_ = _sessions[model_id].current_url
            _ = _sessions[model_id].title
            print(f"♻️ Reusing existing Safari session for model {model_id}")
            return _sessions[model_id]
        except (InvalidSessionIdException, NoSuchWindowException, Exception) as e:
            print(f"⚠️ Session for model {model_id} is dead, restarting… and crashed: {e}")
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