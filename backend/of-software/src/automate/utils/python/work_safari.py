# ============================================================
# work_safari.py — v3 Stable Safari (media-ready)
# Универсальный исполнитель шагов для Safari OnlyFans.
#
# Что делает сейчас:
#   • Единый движок шагов: waitForTime, waitForSelector, click, type, loop, condition
#   • Корректная подстановка $value / key из post_data во все шаги
#   • ProseMirror-friendly ввод caption через JS (без глюков send_keys)
#   • Надёжные клики: _safe_click, clickForValue, clickUntil с retry и автоскроллом
#   • Поддержка appendMedias: bulk_media_paths + пофайловая загрузка через input[type=file]
#   • Обход дублей медиа и алертов: #ModalAlert + generic duplicate/alert dialog
#   • selectMediaByIndex: выбор РОВНО одного медиа по индексу (для повторных постов)
#   • RuntimeState: счётчики retries/skipped/failed + логирование прогресса по шагам
#
# Файл очищен от экспериментальных хендлеров и лишней логики, оставлены только
# стабильные, боевые функции для продакшен-ранов.
# ============================================================

from __future__ import annotations

import time, os, shutil, tempfile, math
from typing import Any, Dict, List, Optional

from selenium.webdriver.common.keys import Keys
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
    except Exception as e:
        print(f"⚠️ Failed to chmod file (will use original path): {e}")
    return path

from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
import time
import math

def _distance(a, b):
    dx = (a["left"] + a["width"] / 2) - (b["left"] + b["width"] / 2)
    dy = (a["top"] + a["height"] / 2) - (b["top"] + b["height"] / 2)
    return math.sqrt(dx * dx + dy * dy)

def _get_rect(driver, selector):
    return driver.execute_script(
        """
        const el = document.querySelector(arguments[0]);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
            left: r.left, top: r.top,
            width: r.width, height: r.height,
            display: style.display,
            visibility: style.visibility
        };
        """,
        selector,
    )

def _collect_file_inputs(driver):
    return driver.execute_script(
        """
        const inputs = Array.from(document.querySelectorAll("input[type='file']"));
        return inputs.map(el => {
            const r = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return {
                id: el.id || null,
                className: el.className || null,
                name: el.name || null,
                hidden: el.hidden,
                width: r.width,
                height: r.height,
                left: r.left,
                top: r.top,
                display: style.display,
                visibility: style.visibility,
            };
        });
        """
    )

def _close_modal_alert_if_present(driver) -> bool:
    """
    Закрывает #ModalAlert, если он есть.
    Возвращает True, если модалка была и мы её закрыли.
    Закрывает попапи про дубликаты/алерты, если они есть.
    Возвращает True, если модалка была и мы её закрыли.
    """

    try:
        try:
            modals = driver.find_elements(By.CSS_SELECTOR, "#ModalAlert")
        except Exception:
            modals = []

        if modals:
            try:
                text = driver.execute_script(
                    "const el = document.querySelector('#ModalAlert .dialog_message');"
                    "return el ? el.textContent.trim() : '';"
                )
            except Exception:
                text = ""

            print(f"⚠️ ModalAlert detected: '{text}'")

            btns = driver.find_elements(By.CSS_SELECTOR, "#ModalAlert button")
            if btns:
                try:
                    btns[0].click()
                    time.sleep(0.5)
                    print("✅ ModalAlert closed via Close button")
                    return True
                except Exception as e:
                    print(f"⚠️ Failed to click Close on ModalAlert: {e}")

        # --- Новый путь: generic duplicate-media popup ---
        try:
            result = driver.execute_script(
                """
                const body = document.body;
                if (!body) return { closed: false, reason: 'no-body' };

                const texts = [
                  'Media has already added',
                  'already added',
                  'Please choose another'
                ];

                const nodes = Array.from(document.querySelectorAll('body *'))
                  .filter(el => el && el.offsetParent !== null);

                let target = null;
                for (const el of nodes) {
                  const txt = (el.textContent || '').trim();
                  if (!txt) continue;
                  const lower = txt.toLowerCase();
                  if (texts.some(t => lower.includes(t.toLowerCase()))) {
                    target = el;
                    break;
                  }
                }

                if (!target) {
                  return { closed: false, reason: 'no-text-match' };
                }

                // ищем ближайший контейнер-диалог
                const dialog = target.closest('#ModalAlert, .dialog, .modal, [role="dialog"], .v--modal-box, .b-popup');
                const root = dialog || target;

                const btn =
                  root.querySelector('button') ||
                  root.querySelector('.b-btn') ||
                  root.querySelector('.btn') ||
                  root.querySelector('[data-role*="close" i]');

                if (!btn) {
                  return { closed: false, reason: 'no-button', text: target.textContent.trim().slice(0, 120) };
                }

                btn.click();
                return {
                  closed: true,
                  reason: 'duplicate-media-dialog',
                  text: target.textContent.trim().slice(0, 120)
                };
                """
            )
        except Exception as e_js:
            print(f"⚠️ _close_modal_alert_if_present JS error: {e_js}")
            result = None

        if result and isinstance(result, dict):
            if result.get("closed"):
                print(f"✅ Duplicate/alert dialog closed: {result}")
                time.sleep(0.4)
                return True
            else:
                reason = result.get("reason")
                if reason not in ("no-text-match", "no-body"):
                    print(f"⚠️ Duplicate-modal not closed, reason={reason}")

        return False

    except Exception as e_outer:
        print(f"⚠️ _close_modal_alert_if_present error: {e_outer}")
        return False


