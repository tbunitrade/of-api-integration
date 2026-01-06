<script setup>
import { ref, computed, watch } from 'vue';
// import { useNotification } from '@kyvg/vue3-notification';

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

const audienceLists = ref([]); // [{id,name,type?}]
const selectedUserLists = ref([]); // array of ids (strings)
const selectedExcludedLists = ref([]); // array of ids (strings)
const massMessageText = ref('');

const loadingAudienceLists = ref(false);
const sendingMassMessage = ref(false);
const lastMassResponse = ref(null);

const mp = computed(() => (Array.isArray(props.modelPlatform) ? (props.modelPlatform[0] || null) : props.modelPlatform));

const accountId = computed(() => String(mp.value?.ofid_username || '').trim());
const modelPlatformId = computed(() => Number(mp.value?.id || 0));

// const accountId = computed(() => String(props.modelPlatform?.ofid_username || '').trim());
// const modelPlatformId = computed(() => Number(props.modelPlatform?.id || 0));

const normalizeProviderLists = (data) => {
  const listsRaw = Array.isArray(data) ? data : (data?.lists || []);
  if (!Array.isArray(listsRaw)) return [];

  // backward compatible: ["fans","following"]
  if (listsRaw.length && (typeof listsRaw[0] === 'string' || typeof listsRaw[0] === 'number')) {
    return listsRaw.map((x) => ({ id: String(x), name: String(x) }));
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

const buildKeySet = (lists) => {
  const set = new Set();
  for (const l of lists) {
    set.add(String(l.id).toLowerCase());
    if (l.name) set.add(String(l.name).toLowerCase());
    if (l.type) set.add(String(l.type).toLowerCase());
  }
  return set;
};

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

    // фильтруем выбранное, чтобы не держать "мертвые" значения
    const set = buildKeySet(lists);
    selectedUserLists.value = selectedUserLists.value.filter((x) => set.has(String(x).toLowerCase()));
    selectedExcludedLists.value = selectedExcludedLists.value.filter((x) => set.has(String(x).toLowerCase()));
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
      // userLists: selectedUserLists.value,       // ids: ["fans", "1224..."]
      // excludedLists: selectedExcludedLists.value,
      userLists: normalizeSelectedTokens(selectedUserLists.value),
      excludedLists: normalizeSelectedTokens(selectedExcludedLists.value),
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

const normalizeSelectedTokens = (arr) => {
  const a = Array.isArray(arr) ? arr : [];
  const out = a
    .map((x) => {
      if (x == null) return '';
      if (typeof x === 'string' || typeof x === 'number') return String(x).trim();
      // если вдруг объект
      return String(x?.id ?? x?.value ?? x?.key ?? '').trim();
    })
    .filter(Boolean);

  // uniq case-insensitive
  const seen = new Set();
  return out.filter((t) => {
    const k = t.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// если поменялась связка (модель/платформа) — сбросим списки
watch(
  () => modelPlatformId.value,
  () => {
    audienceLists.value = [];
    selectedUserLists.value = [];
    selectedExcludedLists.value = [];
    lastMassResponse.value = null;
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

    <div class="mt-4">
      <BaseButton
        label="Load audience lists"
        color="info"
        rounded
        small
        :disabled="loadingAudienceLists"
        @click="loadAudienceLists"
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

    <div class="mt-4">
      <label class="block text-sm">Include lists (userLists)</label>
      <select class="w-full rounded mt-1 p-2" multiple size="8" v-model="selectedUserLists">
        <option
          v-for="l in audienceLists"
          :key="'ul-' + String(l.id)"
          :value="String(l.id)"
        >
          {{ l.name }} ({{ l.id }})
        </option>
      </select>
    </div>

    <div class="mt-4">
      <label class="block text-sm">Exclude lists (excludedLists)</label>
      <select class="w-full rounded mt-1 p-2" multiple size="8" v-model="selectedExcludedLists">
        <option
          v-for="l in audienceLists"
          :key="'el-' + String(l.id)"
          :value="String(l.id)"
        >
          {{ l.name }} ({{ l.id }})
        </option>
      </select>
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
