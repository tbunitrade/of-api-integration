# post-safari.py
from safari_session_manager import get_driver
from work_safari import work
from post_steps import POST_STEPS

def create_post(driver, model_id):
    print(f"🧩 Starting post workflow for model {model_id}")

    driver.get("https://onlyfans.com/posts/create")
    # Передаём driver в work_safari
    work(driver, POST_STEPS)

if __name__ == "__main__":
    create_post(9)