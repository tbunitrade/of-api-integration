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
  if (typeof props.notify === 'function') return props.notify(payload);
  console.log('[ExternalVaultMediaCard notify]', payload);
};

const mp = computed(() =>
  Array.isArray(props.modelPlatform) ? (props.modelPlatform[0] || null) : props.modelPlatform
);

const modelPlatformId = computed(() => Number((mp.value as any)?.model_platform_id || (mp.value as any)?.id || 0));
const accountId = computed(() => String((mp.value as any)?.ofid_username || '').trim());

// UI state
const vaultListId = ref('');
const vaultSections = ref<any[]>([]);
const selectedSectionKey = ref('');
const selectedMediaIdsLocal = ref<string[]>(Array.isArray(props.mediaIds) ? (props.mediaIds as any).map(String) : []);

const loadingVault = ref(false);
const addingToVaultList = ref(false);
const lastResponse = ref<any>(null);

// --- Normalizers (под твой JSON: data.list[] + medias внутри)
const normalizeVaultSections = (res: any) => {
  const list = res?.data?.list;
  if (!Array.isArray(list)) return [];

  return list.map((x: any) => {
    const id = String(x?.id ?? '').trim();
    const type = String(x?.type ?? '').trim();
    const name = String(x?.name ?? '').trim();

    const medias = Array.isArray(x?.medias) ? x.medias : [];
    const mediasNorm = medias.map((m: any, idx: number) => {
      const mid = m?.id ?? m?.mediaId ?? m?.media_id ?? m?._id ?? null;
      return {
        key: mid != null ? String(mid) : `url:${type}:${idx}:${String(m?.url || '')}`,
        id: mid != null ? String(mid) : '',
        type: String(m?.type || ''),
        url: String(m?.url || ''),
        raw: m,
      };
    });

    return {
      key: `${id}:${type}`,
      id,
      type,
      name,
      hasMedia: Boolean(x?.hasMedia),
      videosCount: Number(x?.videosCount || 0),
      photosCount: Number(x?.photosCount || 0),
      gifsCount: Number(x?.gifsCount || 0),
      audiosCount: Number(x?.audiosCount || 0),
      medias: mediasNorm,
      raw: x,
    };
  });
};

const selectedSection = computed(() => {
  return vaultSections.value.find((x) => x.key === selectedSectionKey.value) || null;
});

const selectableMedias = computed(() => {
  return selectedSection.value?.medias || [];
});

const toggleMedia = (m: any) => {
  const id = String(m?.id || '').trim();
  if (!id) return; // если провайдер не отдаёт id — выбрать нельзя

  if (selectedMediaIdsLocal.value.includes(id)) {
    selectedMediaIdsLocal.value = selectedMediaIdsLocal.value.filter((x) => x !== id);
  } else {
    selectedMediaIdsLocal.value = [...selectedMediaIdsLocal.value, id];
  }
};

const clearSelection = () => {
  selectedMediaIdsLocal.value = [];
};

const loadVaultList = async () => {
  if (!modelPlatformId.value) {
    notify({ title: 'Warning', type: 'error', text: 'ModelPlatform is not selected/found' });
    return;
  }

  const listId = String(vaultListId.value || '').trim();
  if (!listId) {
    notify({ title: 'Warning', type: 'error', text: 'Vault list id is required' });
    return;
  }

  loadingVault.value = true;
  try {
    const url =
      `${import.meta.env.VITE_APP_ROOT_API}/automate/vault-list` +
      `?modelPlatformId=${modelPlatformId.value}&listId=${encodeURIComponent(listId)}`;

    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    lastResponse.value = data;

    const sections = normalizeVaultSections(data);
    vaultSections.value = sections;

    if (!selectedSectionKey.value && sections.length) {
      selectedSectionKey.value = sections[0].key;
    }

    // purge: оставляем только те ids, которые реально есть в ответе (если ids присутствуют)
    const allIds = new Set<string>();
    for (const s of sections) {
      for (const m of (s.medias || [])) {
        if (m?.id) allIds.add(String(m.id));
      }
    }
    selectedMediaIdsLocal.value = selectedMediaIdsLocal.value.filter((id) => allIds.has(String(id)));
  } catch (e: any) {
    console.log('[ExternalVaultMediaCard] loadVaultList error', e);
    notify({ title: 'Error', type: 'error', text: 'Failed to load vault list' });
  } finally {
    loadingVault.value = false;
  }
};

