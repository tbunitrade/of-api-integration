<script setup lang="ts">
import { ref, computed, watch } from 'vue';

import CardBox from '@/components/CardBox.vue';
import BaseButton from '@/components/BaseButton.vue';

const props = defineProps({
  modelPlatform: { type: [Object, Array], required: false, default: null },
  notify: { type: Function, required: false, default: null },

  // NEW import media
  mediaIds: { type: Array, required: false, default: () => [] },
});

const notify = (payload: any) => {
  if (typeof props.notify === 'function') return (props.notify as any)(payload);
  console.log('[ExternalMassMessageCard notify]', payload);
};

const mp = computed(() =>
  Array.isArray(props.modelPlatform) ? ((props.modelPlatform as any)[0] || null) : (props.modelPlatform as any)
);

// НЕ трогаем твою схему: model_platform_id || id
const modelPlatformId = computed(() => Number((mp.value as any)?.model_platform_id || (mp.value as any)?.id || 0));
const accountId = computed(() => String((mp.value as any)?.ofid_username || '').trim());

const canWork = computed(() => modelPlatformId.value > 0);

// оставляю твой лог как есть (не меняю строку), но делаю корректно по порядку
watch(
  () => mp.value,
  (v) => console.log('[ExternalVaultMediaCard]', v),
  { immediate: true }
);

const audienceLists = ref<any[]>([]); // [{id,name,type?}]
const massMessageText = ref('');

const includeTokens = ref<string[]>([]);
const excludeTokens = ref<string[]>([]);

const search = ref('');

const loadingAudienceLists = ref(false);
const sendingMassMessage = ref(false);
const lastMassResponse = ref<any>(null);

const normalizeProviderLists = (data: any) => {
  const listsRaw = Array.isArray(data) ? data : (data?.lists || []);
  if (!Array.isArray(listsRaw)) return [];

  // backward compatible: ["fans","following"] or [123,"fans"]
  if (listsRaw.length && (typeof listsRaw[0] === 'string' || typeof listsRaw[0] === 'number')) {
    return listsRaw.map((x) => ({ id: String(x).trim(), name: String(x).trim() }));
  }

  // objects
  return listsRaw
    .map((x: any) => ({
      id: x?.id ?? x?.key ?? x?.type ?? x?.slug ?? x?.name,
      name: String(x?.name ?? x?.title ?? x?.label ?? x?.id ?? '').trim(),
      type: x?.type,
    }))
    .filter((x: any) => x.id != null && x.name);
};