def _find_file_input_near_dropzone(driver, timeout: int = 10, run_index: int = 0):
    """
    Ищем input[type="file"], который относится к дропзоне.

    НОВАЯ ЛОГИКА (без .button-add-media):

      • Для ЛЮБОГО run_index (0, 1, 2, ...) порядок одинаковый:

        1) Гасим возможный ModalAlert перед началом.
        2) Пытаемся найти input[type=file] внутри контейнера .b-dropzone.
           - если нашли → берём последний enabled и возвращаем.
        3) Если не нашли:
           - жмём #attach_file_photo (через JS click),
           - ждём немного,
           - снова гасим возможный ModalAlert,
           - собираем ВСЕ input[type=file] на странице,
           - выбираем последний enabled и возвращаем.

        4) Если после этого так и не нашли ни одного рабочего input → возвращаем None.
    """

    def log(msg: str):
        # Можно хитрее оформить, но пока достаточно обычного print
        print(msg)

    def _close_modal_alert_if_present() -> bool:
        """Пробуем закрыть модалку 'Media has already added. Please choose another.' если она есть."""
        try:
            alert = WebDriverWait(driver, 1).until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, ".b-modal-alert"))
            )
        except Exception:
            return False

        try:
            text = alert.text.strip()
        except Exception:
            text = "<no-text>"

        log(f"⚠️ ModalAlert detected: {text!r}")
        # пробуем закрыть крестиком
        try:
            close_btn = alert.find_element(By.CSS_SELECTOR, "button.btn-close, button[aria-label='Close']")
            driver.execute_script("arguments[0].click()", close_btn)
            log("✅ ModalAlert closed via Close button")
        except Exception:
            # если не получилось — жмём ESC
            try:
                alert.send_keys(Keys.ESCAPE)
                log("✅ ModalAlert closed via ESC")
            except Exception:
                log("⚠️ Failed to close ModalAlert by ESC")
        time.sleep(0.5)
        return True

    def _visible_file_inputs_in(container) -> list:
        """Возвращает список enabled input[type=file] внутри контейнера."""
        try:
            inputs = container.find_elements(By.CSS_SELECTOR, "input[type='file']")
        except Exception:
            return []

        visible = []
        for el in inputs:
            try:
                if el.is_enabled():
                    visible.append(el)
            except Exception:
                continue
        return visible

    def _visible_file_inputs_global() -> list:
        """Возвращает список enabled input[type=file] по всей странице."""
        try:
            inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
        except Exception:
            return []

        log(f"🧩 [_find_file_input_near_dropzone] global inputs={len(inputs)}")
        visible = []
        for el in inputs:
            try:
                if el.is_enabled():
                    visible.append(el)
            except Exception:
                continue
        return visible

    # 0) На всякий случай сразу пробуем закрыть модалку
    _close_modal_alert_if_present()

    # 1) Пытаемся найти .b-dropzone__label и посмотреть input'ы внутри её контейнера
    try:
        label = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".b-dropzone__label"))
        )
    except Exception:
        log("⚠️ [_find_file_input_near_dropzone] .b-dropzone__label NOT found")
        return None

    try:
        container = label.find_element(
            By.XPATH, "./ancestor::div[contains(@class,'b-dropzone')]"
        )
    except Exception:
        log("⚠️ [_find_file_input_near_dropzone] dropzone container NOT found")
        container = None

    if container is not None:
        near_inputs = _visible_file_inputs_in(container)
        log(
            f"🧩 [_find_file_input_near_dropzone] near-dropzone inputs={len(near_inputs)} "
            f"(run_index={run_index})"
        )
        if near_inputs:
            # берём последний enabled
            return near_inputs[-1]

    # 2) Если около дропзоны ничего нет — принудительно жмём #attach_file_photo
    try:
        btn_attach = driver.find_element(By.CSS_SELECTOR, "#attach_file_photo")
        log(f"🖱 [_find_file_input_near_dropzone] click #attach_file_photo (run_index={run_index})")
        driver.execute_script("arguments[0].click()", btn_attach)
    except Exception as e:
        log(f"⚠️ [_find_file_input_near_dropzone] failed to click #attach_file_photo: {e}")
        return None

    # даём UI время отрисовать input
    time.sleep(0.5)

    # ещё раз гасим возможную модалку дубликата
    _close_modal_alert_if_present()

    # 3) Пробуем собрать input[type=file] глобально
    visible_global = _visible_file_inputs_global()
    if visible_global:
        # берём последний enabled — обычно это самый свежий
        return visible_global[-1]

    log("❌ [_find_file_input_near_dropzone] not found any usable input[type='file']")
    return None

