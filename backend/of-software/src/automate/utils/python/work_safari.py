# work-safari.py
import json
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def wait_for_selector(driver, selector, timeout=10):
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, selector))
        )
        return True
    except Exception as e:
        print(f"⚠️ wait_for_selector timeout for {selector}: {e}")
        return False

def click(driver, selector):
    try:
        el = driver.find_element(By.CSS_SELECTOR, selector)
        el.click()
        print(f"🖱️ Clicked {selector}")
        return True
    except Exception as e:
        print(f"⚠️ click failed for {selector}: {e}")
        return False

def type_text(driver, selector, value):
    try:
        el = driver.find_element(By.CSS_SELECTOR, selector)
        el.clear()
        el.send_keys(value)
        print(f"⌨️ Typed '{value}' into {selector}")
        return True
    except Exception as e:
        print(f"⚠️ type failed for {selector}: {e}")
        return False

def click_for_value(driver, selector, value):
    try:
        elements = driver.find_elements(By.CSS_SELECTOR, selector)
        for el in elements:
            text = el.text.strip().lower()
            if value.lower() in text:
                el.click()
                print(f"✅ click_for_value found '{value}' in {selector}")
                return True
        print(f"⚠️ No element matching '{value}' in {selector}")
        return False
    except Exception as e:
        print(f"❌ click_for_value error: {e}")
        return False

def work(driver, steps):
    """Выполняет последовательность шагов (postSteps)"""
    for step in steps:
        step_type = step.get("type")
        value = step.get("value")
        selector = step.get("selector")

        print(f"➡️ Step: {step_type} | Value: {value}")

        if step_type == "waitForTime":
            time.sleep(int(value) / 1000)
        elif step_type == "waitForSelector":
            wait_for_selector(driver, value)
        elif step_type == "click":
            click(driver, value)
        elif step_type == "type":
            type_text(driver, selector, value)
        elif step_type == "clickForValue":
            click_for_value(driver, selector, value)

        elif step_type == "appendMedias":
            try:
                if not value:
                    print("⚠️ appendMedias: value is empty")
                    continue

                file_list = value.split(",")
                for file_path in file_list:
                    file_path = file_path.strip()
                    if not file_path:
                        continue

                    # Находим input и загружаем файл
                    input_elem = driver.find_element(By.CSS_SELECTOR, step["selector"])
                    input_elem.send_keys(file_path)
                    print(f"📁 Uploaded media: {file_path}")
                    time.sleep(0.1)  # Короткая пауза между загрузками

                # Ждём окончания загрузки (ожидаем исчезновения прогресс-бара)
                for _ in range(10):  # максимум 10 попыток
                    time.sleep(1)
                    try:
                        uploading = driver.find_elements(By.CSS_SELECTOR, "span.b-dropzone__preview__progress")
                        if not uploading:
                            print("✅ Upload finished")
                            break
                    except Exception as e:
                        print("⚠️ Error while waiting for upload done: ", e)

                # Закрыть alert об ошибке (если есть)
                try:
                    modal_btn = driver.find_element(By.CSS_SELECTOR, "#ModalAlert___BV_modal_content_ footer button")
                    modal_btn.click()
                    print("🧹 Closed ModalAlert after file type error")
                except Exception:
                    pass  # Нет модалки — ок

            except Exception as e:
                print(f"❌ appendMedias failed: {e}")

        elif step_type == "keyboardType":
            try:
                driver.switch_to.active_element.send_keys(value)
                print(f"⌨️ Sent keys: {value}")
            except Exception as e:
                print(f"⚠️ keyboardType failed: {e}")
        elif step_type == "clickUntil":
            max_tries = 12
            for _ in range(max_tries):
                try:
                    el_text = driver.find_element(By.CSS_SELECTOR, step["selector"]).text.strip()
                    if step["value"].lower() in el_text.lower():
                        print("✅ Target value found in DOM")
                        break
                    driver.find_element(By.CSS_SELECTOR, step["btnSelector"]).click()
                    time.sleep(0.5)
                except Exception as e:
                    print(f"⚠️ clickUntil failed: {e}")
                    break
        elif step_type == "loop":
            items = step["value"].split(",")
            for item in items:
                for child in step.get("childs", {}).get("yes", []):
                    child_copy = json.loads(json.dumps(child).replace("$value", item.strip()))
                    work(driver, [child_copy])

        elif step_type == "waitForNavigation":
            try:
                WebDriverWait(driver, 10).until(
                    lambda d: d.execute_script("return document.readyState") == "complete"
                )
                print("🧭 Navigation completed")
            except Exception as e:
                print(f"⚠️ waitForNavigation failed: {e}")

        else:
            print(f"⚙️ Unknown step type: {step_type}")

    print("✅ work() completed.")