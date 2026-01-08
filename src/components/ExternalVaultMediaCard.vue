<script setup lang="ts">
import { ref, computed, watch } from 'vue';

import CardBox from '@/components/CardBox.vue';
import BaseButton from '@/components/BaseButton.vue';

type VaultList = {
  id: string;
  name: string;
  type?: string;
  photosCount?: number;
  videosCount?: number;
  audiosCount?: number;
  gifsCount?: number;
  raw?: any;
};

type VaultMedia = {
  id: string;
  type?: string;
  url?: string;
  createdAt?: string | number; // если провайдер отдаёт
  raw?: any;
};

const props = defineProps({
  modelPlatform: { type: [Object, Array], required: false, default: null },
  notify: { type: Function, required: false, default: null },

  // v-model:mediaIds
  mediaIds: { type: Array, required: false, default: () => [] },

  /**
   * ВАЖНО: endpoints задаём как абстракцию, без привязки к конкретному провайдеру.
   * Ты просто подставишь свои маршруты backend.
   */
  endpoints: {
    type: Object as any,
    required: false,
    default: () => ({
      lists: '/vault/lists',            // GET ?modelPlatformId=...
      medias: '/vault/medias',          // GET ?modelPlatformId=...&listId=...&limit=...&offset=...
      upload: '/vault/upload',          // POST multipart/form-data (modelPlatformId, listId, file)
      // optional:
      // search: '/vault/search'        // GET ?modelPlatformId=...&q=... (если сделаешь на бекенде)
    }),
  },
});

const emit = defineEmits(['update:mediaIds']);

const notify = (payload: any) => {
  if (typeof props.notify === 'function') return props.notify(payload);
  console.log('[ExternalVaultMediaCard notify]', payload);
};

const mp = computed(() =>
  Array.isArray(props.modelPlatform) ? (props.modelPlatform[0] || null) : props.modelPlatform
);

const modelPlatformId = computed(() => Number((mp.value as any)?.model_platform_id || (mp.value as any)?.id || 0));
const accountId = computed(() => String((mp.value as any)?.ofid_username || '').trim());

// UI state
const lists = ref<VaultList[]>([]);
const listFilter = ref('');
const selectedListId = ref('');

const medias = ref<VaultMedia[]>([]);
const mediasHasMore = ref(false);
const mediasLimit = ref(24);
const mediasOffset = ref(0);

const selectedMediaIdsLocal = ref<string[]>(Array.isArray(props.mediaIds) ? (props.mediaIds as any).map(String) : []);

const loadingLists = ref(false);
const loadingMedias = ref(false);
const uploading = ref(false);
const lastResponse = ref<any>(null);

// upload input
const fileToUpload = ref<File | null>(null);

// -------- Helpers

const apiBase = computed(() => String(import.meta.env.VITE_APP_ROOT_API || '').trim().replace(/\/+$/, ''));

const toUrl = (path: string) => {
  const p = String(path || '').trim();
  if (!p) return '';
  // path может быть абсолютным или относительным — нормализуем
  if (/^https?:\/\//i.test(p)) return p;
  const normalized = p.startsWith('/') ? p : `/${p}`;
  return `${apiBase.value}${normalized}`;
};

const normalizeLists = (res: any): VaultList[] => {
  const arr = res?.data?.list || res?.data?.lists || res?.list || res?.lists;
  if (!Array.isArray(arr)) return [];

  return arr.map((x: any) => ({
    id: String(x?.id ?? '').trim(),
    name: String(x?.name ?? '').trim(),
    type: String(x?.type ?? '').trim(),
    photosCount: Number(x?.photosCount ?? x?.photos_count ?? 0),
    videosCount: Number(x?.videosCount ?? x?.videos_count ?? 0),
    audiosCount: Number(x?.audiosCount ?? x?.audios_count ?? 0),
    gifsCount: Number(x?.gifsCount ?? x?.gifs_count ?? 0),
    raw: x,
  })).filter((x: VaultList) => Boolean(x.id));
};

const normalizeMedias = (res: any): { items: VaultMedia[]; hasMore: boolean } => {
  const arr = res?.data?.list || res?.data?.items || res?.list || res?.items;
  const hasMore = Boolean(res?.data?.hasMore ?? res?.hasMore ?? false);

  const items = Array.isArray(arr)
    ? arr.map((m: any) => ({
      id: String(m?.id ?? m?.mediaId ?? m?.media_id ?? m?._id ?? '').trim(),
      type: String(m?.type ?? '').trim(),
      url: String(m?.url ?? m?.preview ?? m?.thumb ?? '').trim(),
      createdAt: m?.createdAt ?? m?.created_at ?? m?.created ?? null,
      raw: m,
    })).filter((x: VaultMedia) => Boolean(x.id))
    : [];

  return { items, hasMore };
};

const sortNewestFirst = (items: VaultMedia[]) => {
  // приоритет: createdAt (если есть), иначе id как число, иначе как строка
  return [...items].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt as any).getTime() : NaN;
    const tb = b.createdAt ? new Date(b.createdAt as any).getTime() : NaN;

    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return tb - ta;
    const na = Number(a.id);
    const nb = Number(b.id);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return nb - na;
    return String(b.id).localeCompare(String(a.id));
  });
};

