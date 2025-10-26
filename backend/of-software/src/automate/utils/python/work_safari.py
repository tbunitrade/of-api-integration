# work-safari.py
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
        else:
            print(f"⚙️ Unknown step type: {step_type}")

    print("✅ work() completed.")