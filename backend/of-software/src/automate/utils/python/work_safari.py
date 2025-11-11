# work_safari.py
# Safari (Selenium) executor for Step[] converted from Puppeteer work-utils.ts
# Executes a list of steps with placeholders already injected by caller.
# Supports: waitForTime, waitForSelector, click, clickForValue, clickUntil,
#           keyboardType, type, appendMedias, loop, checkValue, condition,
#           runScript, close, waitForNavigation (basic)

from typing import Any, Dict, List, Optional
import time
import traceback
from selenium.webdriver.remote.webdriver import WebDriver, WebElement
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ---------- helpers ----------

def _log(s: str) -> None:
    print(s, flush=True)

def _find(driver: WebDriver, selector: str, timeout: int = 20) -> WebElement:
    wait = WebDriverWait(driver, timeout)
    return wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))

def _find_clickable(driver: WebDriver, selector: str, timeout: int = 20) -> WebElement:
    wait = WebDriverWait(driver, timeout)
    return wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))

def _find_all(driver: WebDriver, selector: str, timeout: int = 20) -> List[WebElement]:
    # wait at least for container presence, then grab all
    _find(driver, selector, timeout=timeout)
    return driver.find_elements(By.CSS_SELECTOR, selector)

def _safe_click(el: WebElement) -> None:
    try:
        el.click()
    except Exception:
        # sometimes JS overlay; try JS click
        el.parent.execute_script("arguments[0].click();", el)

def _norm_text(s: str) -> str:
    return (s or "").strip().lower()

def _sleep_ms(ms: int) -> None:
    time.sleep(max(ms, 0) / 1000)

def _dispatch_input(driver: WebDriver, el: WebElement) -> None:
    # Best-effort notify frameworks that value changed
    driver.execute_script("""
        const el = arguments[0];
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    """, el)

# ---------- core step handlers ----------

def _handle_wait_for_time(step: Dict[str, Any]) -> None:
    val = int(str(step.get("value", "0")).strip() or "0")
    _log(f"⏳ waitForTime {val}ms")
    _sleep_ms(val)

def _handle_wait_for_selector(driver: WebDriver, step: Dict[str, Any]) -> None:
    sel = step.get("value") or step.get("selector")
    if not sel:
        _log("⚠️ waitForSelector: no selector/value provided")
        return
    _log(f"🔎 waitForSelector: {sel}")
    _find(driver, sel, timeout=30)

def _handle_click(driver: WebDriver, step: Dict[str, Any]) -> None:
    sel = step.get("value") or step.get("selector")
    if not sel:
        _log("⚠️ click: no selector/value provided")
        return
    _log(f"🖱️ click: {sel}")
    el = _find_clickable(driver, sel, timeout=30)
    _safe_click(el)

def _handle_keyboard_type(driver: WebDriver, step: Dict[str, Any]) -> None:
    # types into active element; in your steps you click editor before this
    val = str(step.get("value", "") or "")
    _log(f"⌨️ keyboardType: {len(val)} chars -> activeElement")
    active = driver.switch_to.active_element
    active.send_keys(val)

def _handle_type(driver: WebDriver, step: Dict[str, Any]) -> None:
    sel = step.get("selector")
    val = str(step.get("value", "") or "")
    if not sel:
        _log("⚠️ type: selector required")
        return
    _log(f"⌨️ type: {len(val)} chars -> {sel}")
    el = _find_clickable(driver, sel, timeout=30)
    try:
        el.clear()
    except Exception:
        pass
    try:
        el.send_keys(val)
    except Exception:
        # fallback set value via JS (useful for masked inputs)
        driver.execute_script("arguments[0].value = arguments[1];", el, val)
    _dispatch_input(driver, el)

def _handle_click_for_value(driver: WebDriver, step: Dict[str, Any]) -> None:
    sel = step.get("selector")
    val = str(step.get("value", "")).strip()
    if not sel or val == "":
        _log("⚠️ clickForValue: selector and value required")
        return
    tries = int(step.get("retry", 3))
    _log(f"🖱️ clickForValue: '{val}' in {sel} (retry={tries})")
    for attempt in range(1, tries + 1):
        items = _find_all(driver, sel, timeout=30)
        target = None
        for el in items:
            # skip disabled/hidden
            if el.get_attribute("disabled"):
                continue
            txt = _norm_text(el.text or el.get_attribute("innerText") or "")
            if _norm_text(val) == txt:
                target = el
                break
        if target:
            _safe_click(target)
            _log(f"✅ clickForValue matched on attempt {attempt}")
            return
        _log(f"↻ clickForValue no match (attempt {attempt}/{tries}); waiting 500ms")
        _sleep_ms(500)
    _log("⚠️ clickForValue: no element matched text")