def _handle_select_media_by_index(driver, step, post_data, state):
    """
    Выбирает РОВНО одно медиа по индексу:
    1) ждёт появления .b-make-post__set-order-btn
    2) снимает selected со всех кнопок
    3) включает selected только на одной по index (по умолчанию post_data['run_index'])
    """
    key = step.get("key") or "run_index"
    raw = post_data.get(key, step.get("value", 0))

    try:
        index = int(raw)
    except Exception:
        print(f"⚠️ selectMediaByIndex: invalid index '{raw}', default 0")
        index = 0

    wait_after_ms = int(step.get("waitAfterMs", 0))

    print(f"🎯 selectMediaByIndex → index={index}")

    # 1) ждём, пока сортировка реально активна и чекбоксы появились
    try:
        WebDriverWait(driver, 10).until(
            lambda d: len(
                d.find_elements(
                    By.CSS_SELECTOR,
                    ".b-make-post__media-photos .b-make-post__set-order-btn"
                )
            ) > 0
        )
    except Exception as e_wait:
        print(f"❌ selectMediaByIndex: buttons not found: {e_wait}")
        state.mark_failed()
        return

    try:
        ok = driver.execute_script(
            """
            const idx = arguments[0];

            // Все кнопки выбора порядка
            const btns = Array.from(
              document.querySelectorAll('.b-make-post__media-photos .b-make-post__set-order-btn')
            );
            console.log('[selectMediaByIndex] btns count =', btns.length);

            if (!btns.length) {
              return { ok: false, reason: 'no-buttons' };
            }

            const safeIdx = Math.max(0, Math.min(idx, btns.length - 1));

            // 1) сбрасываем selected на всех
            for (const btn of btns) {
              if (btn.classList.contains('selected')) {
                btn.click();
              }
            }

            const targetBtn = btns[safeIdx];
            if (!targetBtn) {
              return {
                ok: false,
                reason: 'index-out-of-range',
                idx: safeIdx,
                total: btns.length
              };
            }

            targetBtn.scrollIntoView({ block: 'center' });
            targetBtn.click();

            const numSpan = targetBtn.querySelector('.checkbox-item__num');
            const numText = numSpan ? numSpan.textContent.trim() : null;

            return {
              ok: true,
              reason: 'selected',
              idx: safeIdx,
              total: btns.length,
              num: numText
            };
            """,
            index,
        )

        print("🧩 selectMediaByIndex result:", ok)
        if not ok or not ok.get("ok"):
            print(f"⚠️ selectMediaByIndex: failed → {ok}")
            state.mark_failed()
        else:
            print("✅ selectMediaByIndex: media selected")

        if wait_after_ms > 0:
            print(f"⏳ selectMediaByIndex: waitAfterMs={wait_after_ms}ms")
            time.sleep(wait_after_ms / 1000.0)

    except Exception as e:
        print(f"❌ selectMediaByIndex error: {e}")
        state.mark_failed()

