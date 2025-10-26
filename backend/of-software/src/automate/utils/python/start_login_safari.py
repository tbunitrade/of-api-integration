# start_login_safari.py
import sys, json, time
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from safari_session_manager import get_driver, load_cookies_before_login, save_cookies_after_login

def main():
    if len(sys.argv) < 2:
        print("No payload received")
        sys.exit(1)

    payload = json.loads(sys.argv[1])
    email = payload.get("email")
    password = payload.get("password")
    model_id = payload.get("model_id")
    platform_id = payload.get("platform_id")

    print(f"🔐 Login flow → platform_id={platform_id}, model_id={model_id}")
    driver = get_driver(model_id)

    # 1️⃣ Пытаемся загрузить cookies
    cookies_loaded = load_cookies_before_login(driver, model_id, platform_id)
    driver.get("https://onlyfans.com")

    try:
        wait = WebDriverWait(driver, 20)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "header.l-header")))
        print("✅ Already logged in (via cookies)")
        return
    except:
        print("🔄 Cookies invalid or expired — performing login...")

    # 2️⃣ Ввод логина/пароля
    try:
        wait = WebDriverWait(driver, 30)
        email_input = wait.until(EC.element_to_be_clickable((By.NAME, "email")))
        email_input.click()
        email_input.clear()
        email_input.send_keys(email)
        password_input = wait.until(EC.element_to_be_clickable((By.NAME, "password")))
        password_input.click()
        password_input.clear()
        password_input.send_keys(password)
        password_input.send_keys(Keys.RETURN)
        print("🧩 Credentials sent, waiting for dashboard...")

        # Проверяем, загрузился ли header
        time.sleep(5)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "header.l-header")))
        print("✅ Logged in — navigation header detected")

        # 3️⃣ Сохраняем cookies
        save_cookies_after_login(driver, model_id, platform_id)

    except Exception as e:
        print(f"❌ Login error: {e}")
        with open(f"login_debug_{model_id}.html", "w", encoding="utf-8") as f:
            f.write(driver.page_source)
    finally:
        print("✨ Safari session kept alive after login (not closed)")

if __name__ == "__main__":
    main()