def _handle_click_until(driver: WebDriver, step: Dict[str, Any]) -> None:
    # Designed for calendar month navigation etc.
    selector = step.get("selector")
    btn = step.get("btnSelector")
    desired = _norm_text(step.get("value", ""))
    tries = int(step.get("retry", 5))
    if not selector or not btn or not desired:
        _log("⚠️ clickUntil: selector, btnSelector, value required")
        return
    _log(f"🧭 clickUntil: want '{desired}', selector={selector}, btn={btn}, retry={tries}")
    for attempt in range(1, tries + 1):
        try:
            lab = _find(driver, selector, timeout=10)
            cur = _norm_text(lab.text or lab.get_attribute("innerText") or "")
            _log(f"   • current='{cur}' (attempt {attempt}/{tries})")
            if cur == desired:
                _log("✅ clickUntil: matched desired label")
                return
            # click next button and try again
            nxt = _find_clickable(driver, btn, timeout=10)
            _safe_click(nxt)
            _sleep_ms(300)
        except Exception as e:
            _log(f"⚠️ clickUntil error: {e}")
            _sleep_ms(300)
    _log("⚠️ clickUntil: exhausted retries without match")

def _handle_append_medias(driver: WebDriver, step: Dict[str, Any]) -> None:
    # TS semantics: click attach button, then upload media (in Puppeteer via setInputFiles).
    # In Selenium we need a visible <input type="file"> to send_keys(local_path).
    # If your values are URLs, make sure they are downloaded to local paths before this step.
    trigger_sel = step.get("selector") or step.get("value")
    raw = str(step.get("value", "") or "")
    medias = [p.strip() for p in raw.split(",") if p.strip()]
    _log(f"📎 appendMedias: trigger={trigger_sel}, files={len(medias)}")
    if trigger_sel:
        try:
            btn = _find_clickable(driver, trigger_sel, timeout=30)
            _safe_click(btn)
            _sleep_ms(500)
        except Exception as e:
            _log(f"⚠️ appendMedias: cannot click trigger '{trigger_sel}': {e}")
    # try to find a file input
    file_input = None
    try:
        # common patterns: input[type=file] becomes visible after click
        inputs = driver.find_elements(By.CSS_SELECTOR, 'input[type="file"]')
        file_input = next((i for i in inputs if i.is_displayed()), None)
    except Exception:
        file_input = None
    if file_input and medias:
        try:
            # Safari supports multiple if input has multiple attribute; else send one by one
            multiple = file_input.get_attribute("multiple") is not None
            if multiple:
                file_input.send_keys("\n".join(medias))
            else:
                for path in medias:
                    file_input.send_keys(path)
                    _sleep_ms(500)
            _log("✅ appendMedias: files sent to input[type=file]")
        except Exception as e:
            _log(f"⚠️ appendMedias: sending files failed: {e}")
    else:
        _log("ℹ️ appendMedias: no visible input[type=file] found (UI may use native dialog).")

    # optional: wait for upload indicators to finish if present
    try:
        # wait for any progress to appear & disappear
        # tweak selectors if you have specific progress bars
        WebDriverWait(driver, 3).until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".progress, .b-progress")))
        _log("⏳ upload progress detected; waiting up to 30s to finish…")
        WebDriverWait(driver, 30).until_not(EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".progress, .b-progress")))
        _log("✅ upload finished")
    except Exception:
        _log("ℹ️ appendMedias: no progress indicator found or already finished")

def _handle_run_script(driver: WebDriver, step: Dict[str, Any]) -> None:
    script = step.get("value") or step.get("script")
    if not script:
        _log("⚠️ runScript: no script provided")
        return
    _log("🧪 runScript")
    driver.execute_script(script)

def _handle_close(driver: WebDriver, step: Dict[str, Any]) -> None:
    _log("🧹 close current window")
    try:
        driver.close()
    except Exception as e:
        _log(f"⚠️ close: {e}")

