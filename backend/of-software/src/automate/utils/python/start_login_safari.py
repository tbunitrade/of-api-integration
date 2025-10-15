# start_login_safari.py
import sys, json, time
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from safari_session_manager import get_driver

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
    driver.get("https://onlyfans.com")

    try:
        wait = WebDriverWait(driver, 30)
        email_input = wait.until(EC.element_to_be_clickable((By.NAME, "email")))
        email_input.send_keys(email)
        password_input = wait.until(EC.element_to_be_clickable((By.NAME, "password")))
        password_input.send_keys(password)
        password_input.send_keys(Keys.RETURN)
        print("🧩 Credentials sent, waiting for dashboard...")

        # Проверяем, загрузился ли header
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "header.l-header")))
        print("✅ Logged in — navigation header detected")

    except Exception as e:
        print(f"❌ Login error: {e}")
    finally:
        print("✨ Safari session kept alive after login (not closed)")

if __name__ == "__main__":
    main()