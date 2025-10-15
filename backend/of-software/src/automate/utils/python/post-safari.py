import sys, json, time
from safari_session_manager import get_driver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def main():
    if len(sys.argv) < 2:
        print("No payload received")
        sys.exit(1)

    payload = json.loads(sys.argv[1])
    model_id = payload.get("model_id")
    caption = payload.get("caption") or "Hello from Safari 🧪"

    driver = get_driver(model_id)
    print(f"🧩 Creating post for model {model_id}")

    try:
        driver.get("https://onlyfans.com/my/posts/new")
        wait = WebDriverWait(driver, 30)

        # Примерно — под реальный DOM можно легко подстроить
        caption_input = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "textarea")))
        caption_input.clear()
        caption_input.send_keys(caption)
        print("📝 Caption inserted")

        # Кнопка "Post"
        post_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Post')]")))
        post_button.click()
        print("🚀 Post submitted")

        time.sleep(3)
        print("✅ Post done")

    except Exception as e:
        print(f"❌ Post error: {e}")
        sys.exit(3)

if __name__ == "__main__":
    main()