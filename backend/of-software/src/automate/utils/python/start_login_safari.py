# start_login_safari.py
import sys, json, time
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from safari_session_manager import get_driver, load_cookies_before_login, save_cookies_after_login
from python_anticaptcha import AnticaptchaClient
from python_anticaptcha.tasks import NoCaptchaTaskProxylessTask


# 1.	driver.get("https://onlyfans.com")
# 2.	Заполняем email
# 3.	Заполняем password
# 4.	Нажимаем кнопку Login
# 5.	🛑 И вот тут может появиться капча
# 6.	Если капча есть — решаем через AntiCaptcha
# 6.1 здесь с задержкой может сработать еще раз капча второго типа где надо просто кликнуть по центру
# 7.	Подставляем g-recaptcha-response в DOM
# 8.	Ждём дашборд или ловим ошибку

api_key = '5cdaa49b8672f47316a458d137fcc4'
site_key = 'test'  # grab from site
url = 'https://onlyfans.com'

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

        print("🧩 Credentials sent, waiting for captcha checks...")

        # check reCAPTCHA
        try:
            recaptcha_iframe = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'iframe[src*="recaptcha"]'))
            )
            print("Google reCaptcha detected")
            #print("Anticaptcha for Google  reCaptcha not implemented yet")

            client = AnticaptchaClient(api_key)
            task = NoCaptchaTaskProxylessTask(url, site_key)
            job = client.createTask(task)
            job.join()

            print(job.get_solution_response())

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