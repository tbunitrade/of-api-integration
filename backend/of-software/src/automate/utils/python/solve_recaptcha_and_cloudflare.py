import os
from dotenv import load_dotenv
from python_anticaptcha import AnticaptchaClient
from python_anticaptcha.tasks import NoCaptchaTaskProxylessTask

load_dotenv()

api_key = os.getenv("ANTICAPTCHA_API_KEY")
site_key = os.getenv("RECAPTCHA_SITEKEY")
url = os.getenv("RECAPTCHA_URL")


def solve_recaptcha_and_insert_token(driver, site_key: str, url: str, api_key: str) -> None:
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