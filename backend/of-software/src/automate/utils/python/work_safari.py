# ============================================================
# work_safari.py — v3 Stable Safari
# Полностью очищенный, исправленный и задокументированный.
# Основные улучшения:
#   • Исправлена подстановка $value
#   • Удалён мусорный handler _handle_keyboard_type
#   • Исправлен ввод caption (ProseMirror-friendly)
#   • Исправлен clickForValue (работает для месяца, дней, часов, AM/PM)
#   • Исправлен clickUntil (не ломается state)
#   • Добавлены комментарии к каждому блоку
#   • Устранены конфликты логики
# ============================================================

from __future__ import annotations

import time, os, shutil, tempfile
from typing import Any, Dict, List, Optional
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    ElementClickInterceptedException,
    StaleElementReferenceException,
    NoSuchElementException,
    JavascriptException,
    WebDriverException
)

# ============================================================
# BLOCK 1 — Константы ожиданий и retry-политика
# НУЖНЫ. Используются по всему файлу.
# ============================================================
# ----------------------------
# Константы ожиданий и настроек
# ----------------------------
FIRST_LONG_GATES_STEPS = 5          # На первых N шагах (где важно «приехать» в дом) даём длинные таймауты
TIMEOUT_LONG = 13                   # сек для первых «гейт» шагов
TIMEOUT_SHORT = 5                  # сек для остальных шагов
RETRY_CLICK = 3                     # ретраи кликов
RETRY_WAIT = 2                      # ретраи ожиданий (дополнительно к базовому)
RETRY_TYPING = 2                    # ретраи для печати текста
SCROLL_PADDING = 200                # прокрутка перед кликом
# ============================================================
# BLOCK 2 — RuntimeState
# НУЖЕН. Логирует прогресс, retries, ошибки.
# ============================================================
# ----------------------------
# Вспомогательное состояние
# ----------------------------
class RuntimeState:
    def __init__(self):
        self.step_index = 0
        self.total_steps = 0
        self.retried = 0
        self.skipped = 0
        self.failed = 0
        self.started_at = time.time()
        self._last_check_value = False
        self.post_data = {}

    def mark_retry(self):
        self.retried += 1

    def mark_skipped(self):
        self.skipped += 1

    def mark_failed(self):
        self.failed += 1

    def set_check(self, ok: bool):
        self._last_check_value = ok

    def last_check(self) -> bool:
        return self._last_check_value

# ============================================================
# BLOCK 3 — Helpers: поиск элементов, JS-scroll, safe click
# ВСЕ НУЖНЫ
# ============================================================
# ----------------------------
# Утилиты поиска/клика
# ----------------------------
def _timeout_for_step(state: RuntimeState, step_type: str) -> int:
    """13s для первых ворот (первые шаги), потом 5s"""
    if state.step_index < FIRST_LONG_GATES_STEPS and step_type in ("waitForSelector", "click", "appendMedias"):
        return TIMEOUT_LONG
    return TIMEOUT_SHORT

def _find(driver, selector: str, timeout: int):
    return WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))

def _find_all_visible(driver, selector: str) -> List[Any]:
    els = driver.find_elements(By.CSS_SELECTOR, selector)
    return [el for el in els if el.is_displayed()]  # тихие ошибки игнорируются

def _find_clickable(driver, selector: str, timeout: int):
    return WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))

def _scroll_into_view_js(driver, element):
    try:
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", element)
        driver.execute_script(f"window.scrollBy(0, -{SCROLL_PADDING});")
    except:
        pass

def _js_click(driver, element):
    try:
        driver.execute_script("arguments[0].click();", element)
        return True
    except:
        return False

