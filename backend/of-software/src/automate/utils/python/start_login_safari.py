# start_login_safari.py
import os
from os import mkdir
import logging
from pathlib import Path
from dotenv import load_dotenv
import sys, json, time, traceback
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from safari_session_manager import get_driver, load_cookies_before_login, save_cookies_after_login
from solve_recaptcha_and_cloudflare import solve_recaptcha_and_insert_token
from post_safari import create_post
#from safari_session_manager import get_driver

print("🔥 ARGV:", sys.argv)
#payload = json.loads(sys.argv[1])
#print("🧩 Payload:", payload)

#1.	crom.service.ts -> manualStartSafari or manualStartSafariFingerPrint
#2.	automate.service.ts() (в TS) вызывает: → startPostSafariFingerPrint or startPostSafari с payload
#3.	→ внутри main():
# Готовим Payload  из automate.service.ts -> buildSafariPayload
#•	загружаются cookies - постоянный баг на данный момент с куками их нужно удалять
#•	происходит логин 1 вариант
#•	решаются капчи (recaptcha, turnstile) - не работает enterprise captcha solver
#•	проверка статуса
#• происходит логин 2 вариант FingerPrint работает
#4.	→ при успехе вызывается post_safari.py create_post(safari_driver, post_model_id)
#5.	create_post() открывает /my/posts/new и вызывает work(safari_driver, POST_STEPS)
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

# logging.basicConfig(level=logging.DEBUG)
logging.basicConfig(level=logging.INFO)
logging.getLogger("selenium").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("selenium.webdriver.remote.remote_connection").setLevel(logging.WARNING)
print("I started start_login_safari")

def is_authorized(driver):
    """
    Простая проверка: есть ли .b-feed на текущей странице.
    Считаем, что если .b-feed есть — пользователь уже авторизован.
    """
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".b-feed"))
        )
        print("✅ is_authorized: .b-feed detected, user is authenticated")
        return True
    except Exception as e:
        print(f"⚠️ is_authorized: user is NOT authenticated ({e})")
        return False

def main():
    print("🔥 ARGV:", sys.argv)
    if len(sys.argv) < 2:
        print("❌ No payload received!")
        sys.exit(1)
    try:
        payload = json.loads(sys.argv[1])
        print("🧩 Payload parsed:", payload)
        # 🆔 IDs для Safari-сессии и кук
        model_id = (
                payload.get("model_id")
                or payload.get("modelId")
                or payload.get("model_platform_id")  # fallback, если вообще ничего нет
        )
        platform_id = (
                payload.get("platform_id")
                or payload.get("platformId")
                or payload.get("model_platform_id")  # fallback для случаев "один id на всё"
        )

        print(f"🧩 Model/platform IDs for cookies: model_id={model_id}, platform_id={platform_id}")
    except Exception as e:
        print("❌ Error parsing payload:", e)
        sys.exit(1)

    #payload = json.loads(sys.argv[1])

    # payload уже распарсен выше, повторно не парсим
    email = payload.get("email")
    password = payload.get("password")
    # model_id и platform_id уже вычислены выше с fallback-логикой
    use_fingerprint = payload.get("fingerprint_username") is not None
    fingerprint_username = payload.get("fingerprint_username")

    try:
        print(f"🚀 Creating Safari driver for model_id={model_id}")
        driver = get_driver(model_id)
        print(f"🍪 Trying to load cookies for model_id={model_id}, platform_id={platform_id}")
        #load_cookies_before_login(driver, model_id, platform_id)
        #print("✅ load_cookies_before_login finished")
    except Exception as e:
        print(f"❌ Error in get_driver/load_cookies: {e}")
        traceback.print_exc()
        sys.exit(1)

    print('Accepted cookies rules')

    is_fingerprint_login = False

    print("status", use_fingerprint, "user-> ", fingerprint_username)

    if use_fingerprint:
        is_fingerprint_login = True
        driver.get("https://onlyfans.com")

        time.sleep(5)

        cookies_btn = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '.b-cookies-informer__nav .g-btn[data-v-fe22891a]:not(:first-child)'))
        )

        cookies_btn.click()

        try:
            # Ждём появления и кликаем на иконку Fingerprint
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'button.m-social-btn svg use[href="#icon-fingerprint"]'))
            )
            fingerprint_button = driver.find_element(By.CSS_SELECTOR, 'button.m-social-btn')
            fingerprint_button.click()
            print("🟢 Fingerprint button clicked")

            # Находим поле username и вставляем fingerprint_username
            wait = WebDriverWait(driver, 15)
            username_input = wait.until(EC.element_to_be_clickable((By.NAME, "username")))
            username_input.click()
            username_input.send_keys(fingerprint_username)
            username_input.send_keys(Keys.RETURN)
            print("🟢 Fingerprint username inserted")

            # 3️⃣ Сохраняем cookies
            save_cookies_after_login(driver, model_id, platform_id)
            print("✨ cookies saved")

        except Exception as e:
            print(f"❌ Fingerprint flow failed: {e}")
            with open(f"fingerprint_debug_{model_id}.html", "w", encoding="utf-8") as f:
                f.write(driver.page_source)
            sys.exit(1)

        print("🟢 Waiting for user to complete FaceID/TouchID")
        time.sleep(10)

        create_post(driver, payload)  # ← передаём текущий driver + payload
        return
    else:
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
            print("Start try catch  WebDriverWait(driver")

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
            if is_fingerprint_login:
                print("✨ Skipping post-steps, fingerprint login only")
                return  # 🛑 Никакого post() вызова здесь

            print("✨ Safari session kept alive after login (not closed)")

            # 3️⃣ Сохраняем cookies
            save_cookies_after_login(driver, model_id, platform_id)
            print("✨ cookies saved")
            create_post(driver, payload)  # ← передаём текущий driver + payload

if __name__ == "__main__":
    try:
        print("🚀 start_login_safari.py __main__ entry")
        main()
        print("✅ start_login_safari.py finished without unhandled exceptions")
    except Exception as e:
        print("❌ Unhandled exception in start_login_safari.py:", e)
        traceback.print_exc()
        sys.exit(1)
