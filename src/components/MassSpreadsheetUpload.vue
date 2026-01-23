<!--src/components/MassSpreadsheetUpload.vue-->
<script setup>
import { ref, computed } from "vue";
import * as XLSX from "xlsx";

const props = defineProps({
  /**
   * Включает/выключает компонент (например, показывать только для massmsg).
   */
  enabled: { type: Boolean, default: true },

  /**
   * Разрешенные расширения (по умолчанию xlsx/xls/csv).
   */
  accept: { type: String, default: ".xlsx,.xls,.csv" },

  /**
   * Если хочешь показывать подсказку по expected headers.
   */
  hint: { type: String, default: "Headers: vaults_id | price | exclude_list" },
});

const emit = defineEmits([
  /**
   * Отдаём распарсенные значения наружу.
   * payload: { vault_media_ids: string[], price: number, message_exclude_list: string }
   */
  "parsed",

  /**
   * Ошибка парсинга / формата.
   */
  "error",
]);

const fileName = ref("");
const lastResult = ref(null);
const lastError = ref("");

const normalizeHeader = (h) =>
  String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

/**
 * Разбор списка значений из одной ячейки.
 * ВАЖНО: НЕ режем по пробелам, чтобы не ломать "Following 2nd folder"
 */
const stripWrapQuotes = (s) =>
  String(s ?? "")
    .trim()
    // .replace(/^[\s"']+/, "")
    // .replace(/[\s"']+$/, "");
    .replace(/\\"/g, '"')            // <-- важно: убираем экранирование кавычек
    .replace(/^[\s"'\\]+/, "")       // <-- добавил \\ в начало
    .replace(/[\s"'\\]+$/, "");      // <-- добавил \\ в конец

// const isNumeric = (s) => /^[0-9]+$/.test(String(s || "").trim());
// const isNumeric = (s) => /^[0-9]+$/.test(String(s || "").trim());
// ...
// const isNumeric = (s) => /^[0-9]{3,}$/.test(String(s));

// id: 1209680837
const isNumericId = (s) => /^[0-9]{3,}$/.test(String(s || "").trim());

// id: friends / rebill_off / tagged
const isSlugId = (s) => /^[a-z0-9_]+$/.test(String(s || "").trim());

const isIdLike = (s) => isNumericId(s) || isSlugId(s);

// label: Friends / TIPS / Renew Off / Following 2nd folder
const isLabelLike = (s) => {
  const v = String(s || "").trim();
  if (!v) return false;
  if (isIdLike(v)) return false;               // если это id — это не label
  return /[A-ZА-Я]/.test(v) || /\s/.test(v);   // верхний регистр или пробелы — типичный label
};

const uniqExact = (arr) => {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    const v = String(x || '').trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
};


const normalizeToken = (raw) => {
  let s = stripWrapQuotes(raw);
  if (!s) return "";

  // "TIPS (1209680837)" -> "1209680837"
  // "Renew Off (rebill_off)" -> "rebill_off"
  const m = s.match(/\(([^)]+)\)\s*$/);
  if (m && m[1]) s = stripWrapQuotes(m[1]);

  return s.trim();
};

const isNumeric = (s) => /^[0-9]{3,}$/.test(String(s));
const isSlug = (s) => /^[a-z0-9_]+$/.test(String(s)); // id-формат типа friends/rebill_off/tagged
//
// const uniqExact = (arr) => {
//   const out = [];
//   const seen = new Set();
//   for (const x of arr || []) {
//     const v = String(x || '').trim();
//     if (!v) continue;
//     if (seen.has(v)) continue;
//     seen.add(v);
//     out.push(v);
//   }
//   return out;
// };

/**
 * Парсер exclude_list:
 * - если идёт пара key,value -> сохраняем ТОЛЬКО value
 * - иначе сохраняем токен как есть
 *
 * Правила пары:
 * 1) key,value одинаковы без учёта регистра (Friends,friends) -> берём value
 * 2) value выглядит как numeric id (TIPS,120...) -> берём value
 * 3) value выглядит как slug id (friends/rebill_off) -> берём value, а key может быть Label
 *
 * Updates v.01
 *
 * **
 *  * Парсер exclude_list:
 *  * - если идёт пара LABEL,ID -> сохраняем ТОЛЬКО ID
 *  * - иначе сохраняем токен как есть
 *  *
 *  * Пример:
 *  * "rebill_off","855672336","Friends","friends","TIPS","1209680837"
 *  * -> ["rebill_off","855672336","friends","1209680837"]
 *  */

const parseExcludeList = (raw) => {
  if (raw == null) return [];

  const s = String(raw).trim();
  if (!s) return [];

  const tokens = s
    .split(/[,;\n\r]+/g)
    .map((x) => normalizeToken(x))
    .filter(Boolean);

  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const key = tokens[i];
    const val = tokens[i + 1];

    if (val) {
      const sameCI = key.toLowerCase() === val.toLowerCase();
      const valIsId = isNumeric(val) || isSlug(val);

      // key,value -> берём value
      if (sameCI || valIsId) {
        out.push(val);
        i++; // пропускаем val
        continue;
      }
    }

    // одиночный токен
    out.push(key);
  }

  return uniqExact(out);
};

const parseExcludeListWithMeta = (raw) => {
  if (raw == null) return { ids: [], meta: [] };

  const s = String(raw).trim();
  if (!s) return { ids: [], meta: [] };

  const tokens = s
    .split(/[,;\n\r]+/g)
    .map((x) => normalizeToken(x))
    .filter(Boolean);

  const ids = [];
  const meta = [];
  const seen = new Set();

  const pushId = (id) => {
    const v = String(id || '').trim();
    if (!v) return;
    const k = v.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);

    ids.push(v);
    meta.push({ id: v, type: inferTypeById(v) });
  };

  for (let i = 0; i < tokens.length; i++) {
    const key = tokens[i];
    const val = tokens[i + 1];

    // пара LABEL,ID -> берём только val
    if (val && isLabelLike(key) && isIdLike(val)) {
      pushId(val);
      i++;
      continue;
    }

    // одиночный токен -> это уже id
    pushId(key);
  }

  return { ids, meta };
};

const normalizeList = (arr) => {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    const v = normalizeToken(x);
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
};

const parseIds = (v) => {
  if (v == null) return [];
  const s = String(v).trim();
  if (!s) return [];
  const parts = s
    .split(/[,;\n\r]+/g)
    .map((x) => normalizeToken(x))
    .filter(Boolean);

  return normalizeList(parts);
};

const inferTypeById = (id) => {
  const s = String(id || '').trim();
  if (!s) return '';
  return isNumericId(s) ? 'custom' : s; // numeric -> custom, slug -> type=id
};

const summary = computed(() => {
  if (!lastResult.value) return null;
  return {
    vaultCount: lastResult.value.vault_media_ids?.length || 0,
    price: lastResult.value.price ?? 0,
    excludeLen: (lastResult.value.message_exclude_list || "").length,
  };
});

const resetInput = (inputEl) => {
  try {
    if (inputEl) inputEl.value = "";
  } catch (_) {}
};

const onUpload = async (e) => {
  if (!props.enabled) return;

  lastError.value = "";
  lastResult.value = null;

  try {
    const file = e?.target?.files?.[0];
    if (!file) return;

    fileName.value = file.name;

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const sheetName = wb.SheetNames?.[0];
    if (!sheetName) throw new Error("No sheets found in file");

    const ws = wb.Sheets[sheetName];

    /**
     * КЛЮЧЕВОЕ:
     * Читаем лист как матрицу, это стабильнее для CSV и XLSX.
     * И позволяет склеить значения, если CSV развалил ячейку из-за запятых.
     */
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (!matrix || !matrix.length) throw new Error("Spreadsheet is empty");

    const headers = (matrix[0] || []).map((x) => normalizeHeader(x));
    const row = matrix[1] || [];

    const idxVault = headers.indexOf("vaults_id");
    const idxPrice = headers.indexOf("price");
    const idxExclude =
      headers.indexOf("exclude_list") !== -1
        ? headers.indexOf("exclude_list")
        : headers.indexOf("message_exclude_list");

    if (idxVault === -1 || idxPrice === -1 || idxExclude === -1) {
      throw new Error("Invalid headers. Expected: vaults_id | price | exclude_list");
    }

    /**
     * Если в CSV значения не в кавычках, запятые разбивают одну ячейку на несколько колонок.
     * Поэтому:
     * - vaultsRaw берём как всё между vaults_id и price
     * - excludeRaw берём как всё от exclude_list до конца
     */
    const vaultsRaw = row.slice(idxVault, idxPrice).join(",");
    const priceRaw = row[idxPrice] ?? "";
    const excludeRaw = row.slice(idxExclude).join(",");

    const vault_media_ids = parseIds(vaultsRaw);

    // price: поддержка "99,00"
    const price = Number(String(priceRaw).trim().replace(",", ".")) || 0;

    // сохраняем как строку (как у тебя было), но собираем из списка
    //const message_exclude_list = parseIds(excludeRaw).join(",");
    // const exclude_ids = parseExcludeList(excludeRaw);
    // const message_exclude_list = exclude_ids.join(",");

    const { ids: exclude_ids, meta: exclude_meta } = parseExcludeListWithMeta(excludeRaw);
    const message_exclude_list = exclude_ids.join(",");

// важно: не ломаем текущий контракт, просто добавляем новое поле
    const payload = { vault_media_ids, price, message_exclude_list, exclude_ids, exclude_meta };
    emit("parsed", payload);

    //const payload = { vault_media_ids, price, message_exclude_list };

    // guard: если совсем пусто — считаем ошибкой формата
    if (!payload.vault_media_ids?.length && !payload.price && !payload.message_exclude_list) {
      throw new Error("Invalid spreadsheet format (no data parsed)");
    }

    lastResult.value = payload;
    emit("parsed", payload);

    // чтобы можно было загрузить тот же файл повторно
    resetInput(e?.target);
  } catch (err) {
    const msg = err?.message || String(err);
    lastError.value = msg;
    emit("error", msg);
    resetInput(e?.target);
  }
};
</script>

<template>
  <div v-if="enabled" class="mt-4">
    <label class="block text-sm font-medium mb-1">
      Upload XLSX/CSV to fill vault IDs, price, exclude list
    </label>

    <input type="file" :accept="accept" @change="onUpload" />

    <div v-if="hint" class="text-xs text-gray-500 mt-2">
      {{ hint }}
    </div>

    <div v-if="fileName" class="text-xs mt-2">
      File: <span class="font-mono">{{ fileName }}</span>
    </div>

    <div v-if="summary" class="text-xs mt-2">
      Parsed: vault_media_ids={{ summary.vaultCount }}, price={{ summary.price }}, exclude_len={{ summary.excludeLen }}
    </div>

    <div v-if="lastError" class="text-xs mt-2 text-red-600">
      Error: {{ lastError }}
    </div>
  </div>
</template>
