<!-- src/views/MassView.vue -->
<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { mdiMessage } from "@mdi/js";
import { useNotification } from "@kyvg/vue3-notification";
import { ClipLoader } from "vue3-spinner";

import {
  useGroupStore,
  useModelPlatformStore,
  useModelStore,
  usePlatformStore,
  useAuthStore,
} from "@/stores";

import LayoutAuthenticated from "@/layouts/LayoutAuthenticated.vue";
import SectionMain from "@/components/SectionMain.vue";
import SectionTitleLineWithButton from "@/components/SectionTitleLineWithButton.vue";
import CardBox from "@/components/CardBox.vue";
import TabContainer from "@/components/TabContainer.vue";
import TabContent from "@/components/TabContent.vue";
import TableMessageGroup from "@/components/TableMessageGroup.vue";
import TableMessages from "@/components/TableMessages.vue";
import BaseButton from "@/components/BaseButton.vue";

//fi
import { useFileStore } from "@/stores/files.store";
import ExternalMassMessageCard from "@/components/ExternalMassMessageCard.vue";
import ExternalVaultMediaCard from "@/components/ExternalVaultMediaCard.vue";

import useVuelidate from "@vuelidate/core";
import { required, helpers } from "@vuelidate/validators";

import { useMessageStore } from "@/stores/message.store";
import CardBoxModal from "@/components/CardBoxModal.vue";
import {colorsText} from "@/colors";
import FormControl from "@/components/FormControl.vue";
import ImageVideoUpload from "@/components/ImageVideoUpload.vue";
import TimeField from "@/components/TimeField.vue";
import FormField from "@/components/FormField.vue";
import Multiselect from "@vueform/multiselect";
import '@vueform/multiselect/themes/default.css';

const fileStore = useFileStore();
const { notify } = useNotification();

const tabs = ref([
  { id: 1, title: "Groups" },
  { id: 2, title: "Mass Message List" },
]);

const spinnerColor = "#3B82F6";


const groupStore = useGroupStore();
const messageStore = useMessageStore();
const modelStore = useModelStore();
const platformStore = usePlatformStore();
const modelPlatformStore = useModelPlatformStore();
const authStore = useAuthStore();

//data for Saving
const vaultMediaIds = ref([]);
const audienceIncludeIds = ref([]); // ['recent','fans',...]
const audienceExcludeIds = ref([]); // ['following','907433881',...]

// UI state
const isGroupModalActive = ref(false);
const isMessageModalActive = ref(false);
const isModalDangerActive = ref(false);
const isGroupSelected = ref(false);
const checkedGroups = ref([]);

const selectedGroup = ref({
  name: "",
  isEdit: false,
});

const selectedMessage = ref({
  id:null,
  name: "",
  group_id: 0,
  price: 0,
  free_preview: 0,
  message: "",
  message_time: "",
  message_list: "",
  message_exclude_list: "",
  release_form_tags: '',
  release_user_tags: '',
  content_attached: false,
  content: "",
  isEdit: false,
  scheduled_date: "",
});
// --- Selected Model / Platform (как у тебя)
const selectedModel = computed(() => modelStore.selectedModel);
const selectedPlatform = computed(() => platformStore.selectedPlatform);

// --- Store lists
const groupsInStore = computed(() => groupStore.groups || []);
const isMass = (v) => v === true || v === 1 || v === "1";
const messagesInStore = computed(() => (messageStore.messages || []).filter((m) => isMass(m?.massmsg)));

// 🔹 Берём список связок из стора
const modelPlatforms = computed(() => modelPlatformStore.model_platforms || []);

