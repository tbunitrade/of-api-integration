<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import BaseButton from './BaseButton.vue';
//import {  } from "@/stores";
import { useModelStore, useFileStore } from '@/stores';
import { notify } from '@kyvg/vue3-notification';
// import { ClipLoader } from 'vue3-spinner';
import { mdiClose } from '@mdi/js';
import throttle from 'lodash/throttle';
import messageId from "simple-vue-validator/src/rule";

const modelStore = useModelStore();
const selectedModel = computed(() => modelStore.selectedModel);

const props = defineProps({ messageId: { type: String, required: true },  info: { type: Object, default: () => ({}) } });
const fileInputRef = ref(null);
const fileStore = useFileStore();
const filesInStore = computed(() => fileStore.files);
const files = ref([]);
const uploadProgress = ref(0);
let lastPercent = 0;
let isUploading = false;
const isRefreshing = ref(false); // не обязательно, просто для UX

const isImage = (file) => {
  return /\.(jpe?g|png|gif|bmp)$/i.test(file);
};
const isVideo = (file) => {
  return /\.(mp4|m4v|flv|vob|avi|mov|mpeg|mpg|m4p|amv|mts|ts|webm|ogg)$/i.test(file);
};

const handleFileChange = (event) => {
  const selectedFiles = event.target.files;
  processFiles(selectedFiles);
};
const openFileInput = () => {
  fileInputRef.value.click();
};

const deleteFile = async (file) => {
  const result = await fileStore.deleteFile(file, props.id || null, selectedModel.value.name );
  if (result) {
    notify({
      title: "Success",
      type: "success",
      text: "ImageVideoUpload msg File deleted successfully",
    });
  } else {
    notify({
      title: "Error",
      type: "error",
      text: "ImageVideoUpload msg file delete error",
    });
  }
};
// Throttle progress updates for ImageVideo Uploading
const throttledProgress = throttle((percent) => {
  // Прокидываем 1% сразу
  if (percent === 1 && lastPercent === 0) {
    uploadProgress.value = percent;
    console.log(`Upload progress for ImageVideo Uploading in msg: ${percent}%`);
    lastPercent = percent;
    return;
  }
  // Потом обновляем только если +10% или дошли до 100%
  if (percent === 100 || percent - lastPercent >= 10) {
    uploadProgress.value = percent;
    console.log(`Upload progress: ${percent}%`);
    lastPercent = percent;
    if ( percent === 100) {
      console.log('🎯 100% upload reached. Waiting for add requests to finish...');
    }
  }
}, 300);
const processFiles = async (selectedFiles) => {

  if (isUploading) {
    console.warn('⛔ Upload already in progress. Ignoring duplicate call.');
    return;
  }
  isUploading = true;

  const controller = new AbortController();
  let totalSize = 0;

  // Вычисляем общий размер файлов
  for (let i = 0; i < selectedFiles.length; i++) {
    totalSize += selectedFiles[i].size;
  }

  // Выбираем таймаут по размеру

  let timeoutDuration = 90000; //default 90 sec

  if (totalSize > 1 * 1024 * 1024 * 1024) { // > 1GB
    timeoutDuration = 25 * 60 * 1000; // 25 min
  } else if (totalSize > 100 * 1024 * 1024) { // >100mb
    timeoutDuration = 10 * 60 * 1000; // 10 min
  }

  console.log(`⏳ Timeout set to ${timeoutDuration / 1000} seconds for total size ${totalSize} bytes`);

  //  Set timeout
  const timeout = setTimeout(() => {
    controller.abort();
    notify({
      title: "Error",
      type: "error",
      text: "Server took too long to respond. Upload may have failed."
    });
    uploadProgress.value = 0;
    lastPercent = 0;
  }, timeoutDuration);

  const formData = new FormData();
  if (selectedModel?.value?.name) {
    formData.append('model_name', selectedModel.value.name);
  }
  // 👇 ДОБАВЛЕНО
  if ( props.messageId ) {
    formData.append('model_id', props.messageId );
  }

  formData.append('entity', 'messages'); // <-- ВАЖНО
  console.log('[message-upload] meta', { model_name: selectedModel.value?.name , model_id: props.messageId, entity: 'messages' });
  // 👆 ДОБАВЛЕНО
  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    formData.append(`files`, file);
  }
  if (!selectedModel.value?.name) return;

  // Загружаем с передачей signal feature
  try {
    const result = await fileStore.uploadFiles(
      formData,
      throttledProgress,
      controller.signal,
    );



    // 🔁 Сразу обновляем список из реальной папки:
    await fileStore.refreshFiles({
      model_name: selectedModel.value.name,
      model_id: props.messageId,
      entity: 'messages',
    });
    if (result) {
      notify({
        title: "Success",
        type: "success",
        text: "ImageVideoUpload file uploaded successfully",
      });
    }

  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('⛔ Upload aborted by timeout.');
    } else {
      console.error('❌ Upload failed:', err);
    }
  } finally {
    uploadProgress.value = 0;
    lastPercent = 0;
    fileStore.isLoading = false;
    isUploading = false;
    clearTimeout(timeout);
    console.log("✅ Upload + add complete, spinner stopped.");
  }
};
watch(filesInStore, () => {
  if (filesInStore.value.length === 0) {
    files.value = [];
    fileInputRef.value.value = '';
  } else {
    files.value = filesInStore.value;
  }
})
// ... остальной импорт оставляем как есть
// можно без новых импортов, notify уже есть, fileStore есть

