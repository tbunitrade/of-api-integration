# post_safari.py
import json
import traceback
import time
from safari_session_manager import get_driver
from work_safari import work
from post_steps import POST_STEPS
from selenium.webdriver.common.by import By


def inject_payload_into_steps(steps, cli_payload):
    def deep_replace(obj, payload):
        if isinstance(obj, dict):
            new_dict = {}
            for k, v in obj.items():
                new_dict[k] = deep_replace(v, payload)
            return new_dict
        elif isinstance(obj, list):
            return [deep_replace(x, payload) for x in obj]
        elif isinstance(obj, str):
            result = obj
            for key, value in payload.items():
                result = result.replace(f"${key}", str(value))
            return result
        else:
            return obj

    injected_steps = []
    for step in steps:
        injected_steps.append(deep_replace(step, cli_payload))
    return injected_steps


def create_post(safari_driver, cli_payload):
    post_model_id = cli_payload.get("model_id")
    print(f"🧩 Starting post workflow for model {post_model_id}")

    post_data = cli_payload.get("postData", {})

    try:
        safari_driver.get("https://onlyfans.com/posts/create")

        time.sleep(15)

        print("🔎 Checking for .b-feed element...")
        for _ in range(30):
            els = safari_driver.find_elements(By.CSS_SELECTOR, ".b-feed")
            if els:
                print("✅ .b-feed detected — UI is ready.")
                break
            time.sleep(1)
        else:
            print("⚠️ .b-feed not found after 30s, continuing anyway...")

        # Заменяем переменные в POST_STEPS
        print("📦 postData = ", post_data)
        steps = inject_payload_into_steps(POST_STEPS, post_data)
        print(f"🚀 Loaded {len(steps)} steps for post execution.")

        # Передаём модифицированный steps в work()
        work(safari_driver, steps, post_data)

        print("✅ Post workflow finished successfully.")

    except Exception as e:
        print("❌ Error during post workflow:")
        traceback.print_exc()

    finally:
        try:
            print("⏳ Waiting 2 seconds before closing Safari…")
            time.sleep(10)
            #safari_driver.quit()
            print("🧹 Safari driver should be closed.")
        except Exception:
            pass


if __name__ == "__main__":
    import sys

    cli_payload = json.loads(sys.argv[1])
    safari_driver = get_driver(cli_payload["model_id"])

    create_post(safari_driver, cli_payload)
    print("✅ CLI payload received:", cli_payload)