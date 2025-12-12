# post_safari.py
import json
import traceback
import time
from safari_session_manager import get_driver
from work_safari import work
from post_steps import POST_STEPS
from selenium.webdriver.common.by import By

# ============================================================
# inject_payload_into_steps — подставляет значения postData
# в шаги POST_STEPS вместо плейсхолдеров вида $key
# ============================================================
def inject_payload_into_steps(steps, cli_payload):
    """Рекурсивно проходит по steps и заменяет строки с плейсхолдерами $key на значения из cli_payload."""
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


# ============================================================
# create_post — открывает /posts/create и выполняет POST_STEPS
# ============================================================
def create_post(safari_driver, cli_payload):
    """Открывает страницу создания поста, подставляет postData в шаги и запускает work()."""
    post_model_id = cli_payload.get("model_id")
    print(f"🧩 Starting post workflow for model {post_model_id}")

    post_runs = cli_payload.get("postRuns")
    single_post_data = cli_payload.get("postData", {})

    if post_runs:
        print(f"📅 Received {len(post_runs)} postRuns from payload")
    else:
        print("📅 No postRuns array, falling back to single postData")

    try:
        safari_driver.get("https://onlyfans.com/posts/create")

        # ждём, пока страница прогрузится
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

        if post_runs:
            total = len(post_runs)
            for idx, pr in enumerate(post_runs, start=1):
                print("\n============================================================")
                print(f"▶️ Run {idx}/{total}")

                # 🔄 Для всех, кроме первого, заново открываем /posts/create
                if idx > 1:
                    print("🔄 Navigating back to /posts/create for next run...")
                    safari_driver.get("https://onlyfans.com/posts/create")
                    time.sleep(15)
                    # Можно, если хочешь, ещё подстраховаться:
                    # from selenium.webdriver.common.by import By
                    # for _ in range(30):
                    #     els = safari_driver.find_elements(By.CSS_SELECTOR, "form#make_post_form")
                    #     if els:
                    #         print("✅ make_post_form ready for next run.")
                    #         break
                    #     time.sleep(1)

                # базовые данные
                post_data = dict(single_post_data)
                post_data.update(pr or {})

                # 0-based индекс руна – будем использовать в selectMediaByIndex
                run_index = idx - 1
                post_data["run_index"] = run_index

                print("📦 postData (base) = ", post_data)

                # работаем с копией, чтобы не портить исходный массив
                local_post_data = dict(post_data)

                has_tags = bool(
                    (local_post_data.get("release_user_tags") or "").strip()
                    or (local_post_data.get("release_form_tags") or "").strip()
                )

                local_post_data["has_release_tags"] = has_tags
                print(f"🏷 has_release_tags = {has_tags}")

                # ⬇️ Никакого bulk / bulk_media_paths — каждый run заливает СВОЙ content_path
                # сначала подставляем payload в POST_STEPS
                steps = inject_payload_into_steps(POST_STEPS, local_post_data)

                # ⬇️ Больше НЕ вырезаем appendMedias на idx > 1
                # steps = [s for s in steps if s.get("type") != "appendMedias"]  # ← убрали

                print("📦 postData (final) = ", local_post_data)
                print(f"🚀 Loaded {len(steps)} steps for post execution.")

                # один run = один полноценный workflow (загрузка медиа + caption + время + пост)
                print("🌍 Current URL before steps:", safari_driver.current_url)
                work(safari_driver, steps, local_post_data)

                print("✅ Post workflow finished for this run.")
                # если нужно — можно добавить паузу между постами:
                # time.sleep(2)

            print("\n✅ All postRuns processed successfully.")
        else:
            post_data = dict(single_post_data)

            has_tags = bool(
                (post_data.get("release_user_tags") or "").strip()
                or (post_data.get("release_form_tags") or "").strip()
            )
            post_data["has_release_tags"] = has_tags
            print("📦 postData = ", post_data)
            print(f"🏷 has_release_tags = {has_tags}")
            steps = inject_payload_into_steps(POST_STEPS, post_data)
            print(f"🚀 Loaded {len(steps)} steps for post execution.")

            print("🌍 Current URL before steps:", safari_driver.current_url)
            work(safari_driver, steps, post_data)

            print("✅ Post workflow finished successfully.")

    except Exception as e:
        print("❌ Error during post workflow:")
        traceback.print_exc()
    finally:
        try:
            print("⏳ Waiting 2 seconds before closing Safari…")
            time.sleep(10)
            print("🧹 Closing Safari driver via quit()…")
            safari_driver.quit()
        except Exception:
            pass

if __name__ == "__main__":
    import sys

    cli_payload = json.loads(sys.argv[1])
    safari_driver = get_driver(cli_payload["model_id"])

    create_post(safari_driver, cli_payload)
    print("✅ CLI payload received:", cli_payload)