// -------- Core actions

const loadLists = async () => {
  if (!modelPlatformId.value) {
    notify({ title: 'Warning', type: 'error', text: 'ModelPlatform is not selected/found' });
    return;
  }

  loadingLists.value = true;
  try {
    const url = `${toUrl(props.endpoints.lists)}?modelPlatformId=${modelPlatformId.value}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    lastResponse.value = data;

    const normalized = normalizeLists(data);
    lists.value = normalized;

    if (!selectedListId.value && normalized.length) {
      selectedListId.value = normalized[0].id;
    }
  } catch (e: any) {
    console.log('[ExternalVaultMediaCard] loadLists error', e);
    notify({ title: 'Error', type: 'error', text: 'Failed to load lists' });
  } finally {
    loadingLists.value = false;
  }
};

const loadMedias = async (opts?: { reset?: boolean }) => {
  if (!modelPlatformId.value) return;
  if (!selectedListId.value) {
    notify({ title: 'Warning', type: 'error', text: 'Select a list first' });
    return;
  }

  const reset = Boolean(opts?.reset);

  if (reset) {
    medias.value = [];
    mediasOffset.value = 0;
    mediasHasMore.value = false;
  }

  loadingMedias.value = true;
  try {
    const url =
      `${toUrl(props.endpoints.medias)}` +
      `?modelPlatformId=${modelPlatformId.value}` +
      `&listId=${encodeURIComponent(selectedListId.value)}` +
      `&limit=${encodeURIComponent(String(mediasLimit.value))}` +
      `&offset=${encodeURIComponent(String(mediasOffset.value))}`;

    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    lastResponse.value = data;

    const { items, hasMore } = normalizeMedias(data);

    // добавляем и сортируем “новые сверху”
    const merged = sortNewestFirst([...medias.value, ...items]);
    medias.value = merged;
    mediasHasMore.value = hasMore;

    // сдвигаем offset только если пришло что-то
    if (items.length) mediasOffset.value += items.length;

    // purge selection: оставляем только те id, которые реально присутствуют
    const allIds = new Set(medias.value.map((m) => String(m.id)));
    selectedMediaIdsLocal.value = selectedMediaIdsLocal.value.filter((id) => allIds.has(String(id)));
  } catch (e: any) {
    console.log('[ExternalVaultMediaCard] loadMedias error', e);
    notify({ title: 'Error', type: 'error', text: 'Failed to load medias' });
  } finally {
    loadingMedias.value = false;
  }
};

const last4Medias = computed(() => sortNewestFirst(medias.value).slice(0, 4));

const filteredLists = computed(() => {
  const q = String(listFilter.value || '').trim().toLowerCase();
  if (!q) return lists.value;
  return lists.value.filter((x) => String(x.name || '').toLowerCase().includes(q));
});

const toggleMedia = (m: VaultMedia) => {
  const id = String(m?.id || '').trim();
  if (!id) return;

  if (selectedMediaIdsLocal.value.includes(id)) {
    selectedMediaIdsLocal.value = selectedMediaIdsLocal.value.filter((x) => x !== id);
  } else {
    selectedMediaIdsLocal.value = [...selectedMediaIdsLocal.value, id];
  }
};

const clearSelection = () => {
  selectedMediaIdsLocal.value = [];
};

const onPickFile = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const f = input?.files?.[0] || null;
  fileToUpload.value = f;
};

const uploadFileToSelectedList = async () => {
  if (!modelPlatformId.value) return;
  if (!selectedListId.value) {
    notify({ title: 'Warning', type: 'error', text: 'Select a list first' });
    return;
  }
  if (!fileToUpload.value) {
    notify({ title: 'Warning', type: 'error', text: 'Pick a file first' });
    return;
  }

  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append('modelPlatformId', String(modelPlatformId.value));
    fd.append('listId', String(selectedListId.value));
    fd.append('file', fileToUpload.value);

    const res = await fetch(toUrl(props.endpoints.upload), {
      method: 'POST',
      body: fd,
    });

    const data = await res.json().catch(() => ({}));
    lastResponse.value = data;

    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

    notify({ title: 'Success', type: 'success', text: 'File uploaded' });

    // после загрузки — обновляем медиа (reset)
    await loadMedias({ reset: true });
    fileToUpload.value = null;
  } catch (e: any) {
    console.log('[ExternalVaultMediaCard] uploadFileToSelectedList error', e);
    notify({ title: 'Error', type: 'error', text: e?.message || 'Upload failed' });
  } finally {
    uploading.value = false;
  }
};

/**
 * “Поиск по всем категориям зная имя?”
 * В идеале — серверный поиск (один эндпоинт).
 * Если его нет — можно сделать клиентский перебор списков последовательно.
 */
const globalSearchQuery = ref('');
const globalSearchResults = ref<{ listId: string; listName: string; medias: VaultMedia[] }[]>([]);
const searchingAllLists = ref(false);

const searchAcrossAllListsByName = async () => {
  const q = String(globalSearchQuery.value || '').trim().toLowerCase();
  if (!q) {
    globalSearchResults.value = [];
    return;
  }
  if (!modelPlatformId.value) return;
  if (!lists.value.length) await loadLists();

  searchingAllLists.value = true;
  globalSearchResults.value = [];
  try {
    // Последовательно и ограниченно, чтобы не убивать лимиты
    for (const l of lists.value) {
      // throttle: лёгкая пауза (можно увеличить)
      await new Promise((r) => setTimeout(r, 200));

      const url =
        `${toUrl(props.endpoints.medias)}` +
        `?modelPlatformId=${modelPlatformId.value}` +
        `&listId=${encodeURIComponent(l.id)}` +
        `&limit=24&offset=0`;

      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      const { items } = normalizeMedias(data);

      const matched = items.filter((m) => {
        // ищем по любому разумному полю имени/файла в raw (если есть)
        const rawStr = JSON.stringify(m.raw || {}).toLowerCase();
        return rawStr.includes(q);
      });

      if (matched.length) {
        globalSearchResults.value.push({
          listId: l.id,
          listName: l.name,
          medias: sortNewestFirst(matched),
        });
      }
    }
  } catch (e: any) {
    console.log('[ExternalVaultMediaCard] searchAcrossAllListsByName error', e);
    notify({ title: 'Error', type: 'error', text: 'Global search failed' });
  } finally {
    searchingAllLists.value = false;
  }
};

// --- sync v-model both ways
watch(
  () => props.mediaIds,
  (v: any) => {
    const arr = Array.isArray(v) ? v.map(String) : [];
    selectedMediaIdsLocal.value = arr;
  }
);

watch(
  () => selectedMediaIdsLocal.value,
  (v) => emit('update:mediaIds', v),
  { deep: true }
);

// reset on modelPlatform change
watch(
  () => modelPlatformId.value,
  async () => {
    lists.value = [];
    listFilter.value = '';
    selectedListId.value = '';

    medias.value = [];
    mediasOffset.value = 0;
    mediasHasMore.value = false;

    selectedMediaIdsLocal.value = [];
    lastResponse.value = null;

    globalSearchQuery.value = '';
    globalSearchResults.value = [];

    if (modelPlatformId.value) {
      await loadLists();
      if (selectedListId.value) await loadMedias({ reset: true });
    }
  },
  { immediate: true }
);

// reload medias when list changes
watch(
  () => selectedListId.value,
  async () => {
    if (!selectedListId.value) return;
    await loadMedias({ reset: true });
  }
);
</script>

<template>
  <CardBox class="border-2 border-gray-300" rounded="rounded-md">
    <h1 class="font-bold text-xl">External API — Vault Media</h1>

    <div class="text-sm mt-2">
      <div><b>ModelPlatform:</b> {{ modelPlatformId || '-' }}</div>
      <div><b>Account:</b> {{ accountId || '-' }}</div>
      <div class="text-xs opacity-70"><b>Selected mediaIds:</b> {{ selectedMediaIdsLocal.length }}</div>
    </div>

    <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div class="border rounded p-2">
        <div class="flex gap-2 mb-2">
          <input class="flex-1 rounded p-2 border" v-model="listFilter" placeholder="Filter lists by name..." />
          <BaseButton label="Reload lists" color="info" rounded small :disabled="loadingLists" @click="loadLists" />
        </div>

        <div class="flex gap-2 items-center">
          <select class="flex-1 rounded p-2 border" v-model="selectedListId" :disabled="!filteredLists.length">
            <option value="" disabled>Select list...</option>
            <option v-for="l in filteredLists" :key="l.id" :value="l.id">
              {{ l.name }} ({{ l.id }})
            </option>
          </select>
          <BaseButton label="Clear selection" color="warning" rounded small :disabled="!selectedMediaIdsLocal.length" @click="clearSelection" />
        </div>

        <div class="mt-3 text-xs opacity-70">
          <div><b>Lists:</b> {{ lists.length }}</div>
          <div><b>Medias loaded:</b> {{ medias.length }}</div>
          <div><b>Last 4:</b> {{ last4Medias.length }}</div>
        </div>
      </div>

      <div class="border rounded p-2">
        <div class="text-sm font-semibold mb-2">Upload file to selected list</div>
        <div class="flex gap-2 items-center">
          <input type="file" class="flex-1" @change="onPickFile" />
          <BaseButton
            label="Upload"
            color="success"
            rounded
            small
            :disabled="uploading || !fileToUpload || !selectedListId"
            @click="uploadFileToSelectedList"
          />
        </div>
        <div class="text-xs opacity-70 mt-2" v-if="fileToUpload">
          Selected: {{ fileToUpload.name }} ({{ Math.round(fileToUpload.size / 1024) }} KB)
        </div>
      </div>
    </div>

    <div class="mt-4 border rounded p-2">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-semibold">Last 4 uploaded (best-effort)</div>
        <BaseButton
          label="Reload medias"
          color="info"
          rounded
          small
          :disabled="loadingMedias || !selectedListId"
          @click="loadMedias({ reset: true })"
        />
      </div>

      <div class="flex flex-wrap gap-3" v-if="last4Medias.length">
        <div v-for="m in last4Medias" :key="m.id" class="w-32">
          <div class="relative border rounded overflow-hidden">
            <input
              type="checkbox"
              class="absolute top-1 left-1 z-10"
              :checked="selectedMediaIdsLocal.includes(m.id)"
              @change="toggleMedia(m)"
              title="Select media"
            />
            <img v-if="m.url" :src="m.url" class="w-32 h-32 object-cover" />
            <div v-else class="w-32 h-32 flex items-center justify-center text-xs opacity-70">media</div>
          </div>
          <div class="mt-1 text-xs break-all opacity-70">id: {{ m.id }}</div>
        </div>
      </div>
      <div v-else class="text-xs opacity-70">No medias loaded.</div>
    </div>

    <div class="mt-4 border rounded p-2">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-semibold">Medias in selected list</div>
        <BaseButton
          label="Load more"
          color="info"
          rounded
          small
          :disabled="loadingMedias || !mediasHasMore || !selectedListId"
          @click="loadMedias()"
        />
      </div>

      <div class="flex flex-wrap gap-3" v-if="medias.length">
        <div v-for="m in medias" :key="m.id" class="w-32">
          <div class="relative border rounded overflow-hidden">
            <input
              type="checkbox"
              class="absolute top-1 left-1 z-10"
              :checked="selectedMediaIdsLocal.includes(m.id)"
              @change="toggleMedia(m)"
              title="Select media"
            />
            <img v-if="m.url" :src="m.url" class="w-32 h-32 object-cover" />
            <div v-else class="w-32 h-32 flex items-center justify-center text-xs opacity-70">media</div>
          </div>
          <div class="mt-1 text-xs break-all opacity-70">id: {{ m.id }}</div>
        </div>
      </div>
      <div v-else class="text-xs opacity-70">No medias.</div>
    </div>

    <div class="mt-4 border rounded p-2">
      <div class="text-sm font-semibold mb-2">Global search (across lists, sequential)</div>
      <div class="flex gap-2">
        <input class="flex-1 rounded p-2 border" v-model="globalSearchQuery" placeholder="Search query..." />
        <BaseButton label="Search" color="info" rounded small :disabled="searchingAllLists" @click="searchAcrossAllListsByName" />
      </div>

      <div v-if="globalSearchResults.length" class="mt-3 space-y-3">
        <div v-for="r in globalSearchResults" :key="r.listId" class="border rounded p-2">
          <div class="text-xs font-semibold mb-2">{{ r.listName }} ({{ r.listId }}) — matches: {{ r.medias.length }}</div>
          <div class="flex flex-wrap gap-3">
            <div v-for="m in r.medias.slice(0, 8)" :key="m.id" class="w-24">
              <div class="relative border rounded overflow-hidden">
                <input
                  type="checkbox"
                  class="absolute top-1 left-1 z-10"
                  :checked="selectedMediaIdsLocal.includes(m.id)"
                  @change="toggleMedia(m)"
                />
                <img v-if="m.url" :src="m.url" class="w-24 h-24 object-cover" />
                <div v-else class="w-24 h-24 flex items-center justify-center text-[10px] opacity-70">media</div>
              </div>
              <div class="mt-1 text-[10px] break-all opacity-70">{{ m.id }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="mt-2 text-xs opacity-70">
        No global search results.
      </div>
    </div>

    <div v-if="lastResponse" class="mt-4">
      <label class="block text-sm">Last response</label>
      <pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(lastResponse, null, 2) }}</pre>
    </div>
  </CardBox>
</template>
