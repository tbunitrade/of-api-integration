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

    print(f"🚀 Starting Safari automation from platform_id={platform_id}, model={model_id}")
    driver = get_driver(model_id)
    driver.get("https://onlyfans.com")
    print('🌍 Page title is', driver.title)

    try:
        wait = WebDriverWait(driver, 25)

        # ждём email
        email_input = wait.until(EC.element_to_be_clickable((By.NAME, "email")))
        email_input.click()
        print('📩 Email input is ready')
        email_input.send_keys(email)
        email_input.send_keys(Keys.RETURN)

        # ждём password
        password_input = wait.until(EC.element_to_be_clickable((By.NAME, "password")))
        password_input.click()
        print('🔑 Password input is ready')
        password_input.send_keys(password)
        password_input.send_keys(Keys.RETURN)

        print('✅ Поля найдены и заполнены.')

        # даём Safari немного времени, чтобы страница не "прыгнула"
        time.sleep(10)

    except Exception as e:
        print("❌ Ошибка при поиске элементов:", e)
    finally:
        print("✨ Safari остаётся открытым, драйвер не закрывается.")

if __name__ == "__main__":
    main()