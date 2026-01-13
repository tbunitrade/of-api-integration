<script setup lang="ts">
import { ref, computed, watch } from 'vue';

import CardBox from '@/components/CardBox.vue';
import BaseButton from '@/components/BaseButton.vue';

const props = defineProps({
  modelPlatform: { type: [Object, Array], required: false, default: null },
  notify: { type: Function, required: false, default: null },

  // v-model:mediaIds
  mediaIds: { type: Array, required: false, default: () => [] },
});

const emit = defineEmits(['update:mediaIds']);

const notify = (payload: any) => {
  if (typeof props.notify === 'function') return (props.notify as any)(payload);
  console.log('[ExternalVaultMediaCard notify]', payload);
};

const mp = computed(() =>
  Array.isArray(props.modelPlatform) ? ((props.modelPlatform as any)[0] || null) : (props.modelPlatform as any)
);

const modelPlatformId = computed(() => Number((mp.value as any)?.model_platform_id || (mp.value as any)?.id || 0));
const accountId = computed(() => String((mp.value as any)?.ofid_username || '').trim());
const canWork = computed(() => modelPlatformId.value > 0);

// UI state
const vaultLists = ref<any[]>([]); // [{id,name,type,...}]
const selectedVaultListId = ref<string>('');

//for random
const loadingRandom = ref(false);
const suppressAutoLoad = ref(false);

const vaultMedias = ref<any[]>([]); // normalized medias
const limit = ref<number>(24);
const offset = ref<number>(0);
const hasMore = ref<boolean>(false);

const selectedMediaIdsLocal = ref<string[]>(
  Array.isArray(props.mediaIds) ? (props.mediaIds as any).map(String) : []
);

const sameArr = (a, b) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (String(a[i]) !== String(b[i])) return false;
  }
  return true;
};


const findPostsListId = (lists: any[]) => {
  const lower = (s: any) => String(s || '').toLowerCase();

  // 1) по type
  const byType = lists.find((l) => lower(l?.type).includes('post'));
  if (byType?.id) return String(byType.id);

  // 2) по name
  const byName = lists.find((l) => lower(l?.name).includes('post'));
  if (byName?.id) return String(byName.id);

  // 3) fallback: иногда это "posts" / "post media" и т.д.
  const byHints = lists.find((l) => {
    const n = lower(l?.name);
    return n.includes('posts') || n.includes('post media') || n.includes('post list');
  });
  if (byHints?.id) return String(byHints.id);

  return '';
};

const getPhotoIds = () =>
  selectableMedias.value
    .filter((m: any) => String(m?.type || '').toLowerCase() === 'photo')
    .map((m: any) => String(m?.id || '').trim())
    .filter(Boolean);

//random 4

const pickRandom = (arr: string[], n: number) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};

const selectRandom4Photos = () => {
  const ids = selectableMedias.value
    .filter((m: any) => (m?.type || '') === 'photo') // только фото
    .map((m: any) => String(m?.id || '').trim())
    .filter(Boolean);

  if (ids.length < 1) return;

  selectedMediaIdsLocal.value = pickRandom(ids, Math.min(4, ids.length));
};

const ensurePostsMediaLoaded = async () => {
  // 1) списки
  if (!vaultLists.value.length) {
    await loadVaultLists();
  }

  const postsListId = findPostsListId(vaultLists.value);
  if (!postsListId) {
    notify({ title: 'Error', type: 'error', text: 'Posts list not found in vault-lists' });
    return false;
  }

  // 2) переключаем список на Posts и грузим медиа (без двойного вызова watcher)
  suppressAutoLoad.value = true;
  selectedVaultListId.value = postsListId;
  suppressAutoLoad.value = false;

  await loadVaultMedia(true);
  return true;
};