def _safe_click(driver, selector, timeout, state, safeguard):
    last_err = None
    for attempt in range(RETRY_CLICK):
        try:
            el = _find_clickable(driver, selector, timeout)
            _scroll_into_view_js(driver, el)
            el.click()
            driver.execute_script("return document.readyState")  # <-- min wait
            time.sleep(0.2)
            return True
        except Exception as e:
            last_err = e
            state.mark_retry()
            try:
                el2 = driver.find_element(By.CSS_SELECTOR, selector)
                if _js_click(driver, el2):
                    return True
            except:
                pass
            time.sleep(0.5)

    msg = f"cannot click '{selector}': {last_err}"
    if safeguard:
        print(f"⚠️ click safeguard: {msg}")
        return False
    raise TimeoutException(msg)

# ============================================================
# BLOCK 4 — Универсальный ввод текста (исправлено для ProseMirror)
# КРИТИЧЕСКИЙ БЛОК
# ============================================================

def _type_text(driver, selector: Optional[str], text: str, timeout: int, state: RuntimeState):
    from selenium.webdriver.common.keys import Keys

    last_err = None

    for attempt in range(RETRY_TYPING):
        try:
            el = _find(driver, selector, timeout)
            _scroll_into_view_js(driver, el)
            el.click()
            driver.execute_script("return document.readyState")  # <-- min wait
            time.sleep(0.2)

            tag = el.tag_name.lower()
            editable = el.get_attribute("contenteditable")

            # Если это ProseMirror root → send_keys НЕ РАБОТАЕТ
            if editable and editable.lower() == "true":
                driver.execute_script("""
                    const el = arguments[0];
                    el.focus();
                    el.innerHTML = arguments[1];
                    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
                    el.dispatchEvent(new Event("change", { bubbles: true }));
                    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: " " }));
                """, el, text)
                time.sleep(0.2)
                return

            # Стандартный input/textarea
            if tag in ("input", "textarea"):
                el.clear()
            el.send_keys(text)
            time.sleep(0.2)
            return

        except Exception as e:
            last_err = e
            state.mark_retry()
            time.sleep(0.4)

    raise TimeoutException(f"cannot type into '{selector}': {last_err}")

# ============================================================
# BLOCK 5 — Handlers шагов
# Здесь много мусора → удалили то, что ломало pipeline
# ============================================================

def _handle_wait_for_time(step):
    ms = int(step.get("value", 0))
    print(f"⏳ waitForTime {ms}ms")
    time.sleep(ms / 1000)


def _handle_wait_for_selector(driver, step, state):
    sel = step.get("value")
    timeout = _timeout_for_step(state, "waitForSelector")
    print(f"🔎 waitForSelector: {sel}")

    try:
        _find(driver, sel, timeout)
        return
    except TimeoutException:
        for _ in range(RETRY_WAIT):
            state.mark_retry()
            try:
                _find(driver, sel, timeout)
                return
            except:
                pass
        raise


def _handle_click(driver, step, state):
    sel = step.get("value")
    safeguard = bool(step.get("safeguard"))
    print(f"🖱 click: {sel}")
    _safe_click(driver, sel, _timeout_for_step(state, "click"), state, safeguard)


# ❌ УДАЛЕНО: _handle_keyboard_type
# Был дубль и ломал ввод → send_keys активному элементу бесполезен.

# ============================================================
# INPUT TYPE — ПРАВИЛЬНО ПЕРЕПИСАНО
# ============================================================

def _handle_type(driver, step, post_data, state):
    raw = step.get("value")
    key = step.get("key")

    if raw == "$value":
        if key:
            val = str(post_data.get(key, "")).strip()
        else:
            val = str(post_data.get("value", "")).strip()
    else:
        val = str(raw)

    sel = step.get("selector")
    print(f"⌨ type '{val}' -> {sel}")

    _type_text(driver, sel, val, _timeout_for_step(state, "type"), state)


# ============================================================
# CLICK FOR VALUE — ПОЛНОСТЬЮ ИСПРАВЛЕНО
# ============================================================

