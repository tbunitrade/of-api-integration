# work_safari.py
# v2 Stable Safari — extended waits, retries, JS fallback, detailed logs + summary
from __future__ import annotations

import time
import json
import traceback
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
)

# ----------------------------
# Константы ожиданий и настроек
# ----------------------------
FIRST_LONG_GATES_STEPS = 5          # На первых N шагах (где важно «приехать» в дом) даём длинные таймауты
TIMEOUT_LONG = 40                   # сек для первых «гейт» шагов
TIMEOUT_SHORT = 15                  # сек для остальных шагов
RETRY_CLICK = 3                     # ретраи кликов
RETRY_WAIT = 2                      # ретраи ожиданий (дополнительно к базовому)
RETRY_TYPING = 2                    # ретраи для печати текста
SCROLL_PADDING = 200                # прокрутка перед кликом

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


# ----------------------------
# Утилиты поиска/клика
# ----------------------------
def _timeout_for_step(state: RuntimeState, step_type: str) -> int:
    """40s для первых ворот (первые шаги), потом 15s"""
    if state.step_index < FIRST_LONG_GATES_STEPS and step_type in ("waitForSelector", "click", "appendMedias"):
        return TIMEOUT_LONG
    return TIMEOUT_SHORT


def _find(driver, selector: str, timeout: int):
    wait = WebDriverWait(driver, timeout)
    return wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))


def _find_all_visible(driver, selector: str) -> List[Any]:
    els = driver.find_elements(By.CSS_SELECTOR, selector)
    res = []
    for el in els:
        try:
            if el.is_displayed():
                res.append(el)
        except Exception:
            pass
    return res


def _find_clickable(driver, selector: str, timeout: int):
    wait = WebDriverWait(driver, timeout)
    return wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))


def _scroll_into_view_js(driver, element):
    try:
        driver.execute_script(
            "arguments[0].scrollIntoView({block:'center', inline:'center'});", element
        )
        # Немного приподнимем, чтобы кнопка не оказалась под фикс-хедером
        driver.execute_script(f"window.scrollBy(0, -{SCROLL_PADDING});")
    except JavascriptException:
        pass


def _js_click(driver, element) -> bool:
    try:
        driver.execute_script("arguments[0].click();", element)
        return True
    except JavascriptException:
        return False


def _safe_click(driver, selector: str, timeout: int, state: RuntimeState, safeguard: bool) -> bool:
    last_err = None
    for attempt in range(1, RETRY_CLICK + 1):
        try:
            el = _find_clickable(driver, selector, timeout)
            _scroll_into_view_js(driver, el)
            el.click()
            return True
        except (ElementClickInterceptedException, StaleElementReferenceException, TimeoutException) as e:
            last_err = e
            state.mark_retry()
            # JS-fallback
            try:
                el2 = driver.find_element(By.CSS_SELECTOR, selector)
                _scroll_into_view_js(driver, el2)
                if _js_click(driver, el2):
                    return True
            except Exception:
                pass
            time.sleep(0.5 * attempt)
    # не удалось
    msg = f"cannot click '{selector}': {last_err}"
    if safeguard:
        print(f"⚠️ click safeguard: {msg}")
        return False
    else:
        raise TimeoutException(msg)


def _type_text(driver, selector: Optional[str], text: str, timeout: int, state: RuntimeState, active: bool = False):
    from selenium.webdriver.common.keys import Keys
    import time

    last_err = None
    for attempt in range(1, RETRY_TYPING + 1):
        try:
            if active:
                el = driver.switch_to.active_element
            else:
                el = _find(driver, selector, timeout)

            _scroll_into_view_js(driver, el)
            el.click()

            tag = el.tag_name.lower()
            contenteditable = el.get_attribute("contenteditable")

            try:
                # Если элемент редактируемый (input / textarea / contenteditable)
                if tag in ["input", "textarea"]:
                    el.clear()
                elif contenteditable and contenteditable.lower() == "true":
                    el.send_keys(Keys.COMMAND, "a")   # выделить всё
                    el.send_keys(Keys.DELETE)          # удалить
                else:
                    print(f"⚠️ Element not editable: tag={tag}, contenteditable={contenteditable}")
            except Exception as clear_err:
                print(f"⚠️ Cannot clear element ({tag}): {clear_err}")

            # Вводим текст
            el.send_keys(str(text))
            time.sleep(0.3)
            return

        except (StaleElementReferenceException, TimeoutException, ElementClickInterceptedException) as e:
            last_err = e
            state.mark_retry()
            time.sleep(0.4 * attempt)

    raise TimeoutException(f"cannot type into '{selector or 'activeElement'}': {last_err}")