const selectRandom4PhotosFromPosts = async () => {
  if (!canWork.value) {
    notify({ title: 'Warning', type: 'error', text: 'ModelPlatform is not selected/found' });
    return;
  }

  loadingRandom.value = true;
  try {
    if (!vaultLists.value.length) {
      await loadVaultLists();
    }

    const postsListId = findPostsListId(vaultLists.value);
    if (!postsListId) {
      notify({ title: 'Error', type: 'error', text: 'Posts list not found in vault-lists' });
      return;
    }

    // переключим listId (чтобы UI показывал правильный list)
    suppressAutoLoad.value = true;
    selectedVaultListId.value = postsListId;
    suppressAutoLoad.value = false;

    // optional: загрузим первую страницу, чтобы UI был не пустой
    await loadVaultMedia(true);

    const ok = await pickRandomFromManyPages(postsListId);
    if (!ok) {
      notify({ title: 'Warning', type: 'error', text: 'No photo media found for random selection' });
    }
  } catch (e: any) {
    console.log('[ExternalVaultMediaCard] selectRandom4PhotosFromPosts error', e);
    notify({ title: 'Error', type: 'error', text: 'Failed to pick random photos from Posts' });
  } finally {
    loadingRandom.value = false;
  }
};

// end random 4
////
const loadingLists = ref(false);
const loadingMedia = ref(false);
const lastResponse = ref<any>(null);

const normalizeVaultLists = (res: any) => {
  const list = res?.data?.list;
  if (!Array.isArray(list)) return [];
  return list
    .map((x: any) => ({
      id: String(x?.id ?? '').trim(),
      name: String(x?.name ?? '').trim(),
      type: String(x?.type ?? '').trim(),
      raw: x,
    }))
    .filter((x: any) => x.id && x.name);
};

const normalizeMedias = (res: any) => {
  // ожидаем data.list = медиа
  const list = res?.data?.list;
  if (!Array.isArray(list)) return [];

  return list.map((m: any, idx: number) => {
    const mid = m?.id ?? m?.mediaId ?? m?.media_id ?? m?._id ?? null;
    return {
      key: mid != null ? String(mid) : `url:${idx}:${String(m?.url || '')}`,
      id: mid != null ? String(mid) : '',
      type: String(m?.type || ''),
      url: String(m?.url || ''),
      createdAt: String(m?.createdAt || m?.created_at || ''),
      raw: m,
    };
  });
};

const selectableMedias = computed(() => vaultMedias.value || []);

