<!--src/views/MassView.vue-->
<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { mdiTable } from "@mdi/js";
import { useNotification } from "@kyvg/vue3-notification";
import { ClipLoader } from "vue3-spinner";

import {
  useModelPlatformStore,
  useModelStore,
  usePlatformStore,
  useAuthStore,
} from "@/stores";

import SectionMain from "@/components/SectionMain.vue";
import CardBox from "@/components/CardBox.vue";
import LayoutAuthenticated from "@/layouts/LayoutAuthenticated.vue";
import SectionTitleLineWithButton from "@/components/SectionTitleLineWithButton.vue";
import BaseButton from "@/components/BaseButton.vue";

import ExternalMassMessageCard from "@/components/ExternalMassMessageCard.vue";
import ExternalVaultMediaCard from "@/components/ExternalVaultMediaCard.vue";

const modelStore = useModelStore();
const platformStore = usePlatformStore();
const modelPlatformStore = useModelPlatformStore();
const authStore = useAuthStore();

const { notify } = useNotification();

const spinnerColor = "#3B82F6";

// Выбранные Model / Platform — как у тебя в MessageView.vue
const selectedModel = computed(() => modelStore.selectedModel);
const selectedPlatform = computed(() => platformStore.selectedPlatform);

// Текущие выбранные vault media ids
const vaultMediaIds = ref([]);

/**
 * ВАЖНО:
 * Ты просишь использовать именно selectedModelPlatformId и передавать его в :modelPlatform
 * Поэтому берём id из modelPlatformStore.model_platforms[0]
 */
const selectedModelPlatformId = computed(() => {
  return modelPlatformStore.model_platforms?.length > 0
    ? modelPlatformStore.model_platforms[0].id
    : null;
});

const fetchData = async () => {
  try {
    if (!selectedModel.value || !selectedPlatform.value) return;

    const params = {
      model_id: selectedModel.value.id,
      platform_id: selectedPlatform.value.id,
    };

    // как в MessageView.vue
    await authStore.getMyProfile();
    await modelPlatformStore.getModelPlatform(params.model_id, params.platform_id);
  } catch (error) {
    console.error("[MassView] Error fetching data:", error);
  }
};

// Если Model / Platform меняются — подтягиваем связку и очищаем выбранные медиа
watch(
  () => [selectedModel.value?.id, selectedPlatform.value?.id],
  async ([modelId, platformId], [prevModelId, prevPlatformId]) => {
    console.log("[MassView:watch] model/platform changed:", {
      prevModelId,
      prevPlatformId,
      modelId,
      platformId,
    });

    vaultMediaIds.value = [];

    if (!modelId || !platformId) return;

    await fetchData();

    console.log("[MassView] selectedModelPlatformId:", selectedModelPlatformId.value);
  },
  { immediate: true }
);

// implement @Post('restart-server') — если хочешь как в MessageView
const onRestartServer = async () => {
  try {
    await fetch(`${import.meta.env.VITE_APP_ROOT_API}/admin-panel/restart-server`, {
      method: "POST",
    });

    notify({
      title: "Success",
      type: "success",
      text: "Server restart triggered!",
    });
  } catch (e) {
    console.log("err ", e);
    notify({
      title: "Error",
      type: "error",
      text: "Server failed, handle error to restart himself!",
    });
  }
};

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
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiTable" title="Mass" main>
        <BaseButton
          label="Restart server backend"
          color="danger"
          rounded-full
          @click="onRestartServer"
        />
      </SectionTitleLineWithButton>

      <!-- сервисная карточка как в MessageView (опционально) -->
      <CardBox class="mb-6">
        <div class="text-sm">
          <div class="opacity-70">Selected model:</div>
          <div class="font-semibold">{{ selectedModel?.name || "—" }}</div>

          <div class="opacity-70 mt-3">Selected platform:</div>
          <div class="font-semibold">{{ selectedPlatform?.name || "—" }}</div>

          <div class="opacity-70 mt-3">modelPlatformId:</div>
          <div class="font-semibold">{{ selectedModelPlatformId || "—" }}</div>
        </div>
      </CardBox>

      <!-- Mass функционал -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ExternalVaultMediaCard
          :modelPlatform="selectedModelPlatformId"
          :notify="notify"
          v-model:mediaIds="vaultMediaIds"
        />

        <ExternalMassMessageCard
          :modelPlatform="selectedModelPlatformId"
          :notify="notify"
          :mediaIds="vaultMediaIds"
        />
      </div>

      <ClipLoader
        class="fixed top-0 left-0 w-full h-full flex justify-center items-center"
        :color="spinnerColor"
        v-if="modelPlatformStore?.isLoading"
      />
    </SectionMain>
  </LayoutAuthenticated>
</template>