def _handle_click_for_value(driver, step, post_data, state):
    raw = step.get("value", "").strip()
    key = step.get("key")

    if raw == "$value":
        if key:
            val = str(post_data.get(key, "")).lower().strip()
        else:
            val = str(post_data.get("value", "")).lower().strip()
    else:
        val = raw.lower()

    sel = step.get("selector")
    safeguard = bool(step.get("safeguard"))

    print(f"🖱 clickForValue: '{val}' in {sel}")

    try:
        WebDriverWait(driver, _timeout_for_step(state, "clickForValue")).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, sel))
        )
    except TimeoutException:
        if safeguard:
            print(f"⚠️ safeguard: list '{sel}' not found")
            return
        raise

    items = driver.find_elements(By.CSS_SELECTOR, sel)
    val_norm = val.lstrip("0")

    for el in items:
        try:
            txt = el.text.strip().lower()
            txt_norm = txt.lstrip("0")
            if txt_norm == val_norm or val_norm in txt_norm:
                _scroll_into_view_js(driver, el)
                try:
                    el.click()
                    driver.execute_script("return document.readyState")  # <-- min wait
                    time.sleep(0.2)
                except:
                    if not _js_click(driver, el):
                        raise
                return
        except:
            state.mark_retry()

    if safeguard:
        print(f"⚠️ safeguard: value '{val}' not found")
        return

    raise TimeoutException(f"value '{val}' not found")

# ============================================================
# CLICK UNTIL — ИСПРАВЛЕНО
# ============================================================

def _norm(x):
    return (x or "").strip().lower()


def _handle_click_until(driver, step, post_data, state):
    read_sel = step.get("selector")
    btn_sel = step.get("btnSelector")
    retry = int(step.get("retry", 24))
    raw = step.get("value")
    key = step.get("key")

    if raw == "$value":
        desired = str(post_data.get(key, "")).strip().lower()
    else:
        desired = raw.lower()

    desired_norm = _norm(desired)

    for _ in range(retry):
        try:
            txt = _norm(driver.find_element(By.CSS_SELECTOR, read_sel).text)
            if desired_norm in txt:
                return
        except:
            pass
        try:
            driver.find_element(By.CSS_SELECTOR, btn_sel).click()
        except:
            pass
        time.sleep(0.25)

    raise TimeoutException(f"clickUntil: cannot reach '{desired}'")


# ============================================================
# CHECK, CONDITION, LOOP — нужные, не трогаем
# ============================================================

def _handle_check_value(step, post_data, state):
    key = step.get("key")
    ok = bool(post_data.get(key))
    print(f"checkValue[{key}] → {ok}")
    state.set_check(ok)


def _handle_condition(driver, step, post_data, state):
    childs = step.get("childs", {})
    if state.last_check():
        _exec_child_steps(driver, childs.get("yes", []), post_data, state)
    else:
        print("condition → NO branch")


def _handle_loop(driver, step, post_data, state):
    key = step.get("key")
    raw = post_data.get(key, "")
    print(f"loop[{key}] = '{raw}'")

    if not raw:
        return state.mark_skipped()

    items = [x.strip() for x in raw.split(",") if x.strip()]
    for item in items:
        local = dict(post_data)
        local["value"] = item
        _exec_child_steps(driver, step.get("childs", {}).get("yes", []), local, state)


# ============================================================
# appendMedias — оставляем, Safari фикс включён
# ============================================================

def ensure_world_readable(path: str) -> str:
    """Гарантирует, что файл world-readable. Если нельзя chmod — делаем копию в /tmp."""
    try:
        os.chmod(path, 0o644)
        print(f"✅ chmod 644 succeeded for {path}")
        return path
    except Exception as e:
        print(f"⚠️ Failed to chmod file: {e}, trying temp copy...")
        try:
            tmp_dir = os.path.join(tempfile.gettempdir(), "of_uploads")
            os.makedirs(tmp_dir, exist_ok=True)
            filename = os.path.basename(path)
            tmp_path = os.path.join(tmp_dir, filename)
            shutil.copy2(path, tmp_path)
            os.chmod(tmp_path, 0o644)
            print(f"✅ Copied file to tmp and chmod 644: {tmp_path}")
            return tmp_path
        except Exception as e2:
            print(f"❌ unable to prepare temp file: {e2}")
            raise