const toggleMedia = (m: any) => {
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

const selectLast4 = () => {
  // “последние 4” — считаем что список уже отсортирован провайдером по свежести
  const ids = selectableMedias.value
    .map((m: any) => String(m?.id || '').trim())
    .filter(Boolean)
    .slice(0, 4);

  if (!ids.length) return;
  selectedMediaIdsLocal.value = ids;
};

const loadVaultLists = async () => {
  if (!canWork.value) {
    notify({ title: 'Warning', type: 'error', text: 'ModelPlatform is not selected/found' });
    return;
  }

  loadingLists.value = true;
  try {
    const url = `${import.meta.env.VITE_APP_ROOT_API}/automate/vault-lists?modelPlatformId=${modelPlatformId.value}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    lastResponse.value = data;

    const lists = normalizeVaultLists(data);
    vaultLists.value = lists;

    if (!selectedVaultListId.value && lists.length) {
      selectedVaultListId.value = String(lists[0].id);
    }
  } catch (e: any) {
    console.log('[ExternalVaultMediaCard] loadVaultLists error', e);
    notify({ title: 'Error', type: 'error', text: 'Failed to load vault lists' });
  } finally {
    loadingLists.value = false;
  }
};

const loadVaultMedia = async (reset = true) => {
  if (!canWork.value) {
    notify({ title: 'Warning', type: 'error', text: 'ModelPlatform is not selected/found' });
    return;
  }

  const listId = String(selectedVaultListId.value || '').trim();
  if (!listId) {
    notify({ title: 'Warning', type: 'error', text: 'Select vault list first' });
    return;
  }

  if (reset) {
    offset.value = 0;
    vaultMedias.value = [];
  }

  loadingMedia.value = true;
  try {
    const url =
      `${import.meta.env.VITE_APP_ROOT_API}/automate/vault-media` +
      `?modelPlatformId=${modelPlatformId.value}` +
      `&list=${encodeURIComponent(listId)}` +
      `&limit=${encodeURIComponent(String(limit.value))}` +
      `&offset=${encodeURIComponent(String(offset.value))}`;

    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    lastResponse.value = data;

    const medias = normalizeMedias(data);
    vaultMedias.value = reset ? medias : [...vaultMedias.value, ...medias];

    hasMore.value = Boolean(data?.data?.hasMore);
    offset.value = offset.value + limit.value;

    // purge selection: оставляем только те ids, которые реально есть в текущем пуле
    const allIds = new Set<string>(vaultMedias.value.map((m: any) => String(m?.id || '').trim()).filter(Boolean));
    selectedMediaIdsLocal.value = selectedMediaIdsLocal.value.filter((id) => allIds.has(String(id)));
  } catch (e: any) {
    console.log('[ExternalVaultMediaCard] loadVaultMedia error', e);
    notify({ title: 'Error', type: 'error', text: 'Failed to load vault media' });
  } finally {
    loadingMedia.value = false;
  }
};


const fetchVaultMediaPage = async (listId: string, pageOffset: number, pageLimit: number) => {
  const url =
    `${import.meta.env.VITE_APP_ROOT_API}/automate/vault-media` +
    `?modelPlatformId=${modelPlatformId.value}` +
    `&list=${encodeURIComponent(listId)}` +
    `&limit=${encodeURIComponent(String(pageLimit))}` +
    `&offset=${encodeURIComponent(String(pageOffset))}`;

  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));

  const medias = normalizeMedias(data);
  const hasMoreResp = Boolean(data?.data?.hasMore);

  return { medias, hasMoreResp, raw: data };
};

const pickRandomFromManyPages = async (postsListId: string) => {
  // мы НЕ знаем total, поэтому делаем несколько попыток
  // чтобы попасть в разные страницы.
  const pageLimit = Number(limit.value || 24);

  // оценка “верхней границы” оффсета.
  // можно поднять до 2000/5000 — но не бесконечно.
  // если медиа 600 и limit 24 -> страниц ~25 -> оффсеты 0..576
  // поэтому ставим "maxOffsetGuess" 2000 чтобы точно покрыть.
  const maxOffsetGuess = 2000;

  for (let attempt = 0; attempt < 10; attempt++) {
    const randomOffset = Math.floor(Math.random() * maxOffsetGuess);

    const { medias } = await fetchVaultMediaPage(postsListId, randomOffset, pageLimit);

    // фильтруем только photo
    const photoIds = medias
      .filter((m: any) => String(m?.type || '').toLowerCase() === 'photo')
      .map((m: any) => String(m?.id || '').trim())
      .filter(Boolean);

    if (photoIds.length >= 4) {
      selectedMediaIdsLocal.value = pickRandom(photoIds, 4);
      return true;
    }

    // если мало фото — попробуем ещё раз другой offset
  }

  // fallback: если не повезло — рандомим из текущего загруженного пула
  const fallback = getPhotoIds();
  if (fallback.length) {
    selectedMediaIdsLocal.value = pickRandom(fallback, Math.min(4, fallback.length));
    return true;
  }

  return false;
};


// sync v-model both ways
// sync v-model both ways (anti ping-pong)
watch(
  () => props.mediaIds,
  (v: any) => {
    const next = Array.isArray(v) ? v.map(String) : [];
    if (sameArr(next, selectedMediaIdsLocal.value)) return;

    selectedMediaIdsLocal.value = next;
  },
  { deep: true }
);

watch(
  () => selectedMediaIdsLocal.value,
  (v) => {
    const next = Array.isArray(v) ? v.map(String) : [];
    const curr = Array.isArray(props.mediaIds) ? props.mediaIds.map(String) : [];

    // если уже совпадает с тем, что пришло сверху — не эмитим
    if (sameArr(next, curr)) return;

    emit('update:mediaIds', next);
  },
  { deep: true }
);

// reset on modelPlatform change
watch(
  () => modelPlatformId.value,
  () => {
    vaultLists.value = [];
    selectedVaultListId.value = '';
    vaultMedias.value = [];
    // selectedMediaIdsLocal.value = [];
    if (selectedMediaIdsLocal.value.length) selectedMediaIdsLocal.value = [];
    offset.value = 0;
    hasMore.value = false;
    lastResponse.value = null;
  }
);

// if user changes selected list -> reload medias
watch(
  () => selectedVaultListId.value,
  () => {
    if (suppressAutoLoad.value) return;
    if (selectedVaultListId.value) loadVaultMedia(true);
  }
);

watch(
  () => selectedMediaIdsLocal.value,
  (v) => {
    console.log('[ExternalVaultMediaCard] selectedMediaIdsLocal:', v);
  },
  { deep: true }
);
</script>

<template>
  <CardBox class="border-2 border-gray-300" rounded="rounded-md">
    <h1 class="font-bold text-xl">External API — Vault Media</h1>

    <div class="text-sm mt-2">
      <div><b>ModelPlatform:</b> {{ modelPlatformId || '-' }}</div>
      <div><b>Account (ofid_username):</b> {{ accountId || '-' }}</div>
      <div class="text-xs opacity-70"><b>Selected mediaIds:</b> {{ selectedMediaIdsLocal.length }}</div>
      <div class="text-xs mt-1">

        <span v-if="selectedMediaIdsLocal.length">
          {{ selectedMediaIdsLocal.join(', ') }}
        </span>
        <span v-else>—</span>
      </div>
    </div>

    <div class="mt-4 flex gap-2 items-center">
      <BaseButton
        label="Random 4 photos (Posts)"
        color="success"
        rounded
        small
        :disabled="loadingRandom || loadingMedia || loadingLists || !canWork"
        @click="selectRandom4PhotosFromPosts"
      />

      <BaseButton
        label="Select Random 4 photos"
        color="success"
        rounded
        small
        :disabled="!selectableMedias.length || !modelPlatformId"
        @click="selectRandom4Photos"
      />

      <BaseButton
        label="Load lists"
        color="info"
        rounded
        small
        :disabled="loadingLists || !canWork"
        @click="loadVaultLists"
      />

      <select class="flex-1 rounded p-2 border" v-model="selectedVaultListId" :disabled="!vaultLists.length">
        <option value="" disabled>Select vault list...</option>
        <option v-for="l in vaultLists" :key="l.id" :value="l.id">
          {{ l.name }} ({{ l.id }})
        </option>
      </select>

      <BaseButton
        label="Reload medias"
        color="info"
        rounded
        small
        :disabled="loadingMedia || !selectedVaultListId || !canWork"
        @click="loadVaultMedia(true)"
      />

      <BaseButton
        label="Clear selection"
        color="warning"
        rounded
        small
        :disabled="!selectedMediaIdsLocal.length"
        @click="clearSelection"
      />
    </div>

    <div class="mt-3 flex gap-2 items-center">
      <BaseButton
        label="Select last 4"
        color="success"
        rounded
        small
        :disabled="!selectableMedias.length || !modelPlatformId"
        @click="selectLast4"
      />
      <BaseButton
        v-if="hasMore"
        label="Load more"
        color="info"
        rounded
        small
        :disabled="loadingMedia || !modelPlatformId"
        @click="loadVaultMedia(false)"
      />
      <div class="text-xs opacity-70" v-if="selectableMedias.length">
        loaded={{ selectableMedias.length }} | hasMore={{ hasMore ? 'yes' : 'no' }}
      </div>
    </div>

    <div class="mt-4 border rounded p-2 max-h-96 overflow-auto">
      <div v-if="selectableMedias.length" class="flex flex-wrap gap-3">
        <div v-for="m in selectableMedias" :key="m.key" class="w-32">
          <div v-if="m.id && selectedMediaIdsLocal.includes(m.id)"
               class="absolute bottom-1 right-1 z-10 bg-black/70 text-white text-[10px] px-1 rounded">
            SELECTED
          </div>
          <div class="relative border rounded overflow-hidden">
            <input
              type="checkbox"
              class="absolute top-1 left-1 z-10"
              :disabled="!m.id"
              :checked="m.id && selectedMediaIdsLocal.includes(m.id)"
              @change="toggleMedia(m)"
              :title="m.id ? 'Select by id' : 'No media id in response — cannot attach'"
            />

            <img
              v-if="m.url && (m.type === 'photo' || m.type === 'gif')"
              :src="m.url"
              class="w-32 h-32 object-cover"
            />
            <div v-else class="w-32 h-32 flex items-center justify-center text-xs opacity-70">
              {{ m.type || 'media' }}
            </div>
          </div>

          <div class="mt-1 text-xs break-all opacity-70">
            <div v-if="m.id">id: {{ m.id }}</div>
            <div v-else>id: —</div>
          </div>
        </div>
      </div>

      <div v-else class="text-xs opacity-70">
        Load lists, select list, and medias will load automatically.
      </div>
    </div>

    <div v-if="lastResponse" class="mt-4">
      <label class="block text-sm">Last response</label>
<!--      <pre class="text-xs whitespace-pre-wrap">-->
<!--        {{-->
<!--          JSON.stringify(lastResponse, null, 2)-->
<!--        }}-->
<!--      </pre>-->
    </div>
  </CardBox>
</template>
