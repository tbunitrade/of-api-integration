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

const { notify } = useNotification();

const tabs = ref([
  { id: 1, title: "Groups" },
  { id: 2, title: "Message List" },
]);

const spinnerColor = "#3B82F6";


const groupStore = useGroupStore();
const messageStore = useMessageStore();
const modelStore = useModelStore();
const platformStore = usePlatformStore();
const modelPlatformStore = useModelPlatformStore();
const authStore = useAuthStore();

const vaultMediaIds = ref([]);

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
});
// --- Selected Model / Platform (как у тебя)
const selectedModel = computed(() => modelStore.selectedModel);
const selectedPlatform = computed(() => platformStore.selectedPlatform);

// --- Store lists
const groupsInStore = computed(() => groupStore.groups || []);
const messagesInStore = computed(() => messageStore.messages || []);

// --- Берём список связок из стора
const modelPlatforms = computed(() => modelPlatformStore.model_platforms || []);

// --- Ищем связку model_platform по выбранной модели и платформе (копия логики из PostView)
const selectedModelPlatform = computed(() => {
  if (!selectedModel.value?.id || !selectedPlatform.value?.id) return null;

  const res =
    modelPlatforms.value.find((mp) => {
      const mpModelId = mp.model_id ?? (mp.model && mp.model.id) ?? null;

      let platformMatch = false;

      if (Array.isArray(mp.platforms) && mp.platforms.length) {
        platformMatch = mp.platforms.some((p) => {
          const pId =
            p.platform_id ??
            (p.platform && p.platform.id) ??
            p.id ??
            null;

          return pId === selectedPlatform.value.id;
        });
      } else {
        const mpPlatformId =
          mp.platform_id ?? (mp.platform && mp.platform.id) ?? null;

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

// ✅ конкретная платформа внутри selectedModelPlatform.platforms[] для выбранной platform
// НЕ переименовываем — оставляем как у тебя: selectedModelPlatformPlatform
const selectedModelPlatformPlatform = computed(() => {
  const grp = selectedModelPlatform.value;
  const platId = selectedPlatform.value?.id;

  if (!grp || !platId) return null;

  const arr = Array.isArray(grp.platforms) ? grp.platforms : [];

  const found =
    arr.find((p) => (p.platform_id ?? null) === platId) ||
    arr.find((p) => (p.platform && p.platform.id) === platId) ||
    arr.find((p) => (p.id ?? null) === platId) ||
    null;

  console.log("[MassView] selectedModelPlatformPlatform:", found);

  return found;
});

// Если где-то нужен именно model_platform_id (для cron/бекенда)
const selectedModelPlatformId = computed(() => {
  const x = selectedModelPlatformPlatform.value;
  if (!x) return null;
  return x.model_platform_id ?? x.id ?? null;
});

// --- Data loading
const fetchData = async () => {
  try {
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

    // важно для External*Card: подтянуть все model_platforms, чтобы найти ofid_username
    await modelPlatformStore.getAllModelPlatforms();

    // если у тебя это реально нужно (как в MessageView) — оставляем
    if (typeof modelPlatformStore.getModelPlatform === "function") {
      await modelPlatformStore.getModelPlatform(params.model_id, params.platform_id);
    }

    console.log("[MassView] selectedModelPlatformId:", selectedModelPlatformId.value);
  } catch (error) {
    console.error("[MassView] Error fetching data:", error);
  }
};

// --- Group view
const onViewGroup = (id) => {
  selectedGroup.value = (groupStore.groups || []).filter((it) => it.id === id)[0];
  messageStore.getMessagesByGroup(id);
  isGroupSelected.value = true;
};

const onCancelAddMessage = () => {
  selectedGroup.value = { name: "" };
  isGroupSelected.value = false;
};

const onClickMessageList = (tabNumber) => {
  if (tabNumber === 2) {
    if (selectedModel.value) {
      messageStore.getMessagesByModel(selectedModel.value.id);
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
  "New Movie",
  "New Pics",
  "New photo",
  "New video",
  "New videos",
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
  message_list: {
    required: helpers.withMessage("Message list field is required", required),
    $autoDirty: true,
  },
}));

// Важно: шаблон использует $mv напрямую — Vue сам развернет ref
const $gv = useVuelidate(gRules, selectedGroup);
const $mv = useVuelidate(mRules, selectedMessage);

// ---- Delete modal plumbing (чтобы confirmDelete не был undefined)
const deleteId = ref(null);
const deleteCallback = ref(null);




///area for edits or delete group
const onClickEditGroup = (id) =>
{
  const group = (groupStore.groups || []).filter((it) => it.id === id);

  if (group)
  {
    selectedGroup.value = { ...group[0], isEdit: true };
    isGroupModalActive.value = true;
  }
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
    isEdit: true,
    id: String(row.id ?? ''),
    ...selectedMessage.value,
    ...row,
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
  };
  // Превью файлов
  if (typeof selectedMessage.value.content === 'string' && selectedMessage.value.content.length > 0) {
    fileStore.setFiles(selectedMessage.value.content.split(','));
  }
  isMessageModalActive.value = true;
};

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
  selectedMessage.value = {
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
async function onFinalSubmitMessage() {
  const ok = await $mv.value.$validate();
  if (!ok) return;

  try {
    const payload = { ...selectedMessage.value };

    // нормализация списков
    if (Array.isArray(payload.message_list)) {
      payload.message_list = payload.message_list.join(",");
    }
    if (Array.isArray(payload.message_exclude_list)) {
      payload.message_exclude_list = payload.message_exclude_list.join(",");
    }

    // нормализация времени до HH:MM
    payload.message_time =
      (typeof payload.message_time === "string"
          ? payload.message_time
          : payload.message_time?.value || ""
      )
        .split(":")
        .slice(0, 2)
        .join(":");

    // group_id как число
    payload.group_id = Number(payload.group_id || 0);

    const saved = payload.isEdit
      ? await messageStore.updateMessage(payload)
      : await messageStore.addMessage(payload);

    if (saved) {
      notify({
        title: "Success",
        type: "success",
        text: payload.isEdit ? "Message updated successfully" : "Message added successfully",
      });

      $mv.value.$reset();

      // Обновить списки (минимально)
      if (isGroupSelected.value && selectedGroup.value?.id) {
        await messageStore.getMessagesByGroup(selectedGroup.value.id);
      } else if (selectedModel.value?.id) {
        await messageStore.getMessagesByModel(selectedModel.value.id);
      }
    }

    isMessageModalActive.value = false;
  } catch (error) {
    console.error("[MassView] onFinalSubmitMessage error:", error);
    notify({
      title: "Error",
      type: "error",
      text: "Failed to save message",
    });
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
  () => [selectedModel.value?.id, selectedPlatform.value?.id],
  async (newVal, oldVal) => {
    const [modelId, platformId] = newVal || [];
    const [prevModelId, prevPlatformId] = oldVal || [];

    console.log("[MassView:watch] model/platform changed:", {
      prevModelId,
      prevPlatformId,
      modelId,
      platformId,
    });

    if (!modelId || !platformId) return;

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
            <b>{{ selectedModelPlatformPlatform?.ofid_username || "—" }}</b>
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
                    :messages="messagesInStore"
                    :showGroup="false"
                    @click-row="onClickEditMessage"
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
                  <h1 class="font-bold text-xl">Message List</h1>
                  <TableMessages
                    :messages="messagesInStore"
                    @click-row="onClickEditMessage"
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




<!--        &lt;!&ndash; RIGHT: External cards &ndash;&gt;-->
<!--        <div class="space-y-6">-->
<!--          <ExternalMassMessageCard-->
<!--            :modelPlatform="selectedModelPlatformPlatform"-->
<!--            :notify="notify"-->
<!--            :mediaIds="vaultMediaIds"-->
<!--          />-->
<!--          <ExternalVaultMediaCard-->
<!--            :modelPlatform="selectedModelPlatformPlatform"-->
<!--            :notify="notify"-->
<!--            v-model:mediaIds="vaultMediaIds"-->
<!--          />-->
<!--        </div>-->
<!--      </div>-->
      <CardBoxModal v-model="isMessageModalActive" title="Message"
                    size="xxl:!w-11/12 xl:!w-11/12 md:w-4/5 lg:w-4/5 w-4/5"
                    :buttonLabel="selectedMessage.isEdit ? 'Update' : 'Save'" :hasCancel="true" @confirm="onFinalSubmitMessage">

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
                    <FormField label="Message Time" help="Required. Message Time">
                      <TimeField
                        v-model="selectedMessage.message_time"
                        label="Message Time"
                        :presets="['08:00','10:00','12:00','14:00','16:00','18:00']"
                      />
                    </FormField>
                    <div class="mb-3" v-for="error of $mv.message_time.$errors " :key="error.$uid">
                      <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
                    </div>
                  </div>
                  <div class="flex-1">
                    <FormField label="Message List" help="Required. Message List">
                      <Multiselect
                        v-model="selectedMessage.message_list"
                        :options="messageListOptions"
                        mode="single"
                        :object="false"
                        :can-clear="true"
                        :searchable="true"
                        placeholder="(separate with commas)"
                      />
                    </FormField>
                    <div class="mb-3" v-for="error of $mv.message_list.$errors " :key="error.$uid">
                      <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
                    </div>
                  </div>


                </div>
                <div class="flex gap-5 md:flex-row flex-col">
                  <div class="flex-1">
                    <FormField label="Message List Exclude">
                      <!--                      <FormControl v-model="selectedMessage.message_exclude_list" name="message_exclude_list"-->

                      <Multiselect
                        v-model="selectedMessage.message_exclude_list"
                        :options="messageEcludeOptions"
                        mode="single"
                        :object="false"
                        :can-clear="true"
                        :searchable="false"
                        :allow-empty="true"
                        placeholder="Select or type"
                      />
                    </FormField>

                  </div>
                  <div class="flex-1">
                    <FormField label="User Tags" help="Required. User Tags">
                      <FormControl v-model="selectedMessage.release_user_tags" name="release_user_tags"
                                   autocomplete="release_user_tags" />
                    </FormField>

                  </div>


                </div>
                <div class="flex gap-5 md:flex-row flex-col">

                  <div class="flex-1">
                    <FormField label="Release Form Tags" help="Required. Release Form Tags">
                      <FormControl v-model="selectedMessage.release_form_tags" name="release_form_tags" required
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