// 🔹 Ищем связку model_platform по выбранной модели и платформе (как PostView)
const selectedModelPlatform = computed(() => {
  if (!selectedModel.value?.id || !selectedPlatform.value?.id) return null;

  const res =
    modelPlatforms.value.find((mp) => {
      const mpModelId = mp.model_id ?? (mp.model && mp.model.id) ?? null;

      let platformMatch = false;

      if (Array.isArray(mp.platforms) && mp.platforms.length) {
        // ВАЖНО: как в PostView — platforms: [{ id, name, ... }]
        platformMatch = mp.platforms.some((p) => p.id === selectedPlatform.value.id);
      } else {
        const mpPlatformId = mp.platform_id ?? (mp.platform && mp.platform.id) ?? null;
        platformMatch = mpPlatformId === selectedPlatform.value.id;
      }

      return mpModelId === selectedModel.value.id && platformMatch;
    }) || null;

  console.log("[MassView] selectedModel:", selectedModel.value);
  console.log("[MassView] selectedPlatform:", selectedPlatform.value);
  console.log("[MassView] modelPlatforms:", modelPlatforms.value);
  console.log("[MassView] selectedModelPlatform:", res);

  return res;
});

// всегда отдаёт объект платформы (с ofid_username, fingerprint_username, model_platform_id и т.п.)
const selectedPlatformConfig = computed(() => {
  const modelId = selectedModel.value?.id;
  const platformId = selectedPlatform.value?.id;
  const list = modelPlatforms.value || [];

  if (!modelId || !platformId) return null;

  // CASE A: grouped shape: [{ model_id, platforms: [...] }]
  const grouped = list.find((x) => x && Number(x.model_id) === Number(modelId) && Array.isArray(x.platforms));
  if (grouped) {
    const p = grouped.platforms.find((p) => Number(p.id) === Number(platformId));
    if (!p) return null;

    // в grouped-ответе бекенда model_platform_id лежит в p.model_platform_id
    return {
      ...p,
      model_id: modelId,
      platform_id: platformId,
      model_platform_id: p.model_platform_id ?? null,
    };
  }

  // CASE B: flat entity shape: [{ id, model_id, platform_id, ofid_username, ... }]
  const flat = list.find(
    (x) =>
      x &&
      Number(x.model_id) === Number(modelId) &&
      Number(x.platform_id) === Number(platformId)
  );

  if (flat) {
    return {
      ...flat,
      model_platform_id: flat.id ?? null,
    };
  }

  return null;
});

// то, что реально нужно как ID
const selectedModelPlatformId = computed(() => selectedPlatformConfig.value?.model_platform_id ?? null);

// console.log(" selectedPlatformConfig --", selectedPlatformConfig.value);

// --- Data loading
const isFetching = ref(false);

const fetchData = async () => {
  if (isFetching.value) return;
  isFetching.value = true;
  try {
    //messageStore.messages = []; // <-- важно

    if (!selectedModel.value?.id || !selectedPlatform.value?.id) {
      console.log(
        "[MassView:fetchData] no selected model/platform yet:",
        selectedModel.value,
        selectedPlatform.value
      );
      return;
    }

    const params = {
      model_id: selectedModel.value.id,
      platform_id: selectedPlatform.value.id,
    };

    await authStore.getMyProfile();

    // группы/сообщения — как MessageView
    await groupStore.getAllGroups( { ...params, massmsg: 1});

    if (!Array.isArray(modelPlatformStore.model_platforms) || modelPlatformStore.model_platforms.length === 0) {
      await modelPlatformStore.getAllModelPlatforms();
    }

    console.log("[MassView] selectedModelPlatformId:", selectedModelPlatformId.value);
  } finally {
    isFetching.value = false;
  }
};

// --- Group view
const onViewGroup = (id) => {
  selectedGroup.value = (groupStore.groups || []).filter((it) => it.id === id)[0];
  messageStore.getMessagesByGroup(id, { massmsg : true });
  isGroupSelected.value = true;
};

const onCancelAddMessage = () => {
  selectedGroup.value = { name: "" };
  isGroupSelected.value = false;
};

const onClickMessageList = async (tabNumber) => {
  if (tabNumber === 2 && selectedModel.value) {
    if (selectedModel.value) {
      messageStore.messages = []; // <-- важно
      messageStore.getMessagesByModel(selectedModel.value.id, undefined, { massmsg: true });
    }
  }
  checkedGroups.value = [];
};

