
<script setup>
import { computed, ref, watch } from 'vue';
import BaseButton from './BaseButton.vue';
import { usePostFileStore } from '@/stores';
import { notify } from '@kyvg/vue3-notification';
import { ClipLoader } from 'vue3-spinner';
import { mdiClose } from '@mdi/js';
import throttle from 'lodash/throttle';


const props = defineProps({ id: { type: Number, default: 0 } });
const fileInputRef = ref(null);
const fileStore = usePostFileStore();
const filesInStore = computed(() => fileStore.post_files);
const uploadProgress = ref(0);
let lastPercent = 0;

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

const deleteFile = async (file, id) => {
  const result = await fileStore.deleteFile(file, id);
  if (result) {
    notify({
      title: "Success",
      type: "success",
      text: "PostImageVideo file deleted successfully",
    });
  }
};
// Throttle progress updates
const throttledProgress = throttle((percent) => {
  // Прокидываем 1% сразу
  if (percent === 1 && lastPercent === 0) {
    uploadProgress.value = percent;
    console.log(`Upload progress: ${percent}%`);
    lastPercent = percent;
    return;
  }

  // Потом обновляем только если +10% или дошли до 100%
  if (percent === 100 || percent - lastPercent >= 10) {
    uploadProgress.value = percent;
    console.log(`Upload progress: ${percent}%`);
    lastPercent = percent;
  }
}, 300);

const processFiles = async (selectedFiles) => {
  const formData = new FormData();
  for (let i = 0; i < selectedFiles.length; i++) {
    formData.append(`files`, selectedFiles[i]);
  }

  const result = await fileStore.uploadFiles(
    formData,
    props.id,
    throttledProgress
  );

  uploadProgress.value = 0; // сбросить прогресс после загрузки
  lastPercent = 0;
  if (result) {
    notify({
      title: "Success",
      type: "success",
      text: "PostImageVideo file uploaded successfully",
    });
  }
};
watch(filesInStore, () => {
  if (filesInStore.value.length === 0) {
    fileInputRef.value.value = '';
  }
})

const selectedFileIds = ref([]);


const onDeleteSelectedFiles = async () => {
  if (selectedFileIds.value.length === 0) return;
  try {
    await fileStore.deleteMany(selectedFileIds.value);
    selectedFileIds.value = []; // очистить выбранные
    notify({
      title: "Success",
      type: "success",
      text: "Selected files deleted",
    });
  } catch (err) {
    notify({
      title: "Error",
      type: "error",
      text: "Failed to delete files",
    });
  }
};

const toggleSelectAllFiles = () => {
  if (selectedFileIds.value.length === filesInStore.value.length) {
    selectedFileIds.value = [];
  } else {
    selectedFileIds.value = filesInStore.value.map(file => file.id);
  }
};



</script>

<template>
  <div class="w-full">
    <BaseButton label="Upload" color="info" rounded small @click="openFileInput" />

    <input ref="fileInputRef" type="file" @change="handleFileChange" multiple
           accept=".jpg, .jpeg, .gif, .png, .heic, .mp4, .mov, .m4v, .mpg, .mpeg, .wmv, .avi, .webm, .mkv, .mp3, .wav, .ogg"
           hidden />

    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center">
        <input
          id="selectAllFiles"
          type="checkbox"
          :checked="selectedFileIds.length === filesInStore.length"
          @change="toggleSelectAllFiles"
        />
        <label for="selectAllFiles" class="ml-2 text-sm">Select All</label>
      </div>
      <BaseButton
        label="Delete Selected"
        color="danger"
        :disabled="selectedFileIds.length === 0"
        @click="onDeleteSelectedFiles"
        small
      />
    </div>
    <progress v-if="uploadProgress > 0 " :value="uploadProgress" max="100" class="w-full"></progress>
    <p v-if="uploadProgress > 0 && uploadProgress < 100">{{ uploadProgress }}% uploaded</p>
    <p v-else-if="uploadProgress === 100">
      Finalizing upload...
    </p>

    <div class="w-full border border-gray-300 p-3 rounded mt-2 flex min-h-32 flex-wrap gap-3 max-h-64 overflow-scroll">
      <div v-for="(file, index) in filesInStore" :key="index">
        <div class="relative">
          <input
            v-model="selectedFileIds"
            :value="file.id"
            type="checkbox"
            class="absolute top-1 left-1 z-10 w-4 h-4"
          />
          <img v-if="isImage(file.url)" :src="file.url" alt="Preview" class="w-32 h-32 object-cover rounded" />
          <video v-else-if="isVideo(file.url)" controls class="w-32 h-32 object-cover rounded">
            <source :src="file.url" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <!-- NEW fallback -->
          <div v-else class="w-32 h-32 flex flex-col items-center justify-center bg-gray-200 text-gray-800 rounded p-1 overflow-hidden">
            <span class="font-bold">
              {{ file.url.split('.').pop().toUpperCase() }}
            </span>
            <span
              class="text-xs text-gray-600 w-full p-1 mt-1 bg-gray-100 rounded border border-gray-400 overflow-x-auto"
              style="max-height: 3rem;"
            >
<!--              <span-->
<!--                class="text-xs text-gray-600 w-full p-1 mt-1 bg-gray-100 rounded border border-gray-400 overflow-hidden text-ellipsis whitespace-nowrap"-->
<!--                :title="file.url"-->
<!--              >-->
              {{ file.url }}
            </span>
          </div>
          <BaseButton
            :icon="mdiClose"
            color="danger"
            outline
            small
            rounded-full
            @click.prevent="deleteFile(file.url, file.id)"
            class="border-0 absolute top-0 right-0"
          />
        </div>
      </div>

      <ClipLoader
        class="absolute top-0 left-0 w-full h-full flex justify-center items-center"
        :color="'#3b82f6'"
        v-if="fileStore.isLoading"
      />
    </div>
  </div>
</template>

