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
    .replace(/^[\s"']+/, "")
    .replace(/[\s"']+$/, "");

const parseIds = (v) => {
  if (v == null) return [];
  const s = String(v).trim();
  if (!s) return [];
  return s
    .split(/[,;\n\r]+/g)      // без пробелов, как у тебя
    .map((x) => stripWrapQuotes(x))
    .filter(Boolean);
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
    const message_exclude_list = parseIds(excludeRaw).join(",");

    const payload = { vault_media_ids, price, message_exclude_list };

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