// --- Lifecycle
onMounted(async () => {
  if (!selectedModel.value || !selectedPlatform.value) {
    notify({
      title: "Warning",
      type: "error",
      text: "Please select Model and Platform",
    });
    return;
  }

  await fetchData();
});

// ---- Options (как в доноре MessageView.vue)
const messageNameOptions = [
  'SFS',
  'Videos',
  'Games',
  'Custom',
  'Services',
  'Captions',
  'Exclusive',
  'Video Chat',
  'ReSubscribe'
];

const messageListOptions = [
  "All",
  "Expired",
  "Current",
  "Past",
  "Never",
  "Cancelled",
];

const messageEcludeOptions = [
  "None",
  "Inactive",
  "Active",
];

const freePreviewOptions = [
  { value: 0, label: "No" },
  { value: 1, label: "Yes" },
];

// ---- isRealMessageId (нужно для ImageVideoUpload v-if)
const isRealMessageId = computed(() => !!selectedMessage.value?.id);

// ---- Vuelidate rules (минимально, как у донора)
const gRules = computed(() => ({
  name: {
    required: helpers.withMessage("Group Name field is required", required),
    $autoDirty: true,
  },
}));

const mRules = computed(() => ({
  group_id: {
    required: helpers.withMessage("Group Name field is required", required),
    $autoDirty: true,
  },
  name: {
    required: helpers.withMessage("Message Name field is required", required),
    $autoDirty: true,
  },
  message: {
    required: helpers.withMessage("Message field is required", required),
    $autoDirty: true,
  },
  message_time: {
    required: helpers.withMessage("Message time field is required", required),
    $autoDirty: true,
  },
  // message_list: {
  //   required: helpers.withMessage("Message list field is required", required),
  //   $autoDirty: true,
  // },
}));

// Важно: шаблон использует $mv напрямую — Vue сам развернет ref
const $gv = useVuelidate(gRules, selectedGroup);
const $mv = useVuelidate(mRules, selectedMessage);

// ---- Delete modal plumbing (чтобы confirmDelete не был undefined)
const deleteId = ref(null);
const deleteCallback = ref(null);




///area for edits or delete group
const onClickEditGroup = (id) => {
  const group = (groupStore.groups || []).filter((it) => it.id === id);

  if (!group || group.length === 0) return;

  selectedGroup.value = { ...group[0], isEdit: true };
  isGroupModalActive.value = true;
};

const onDeleteGroup = async (id) =>
{
  isModalDangerActive.value = true;
  deleteId.value = id;
  deleteCallback.value = confirmDeleteGroup;
};

const confirmDeleteGroup = async () =>
{
  const del_result = await groupStore.deleteGroup(deleteId.value);
  if (del_result)
  {
    notify({
      title: "Success",
      type: "success",
      text: "Group deleted successfully",
    });
    $gv.value.$reset();
    isModalDangerActive.value = false;
  }
};


const onClickEditMessage = (id) => {
  const [row] = messagesInStore.value.filter((it) => it.id === id);
  if (!row) return;

  selectedMessage.value = {
    ...selectedMessage.value,
    ...row,

    //normalizing нормализации ниже должны быть ПОСЛЕ ...row, чтобы перезаписать сырые значения
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    group_id: Number(row.group_id ?? selectedGroup.value?.id ?? 0),
    price: Number(row.price ?? 0),
    free_preview: Number(row.free_preview ?? 0),
    message_time: String(row.message_time ?? ''),
    message_list: Array.isArray(row.message_list) ? (row.message_list[0] ?? '') : String(row.message_list ?? ''),
    message_exclude_list: Array.isArray(row.message_exclude_list) ? (row.message_exclude_list[0] ?? '') : String(row.message_exclude_list ?? ''),
    release_form_tags: String(row.release_form_tags ?? ''),
    release_user_tags: String(row.release_user_tags ?? ''),
    content_attached: !!row.content_attached,
    content: String(row.content ?? ''),

    // Important ВАЖНО: isEdit в конце, чтобы никто его не перетёр
    isEdit: true,
  };
  // Превью файлов
  if (typeof selectedMessage.value.content === 'string' && selectedMessage.value.content.length > 0) {
    fileStore.setFiles(selectedMessage.value.content.split(','));
  }

  // 👇 подтянуть массивы и дату/время из БД в refs (vaultMediaIds/audience*)
  hydrateMassRefsFromMessage(row);

  isMessageModalActive.value = true;
};

