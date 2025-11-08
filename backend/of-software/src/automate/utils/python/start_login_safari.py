# start_login_safari.py
import os
from os import mkdir
from pathlib import Path
from dotenv import load_dotenv
import sys, json, time
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from safari_session_manager import get_driver, load_cookies_before_login, save_cookies_after_login
from solve_recaptcha_and_cloudflare import solve_recaptcha_and_insert_token
from post_safari import create_post
from safari_session_manager import get_driver

#1.	startPostSafari() (в TS) вызывает:
#2.	→ start_login_safari.py с payload
#3.	→ внутри main():
#•	загружаются cookies
#•	происходит логин
#•	решаются капчи (recaptcha, turnstile)
#•	проверка статуса
#4.	→ при успехе вызывается create_post(driver, model_id)
#5.	create_post() открывает /my/posts/new и вызывает work(driver, POST_STEPS)
#6.	work() выполняет постинг шаг за шагом
#7.	Сессия не сбивается, потому что всё делается в одном driver

#Как работает start_login_safari
# 1.	driver.get("https://onlyfans.com")
# 2.	Заполняем email
# 3.	Заполняем password
# 4.	Нажимаем кнопку Login
# 5.	🛑 И вот тут может появиться капча
# 6.	Если капча есть — решаем через AntiCaptcha
# 6.1 здесь с задержкой может сработать еще раз капча второго типа где надо просто кликнуть по центру
# 7.	Подставляем g-recaptcha-response в DOM
# 8.	Ждём дашборд или ловим ошибку

#Задаем путь к локальной папке кеша прямо в проекте

load_dotenv() # загрузка .env
custom_cache_path = Path(os.getenv("SELENIUM_CACHE_PATH", "./.selenium-cache")).resolve()
custom_cache_path.mkdir(parents=True, exist_ok=True)
os.environ["SE_CACHE_PATH"] = str(custom_cache_path)


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

    # 2️⃣ Ввод логина/пароля
    try:
        wait = WebDriverWait(driver, 600)
        email_input = wait.until(EC.element_to_be_clickable((By.NAME, "email")))
        email_input.click()
        email_input.send_keys(email)
        email_input.send_keys(Keys.RETURN)
        print("Email entered")

        password_input = wait.until(EC.element_to_be_clickable((By.NAME, "password")))
        password_input.click()
        password_input.send_keys(password)
        password_input.send_keys(Keys.RETURN)
        print("Password entered")

        try:
            WebDriverWait(driver, 10).until(
                lambda d: d.find_element(By.CSS_SELECTOR, 'button[type="submit"]').is_enabled()
            )
            print("🧩 Login BTN can be clicked.")

            login_btn = wait.until(EC.element_to_be_clickable((By.NAME, "submit")))
            login_btn.click()
            print("🧩 Credentials sent, waiting for captcha checks...")
        except:
            print("🧩 Login BTN blocked")

        # check reCAPTCHA
        try:
            #recaptcha_iframe = WebDriverWait(driver, 10).until(
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'iframe[src*="recaptcha"]'))
            )
            print("Google reCaptcha detected")
            #print("Anticaptcha for Google  reCaptcha not implemented yet")

            solve_recaptcha_and_insert_token(driver)

            submit_btn = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
            submit_btn.click()

        except:
            print("Google reCaptcha not detected")

        # check Cloudflare Turnstile
        try:
            turnstile_iframe = WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'iframe[src*="challenges.cloudflare.com"]'))
            )
            print("Cloudflare Tunrstile detected")
            driver.switch_to.frame(turnstile_iframe)

            try:
                body = WebDriverWait(driver, 10).until(
                    EC.element_to_be_clickable((By.TAG_NAME, 'body'))
                )

                body.click()
                print("Clicked inside Turnstile iframe body")
            except:
                print("Body inside Tunstile iframe not clickable")

            driver.switch_to.default_content()

            WebDriverWait(driver, 30).until_not(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'iframe[src*="challenges.cloudflare.com"]'))
            )
            print("Tunrstile challenge solded")
        except:
            print("✅ No Turnstile challenge detected or already solved")

        # Проверяем, загрузился ли header
        time.sleep(5)
        # Проверяем, кнопку Логина повторно
        try:
            WebDriverWait(driver, 10).until(
                lambda d: d.find_element(By.CSS_SELECTOR, 'button[type="submit"]').is_enabled()
            )
            print("🧩 Login BTN can be clicked.")

            login_btn = wait.until(EC.element_to_be_clickable((By.NAME, "submit")))
            login_btn.click()
            print("🧩 Credentials sent, waiting for captcha checks...")
        except:
            print("🧩 Login BTN blocked")

    except Exception as e:
        print(f"❌ Login error: {e}")
        with open(f"login_debug_{model_id}.html", "w", encoding="utf-8") as f:
            f.write(driver.page_source)
        sys.exit(1) # ← триггер для JS что логин не сработал
    finally:
        print("✨ Safari session kept alive after login (not closed)")

        # 3️⃣ Сохраняем cookies
        save_cookies_after_login(driver, model_id, platform_id)
        print("✨ cookies saved")
        create_post(driver, model_id)  # ← передаём текущий driver

if __name__ == "__main__":
    main()