def _wait_upload_progress(driver, max_wait: int = 60) -> None:
    """
    Универсальный «наблюдатель» загрузки:
    - ждём появления любых известных прелоадеров/спиннеров/прогрессов,
    - затем ждём их исчезновения. Если ничего не появилось — это окей (UI мог мгновенно принять файлы).
    """
    known_progress_selectors = [
        ".b-upload__progress",
        ".upload-progress",
        ".progress",
        ".v-progress-linear",
        ".b-file-item--uploading",
        ".m-loader",
    ]

    end_time = time.time() + max_wait
    appeared = False

    # 1) ждём появления любого индикатора
    while time.time() < end_time:
        for sel in known_progress_selectors:
            try:
                vis = _find_all_visible(driver, sel)
                if vis:
                    appeared = True
                    break
            except Exception:
                pass
        if appeared:
            break
        time.sleep(0.25)

    if not appeared:
        print("ℹ️ appendMedias: no progress indicator found (maybe instant accept).")
        return

    # 2) ждём исчезновения индикаторов
    while time.time() < end_time:
        still_any = False
        for sel in known_progress_selectors:
            try:
                vis = _find_all_visible(driver, sel)
                if vis:
                    still_any = True
                    break
            except Exception:
                pass
        if not still_any:
            break
        time.sleep(0.3)


# ----------------------------
# Handlers шагов
# ----------------------------
def _handle_wait_for_time(step: Dict[str, Any]):
    ms = int(str(step.get("value", "0")).strip() or "0")
    print(f"⏳ waitForTime {ms}ms")
    time.sleep(ms / 1000.0)


def _handle_wait_for_selector(driver, step: Dict[str, Any], state: RuntimeState):
    sel = step.get("value")
    timeout = _timeout_for_step(state, "waitForSelector")
    print(f"🔎 waitForSelector: {sel}")
    # Базовое ожидание
    try:
        _find(driver, sel, timeout)
        return
    except TimeoutException as e:
        # Дополнительные повторы
        last = e
        for i in range(RETRY_WAIT):
            state.mark_retry()
            try:
                _find(driver, sel, timeout)
                return
            except TimeoutException as e2:
                last = e2
        raise TimeoutException(f"waitForSelector '{sel}' failed: {last}")


def _handle_click(driver, step: Dict[str, Any], state: RuntimeState):
    sel = step.get("value")
    safeguard = bool(step.get("safeguard"))
    timeout = _timeout_for_step(state, "click")
    print(f"🖱️ click: {sel}")
    _safe_click(driver, sel, timeout, state, safeguard)


def _handle_keyboard_type(driver, step: Dict[str, Any], state: RuntimeState):
    val = str(step.get("value", ""))
    print(f"⌨️ keyboardType: {len(val)} chars -> activeElement")
    timeout = _timeout_for_step(state, "keyboardType")
    _type_text(driver, None, val, timeout, state, active=True)


def _handle_type(driver, step: Dict[str, Any], state: RuntimeState):
    val = str(step.get("value", ""))
    sel = step.get("selector")
    print(f"⌨️ type: {len(val)} chars -> {sel}")
    timeout = _timeout_for_step(state, "type")
    _type_text(driver, sel, val, timeout, state, active=False)


def _handle_click_for_value(driver, step: Dict[str, Any], state: RuntimeState):
    val = str(step.get("value", "")).strip().lower()
    sel = step.get("selector")
    safeguard = bool(step.get("safeguard"))
    timeout = _timeout_for_step(state, "clickForValue")
    print(f"🖱️ clickForValue: '{val}' in {sel}")

    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, sel))
        )
    except TimeoutException as e:
        if safeguard:
            print(f"⚠️ clickForValue safeguard: list '{sel}' not found: {e}")
            return
        raise

    items = driver.find_elements(By.CSS_SELECTOR, sel)
    val_norm = val.lstrip("0")

    for el in items:
        try:
            text = (el.text or "").strip().lower()
            text_norm = text.lstrip("0")

            # нормализованное сравнение
            if text_norm == val_norm or val_norm in text_norm:
                _scroll_into_view_js(driver, el)
                try:
                    el.click()
                except Exception:
                    if not _js_click(driver, el):
                        raise
                return

        except StaleElementReferenceException:
            state.mark_retry()
            continue

    # если ничего не нашли
    if safeguard:
        print(f"⚠️ clickForValue safeguard: value '{val}' not found in '{sel}'")
        return

    raise TimeoutException(f"clickForValue: value '{val}' not found in '{sel}'")


