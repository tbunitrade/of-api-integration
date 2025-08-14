<template>
  <div class="w-full">
    <BaseButton label="Upload" color="info" rounded small @click="openFileInput" />
    <input ref="fileInputRef" type="file" @change="handleFileChange" multiple
      accept=".jpg, .jpeg, .gif, .png, .heic, .mp4, .mov, .m4v, .mpg, .mpeg, .wmv, .avi, .webm, .mkv, .mp3, .wav, .ogg"
      hidden /> <!-- image/*, video/*-->
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
      <ClipLoader class="absolute top-0 left-0 w-full h-full flex justify-center items-center" :color="info"
        v-if="fileStore.isLoading" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import BaseButton from './BaseButton.vue';
import { useFileStore } from '@/stores/files.store';
import { notify } from '@kyvg/vue3-notification';
import { ClipLoader } from 'vue3-spinner';
import { mdiClose } from '@mdi/js';
import {useModelStore} from "@/stores";

const props = defineProps({
  id: {
    type: Number,
    default: 0
  }
});

const fileInputRef = ref(null);

const fileStore = useFileStore();
const files = ref([]);

const filesInStore = computed(() => fileStore.files);

const modelStore = useModelStore();
const selectedModel = computed(() => modelStore.selectedModel);

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
      text: "ImageVideoUpload File deleted successfully",
    });
  } else {
    notify({
      title: "Error",
      type: "error",
      text: "ImageVideoUpload file delete error",
    });
  }
};
const processFiles = async (selectedFiles) => {
  const formData = new FormData();
  if (selectedModel.value.name) {
    formData.append('model_name', selectedModel.value.name);
  }
  // 👇 ДОБАВЛЕНО

  formData.append('model_id', String(props.id || 0));
  console.log('[message-upload] meta', { model_name: 'message', model_id: String(props.id || 0) });
  // 👆 ДОБАВЛЕНО

  formData.append('entity', 'messages'); // <-- ВАЖНО

  for (let i = 0; i < selectedFiles.length; i++) {

    const file = selectedFiles[i];
    formData.append(`files`, file);
  }

  if (!selectedModel.value?.name) return;

  const result = await fileStore.uploadFiles(formData);

  // 🔁 Сразу обновляем список из реальной папки:
  await fileStore.refreshFiles({
    model_name: selectedModel.value.name,
    model_id: String(props.id || 0),
    entity: 'messages',
  });

  if (result) {
    notify({
      title: "Success",
      type: "success",
      text: "ImageVideoUpload file uploaded successfully",
    });
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

</script>
