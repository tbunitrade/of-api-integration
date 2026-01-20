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

const parseIds = (v) => {
  if (v == null) return [];
  const s = String(v);
  return s
    .split(/[,;\n\r\t ]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
};

const pick = (obj, keys) => {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") {
      return obj[k];
    }
  }
  return "";
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
    const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!rawRows.length) throw new Error("Spreadsheet is empty");

    // Берём первую строку как “template”
    const row = rawRows[0];

    // Нормализуем ключи
    const normalized = {};
    Object.keys(row).forEach((k) => {
      normalized[normalizeHeader(k)] = row[k];
    });

    const vaultsRaw = pick(normalized, ["vaults_id", "vault_media_ids", "vault_ids"]);
    const priceRaw = pick(normalized, ["price"]);
    const excludeRaw = pick(normalized, ["exclude_list", "message_exclude_list"]);

    const vault_media_ids = parseIds(vaultsRaw);
    const price = Number(priceRaw || 0) || 0;
    const message_exclude_list = String(excludeRaw || "").trim();

    const payload = { vault_media_ids, price, message_exclude_list };

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
