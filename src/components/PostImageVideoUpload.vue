<template>
  <div class="w-full">
    <BaseButton label="Upload" color="info" rounded small @click="openFileInput" />
    <input ref="fileInputRef" type="file" @change="handleFileChange" multiple
      accept=".jpg, .jpeg, .gif, .png, .heic, .mp4, .mov, .m4v, .mpg, .mpeg, .wmv, .avi, .webm, .mkv, .mp3, .wav, .ogg"
      hidden /> <!-- image/*, video/*-->
    <div class="w-full border border-gray-300 p-3 rounded mt-2 flex min-h-32 flex-wrap gap-3 max-h-64 overflow-scroll">
      <div v-for="(file, index) in filesInStore" :key="index">
        <div class="relative">
          <img v-if="isImage(file.url)" :src="file.url" alt="Preview" class="w-32 h-32 object-cover rounded" />
          <video v-else-if="isVideo(file.url)" controls alt="Preview" class="w-32 h-32 object-cover rounded">
            <source :src="file.url" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <BaseButton :icon="mdiClose" color="danger" outline small rounded-full
            @click.prevent="deleteFile(file.url, file.id)" class="border-0 absolute top-0 right-0" />
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
import { usePostFileStore } from '@/stores';
import { notify } from '@kyvg/vue3-notification';
import { ClipLoader } from 'vue3-spinner';
import { mdiClose } from '@mdi/js';

const props = defineProps({
  id: {
    type: Number,
    default: 0
  }
});

const fileInputRef = ref(null);

const fileStore = usePostFileStore();

const filesInStore = computed(() => fileStore.post_files);

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
      text: "File deleted successfully",
    });
  }
};
const processFiles = async (selectedFiles) => {
  const formData = new FormData();
  for (let i = 0; i < selectedFiles.length; i++) {

    formData.append(`files`, selectedFiles[i]);

  }

  const result = await fileStore.uploadFiles(formData, props.id);
  if (result) {
    notify({
      title: "Success",
      type: "success",
      text: "File uploaded successfully",
    });
  }
};
watch(filesInStore, () => {
  if (filesInStore.value.length === 0) {
    fileInputRef.value.value = '';
  }
})

</script>