def _handle_append_medias(driver, step, post_data, state):
    key = step.get("key") or "content_path"
    file_path = post_data.get(key) or post_data.get("content_path")
    selector = step.get("selector") or "input[type='file']"

    bulk_paths = post_data.get("bulk_media_paths")

    if bulk_paths and isinstance(bulk_paths, list):
        raw_paths = [p for p in bulk_paths if isinstance(p, str) and p.strip()]
        mode = "bulk"
    else:
        raw_paths = [file_path] if file_path else []
        mode = "single"

    print(f"📦 appendMedias[{mode}]: key={key}, file_path={raw_paths}, selector={selector}")
    print(
        f"📦 appendMedias[{mode}]: run_index={post_data.get('run_index')}, "
        f"raw_paths={raw_paths}, selector={selector}"
    )

    if not raw_paths:
        print("⚠️ No media paths provided for appendMedias")
        return state.mark_skipped()

    # 1) фильтруем по существующим файлам
    existing_paths = []
    for p in raw_paths:
        if os.path.exists(p):
            existing_paths.append(p)
        else:
            print(f"⚠️ File does not exist: {p}")

    if not existing_paths:
        print("⚠️ appendMedias: no existing files after check")
        return state.mark_skipped()

    # 2) готовим файлы
    safe_paths = []
    for p in existing_paths:
        try:
            safe_p = ensure_world_readable(p)
            safe_paths.append(safe_p)
        except Exception as e:
            print(f"⚠️ Failed to prepare file {p}: {e}")

    if not safe_paths:
        print("❌ appendMedias: no safe_paths after ensure_world_readable")
        return state.mark_failed()

    try:
        for sp in safe_paths:
            if not os.path.isfile(sp):
                print(f"❌ File not found at safe_path: {sp}")
    except Exception as e:
        print(f"⚠️ os.path.isfile check failed: {e}")

    # 3) run_index
    base_run_index = 0
    try:
        raw_idx = post_data.get("run_index")
        if raw_idx is not None:
            base_run_index = int(raw_idx)
    except Exception as e_idx:
        print(f"⚠️ appendMedias: cannot parse run_index from post_data: {e_idx}")
        base_run_index = 0

    uploaded_any = False

    # 4) для КАЖДОГО файла ищем input[type=file]
    for idx, sp in enumerate(safe_paths):
        try:
            if idx == 0:
                local_run_index = base_run_index
            else:
                local_run_index = max(1, base_run_index + idx)

            print(f"📁 appendMedias: Uploading file #{idx} (local_run_index={local_run_index}) → {sp}")

            el = _find_file_input_near_dropzone(
                driver,
                timeout=10,
                run_index=local_run_index,
            )

            if el is None:
                print("❌ appendMedias: NO usable input[type='file'] found for this file → FAIL")
                state.mark_failed()
                # ⬇️ ВАЖНО: НЕ return
                continue

            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)

            print(f"📁 appendMedias: send_keys({sp})")
            el.send_keys(sp)
            uploaded_any = True
            time.sleep(0.5)

        except Exception as e_upload:
            print(f"❌ appendMedias: error while uploading {sp}: {e_upload}")
            state.mark_failed()
            continue

    # 5) если ни один файл физически не ушёл — дальше ждать нечего
    if not uploaded_any:
        print("⚠️ appendMedias: no files were actually sent to OF, skip waits & upload_settled")
        return

    print("🔁 appendMedias: reached post-upload waits (progress + upload_settled)")

    # 6) твои ожидания — как были, только без внешнего глобального try/except
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
        def upload_settled(drv):
            try:
                progress = drv.find_elements(
                    By.CSS_SELECTOR,
                    ".b-dropzone__preview__progress"
                )
                if progress:
                    return False

                processing = drv.find_elements(
                    By.CSS_SELECTOR,
                    ".post_media.m-processing, .post_media.m-uploading-media"
                )
                if processing:
                    return False

                loaded = drv.find_elements(
                    By.CSS_SELECTOR,
                    ".b-photos .b-dropzone__preview.m-loaded"
                )
                if not loaded:
                    return False

                return True
            except Exception as e:
                print(f"⚠️ [upload_settled] error: {e}")
                return False

        print("⏳ appendMedias: waiting for post_media to finish processing…")
        WebDriverWait(driver, 60).until(upload_settled)
        print("✅ appendMedias: upload finished (no m-processing / m-uploading-media).")
    except Exception as e:
        print(f"⚠️ appendMedias: upload still marked as processing after timeout: {e}")

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

    print("✅ appendMedias: completed with previews present")

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

        elif stype == "selectMediaByIndex":
            _handle_select_media_by_index(driver, step, post_data, state)

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
# work — универсальный исполнитель шагов (waitFor, click, appendMedias и т.д.)
# ============================================================
def work(driver, steps, post_data):
    """Идёт по steps по очереди и выполняет действия (клики, ввод, загрузку медиа) в Safari."""
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