def _handle_append_medias(driver, step, post_data, state):
    key = step.get("key") or "content_path"
    file_path = post_data.get(key) or post_data.get("content_path")
    selector = step.get("selector") or "input[type='file']"

    print(f"📦 appendMedias: key={key}, file_path={file_path}, selector={selector}")

    if not file_path or not os.path.exists(file_path):
        print(f"⚠️ File does not exist or not provided: {file_path}")
        return state.mark_skipped()

    # 🔐 ВАЖНО: делаем файл world-readable для SafariDriver
    try:
        #os.chmod(file_path, 0o644)
        safe_path = ensure_world_readable(file_path)
        print(f"🔐 chmod 644 applied to {safe_path}")
    except Exception as e:
        print(f"⚠️ Failed to chmod file: {e}")
        return state.mark_failed()

    # Немного sanity-check, чтобы видеть что реально существует
    try:
        if not os.path.isfile(safe_path):
            print(f"❌ File not found at safe_path: {safe_path}")
        if not os.path.isfile(file_path):
            print(f"❌ File not found at original file_path: {file_path}")
    except Exception as e:
        print(f"⚠️ os.path.isfile check failed: {e}")

    try:
        el = None

        # 1️⃣ пробуем найти file input как есть
        try:
            print(f"🔎 appendMedias: trying primary selector {selector}")
            el = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, selector))
            )
        except Exception as e_primary:
            print(f"⚠️ Primary selector '{selector}' not found: {e_primary}")
            print("⚠️ input[type=file] не найден сразу, пробуем кликнуть кнопку 'Add media' (#attach_file_photo)")
            try:
                btn = driver.find_element(By.CSS_SELECTOR, "#attach_file_photo")
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", btn)
                btn.click()
                time.sleep(0.8)
            except Exception as e_btn:
                print(f"❌ Не удалось кликнуть #attach_file_photo: {e_btn}")

            try:
                el = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                print(f"✅ appendMedias: found file input by selector {selector} after button click")
            except Exception as e_second:
                print(f"⚠️ Still no element by '{selector}': {e_second}")
                el = None

        if el is None:
            print("🔎 appendMedias: scanning for ANY input[type='file']")
            file_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
            print(f"🔎 Found {len(file_inputs)} file inputs in DOM")

            for idx, inp in enumerate(file_inputs):
                try:
                    attrs = driver.execute_script(
                        """
                        const el = arguments[0];
                        return {
                          id: el.id || null,
                          name: el.name || null,
                          className: el.className || null,
                          hidden: el.hidden || false,
                          display: getComputedStyle(el).display,
                          visibility: getComputedStyle(el).visibility
                        };
                        """,
                        inp,
                    )
                    print(f"   🧩 input[{idx}]: {attrs}")
                except Exception:
                    pass

            for inp in file_inputs:
                try:
                    if inp.is_enabled():
                        el = inp
                        print("✅ appendMedias: using first enabled input[type=file]")
                        break
                except Exception:
                    continue

        if el is None:
            print("❌ appendMedias: NO usable input[type='file'] found → skip")
            return state.mark_skipped()

        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)

        # 🔁 1) сначала пробуем temp-путь (/tmp/of_uploads/…)
        try:
            print(f"📁 appendMedias: Uploading {safe_path} into input[type='file']")
            el.send_keys(safe_path)
        except Exception as e1:
            print(
                f"❌ appendMedias: Safari rejected temp path {safe_path}: {e1}. "
                f"Trying original file_path: {file_path}"
            )

            # 🔁 2) fallback — пробуем прямой путь из /uploads/…
            try:
                print(f"📁 appendMedias: Retrying upload with original path {file_path}")
                el.send_keys(file_path)
            except Exception as e2:
                print(
                    f"❌ appendMedias: Safari rejected original path {file_path} too: {e2}"
                )
                return state.mark_failed()

        try:
            WebDriverWait(driver, 20).until_not(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, "span.b-dropzone__preview__progress")
                )
            )
            print("⏳ Upload progress indicator disappeared (b-dropzone__preview__progress)")
        except Exception:
            print("⚠️ No explicit upload progress indicator or wait timeout, continue anyway")

        try:
            print("🔎 Checking dropzone preview nodes after upload…")
            preview_info = driver.execute_script(
                """
                const sels = [
                  '.b-dropzone__video',
                  '.b-dropzone__item',
                  '.b-dropzone__preview'
                ];
                const result = {};
                for (const sel of sels) {
                  const els = Array.from(document.querySelectorAll(sel));
                  result[sel] = els.map(el => ({
                    tag: el.tagName,
                    className: el.className,
                    html: el.outerHTML.slice(0, 180)
                  }));
                }
                return result;
                """
            )
            print("🎯 Dropzone preview snapshot:", preview_info)
        except Exception as e:
            print(f"⚠️ Failed to inspect dropzone preview: {e}")

        try:
            def any_preview(drv):
                sels = [
                    ".b-dropzone__video",
                    ".b-dropzone__item",
                    ".b-dropzone__preview",
                ]
                for sel in sels:
                    if drv.find_elements(By.CSS_SELECTOR, sel):
                        return True
                return False

            WebDriverWait(driver, 10).until(any_preview)
            print("✅ appendMedias: preview element detected in dropzone before submit.")
        except Exception as e_wait:
            print(f"⚠️ appendMedias: no preview detected before timeout: {e_wait}")

        print("✅ File uploaded successfully (appendMedias end)")
        #state.mark_ok()

    except Exception as e:
        print(f"❌ appendMedias failed: {e}")
        state.mark_failed()


