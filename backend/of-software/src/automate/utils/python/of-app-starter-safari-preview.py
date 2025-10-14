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
    platform_id = payload.get("platform_id")
    model_id = payload.get("model_id")

    print(f"Starting Safari automation from platform_id={platform_id}, model={model_id}")

    driver = get_driver(model_id)
    driver.get("https://onlyfans.com")
    print(f"🌍 Safari session active for model {model_id}")

    try:
        wait = WebDriverWait(driver, 25)
        email_input = wait.until(EC.element_to_be_clickable((By.NAME, "email")))
        email_input.clear()
        email_input.send_keys(email)

        password_input = wait.until(EC.element_to_be_clickable((By.NAME, "password")))
        password_input.clear()
        password_input.send_keys(password)
        password_input.send_keys(Keys.RETURN)

        print("✅ Login creds filled up successfully")
    except Exception as e:
        print("❌ Error during login:", e)
    finally:
        print("✨ Task finished — Safari window remains open")

if __name__ == "__main__":
    main()