const openMessageAsCopy = (row, opts = { withMedia: true }) => {
  if (!row) return;

  selectedMessage.value = {
    ...selectedMessage.value,
    ...row,

    // копия: НОВОЕ сообщение
    id: null,
    isEdit: false,

    // нормализация после ...row
    name: String(row.name ?? ''),
    group_id: Number(row.group_id ?? selectedGroup.value?.id ?? 0),
    price: Number(row.price ?? 0),
    free_preview: Number(row.free_preview ?? 0),
    message_time: String(row.message_time ?? ''),
    message_list: Array.isArray(row.message_list) ? (row.message_list[0] ?? '') : String(row.message_list ?? ''),
    message_exclude_list: Array.isArray(row.message_exclude_list) ? (row.message_exclude_list[0] ?? '') : String(row.message_exclude_list ?? ''),
    release_form_tags: String(row.release_form_tags ?? ''),
    release_user_tags: String(row.release_user_tags ?? ''),
    content_attached: !!row.content_attached,
    content: String(row.content ?? '')
  };

  // контент-файлы (локально) можно оставить как есть
  if (typeof selectedMessage.value.content === 'string' && selectedMessage.value.content.length > 0) {
    fileStore.setFiles(selectedMessage.value.content.split(','));
  } else {
    fileStore.setEmpty();
  }

  // подтягиваем аудитории/дату/время/вулт
  hydrateMassRefsFromMessage(row);

  // copy-without-media -> чистим vaultMediaIds
  if (!opts.withMedia) {
    vaultMediaIds.value = [];

    // чтобы не ловить 400 на бэке:
    selectedMessage.value.price = 0;
    selectedMessage.value.free_preview = 0; // опционально
  }

  isMessageModalActive.value = true;

};

const onCopyFull = (id) => {
  const [row] = messagesInStore.value.filter((it) => it.id === id);
  if(!row) return
  openMessageAsCopy(row, { withMedia : true});
}

const onCopyWithoutMedia = (id) => {
  const [row] = messagesInStore.value.filter((it) => it.id === id);
  if(!row) return
  openMessageAsCopy(row, { withMedia : false});
}

const onDeleteMessage = async (id) =>
{
  isModalDangerActive.value = true;
  deleteId.value = id;
  deleteCallback.value = confirmDeleteMessage;
};
const confirmDeleteMessage = async () =>
{
  const del_result = await messageStore.deleteMessage(deleteId.value);
  if (del_result)
  {
    notify({
      title: "Success",
      type: "success",
      text: "Message deleted successfully",
    });
    $mv.value.$reset();
    isModalDangerActive.value = false;
  }
};

const onCheckGroups = (ids) =>
{
  checkedGroups.value = ids;
};

//add message

const onAddNewMessage = () =>
{
  vaultMediaIds.value = [];
  audienceIncludeIds.value = [];
  audienceExcludeIds.value = [];

  selectedMessage.value = {
    massmsg: true,
    isEdit: false,
    id: null,
    name: "",
    group_id: selectedGroup.value?.id || 0,
    price: 0,
    free_preview: 0,
    message: "",
    message_time: "",
    message_list: "",
    message_exclude_list: "",
    release_form_tags: "",
    release_user_tags: "",
    content_attached: false,
    content: "",
    scheduled_date: "",
  };
  fileStore.setEmpty();
  $gv.value.$reset();
  $mv.value.$reset();
  isMessageModalActive.value = true;
};

// ---- Handlers, которые уже дергаются из template
const onAddNewGroup = () => {
  console.log('[MassView] Add Group clicked');
  isGroupModalActive.value = true;
  selectedGroup.value = {
    isEdit: false,
    name: "",
  };

  if ($gv?.value?.$reset) $gv.value.$reset();
  isGroupModalActive.value = true; // у тебя модалки группы сейчас нет в template, но warning уйдет
};

