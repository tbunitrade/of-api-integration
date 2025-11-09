import os
import time
from typing import Optional
from dotenv import load_dotenv
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from urllib.parse import urlparse, parse_qs
from anticaptchaofficial.recaptchav2enterpriseproxyless import *

load_dotenv()

def _extract_site_key(driver):
    """Пытаемся вытащить sitekey прямо из iframe src"""
    try:
        iframe = driver.find_element(By.CSS_SELECTOR, 'iframe[src*="recaptcha"]')
        src = iframe.get_attribute("src")
        parsed = parse_qs(urlparse(src).query)
        return parsed.get("k", [None])[0]
    except Exception as e:
        print("⚠️ Не удалось извлечь sitekey:", e)
        return None

def is_captcha_token(driver):
    """Простейшая проверка, есть ли iframe с капчей"""
    try:
        driver.find_element(By.CSS_SELECTOR, 'iframe[src*="recaptcha"]')
        return True
    except:
        return False

def solve_recaptcha_and_insert_token(driver, site_key: Optional[str] = None, url: Optional[str] = None, api_key: Optional[str] = None) -> None:
    print("🤖 Запускаем антикапчу ENTERPRISE V2...")

    MAX_CAPTCHA_WAIT = 23  # seconds
    start = time.time()
    print("🟡 Ожидаем появления iframe с капчей…")
    while not is_captcha_token(driver):
        if time.time() - start > MAX_CAPTCHA_WAIT:
            print("❌ Не нашли iframe за отведённое время")
            return
        time.sleep(1)

    api_key = api_key or os.getenv("ANTICAPTCHA_API_KEY")
    site_key = site_key or _extract_site_key(driver)
    url = url or driver.current_url

    if not api_key or not site_key or not url:
        print("❌ Отсутствуют ключевые параметры для решения капчи.")
        return

    solver = recaptchaV2EnterpriseProxyless()
    solver.set_verbose(1)
    solver.set_key(api_key)
    solver.set_website_url(url)
    solver.set_website_key(site_key)

    token = solver.solve_and_return_solution()
    if token == 0:
        print("❌ Anticaptcha failed:", solver.error_code)
        return

    print("✅ Anticaptcha token:", token)

    # Вставляем токен в DOM через JS callback
    driver.execute_script("""
    for (const client of Object.values(window.___grecaptcha_cfg.clients)) {
        for (const key of Object.keys(client)) {
            const obj = client[key];
            if (obj && typeof obj.callback === 'function') {
                obj.callback(arguments[0]);
                console.log("✅ Token passed to callback");
            }
        }
    }
    """, token)

    print("✅ reCaptcha ENTERPRISE token inserted into page")