# def _handle_click_until(driver, step: Dict[str, Any], state: RuntimeState):
#     desired = str(step.get("value", "")).strip().lower()
#     read_sel = step.get("selector")
#     btn_sel = step.get("btnSelector")
#     retry = int(step.get("retry", 3))
#     print(f"🔁 clickUntil: want '{desired}' @ {read_sel} via {btn_sel} x{retry}")
#
#     for i in range(retry):
#         try:
#             el = _find(driver, read_sel, _timeout_for_step(state, "clickUntil"))
#             txt = (el.text or "").strip().lower()
#             if txt == desired or desired in txt:
#                 print(f"✓ clickUntil matched '{txt}'")
#                 return
#         except TimeoutException:
#             state.mark_retry()
#
#         # жмём далее
#         try:
#             _safe_click(driver, btn_sel, TIMEOUT_SHORT, state, safeguard=True)
#             time.sleep(0.4)
#         except Exception:
#             state.mark_retry()
#
#     raise TimeoutException(f"clickUntil: cannot reach '{desired}' in '{read_sel}'")

def _norm(s: str) -> str:
    return (s or "").strip().lower()

def _handle_click_until(driver, step, state):
    """
    Ожидаем, пока текст в readSel (selector) будет содержать желаемое значение.
    desired берём из:
      - step["value"] если это не "$value"
      - иначе из state["post_data"][step["key"]]
    Сравнение по включению, без учёта регистра. Кол-во кликов — step.retry (или 24).
    """
    read_sel = step.get("selector") or step.get("read_sel") or step.get("readSelector")
    btn_sel  = step.get("btnSelector") or step.get("click_sel") or step.get("clickSelector")
    retry    = int(step.get("retry") or 24)

    desired = step.get("value")
    if not desired or desired == "$value":
        key = step.get("key")
        if key and state and "post_data" in state:
            desired = str(state["post_data"].get(key, "")).strip()

    if not (read_sel and btn_sel and desired):
        raise TimeoutException(f"clickUntil: invalid params. read_sel='{read_sel}', btn_sel='{btn_sel}', desired='{desired}'")

    desired_norm = _norm(desired)

    for _ in range(retry):
        try:
            text = _norm(driver.find_element(By.CSS_SELECTOR, read_sel).text)
            if desired_norm in text:
                return
        except Exception:
            pass
        try:
            driver.find_element(By.CSS_SELECTOR, btn_sel).click()
        except Exception:
            # если не смогли кликнуть — маленькая пауза и ещё попытка
            time.sleep(0.2)
        time.sleep(0.2)

    raise TimeoutException(f"clickUntil: cannot reach '{desired}' in '{read_sel}'")

def _handle_check_value(step: Dict[str, Any], post_data: Dict[str, Any], state: RuntimeState):
    key = step.get("key")
    v = (post_data.get(key, "") or "").strip()
    ok = len(v) > 0
    state.set_check(ok)
    print(f"✅ checkValue[{key}] => {ok}")


def _handle_condition(driver, step: Dict[str, Any], post_data: Dict[str, Any], state: RuntimeState):
    childs = step.get("childs") or {}
    if state.last_check():
        print("🧩 condition: YES branch")
        _exec_child_steps(driver, childs.get("yes") or [], post_data, state)
    else:
        print("🧩 condition: NO branch (skip)")


def _handle_loop(driver, step: Dict[str, Any], post_data: Dict[str, Any], state: RuntimeState):
    key = step.get("key")
    raw = (post_data.get(key, "") or "").strip()
    print(f"🔁 loop[{key}] raw='{raw}'")
    if not raw:
        print("ℹ️ loop skipped (no values)")
        state.mark_skipped()
        return

    # поддержим CSV/через запятую
    items = [s.strip() for s in raw.split(",") if s.strip()]
    if not items:
        print("ℹ️ loop skipped (empty after split)")
        state.mark_skipped()
        return

    childs = step.get("childs") or {}
    yes_steps = childs.get("yes") or []
    for i, item in enumerate(items, 1):
        print(f"   • loop item {i}/{len(items)}: '{item}'")
        local_post = dict(post_data)
        # в дочерних шагах '$value' будет уже подставлен заранее в post_safari, но
        # для универсальности можно держать зеркальную переменную:
        local_post["value"] = item
        _exec_child_steps(driver, yes_steps, local_post, state)