const onSubmitGroup = async () => {
  const res = await $gv.value.$validate();
  if (!res) return;

  if (!selectedModel.value?.id || !selectedPlatform.value?.id) {
    notify({ title: "Warning", type: "error", text: "Please select Model and Platform" });
    return;
  }

  try {
    if (selectedGroup.value.isEdit) {
      const ok = await groupStore.updateGroup({ ...selectedGroup.value, massmsg: 1 });
      if (ok) {
        notify({ title: "Success", type: "success", text: "Group updated successfully" });
        $gv.value.$reset();
      }
    } else {
      const ok = await groupStore.addGroup({
        ...selectedGroup.value,
        model_id: selectedModel.value.id,
        platform_id: selectedPlatform.value.id,
        massmsg: 1
      });

      if (ok) {
        notify({ title: "Success", type: "success", text: "Group added successfully" });
        $gv.value.$reset();
      }
    }

    isGroupModalActive.value = false;
    await fetchData(); // чтобы перечитать группы
  } catch (e) {
    console.error("[MassView] onSubmitGroup error:", e);
    notify({ title: "Error", type: "error", text: "Failed to save group" });
  }
};

const parseArrayField = (v) => {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);

  const s = String(v ?? '').trim();
  if (!s) return [];

  // try JSON: '["recent","fans"]'
  try {
    const j = JSON.parse(s);
    if (Array.isArray(j)) return j.map(String).map(x => x.trim()).filter(Boolean);
  } catch (_) {}

  // fallback: 'recent,fans'
  return s.split(',').map(x => x.trim()).filter(Boolean);
};

const normalizeHHMM = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return '';
  // '08:00:00' -> '08:00'
  const m = s.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : s;
};

const toLocalYYYYMMDD = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const hydrateMassRefsFromMessage = (msg) => {
  vaultMediaIds.value = parseArrayField(msg?.vault_media_ids);
  audienceIncludeIds.value = parseArrayField(msg?.audience_include_ids);
  audienceExcludeIds.value = parseArrayField(msg?.audience_exclude_ids);

  // если scheduled_date хранится Date/timestamptz — для input[type=date] нужен YYYY-MM-DD
  if (msg?.scheduled_date) {

    selectedMessage.value.scheduled_date = toLocalYYYYMMDD(msg.scheduled_date);
  }

  // если message_time в БД '08:00:00'
  if (msg?.message_time) {
    selectedMessage.value.message_time = normalizeHHMM(msg.message_time);
  }

  // если в БД user_ids_array jsonb, а в UI ты редактируешь release_form_tags (csv)
  if (!selectedMessage.value.release_form_tags) {
    const ids = parseArrayField(msg?.user_ids_array);
    if (ids.length) selectedMessage.value.release_form_tags = ids.join(',');
  }
};