def _handle_wait_for_navigation(driver: WebDriver, step: Dict[str, Any]) -> None:
    # basic variant: wait for URL to contain value (if provided), else small delay
    target = str(step.get("value", "")).strip()
    _log(f"🧭 waitForNavigation: target='{target}'")
    if target:
        try:
            WebDriverWait(driver, 30).until(lambda d: target in d.current_url)
            _log("✅ navigation target reached")
            return
        except Exception:
            _log("⚠️ waitForNavigation: target not reached in 30s")
    _sleep_ms(500)

# ---------- main work executor ----------

def work(driver: WebDriver, steps: List[Dict[str, Any]]) -> None:
    """
    Execute provided steps sequentially. Steps are assumed to be already
    payload-injected (i.e., no $placeholders remain).
    """
    context: Dict[str, Any] = {
        "compare_result_value": None  # used by checkValue/condition
    }

    total = len(steps)
    _log(f"🚀 work(): starting {total} steps")

    for i, step in enumerate(steps):
        step_type = step.get("type", "")
        safeguard = bool(step.get("safeguard", False))
        _log(f"\n➡️ Step {i+1}/{total}: {step_type}  {('🛡️' if safeguard else '')}")

        try:
            if step_type == "waitForTime":
                _handle_wait_for_time(step)

            elif step_type == "waitForSelector":
                _handle_wait_for_selector(driver, step)

            elif step_type == "click":
                _handle_click(driver, step)

            elif step_type == "keyboardType":
                _handle_keyboard_type(driver, step)

            elif step_type == "type":
                _handle_type(driver, step)

            elif step_type == "clickForValue":
                _handle_click_for_value(driver, step)

            elif step_type == "clickUntil":
                _handle_click_until(driver, step)

            elif step_type == "appendMedias":
                _handle_append_medias(driver, step)

            elif step_type == "runScript":
                _handle_run_script(driver, step)

            elif step_type == "close":
                _handle_close(driver, step)

            elif step_type == "waitForNavigation":
                _handle_wait_for_navigation(driver, step)

            elif step_type == "checkValue":
                # Set flag true if step.key exists and is truthy
                k = step.get("key")
                # In your pipeline steps are already injected; if you still pass 'key' name,
                # best-effort: consider it's truthy if provided and non-empty.
                ok = k is not None and str(k).strip() != ""
                context["compare_result_value"] = bool(ok)
                _log(f"🔎 checkValue('{k}') -> {context['compare_result_value']}")

            elif step_type == "condition":
                # Execute childs.yes if last checkValue was True
                cond = bool(context.get("compare_result_value"))
                childs = step.get("childs", {})
                _log(f"🧩 condition: compare_result_value={cond}")
                if cond:
                    yes_steps = childs.get("yes") or []
                    if isinstance(yes_steps, list) and yes_steps:
                        _log(f"↪️ condition.yes -> executing {len(yes_steps)} steps")
                        work(driver, yes_steps)   # recursive execution with same context is fine
                    else:
                        _log("ℹ️ condition.yes empty")
                else:
                    _log("⏭️ condition: skipped (false)")

            elif step_type == "loop":
                # Iterate over list of items (comma/pipe separated supported)
                raw = str(step.get("value", "") or "")
                # items could be JSON-injected already; split by comma
                parts = [p.strip() for p in raw.split(",") if p.strip()]
                childs = step.get("childs", {})
                yes_steps = childs.get("yes") or []
                _log(f"🔁 loop: {len(parts)} item(s)")
                for idx, item in enumerate(parts, start=1):
                    _log(f"   • loop item {idx}/{len(parts)}: '{item}'")
                    # for each nested step, replace $value on the fly
                    nested: List[Dict[str, Any]] = []
                    for s in yes_steps:
                        # deep copy with replacement only in strings for 'value' fields and 'selector' if needed
                        import json as _json
                        js = _json.dumps(s)
                        js = js.replace("$value", item)
                        nested.append(_json.loads(js))
                    if nested:
                        work(driver, nested)

            else:
                _log(f"⚠️ Unknown step type: {step_type}")

        except Exception as e:
            _log(f"❌ Step {i+1}/{total} failed ({step_type}): {e}")
            traceback.print_exc()
            if not safeguard:
                _log("🛑 No safeguard — aborting workflow")
                raise
            else:
                _log("🛡️ safeguard enabled — continue to next step")

    _log("🏁 work(): finished all steps")