onMounted(async () => {
  if( !selectedModel?.value?.name ) return;
  try {
    isRefreshing.value = true;
    await fileStore.refreshFiles({
      model_name: selectedModel.value.name,
      model_id: props.messageId,
      entity: 'messages'
    });
  } catch (e) {
      console.log('err 911', e)
  } finally {
    isRefreshing.value = false;
  }
});

watch([selectedModel, () => props.id], async ([model]) => {
  if (!model?.name) return;
  try {
    isRefreshing.value = true;
    await fileStore.refreshFiles({
      model_name: model.name,
      model_id: props.messageId,
      entity: 'messages',
    });
  } catch (e) {
    console.log('error 922', e);
  } finally {
    isRefreshing.value = false;
  }
});

const onRefreshFiles = async () => {
  try {
    isRefreshing.value = true;
    console.log('[message-upload] manual refresh', {
      model_name: selectedModel.value?.name,
      model_id: props.messageId,
      entity: 'messages',
    });

    await fileStore.refreshFiles({
      model_name: selectedModel.value?.name,
      model_id: props.messageId,
      entity: 'messages',
    });

    notify({
      title: 'Refreshed',
      type: 'success',
      text: 'List file Refreshed, Список файлов обновлён',
    });
  } catch (e) {
    console.log('[message-upload] refresh error', e);
    notify({
      title: 'Error',
      type: 'error',
      text: 'Error for list updates Не удалось обновить список файлов',
    });
  } finally {
    isRefreshing.value = false;
  }
};
</script>

<template>
  <div class="w-full">
    <div class="flex items-center">
      <BaseButton label="Upload" color="info" rounded small @click="openFileInput" />
      <input ref="fileInputRef" type="file" @change="handleFileChange" multiple
             accept=".jpg, .jpeg, .gif, .png, .heic, .mp4, .mov, .m4v, .mpg, .mpeg, .wmv, .avi, .webm, .mkv, .mp3, .wav, .ogg"
             hidden /> <!-- image/*, video/*-->
      <BaseButton
        label="Refresh"
        color="info"
        small
        class="ml-2"
        :disabled="isRefreshing"
        @click="onRefreshFiles"
      />
    </div>

    <progress v-if="uploadProgress > 0 " :value="uploadProgress" max="100" class="w-full"></progress>
    <p v-if="uploadProgress > 0 && uploadProgress < 100">{{ uploadProgress }}% uploaded</p>
    <p v-else-if="uploadProgress === 100">
      Finalizing upload...
    </p>

    <div class="w-full border border-gray-300 p-3 rounded mt-2 flex min-h-32 flex-wrap gap-3 max-h-64 overflow-scroll">
      <div v-for="(file, index) in files" :key="index">
        <div class="relative">
          <img v-if="isImage(file)" :src="file" alt="Preview" class="w-32 h-32 object-cover rounded" />
          <video v-else-if="isVideo(file)" controls alt="Preview" class="w-32 h-32 object-cover rounded">
            <source :src="file" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <BaseButton :icon="mdiClose" color="danger" outline small rounded-full @click.prevent="deleteFile(file)"
                      class="border-0 absolute top-0 right-0" />
        </div>
        <!-- <div v-else>
          <video :src="file.previewUrl" controls class="w-32 h-32 object-cover rounded"></video>
        </div> -->
      </div>
<!--      <ClipLoader class="absolute top-0 left-0 w-full h-full flex justify-center items-center" :color="'#38bdf8'"-->
<!--                  v-if="fileStore.isLoading" />-->
    </div>
  </div>
</template>
