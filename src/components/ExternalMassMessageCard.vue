<script setup>
import { ref, computed, watch } from 'vue';

import CardBox from '@/components/CardBox.vue';
import BaseButton from '@/components/BaseButton.vue';

const props = defineProps({
  modelPlatform: { type: [Object, Array], required: false, default: null },
  notify: { type: Function, required: false, default: null },
});

const notify = (payload) => {
  if (typeof props.notify === 'function') return props.notify(payload);
  console.log('[ExternalMassMessageCard notify]', payload);
};

const mp = computed(() =>
  Array.isArray(props.modelPlatform) ? (props.modelPlatform[0] || null) : props.modelPlatform
);

const modelPlatformId = computed(() => Number(mp.value?.id || 0));
const accountId = computed(() => String(mp.value?.ofid_username || '').trim());

const audienceLists = ref([]); // [{id,name,type?}]
const massMessageText = ref('');

const includeTokens = ref([]); // string[]
const excludeTokens = ref([]); // string[]

const search = ref('');

const loadingAudienceLists = ref(false);
const sendingMassMessage = ref(false);
const lastMassResponse = ref(null);

const normalizeProviderLists = (data) => {
  const listsRaw = Array.isArray(data) ? data : (data?.lists || []);
  if (!Array.isArray(listsRaw)) return [];

  // backward compatible: ["fans","following"] or [123,"fans"]
  if (listsRaw.length && (typeof listsRaw[0] === 'string' || typeof listsRaw[0] === 'number')) {
    return listsRaw.map((x) => ({ id: String(x).trim(), name: String(x).trim() }));
  }

  // objects
  return listsRaw
    .map((x) => ({
      id: x?.id ?? x?.key ?? x?.type ?? x?.slug ?? x?.name,
      name: String(x?.name ?? x?.title ?? x?.label ?? x?.id ?? '').trim(),
      type: x?.type,
    }))
    .filter((x) => x.id != null && x.name);
};

const normalizeSelectedTokens = (arr) => {
  const a = Array.isArray(arr) ? arr : [];
  const out = a
    .map((x) => {
      if (x == null) return '';
      if (typeof x === 'string' || typeof x === 'number') return String(x).trim();
      return String(x?.id ?? x?.value ?? x?.key ?? '').trim();
    })
    .filter(Boolean);

  const seen = new Set();
  return out.filter((t) => {
    const k = t.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const filteredLists = computed(() => {
  const q = String(search.value || '').trim().toLowerCase();
  if (!q) return audienceLists.value;

  return audienceLists.value.filter((l) => {
    const n = String(l.name || '').toLowerCase();
    const id = String(l.id || '').toLowerCase();
    return n.includes(q) || id.includes(q);
  });
});

const isIncluded = (token) => includeTokens.value.includes(token);
const isExcluded = (token) => excludeTokens.value.includes(token);

const toggleInclude = (token) => {
  token = String(token);
  // remove from exclude if exists
  excludeTokens.value = excludeTokens.value.filter((t) => t !== token);

  if (includeTokens.value.includes(token)) {
    includeTokens.value = includeTokens.value.filter((t) => t !== token);
  } else {
    includeTokens.value = normalizeSelectedTokens([...includeTokens.value, token]);
  }
};

const toggleExclude = (token) => {
  token = String(token);
  // remove from include if exists
  includeTokens.value = includeTokens.value.filter((t) => t !== token);

  if (excludeTokens.value.includes(token)) {
    excludeTokens.value = excludeTokens.value.filter((t) => t !== token);
  } else {
    excludeTokens.value = normalizeSelectedTokens([...excludeTokens.value, token]);
  }
};

const removeInclude = (token) => {
  includeTokens.value = includeTokens.value.filter((t) => t !== token);
};
const removeExclude = (token) => {
  excludeTokens.value = excludeTokens.value.filter((t) => t !== token);
};

const clearInclude = () => (includeTokens.value = []);
const clearExclude = () => (excludeTokens.value = []);

const loadAudienceLists = async () => {
  if (!modelPlatformId.value) {
    notify({ title: 'Warning', type: 'error', text: 'ModelPlatform is not selected/found' });
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

    // purge invalid selections
    const set = new Set(lists.map((x) => String(x.id).toLowerCase()));
    includeTokens.value = includeTokens.value.filter((x) => set.has(String(x).toLowerCase()));
    excludeTokens.value = excludeTokens.value.filter((x) => set.has(String(x).toLowerCase()));
  } catch (e) {
    console.log('[ExternalMassMessageCard] loadAudienceLists error', e);
    notify({ title: 'Error', type: 'error', text: 'Failed to load audience lists' });
  } finally {
    loadingAudienceLists.value = false;
  }
};

const onSendMassMessage = async () => {
  if (!modelPlatformId.value) {
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
  } catch (e) {
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
    </div>

    <div class="mt-4 flex gap-2">
      <BaseButton
        label="Load audience lists"
        color="info"
        rounded
        small
        :disabled="loadingAudienceLists"
        @click="loadAudienceLists"
      />
      <input
        class="flex-1 rounded p-2 border"
        v-model="search"
        placeholder="Search list..."
      />
    </div>

    <div class="mt-4">
      <label class="block text-sm">Message</label>
      <textarea
        class="w-full rounded mt-1 p-2"
        rows="5"
        v-model="massMessageText"
        placeholder="Type message text..."
      ></textarea>
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
            title="Click to remove"
          >
            {{ t }} ✕
          </span>
        </div>

        <div class="mt-3 max-h-64 overflow-auto border rounded p-2">
          <div
            v-for="l in filteredLists"
            :key="'inc-' + String(l.id)"
            class="flex items-center gap-2 py-1"
          >
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
            title="Click to remove"
          >
            {{ t }} ✕
          </span>
        </div>

        <div class="mt-3 max-h-64 overflow-auto border rounded p-2">
          <div
            v-for="l in filteredLists"
            :key="'exc-' + String(l.id)"
            class="flex items-center gap-2 py-1"
          >
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
      <BaseButton
        label="Send mass message"
        color="success"
        rounded
        small
        :disabled="sendingMassMessage"
        @click="onSendMassMessage"
      />
    </div>

    <div v-if="lastMassResponse" class="mt-4">
      <label class="block text-sm">Last response</label>
      <pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(lastMassResponse, null, 2) }}</pre>
    </div>
  </CardBox>
</template>