def _handle_append_medias(driver, step: Dict[str, Any], post_data: Dict[str, Any], state: RuntimeState):
    trigger_sel = step.get("selector")
    files_csv = (post_data.get(step.get("key", "content"), "") or "").strip()
    fallback = bool(step.get("fallback"))
    if not files_csv:
        print("📎 appendMedias: no files provided — skip")
        state.mark_skipped()
        return

    # список локальных путей (ожидаем локальные, а не URL)
    paths = [p.strip() for p in files_csv.split(",") if p.strip()]
    print(f"📎 appendMedias: trigger={trigger_sel}, files={len(paths)}")

    # 1) клик по «скрепке»
    try:
        _safe_click(driver, trigger_sel, _timeout_for_step(state, "appendMedias"), state, safeguard=True)
    except Exception as e:
        print(f"⚠️ appendMedias: cannot click trigger '{trigger_sel}': {e}")

    # 2) искать input[type=file]
    inputs = _find_all_visible(driver, "input[type='file']")
    file_input = None
    if inputs:
        file_input = inputs[-1]
    else:
        # попробуем найти любые инпуты и сделать последний видимым
        try:
            cand = driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
            if cand:
                file_input = cand[-1]
                driver.execute_script(
                    "arguments[0].style.opacity='1';"
                    "arguments[0].style.pointerEvents='auto';"
                    "arguments[0].style.display='block'; "
                    # "arguments[0].style.visibility='visible'; "
                    "arguments[0].removeAttribute('hidden');",
                    file_input,
                )
        except Exception:
            pass

    if not file_input:
        msg = "appendMedias: no visible input[type=file] found (UI may use native dialog)"
        print(f"ℹ️ {msg}")
        if not fallback:
            # жёстко фейлим, если нет fallback
            raise TimeoutException(msg)
        else:
            # мягко продолжаем
            return

    # 3) attach files
    try:
        # В Safari send_keys поддерживается при видимом input[type=file]
        file_input.send_keys("\n".join(paths))
    except Exception as e:
        if not fallback:
            raise
        print(f"⚠️ appendMedias fallback: send_keys failed: {e}")
        return

    # 4) дождёмся «загрузки»
    _wait_upload_progress(driver, max_wait=90)


# ----------------------------
# Выполнение списка шагов
# ----------------------------
def _exec_child_steps(driver, steps: List[Dict[str, Any]], post_data: Dict[str, Any], state: RuntimeState):
    for st in steps:
        _exec_one_step(driver, st, post_data, state)


def _exec_one_step(driver, step: Dict[str, Any], post_data: Dict[str, Any], state: RuntimeState):
    state.step_index += 1
    stype = step.get("type")
    safeguard = bool(step.get("safeguard"))
    title = stype
    if stype in ("click", "clickForValue"):
        title = f"{stype} " + (" 🛡️" if safeguard else "")
    print(f"\n➡️ Step {state.step_index}/{state.total_steps}: {title} ")

    try:
        if stype == "waitForTime":
            _handle_wait_for_time(step)

        elif stype == "waitForSelector":
            _handle_wait_for_selector(driver, step, state)

        elif stype == "click":
            _handle_click(driver, step, state)

        elif stype == "keyboardType":
            _handle_keyboard_type(driver, step, state)

        elif stype == "type":
            _handle_type(driver, step, state)

        elif stype == "clickForValue":
            _handle_click_for_value(driver, step, state)

        elif stype == "clickUntil":
            _handle_click_until(driver, step, state)

        elif stype == "checkValue":
            _handle_check_value(step, post_data, state)

        elif stype == "condition":
            _handle_condition(driver, step, post_data, state)

        elif stype == "loop":
            _handle_loop(driver, step, post_data, state)

        elif stype == "appendMedias":
            _handle_append_medias(driver, step, post_data, state)

        else:
            print(f"ℹ️ unknown step type: {stype} — skip")
            state.mark_skipped()

    except Exception as e:
        # если safeguard — не валим весь флоу
        if safeguard:
            state.mark_skipped()
            print(f"❌ Step {state.step_index}/{state.total_steps} failed ({stype}): {e}\n🛡️ safeguard enabled — continue to next step")
        else:
            state.mark_failed()
            print(f"🛑 No safeguard — aborting workflow")
            raise


def work(driver, steps: List[Dict[str, Any]]):
    """
    Главный исполнятель шагов.
    """
    state = RuntimeState()
    state.total_steps = len(steps)
    print(f"🚀 work(): starting {state.total_steps} steps")

    try:
        for step in steps:
            #_exec_one_step(driver, step, _extract_post_data_from_steps(steps), state)
            _exec_one_step(driver, step, {}, state)

    finally:
        elapsed = time.time() - state.started_at
        mins = int(elapsed // 60)
        secs = int(elapsed % 60)
        print("\n" + "=" * 60)
        print(
            f"✅ Workflow finished: {state.total_steps} steps executed, "
            f"{state.retried} retried, {state.skipped} skipped, {state.failed} failed, "
            f"{mins}m {secs}s"
        )
        print("=" * 60)


def _extract_post_data_from_steps(steps: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Для совместимости с текущей подстановкой значений из post_safari.inject_payload_into_steps()
    здесь просто возвращаем пустой dict — значения уже подставлены в шаги.
    Но оставляем хук на будущее (если потребуется читать ключи из steps).
    """
    return {}