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
    platform_id = payload.get("platform_id")
    caption = payload.get("caption", "🚀 Test post from automation")

    print(f"🧩 Starting post automation → platform_id={platform_id}, model_id={model_id}")

    driver = get_driver(model_id)
    driver.get("https://onlyfans.com/my/posts/new")
    print("🌍 Navigated to create post page")

    try:
        wait = WebDriverWait(driver, 30)

        # ждем textarea
        caption_input = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "textarea")))
        caption_input.click()
        caption_input.clear()
        caption_input.send_keys(caption)
        print("📝 Caption inserted")

        # ищем кнопку “Post”
        post_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Post')]")))
        post_button.click()
        print("🚀 Post submitted")

        time.sleep(5)
        print("✅ Post creation flow finished")

    except Exception as e:
        print(f"❌ Error during posting: {e}")
        sys.exit(2)

    finally:
        print("✨ Safari session kept alive after posting (driver not closed)")

if __name__ == "__main__":
    main()