# ============================================================
# EXECUTION ENGINE — НУЖЕН
# ============================================================

def _exec_child_steps(driver, steps, post_data, state):
    for s in steps:
        _exec_one_step(driver, s, post_data, state)


def _exec_one_step(driver, step, post_data, state):
    state.step_index += 1
    stype = step.get("type")

    print(f"\n➡️ Step {state.step_index}/{state.total_steps}: {stype}")

    try:
        if stype == "waitForTime":
            _handle_wait_for_time(step)

        elif stype == "waitForSelector":
            _handle_wait_for_selector(driver, step, state)

        elif stype == "click":
            _handle_click(driver, step, state)

        elif stype == "type":
            _handle_type(driver, step, post_data, state)

        elif stype == "clickForValue":
            _handle_click_for_value(driver, step, post_data, state)

        elif stype == "clickUntil":
            _handle_click_until(driver, step, post_data, state)

        elif stype == "checkValue":
            _handle_check_value(step, post_data, state)

        elif stype == "condition":
            _handle_condition(driver, step, post_data, state)

        elif stype == "loop":
            _handle_loop(driver, step, post_data, state)

        elif stype == "appendMedias":
            _handle_append_medias(driver, step, post_data, state)
        #testme
        elif stype == "runScript":
            script = step.get("value", "")
            key = step.get("key")
            arg = post_data.get(key) if key else None

            try:
                driver.execute_script(script, arg)
                time.sleep(0.35)
            except Exception as e:
                print(f"runScript failed: {e}")

        else:
            print(f"unknown step → skip")
            state.mark_skipped()

    except Exception as e:
        print(f"❌ Step failed ({stype}): {e}")
        state.mark_failed()
        return


# ============================================================
# MAIN
# ============================================================

def work(driver, steps, post_data):
    main_handle = driver.current_window_handle
    driver.switch_to.window(main_handle)
    state = RuntimeState()
    state.total_steps = len(steps)
    state.post_data = post_data

    print(f"🚀 Starting workflow: {state.total_steps} steps")

    start = time.time()

    for step in steps:
        _exec_one_step(driver, step, post_data, state)

    print("\n============================================================")
    print(f"Finished {state.total_steps} steps:"
          f" retried={state.retried}, skipped={state.skipped}, failed={state.failed}")
    print("============================================================")