const normalizeSelectedTokens = (arr: any) => {
  const a = Array.isArray(arr) ? arr : [];
  const out = a
    .map((x: any) => {
      if (x == null) return '';
      if (typeof x === 'string' || typeof x === 'number') return String(x).trim();
      return String(x?.id ?? x?.value ?? x?.key ?? '').trim();
    })
    .filter(Boolean);

  const seen = new Set<string>();
  return out.filter((t: string) => {
    const k = t.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const filteredLists = computed(() => {
  const q = String(search.value || '').trim().toLowerCase();
  if (!q) return audienceLists.value;

  return audienceLists.value.filter((l: any) => {
    const n = String(l.name || '').toLowerCase();
    const id = String(l.id || '').toLowerCase();
    return n.includes(q) || id.includes(q);
  });
});

const listIndexById = computed(() => {
  const m = new Map<string, any>();
  for (const l of audienceLists.value || []) {
    const id = String((l as any)?.id ?? '').trim();
    if (!id) continue;
    m.set(id, l);
  }
  return m;
});

const tokenLabel = (token: any) => {
  const t = String(token ?? '').trim();
  if (!t) return '';
  const l = listIndexById.value.get(t);
  const name = String(l?.name ?? '').trim();
  return name || t;
};

const tokenTitle = (token: any) => {
  const t = String(token ?? '').trim();
  const l = listIndexById.value.get(t);
  const name = String(l?.name ?? '').trim();
  return name ? `${name} — ${t}` : t;
};

const tokenShowIdInline = (token: any) => {
  const t = String(token ?? '').trim();
  const label = tokenLabel(t);
  return label && label !== t;
};

const isIncluded = (token: string) => includeTokens.value.includes(token);
const isExcluded = (token: string) => excludeTokens.value.includes(token);

const toggleInclude = (token: string) => {
  token = String(token);
  excludeTokens.value = excludeTokens.value.filter((t) => t !== token);

  if (includeTokens.value.includes(token)) {
    includeTokens.value = includeTokens.value.filter((t) => t !== token);
  } else {
    includeTokens.value = normalizeSelectedTokens([...includeTokens.value, token]);
  }
};

const toggleExclude = (token: string) => {
  token = String(token);
  includeTokens.value = includeTokens.value.filter((t) => t !== token);

  if (excludeTokens.value.includes(token)) {
    excludeTokens.value = excludeTokens.value.filter((t) => t !== token);
  } else {
    excludeTokens.value = normalizeSelectedTokens([...excludeTokens.value, token]);
  }
};

const removeInclude = (token: string) => (includeTokens.value = includeTokens.value.filter((t) => t !== token));
const removeExclude = (token: string) => (excludeTokens.value = excludeTokens.value.filter((t) => t !== token));

const clearInclude = () => (includeTokens.value = []);
const clearExclude = () => (excludeTokens.value = []);

const loadAudienceLists = async () => {
  if (!canWork.value) {
    notify({ title: 'Warning', type: 'error', text: 'ModelPlatform in Mass Mess is not selected/found' });
    return;
  }

  loadingAudienceLists.value = true;
  try {
    const url = `${import.meta.env.VITE_APP_ROOT_API}/automate/audience-lists?modelPlatformId=${modelPlatformId.value}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));

    lastMassResponse.value = data;

    const lists = normalizeProviderLists(data);
    audienceLists.value = lists;

    const set = new Set(lists.map((x: any) => String(x.id).toLowerCase()));
    includeTokens.value = includeTokens.value.filter((x) => set.has(String(x).toLowerCase()));
    excludeTokens.value = excludeTokens.value.filter((x) => set.has(String(x).toLowerCase()));
  } catch (e: any) {
    console.log('[ExternalMassMessageCard] loadAudienceLists error', e);
    notify({ title: 'Error', type: 'error', text: 'Failed to load audience lists' });
  } finally {
    loadingAudienceLists.value = false;
  }
};

const onSendMassMessage = async () => {
  if (!canWork.value) {
    notify({ title: 'Warning', type: 'error', text: 'ModelPlatform is not selected/found' });
    return;
  }

  const text = String(massMessageText.value || '').trim();
  if (!text) {
    notify({ title: 'Warning', type: 'error', text: 'Message text is required' });
    return;
  }

  sendingMassMessage.value = true;
  try {
    const payload = {
      modelPlatformId: modelPlatformId.value,
      text,
      userLists: normalizeSelectedTokens(includeTokens.value),
      excludedLists: normalizeSelectedTokens(excludeTokens.value),
      userIds: [],
      mediaIds: Array.isArray(props.mediaIds) ? (props.mediaIds as any).map((x: any) => String(x)) : [],
    };

    const res = await fetch(`${import.meta.env.VITE_APP_ROOT_API}/automate/send-mass-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    lastMassResponse.value = data;

    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

    notify({ title: 'Success', type: 'success', text: 'Mass message request sent' });
    console.log('[ExternalMassMessageCard] send-mass-message response', data);
  } catch (e: any) {
    console.log('[ExternalMassMessageCard] send-mass-message error', e);
    notify({ title: 'Error', type: 'error', text: e?.message || 'Failed to send mass message' });
  } finally {
    sendingMassMessage.value = false;
  }
};

watch(
  () => modelPlatformId.value,
  () => {
    audienceLists.value = [];
    includeTokens.value = [];
    excludeTokens.value = [];
    lastMassResponse.value = null;
    search.value = '';
  }
);
</script>

<template>
  <CardBox class="border-2 border-gray-300" rounded="rounded-md">
    <h1 class="font-bold text-xl">External API — Mass Message</h1>

    <div class="text-sm mt-2">
      <div><b>ModelPlatform:</b> {{ modelPlatformId || '-' }}</div>
      <div><b>Account (ofid_username):</b> {{ accountId || '-' }}</div>
      <div class="text-xs opacity-70" v-if="Array.isArray(mediaIds)"><b>Selected mediaIds:</b> {{ mediaIds.length }}</div>
    </div>

    <div class="mt-4 flex gap-2">
<!--      <BaseButton-->
<!--        label="Load audience lists"-->
<!--        color="info"-->
<!--        rounded-->
<!--        small-->
<!--        :disabled="loadingAudienceLists || !canWork"-->
<!--        @click="loadAudienceLists"-->
<!--      />-->

      <BaseButton
        label="Load audience lists"
        color="info"
        rounded
        small
        :disabled="loadingAudienceLists || !modelPlatformId"
        @click="loadAudienceLists"
      />
      <input class="flex-1 rounded p-2 border" v-model="search" placeholder="Search list..." />
    </div>

    <div class="mt-4">
      <label class="block text-sm">Message</label>
      <textarea class="w-full rounded mt-1 p-2" rows="5" v-model="massMessageText" placeholder="Type message text..."></textarea>
    </div>

    <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <div class="flex items-center justify-between">
          <label class="block text-sm font-semibold">Include lists (userLists)</label>
          <button class="text-xs underline" @click="clearInclude">Clear</button>
        </div>

        <div class="mt-2 flex flex-wrap gap-2" v-if="includeTokens.length">
          <span
            v-for="t in includeTokens"
            :key="'inc-chip-' + t"
            class="text-xs px-2 py-1 rounded border cursor-pointer"
            @click="removeInclude(t)"
            :title="tokenTitle(t)"
          >
            {{ tokenLabel(t) }}
            <span v-if="tokenShowIdInline(t)" class="opacity-60 ml-1">({{ t }})</span>
            ✕
          </span>
        </div>

        <div class="mt-3 max-h-64 overflow-auto border rounded p-2">
          <div v-for="l in filteredLists" :key="'inc-' + String(l.id)" class="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              :checked="isIncluded(String(l.id))"
              :disabled="isExcluded(String(l.id))"
              @change="toggleInclude(String(l.id))"
            />
            <div class="text-sm">
              <div class="font-medium">{{ l.name }}</div>
              <div class="text-xs opacity-70">{{ l.id }}</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between">
          <label class="block text-sm font-semibold">Exclude lists (excludedLists)</label>
          <button class="text-xs underline" @click="clearExclude">Clear</button>
        </div>

        <div class="mt-2 flex flex-wrap gap-2" v-if="excludeTokens.length">
          <span
            v-for="t in excludeTokens"
            :key="'exc-chip-' + t"
            class="text-xs px-2 py-1 rounded border cursor-pointer"
            @click="removeExclude(t)"
            :title="tokenTitle(t)"
          >
            {{ tokenLabel(t) }}
            <span v-if="tokenShowIdInline(t)" class="opacity-60 ml-1">({{ t }})</span>
            ✕
          </span>
        </div>

        <div class="mt-3 max-h-64 overflow-auto border rounded p-2">
          <div v-for="l in filteredLists" :key="'exc-' + String(l.id)" class="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              :checked="isExcluded(String(l.id))"
              :disabled="isIncluded(String(l.id))"
              @change="toggleExclude(String(l.id))"
            />
            <div class="text-sm">
              <div class="font-medium">{{ l.name }}</div>
              <div class="text-xs opacity-70">{{ l.id }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 text-right">
<!--      <BaseButton-->
<!--        label="Send mass message"-->
<!--        color="success"-->
<!--        rounded-->
<!--        small-->
<!--        :disabled="sendingMassMessage || !canWork"-->
<!--        @click="onSendMassMessage"-->
<!--      />-->

      <BaseButton
        label="Send mass message"
        color="success"
        rounded
        small
        :disabled="sendingMassMessage || !modelPlatformId"
        @click="onSendMassMessage"
      />
    </div>

    <div v-if="lastMassResponse" class="mt-4">
      <label class="block text-sm">Last response</label>
      <pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(lastMassResponse, null, 2) }}</pre>
    </div>
  </CardBox>
</template>