// onFinalSubmitMessage in MassView.vue
async function onFinalSubmitMessage() {
  console.log('[MassView] submit clicked, selectedMessage =', selectedMessage.value);

  const ok = await $mv.value.$validate();
  console.log('[MassView] validate ok =', ok, 'errors =', $mv.value.$errors);
  if (!ok) return;

  try {
    const payload = { ...selectedMessage.value };
    payload.massmsg = true;

    // ---- HARD RULE: EDIT ONLY BY id ----
    const idNum = Number(payload.id || 0);
    const isEdit = Number.isFinite(idNum) && idNum > 0;

    console.log('[MassView] isEdit(by id)=', isEdit, 'payload.id=', payload.id, 'payload.isEdit=', payload.isEdit);

    if (isEdit) {
      payload.id = idNum;          // гарантируем number
    } else {
      delete payload.id;           // только для create
    }

    delete payload.isEdit;         // UI-флаг не нужен бэку

    // эти поля должны быть пустыми — оставляем пустыми строками
    payload.message_list = payload.message_list ?? '';
    payload.message_exclude_list = payload.message_exclude_list ?? '';

    payload.vault_media_ids = (vaultMediaIds.value || []).map(String);
    payload.audience_include_ids = (audienceIncludeIds.value || []).map(String);
    payload.audience_exclude_ids = (audienceExcludeIds.value || []).map(String);

    const parseCsv = (s) =>
      String(s ?? '')
        .split(',')
        .map(x => x.trim())
        .filter(Boolean);

    payload.user_ids_array = parseCsv(selectedMessage.value.release_form_tags);

    const day = String(payload.scheduled_date || '').trim();   // 'YYYY-MM-DD'
    const time = String(payload.message_time || '').trim();    // 'HH:MM'

    if (day && time) payload.scheduled_date = new Date(`${day}T${time}:00`);
    else payload.scheduled_date = undefined;

    payload.message_time =
      (typeof payload.message_time === "string"
          ? payload.message_time
          : payload.message_time?.value || ""
      )
        .split(":")
        .slice(0, 2)
        .join(":");

    // group_id берём из payload (селект в модалке должен менять payload.group_id)
    payload.group_id = Number(payload.group_id || 0);

    const saved = isEdit
      ? await messageStore.updateMessage(payload)
      : await messageStore.addMessage(payload);

    if (saved) {
      notify({
        title: "Success",
        type: "success",
        text: isEdit ? "Message updated successfully" : "Message added successfully",
      });

      $mv.value.$reset();

      if (isGroupSelected.value && selectedGroup.value?.id) {
        await messageStore.getMessagesByGroup(selectedGroup.value.id, { massmsg: true });
      } else if (selectedModel.value?.id) {
        await messageStore.getMessagesByModel(selectedModel.value.id, undefined, { massmsg: true });
      }
    }

    isMessageModalActive.value = false;
  } catch (error) {
    console.error("[MassView] onFinalSubmitMessage error:", error);
    notify({ title: "Error", type: "error", text: "Failed to save message" });
  }
}

const confirmDelete = async () => {
  if (typeof deleteCallback.value === "function") {
    await deleteCallback.value();
  } else {
    console.log("No delete function assigned yet");
    isModalDangerActive.value = false;
  }
};

watch(
  [() => selectedModel.value?.id, () => selectedPlatform.value?.id],
  async ([modelId, platformId], [prevModelId, prevPlatformId]) => {
    vaultMediaIds.value = [];
    audienceIncludeIds.value = [];
    audienceExcludeIds.value = [];
    console.log('[MassView] vaultMediaIds reset (modelPlatform changed)');
    console.log("[MassView:watch] model/platform changed:", {
      prevModelId,
      prevPlatformId,
      modelId,
      platformId,
    });

    if (!modelId || !platformId) return;
    if (modelId === prevModelId && platformId === prevPlatformId) return;

    await fetchData();
  },
  { immediate: true }
);
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiMessage" title="Mass" main>
        <!-- можно добавить твои кнопки, если надо -->
      </SectionTitleLineWithButton>

      <!-- Debug / State box -->
      <CardBox class="mb-6">
        <div class="text-sm">
          <div>Selected model: <b>{{ selectedModel?.name || "—" }}</b></div>
          <div>Selected platform: <b>{{ selectedPlatform?.name || "—" }}</b></div>
          <div>modelPlatformId: <b>{{ selectedModelPlatformId || "—" }}</b></div>
          <div>
            Account(ofid_username):
            <b>{{ selectedPlatformConfig?.ofid_username || "—" }}</b>
          </div>
        </div>
      </CardBox>

