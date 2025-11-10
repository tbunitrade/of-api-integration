# post_safari.py
import json
import traceback
from safari_session_manager import get_driver
from work_safari import work
from post_steps import POST_STEPS


def inject_payload_into_steps(steps, payload):
    injected_steps = []
    for step in steps:
        step_str = json.dumps(step)
        for key, value in payload.items():
            step_str = step_str.replace(f"${key}", str(value))
        injected_steps.append(json.loads(step_str))
    return injected_steps


def create_post(driver, payload):
    model_id = payload.get("model_id")
    print(f"🧩 Starting post workflow for model {model_id}")

    try:
        driver.get("https://onlyfans.com/posts/create")

        # Заменяем переменные в POST_STEPS
        steps = inject_payload_into_steps(POST_STEPS, payload)
        print(f"🚀 Loaded {len(steps)} steps for post execution.")

        # Передаём модифицированный steps в work()
        work(driver, steps)

        print("✅ Post workflow finished successfully.")

    except Exception as e:
        print("❌ Error during post workflow:")
        traceback.print_exc()

    finally:
        try:
            driver.quit()
            print("🧹 Safari driver closed.")
        except Exception:
            pass


if __name__ == "__main__":
    import sys

    payload = json.loads(sys.argv[1])
    model_id = payload["model_id"]
    driver = get_driver(model_id)

    create_post(driver, payload)
    print("✅ CLI payload received:", payload)