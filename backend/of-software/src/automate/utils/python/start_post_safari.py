# start_post_safari.py
import sys, json, time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from safari_session_manager import get_driver

def main():
    if len(sys.argv) < 2:
        print("No payload received")
        sys.exit(1)

    payload = json.loads(sys.argv[1])
    model_id = payload.get("model_id")
    caption = payload.get("caption", "🚀 Test post from Safari automation")

    print(f"🧩 Start post automation for model {model_id}")

    driver = get_driver(model_id)
    driver.get("https://onlyfans.com/posts/create")

    try:
        wait = WebDriverWait(driver, 30)
        textarea = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "textarea")))
        textarea.click()
        textarea.send_keys(caption)
        print("📝 Caption inserted")

        print("✅ Reached post creation page successfully")
    except Exception as e:
        print(f"❌ Post creation error: {e}")
    finally:
        print("✨ Safari session kept alive after posting (not closed)")

if __name__ == "__main__":
    main()