<!--      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">-->
        <!-- LEFT: Groups/Messages (как в MessageView) -->
        <CardBox class="mb-6 relative">
          <TabContainer :tabs="tabs" @click-tab="onClickMessageList">
            <template #default="{ openTab }">
              <TabContent :show="openTab === 1">
                <div v-if="!isGroupSelected">
                  <h1 class="font-bold text-xl">Groups</h1>

                  <TableMessageGroup
                    :groups="groupStore.groups"
                    @view-row="onViewGroup"
                    @click-row="onClickEditGroup"
                    @delete-row="onDeleteGroup"
                    @check-rows="onCheckGroups"
                    :checkable="true"
                  />

                  <div class="w-full text-right">
                    <!-- здесь можно добавить Add Group, если надо -->
                    <BaseButton label="Add Group" color="info" rounded small @click="onAddNewGroup" />

                  </div>
                </div>

                <div v-else>
                  <h2>
                    GroupID <span>{{ selectedGroup.id }}</span>
                  </h2>

                  <div>
                    <h1 class="font-bold text-xl">{{ selectedGroup.name }}</h1>
                  </div>

                  <TableMessages
                    :key="`msg-group-${selectedGroup?.id || 0}`"
                    :messages="messagesInStore"
                    :showGroup="false"
                    @click-row="onClickEditMessage"
                    @copy-full="onCopyFull"
                    @copy-no-media="onCopyWithoutMedia"
                    @delete-row="onDeleteMessage"
                  />

                  <div class="w-full flex justify-between">
                    <BaseButton label="Back" color="contrast" rounded small @click="onCancelAddMessage" />
                    <!-- здесь можно добавить Add Message -->
                    <BaseButton label="Add Message" color="info" rounded small @click="onAddNewMessage" />
                  </div>
                </div>
              </TabContent>

              <TabContent :show="openTab === 2">
                <div>
                  <h1 class="font-bold text-xl">Mass-Message List</h1>
                  <TableMessages
                    :key="`msg-model-${selectedModel?.id || 0}-tab-${openTab}`"
                    :messages="messagesInStore"
                    @click-row="onClickEditMessage"
                    @copy-full="onCopyFull"
                    @copy-no-media="onCopyWithoutMedia"
                    @delete-row="onDeleteMessage" />
                </div>
              </TabContent>
            </template>
          </TabContainer>

          <ClipLoader
            class="absolute top-0 left-0 w-full h-full flex justify-center items-center"
            :color="spinnerColor"
            v-if="groupStore.isLoading || messageStore.isLoading"
          />
        </CardBox>
      <CardBoxModal v-model="isMessageModalActive" title="Message"
                    size="xxl:!w-11/12 xl:!w-11/12 md:w-4/5 lg:w-4/5 w-4/5"
                    :buttonLabel="selectedMessage.isEdit ? 'Update' : 'Save'" :hasCancel="true" @confirm="onFinalSubmitMessage">