const addSelectedToList = async () => {
  if (!modelPlatformId.value) return;

  const listId = String(vaultListId.value || '').trim();
  if (!listId) {
    notify({ title: 'Warning', type: 'error', text: 'Vault list id is required' });
    return;
  }

  if (!selectedMediaIdsLocal.value.length) {
    notify({ title: 'Warning', type: 'error', text: 'Select media first' });
    return;
  }

  addingToVaultList.value = true;
  try {
    const payload = {
      modelPlatformId: modelPlatformId.value,
      listId,
      mediaIds: selectedMediaIdsLocal.value,
    };

    const res = await fetch(`${import.meta.env.VITE_APP_ROOT_API}/automate/vault-add-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    lastResponse.value = data;

    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

    notify({ title: 'Success', type: 'success', text: 'Media added to vault list' });
  } catch (e: any) {
    console.log('[ExternalVaultMediaCard] addSelectedToList error', e);
    notify({ title: 'Error', type: 'error', text: e?.message || 'Failed to add media to list' });
  } finally {
    addingToVaultList.value = false;
  }
};

// sync v-model both ways
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
  () => {
    vaultListId.value = '';
    vaultSections.value = [];
    selectedSectionKey.value = '';
    selectedMediaIdsLocal.value = [];
    lastResponse.value = null;
  }
);
</script>

<template>
  <CardBox class="border-2 border-gray-300" rounded="rounded-md">
    <h1 class="font-bold text-xl">External API — Vault Media</h1>

    <div class="text-sm mt-2">
      <div><b>ModelPlatform:</b> {{ modelPlatformId || '-' }}</div>
      <div><b>Account (ofid_username):</b> {{ accountId || '-' }}</div>
      <div class="text-xs opacity-70"><b>Selected mediaIds:</b> {{ selectedMediaIdsLocal.length }}</div>
    </div>

    <div class="mt-4 flex gap-2">
      <input class="flex-1 rounded p-2 border" v-model="vaultListId" placeholder="Vault list id (e.g. 123)" />
      <BaseButton label="Load vault" color="info" rounded small :disabled="loadingVault" @click="loadVaultList" />
      <BaseButton label="Clear selection" color="warning" rounded small :disabled="!selectedMediaIdsLocal.length" @click="clearSelection" />
    </div>

    <div v-if="vaultSections.length" class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="border rounded p-2 max-h-80 overflow-auto">
        <div
          v-for="s in vaultSections"
          :key="s.key"
          class="flex items-start gap-2 py-2 border-b last:border-b-0"
        >
          <input
            type="radio"
            name="vault-section"
            :checked="selectedSectionKey === s.key"
            @change="selectedSectionKey = s.key"
          />
          <div class="text-sm">
            <div class="font-medium">
              {{ s.name }} <span class="opacity-60">({{ s.type }})</span>
            </div>
            <div class="text-xs opacity-70">
              photos={{ s.photosCount }}, videos={{ s.videosCount }}, audios={{ s.audiosCount }}
            </div>
            <div class="text-xs opacity-60" v-if="s.medias?.length">previews: {{ s.medias.length }}</div>
          </div>
        </div>
      </div>

      <div class="border rounded p-2 max-h-80 overflow-auto">
        <div class="text-sm font-semibold mb-2">
          {{ selectedSection?.name || '—' }}
        </div>

        <div v-if="selectableMedias.length" class="flex flex-wrap gap-3">
          <div v-for="m in selectableMedias" :key="m.key" class="w-32">
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

        <div v-else class="text-xs opacity-70">No medias in this section.</div>

        <div class="mt-4 text-right">
          <BaseButton
            label="Add selected to list"
            color="success"
            rounded
            small
            :disabled="addingToVaultList || !selectedMediaIdsLocal.length || !vaultListId"
            @click="addSelectedToList"
          />
        </div>
      </div>
    </div>

    <div v-else class="mt-4 text-xs opacity-70">
      Load vault list to see sections.
    </div>

    <div v-if="lastResponse" class="mt-4">
      <label class="block text-sm">Last response</label>
      <pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(lastResponse, null, 2) }}</pre>
    </div>
  </CardBox>
</template>
