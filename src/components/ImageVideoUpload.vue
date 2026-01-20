<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import BaseButton from './BaseButton.vue';
//import {  } from "@/stores";
import { useModelStore, useFileStore } from '@/stores';
import { notify } from '@kyvg/vue3-notification';
// import { ClipLoader } from 'vue3-spinner';
import { mdiClose } from '@mdi/js';
import throttle from 'lodash/throttle';


const props = defineProps({
  id: { type: [String, Number], default: '' }, // legacy
  messageId: { type: [String , Number], default: 'true' },// mesages
  groupId: { type: String },
  modelId : { type: [String , Number], default: ''},  // for post
  modelName: { type: String , default: '' },
  messageName: { type: String, default: ''}, // общее
  info: { type: Object, default: () => ({}) }
});


const modelStore = useModelStore();
const selectedModel = computed(() => modelStore.selectedModel);

// Нормализация входных параметров (прозрачно для твоей разметки)
const resolvedEntity    = computed(() => (props.info?.entity || 'post'));
const resolvedMessageId = computed(() => String(props.messageId || props.id || '')); // <= вот тут legacy :id
const resolvedGroupId   = computed(() => String(props.groupId || ''));
const resolvedModelName = computed(() => props.modelName || selectedModel.value?.name || '');
const resolvedModelId   = computed(() => String(selectedModel.value?.id || '')); // для post

// Когда действительно можно ходить на /upload/list
const canQueryFiles = computed(() => {
  if (resolvedEntity.value === 'messages') {
    return !!(resolvedModelName.value && resolvedGroupId.value && resolvedMessageId.value);
  }
  // post
  return !!(resolvedModelName.value && resolvedModelId.value);
});


const info = props.info || {};
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
  //const entity = info?.entity || 'post';
  const result = await fileStore.deleteFile(file, {
      entity : resolvedEntity.value,
      modelName: resolvedModelName.value,
      ...( resolvedEntity.value === 'messages'
        ? { messageId: String(props.messageId), groupId: String(props.groupId) }
        : {
            //modelId: String(props.modelId || selectedModel.value?.id || '')
          }
      ),
    });
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
  //const entity = info?.entity || 'post';
  // вместо entity используем info?.entity с дефолтом 'post'
  const ent = info?.entity || 'post';
  console.log('AlexMe', ent);
  formData.append('entity', ent);
  formData.append('model_name', props.modelName || selectedModel.value?.name || '');

  if ((info?.entity || 'post') === 'messages') {
    formData.append('group_id', resolvedGroupId.value);
    formData.append('message_id', resolvedMessageId.value);
  } else {
    // post
    formData.append('model_id',  resolvedModelId.value);
  }

  console.log('[message-upload] meta', {
    entity: info?.entity,
    model_name: selectedModel.value?.name,
    groupId: props.groupId,
    messageId: props.messageId,
  });

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    formData.append(`files`, file);
    console.log('file list', file);
  }

  if (!selectedModel.value?.name) return;

  // Загружаем с передачей signal feature
  try {
    console.log('[ImageVideoUpload] input change files=', {
      count: selectedFiles?.length || 0,
      names: Array.from(selectedFiles || []).map(f => f?.name),
    });


    const result = await fileStore.uploadFiles(
      formData,
      throttledProgress,
      controller.signal,
    );


    // 🔁 Сразу обновляем список из реальной папки:
    await fileStore.refreshFiles(
      resolvedEntity.value === 'messages'
        ? {
              entity: 'messages',
              model_name: props.modelName || selectedModel.value?.name,
              group_id: String(props.groupId),
              message_id: String(props.messageId),
          }
        : {
            entity: 'post',
            model_name: props.modelName || selectedModel.value?.name,
            model_id: String(props.modelId || selectedModel.value?.id || ''),
          }
    );

    console.log('[ImageVideoUpload] after upload store.files=', {
      count: fileStore.files?.length,
      files: fileStore.files,
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
      entity: 'messages',
      model_name: selectedModel.value.name,
      group_id: String(props.groupId),
      message_id: String(props.messageId),
    });
  } catch (e) {
      console.log('fileStore.refreshFiles err 911', e)
  } finally {
    isRefreshing.value = false;
  }
});

// watch([selectedModel, () => props.messageId], async ([model]) => {
//   if (!model?.name ) return;
watch([resolvedEntity, resolvedModelName, resolvedGroupId, resolvedMessageId, resolvedModelId], async () => {
        if (!canQueryFiles.value) return;
        isRefreshing.value = true;
        try {
          await fileStore.refreshFiles(
            resolvedEntity.value === 'messages'
              ? { entity: 'messages', model_name: resolvedModelName.value, group_id: resolvedGroupId.value, message_id: resolvedMessageId.value }
              : { entity: 'post',     model_name: resolvedModelName.value, model_id: resolvedModelId.value }
          );
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
      entity: resolvedEntity.value,
      message_name: props.messageName || ''
    });

    await fileStore.refreshFiles({
      model_name: selectedModel.value?.name,
      model_id: props.messageId,
      entity: resolvedEntity.value,
      message_name: props.messageName || ''
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
      Finalizing upload progress, please click on blue button "Update/Save"
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