<!--        Need to update this-->
        <CardBox is-form>
          <div class="flex flex-col">
            <div class="flex gap-5 flex-wrap md:flex-row flex-col">
              <div class="flex flex-1 flex-col">
                <div class="flex gap-5 md:flex-row flex-col">
                  <div class="flex-1">
                    <FormField label="Group" help="Required. Group name">
                      <FormControl v-model="selectedMessage.group_id" name="group_id" required autocomplete="group_id"
                                   :options="groupStore.groups.map(it => ({ id: it.id, label: it.name }))"
                                   placeholder="Select a Group" />
                    </FormField>
                    <div class="mb-3" v-for="error of $mv.group_id.$errors " :key="error.$uid">
                      <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
                    </div>
                  </div>
                  <div class="flex-1">
                    <FormField label="Message Name" help="Required. Message name">
                      <Multiselect
                        v-model="selectedMessage.name"
                        :options="messageNameOptions"
                        :can-clear="true"
                        :searchable="true"
                        placeholder="Input Message Name"
                      />
                      <!--                      <FormControl v-model="selectedMessage.name" name="name" required autocomplete="name"-->
                      <!--                        placeholder="Input Message Name" />-->
                    </FormField>
                    <div class="mb-3" v-for="error of $mv.name.$errors " :key="error.$uid">
                      <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <FormField label="Message" help="Required. Message">
                    <FormControl v-model="selectedMessage.message" name="message" required autocomplete="message"
                                 type="textarea" placeholder="This message will be posted on Platform" />
                  </FormField>
                  <div class="mb-3" v-for="error of $mv.message.$errors " :key="error.$uid">
                    <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
                  </div>
                </div>
              </div>
              <div class="flex flex-1 flex-col">
                <div class="flex gap-5 md:flex-row flex-col">
                  <div class="flex-1">
                    <FormField help="Required. Message Time">
                      <TimeField
                        v-model="selectedMessage.message_time"
                        label="Message Time"
                        :presets="['08:00','10:00','12:00','14:00','16:00','18:00']"
                      />
                    </FormField>
                    <FormField label="Scheduled Date" help="Required. Day for sending">
                      <FormControl v-model="selectedMessage.scheduled_date" name="scheduled_date" type="date" />
                    </FormField>
                    <div class="mb-3" v-for="error of $mv.message_time.$errors " :key="error.$uid">
                      <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
                    </div>
                  </div>
                </div>

                <ExternalVaultMediaCard
                  :modelPlatform="selectedPlatformConfig"
                  :notify="notify"
                  v-model:mediaIds="vaultMediaIds"
                />
                <div class="flex gap-5 md:flex-row flex-col">
                  <ExternalMassMessageCard :modelPlatform="selectedPlatformConfig" :notify="notify" :mediaIds="vaultMediaIds"
                                           v-model:audienceIncludeIds="audienceIncludeIds"
                                           v-model:audienceExcludeIds="audienceExcludeIds"
                  />
                </div>
                <div class="flex gap-5 md:flex-row flex-col">

                  <div class="flex-1">
                    <FormField label="user_ids_array = Release Form Tags" help=" Release Form Tags">
                      <FormControl v-model="selectedMessage.release_form_tags" name="release_form_tags"
                                   autocomplete="release_form_tags" placeholder="(separate with commas)" />
                    </FormField>
                  </div>
                  <div class="flex-1">
                    <FormField label="Price">
                      <FormControl v-model="selectedMessage.price" name="price" type="number" autocomplete="price" />
                    </FormField>

                  </div>

                </div>
                <div class="flex gap-5 md:flex-row flex-col">
                  <div class="flex-1">
                    <FormField label="Free Preview">
                      <select
                        v-model="selectedMessage.free_preview"
                        class="w-full rounded border px-2 py-1"
                      >
                        <option v-for="option in freePreviewOptions" :key="option.value" :value="option.value">
                          {{ option.label }}
                        </option>
                      </select>

                    </FormField>

                  </div>
                  <div class="flex-1"></div>
                </div>

              </div>
            </div>
            <div class="flex flex-col mt-5">
              <div class="flex flex-wrap">
                <ImageVideoUpload
                  v-if="selectedModel?.name && selectedGroup?.id && isRealMessageId"
                  :message-id="String(selectedMessage.id)"
                  :group-id="String(selectedGroup.id)"
                  :model-name="selectedModel.name"
                  :info="{ entity: 'messages' }"
                />
                <!--                <ImageVideoUpload :id="selectedMessage.id" />-->
              </div>
            </div>
          </div>
        </CardBox>

        <ClipLoader class="absolute w-full h-full top-0 left-0 flex justify-center items-center" :color="spinnerColor"
                    v-if="messageStore.isLoading" />
      </CardBoxModal>
      <CardBoxModal v-model="isModalDangerActive" title="Please confirm" button="danger" button-label="Delete"
                    :has-cancel="true" @confirm="confirmDelete">
        <p>Are you sure you want to delete? </p>
      </CardBoxModal>

      <CardBoxModal
        v-model="isGroupModalActive"
        title="Group"
        :buttonLabel="selectedGroup.isEdit ? 'Update' : 'Save'"
        :hasCancel="true"
        @confirm="onSubmitGroup"
      >
        <CardBox is-form>
          <FormField label="Group Name" help="Required. Group name">
            <FormControl
              v-model="selectedGroup.name"
              name="name"
              required
              autocomplete="name"
              placeholder="Input Group Name"
            />
          </FormField>

          <div class="mb-3" v-for="error of $gv.name.$errors" :key="error.$uid">
            <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
          </div>
        </CardBox>

        <ClipLoader
          class="absolute w-full h-full top-0 left-0 flex justify-center items-center"
          :color="spinnerColor"
          v-if="groupStore.isLoading"
        />
      </CardBoxModal>
    </SectionMain>
  </LayoutAuthenticated>
</template>
