import os
import time
from typing import Optional
from dotenv import load_dotenv
from capsolver.modules.recaptcha import Recaptcha
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from urllib.parse import urlparse, parse_qs


#namespace
load_dotenv()

from anticaptchaofficial.recaptchav2enterpriseproxyless import *

def solve_recaptcha_and_insert_token(driver, site_key: Optional[str] = None, url: Optional[str] = None, api_key: Optional[str] = None) -> None:
    print("🤖 Запускаем антикапчу ENTERPRISE V2...")

    MAX_CAPTCHA_WAIT = 23  # seconds
    start = time.time()
    print("🟡 Ожидаем появления iframe с капчей… перед while.")
    while not is_captcha_token(driver):
        if time.time() - start > MAX_CAPTCHA_WAIT:
            print("❌ Не нашли iframe за отведённое время")
            return
        time.sleep(1)

    api_key = api_key or os.getenv("ANTICAPTCHA_API_KEY")
    site_key = site_key or _extract_site_key(driver)
    url = url or os.getenv("RECAPTCHA_URL")

    solver = recaptchaV2EnterpriseProxyless()
    solver.set_verbose(1)
    solver.set_key(api_key)
    solver.set_website_url(url)
    solver.set_website_key(site_key)

    # Если нужно — сюда можно добавить enterprisePayload
    # solver.set_enterprise_payload({"s": "sometoken"})

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
