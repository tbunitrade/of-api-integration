import os
from typing import Optional
from dotenv import load_dotenv
from python_anticaptcha import AnticaptchaClient
from python_anticaptcha.tasks import NoCaptchaTaskProxylessTask
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By


#namespace
load_dotenv()


def _extract_site_key(driver) -> str:
    iframe = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, 'iframe[src*="recaptcha"]'))
    )
    src = iframe.get_attribute("src")
    print("reCaptcha iframe src:", src)
    # Пример: https://www.google.com/recaptcha/api2/anchor?ar=1&k=YOUR_SITE_KEY&...
    from urllib.parse import urlparse, parse_qs
    query = urlparse(src).query
    return parse_qs(query).get("k", [""])[0]


def solve_recaptcha_and_insert_token(driver, site_key: Optional[str] = None, url: Optional[str] = None, api_key: Optional[str] = None) -> None:
    api_key = api_key or os.getenv("ANTICAPTCHA_API_KEY")
    site_key = site_key or _extract_site_key(driver)
    url = url or os.getenv("RECAPTCHA_URL")


    client = AnticaptchaClient(api_key)
    task = NoCaptchaTaskProxylessTask(url, site_key)
    job = client.createTask(task)
    job.join()
    token = job.get_solution_response()


    driver.execute_script("""
               let el = document.querySelector('[name="g-recaptcha-response"]')
               if (!el){
                   el = document.createElement('textarea')
                   el.name = 'g-recaptcha-response';
                   el.style.display = 'none';
                   document.body.appendChild(el);
               }
               el.value = arguments[0];
           """, job.get_solution_response())


    print(" reCaptcha token inserted manually via JS")

