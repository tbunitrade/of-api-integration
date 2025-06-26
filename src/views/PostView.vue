<script setup>
import { mdiMonitorCellphone, mdiTableBorder, mdiTableOff, mdiGithub, mdiPen, mdiTrashCan } from '@mdi/js';
import SectionMain from '@/components/SectionMain.vue';
import NotificationBar from '@/components/NotificationBar.vue';
import TableSampleClients from '@/components/TableSampleClients.vue';
import CardBox from '@/components/CardBox.vue';
import FormControl from '@/components/FormControl.vue';
import FormField from '@/components/FormField.vue';
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue';
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue';
import BaseButton from '@/components/BaseButton.vue';
import CardBoxComponentEmpty from '@/components/CardBoxComponentEmpty.vue';
import BaseDivider from '@/components/BaseDivider.vue';
import BaseButtons from '@/components/BaseButtons.vue';
import CardBoxModal from '@/components/CardBoxModal.vue';
import { computed, onMounted, ref } from 'vue';
import { useModelStore, usePostStore, usePlatformStore, usePostTimeStore, usePostCaptionStore, usePostFileStore, useCronStore } from '@/stores';

import PostImageVideoUpload from '@/components/PostImageVideoUpload.vue';
import { useNotification } from '@kyvg/vue3-notification';


const postStore = usePostStore();
const postTimeStore = usePostTimeStore();
const postFileStore = usePostFileStore();
const postCaptionStore = usePostCaptionStore();
const { notify } = useNotification();
const modelStore = useModelStore();
const platformStore = usePlatformStore();
const cronStore = useCronStore();


const selectedModel = computed(() => modelStore.selectedModel);
const selectedPlatform = computed(() => platformStore.selectedPlatform);

const fileInputRef = ref(null);
const isContentModalActive = ref(false);
const isCaptionsModalActive = ref(false);
const isTimeModalActive = ref(false);
const isCaptionModalActive = ref(false);
const isModalDangerActive = ref(false);
const deleteCallback = ref({});
const selectedPostTime = ref({
  id: null,
  post_id: null,
  time: null,
  captions: [],
  isEdit: false
});
const selectedPostCaption = ref({
  id: null,
  post_id: null,
  caption: "",
  isEdit: false
});

const selectedCaptionIds = ref([]);

const postInStore = computed(() => postStore.post);
const postTimesInStore = computed(() => postTimeStore.post_times);
const postCaptionsInStore = computed(() => postCaptionStore.post_captions);

const onSubmitPostContent = async () => {

  if ((selectedPostCaption.value?.caption?.length ?? 0) <= 3) {
    notify({
      title: "Error",
      type: "Error",
      text: "Caption length needs to be at least 3 letters",
    });
    return;
  }
  if (selectedPostCaption.value?.isEdit) {
    const data = {
      id: selectedPostCaption.value.id,
      caption: selectedPostCaption.value.caption,

    };
    const result = await postCaptionStore.updatePostCaption(data);
    if (result) {
      notify({
        title: "Success",
        type: "success",
        text: "Post Caption is updated successfully",
      });
    }
  } else {
    const data = {
      post_id: postInStore.value.id,
      caption: selectedPostCaption.value.caption,
    };
    const result = await postCaptionStore.addPostCaption(data);
    if (result) {
      notify({
        title: "Success",
        type: "success",
        text: "Post Caption is added successfully",
      });
    }
  }
  isCaptionModalActive.value = false;

};

const onViewImages = async () => {
  if (!postStore.post?.id) {
    notify({
      title: "Error",
      type: "Error",
      text: "Post is not created yet for this model!",
    });
    return;
  }
  isContentModalActive.value = true;
  const result = await postFileStore.getPostFiles(postStore.post.id);
};

const onViewCaptions = async () => {
  if (!postStore.post?.id) {
    notify({
      title: "Error",
      type: "Error",
      text: "Post is not created yet for this model!",
    });
    return;
  }
  isCaptionsModalActive.value = true;
  const result = await postCaptionStore.getPostCaptions(postStore.post.id, 'onViewCaptions'); // second duplication
  // getPostCaptions был тут — теперь не нужен, вызывается в uploadFiles
};

const onAddTime = () => {
  selectedPostTime.value = {};
  selectedPostTime.value.isEdit = false;
  postCaptionStore.post_captions = [];
  isTimeModalActive.value = true;
};

const onAddTimeDone = () => {
  isTimeModalActive.value = false;
};

const onAddCaption = () => {
  if (!postStore.post?.id) {
    notify({
      title: "Error",
      type: "Error",
      text: "Post is not created yet for this model!",
    });
    return;
  }
  selectedPostCaption.value = {};
  selectedPostCaption.value.isEdit = false;
  isCaptionModalActive.value = true;
};

const onChangeNumberOfDays = async (e) => {

  try {
    const data = {
      id: postStore.post.id,
      number_of_days: parseInt(e.target.value)
    };
    const result = await postStore.updatePost(data);
    if (result) {
      notify({
        title: "Success",
        type: "success",
        text: "Number Of Days updated successfully",
      });
    }

  } catch (err) {
    notify({
      title: "Error",
      type: "error",
      text: err?.toString(),
    });
  }

};

const onChangeUserTags = async (e) => {

  try {
    const data = {
      id: postStore.post.id,
      user_tags: e.target.value
    };
    const result = await postStore.updatePost(data);
    if (result) {
      notify({
        title: "Success",
        type: "success",
        text: "User Tags updated successfully",
      });
    }

  } catch (err) {
    notify({
      title: "Error",
      type: "error",
      text: err?.toString(),
    });
  }

};

const onChangeFormTags = async (e) => {

  try {
    const data = {
      id: postStore.post.id,
      form_tags: e.target.value
    };
    const result = await postStore.updatePost(data);
    if (result) {
      notify({
        title: "Success",
        type: "success",
        text: "Release Form Tags updated successfully",
      });
    }

  } catch (err) {
    notify({
      title: "Error",
      type: "error",
      text: err?.toString(),
    });
  }

};

const onChangePostTime = async (val) => {
  if (selectedPostTime.value.id) {
    const data = {
      id: selectedPostTime.value.id,
      post_id: postStore.post.id,
      time: val,
      status: 1
    };
    const result = await postTimeStore.updatePostTime(data);
    if (result.id) {
      notify({
        title: "Success",
        type: "success",
        text: "PostTime updated successfully",
      });
    }

  } else {
    const data = {
      post_id: postStore.post.id,
      time: val,
      status: 1
    };
    const result = await postTimeStore.addPostTime(data);
    if (result?.id) {
      selectedPostTime.value = result;
      notify({
        title: "Success",
        type: "success",
        text: "PostTime added successfully",
      });

    }


  }
};

const onDeletePostTime = async (id) => {
  isModalDangerActive.value = true;
  deleteCallback.value.func = confirmDeletePostTime;
  deleteCallback.value.id = id;

};

const onDeletePostCaption = async (id) => {
  isModalDangerActive.value = true;
  deleteCallback.value.func = confirmDeletePostCaption;
  deleteCallback.value.id = id;
};
const confirmDeletePostTime = async (id) => {
  const result = await postTimeStore.deletePostTime(id);
  if (result) {
    notify({
      title: "Success",
      type: "success",
      text: "PostTime deleted successfully",
    });

    isModalDangerActive.value = false;
  }
};

const onCloseContentModal = () => {
  isContentModalActive.value = false;
};

const confirmDeletePostCaption = async (id) => {
  const result = await postCaptionStore.deletePostCaption(id);
  if (result) {
    notify({
      title: "Success",
      type: "success",
      text: "PostCaption deleted successfully",
    });

    isModalDangerActive.value = false;
  }
};

const confirmDelete = async () => {
  if (deleteCallback.value.id) {
    deleteCallback.value.func(deleteCallback.value.id);
  } else {
    console.log("No delete function assigned yet");
  }
};

const clickRow = (id) => {
  selectedPostTime.value = postTimesInStore.value?.find(it => it.id === id);
  selectedPostTime.value.isEdit = true;
  isTimeModalActive.value = true;
};

const clickCaptionRow = (id) => {
  selectedPostCaption.value = postCaptionsInStore.value?.find(it => it.id === id);
  isCaptionModalActive.value = true;
  selectedPostCaption.value.isEdit = true;
};

const fetchData = async () => {
  try {
    const params = {
      model_id: selectedModel.value.id,
      platform_id: selectedPlatform.value.id,
    };
    const result = await postStore.getPost(params);
    postTimeStore.post_times = result.post_times;
  } catch (error) {
    console.error('Error fetching data:', error);

  }
};

const onStartCronJobManually = async () => {
  cronStore.triggerPostCronJobManually();
  notify({
    title: "Success",
    type: "success",
    text: "Cron job started!",
  });
};

const openFileInput = () => {
  fileInputRef.value.click();
};

const handleFileChange = (event) => {
  if (!event.target.files) return;
  const selectedFiles = event.target.files;

  processFiles(selectedFiles);
};

const processFiles = async (selectedFiles) => {
  const formData = new FormData();
  for (let i = 0; i < selectedFiles.length; i++) {

    formData.append(`files`, selectedFiles[i]);

  }

  const result = await postCaptionStore.uploadFiles(formData, postStore.post.id, 'processFiles ');
  if (result) {
    //await postCaptionStore.getPostCaptions(postStore.post.id); // <--- dublication
    notify({
      title: "Success",
      type: "success",
      text: "File with caption uploaded successfully",
    });
  }
};


const convertTo12HourFormat = (timeStr) => {
  // Split the time string into hours, minutes, and seconds
  let [hours, minutes, seconds] = timeStr.split(':').map(Number);

  // Determine AM or PM suffix
  const period = hours >= 12 ? 'PM' : 'AM';

  // Convert hours from 24-hour to 12-hour format
  hours = hours % 12 || 12; // If hour is 0 or 12, it should be converted to 12

  // Format the hours, minutes, and seconds with leading zeros if necessary
  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');

  // Combine into the final time string
  return `${formattedHours}:${formattedMinutes}:${formattedSeconds} ${period}`;
}

const onDeleteSelectedCaptions = async () => {
  if (selectedCaptionIds.value.length === 0) return;

  try {
    await postCaptionStore.deleteManyPostCaptions(selectedCaptionIds.value, postInStore.value.id);
    selectedCaptionIds.value = []; // очистим выбранные после удаления
    notify({
      title: "Success",
      type: "success",
      text: "Selected captions deleted",
    });
  } catch (err) {
    notify({
      title: "Error",
      type: "error",
      text: "Failed to delete captions",
    });
  }
};


const toggleSelectAll = () => {
  if (selectedCaptionIds.value.length === postCaptionsInStore.value.length) {
    selectedCaptionIds.value = []
  } else {
    selectedCaptionIds.value = postCaptionsInStore.value.map(caption => caption.id)
  }
}

// implement  @Post('restart-server')

const onRestartServer = async () => {
  try {
    await fetch(`${import.meta.env.VITE_APP_ROOT_API}/admin-panel/restart-server`, {
      method : 'POST',
    });
    notify({
      title: 'Success',
      type: 'success',
      text: 'Server restart triggered!',
    });
  } catch (e) {
    console.log('err '.e);
    notify({
      title: 'Error',
      type: 'error',
      text: 'Server failed, handle error to restart himself!',
    });
  }

}


onMounted(() => {
  if (!selectedModel.value || !selectedPlatform.value) {
    notify({
      title: "Warning",
      type: "error",
      text: "Please select Model and Platform",
    });
    return;
  }
  fetchData();

});

</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiTableBorder" title="Post" main>
        <BaseButton label="Restart server backend" color="danger" rounded-full @click="onRestartServer" />
        <BaseButton label="Trigger CronJob Manually" color="info" rounded small @click="onStartCronJobManually" />
      </SectionTitleLineWithButton>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardBox class=" border-2 border-gray-300" rounded="rounded-md">
          <h1 class="font-bold text-xl">Random Post</h1>
          <div>
            <label class="block text-sm">Number of Days Scheduled</label>
            <input class="w-full mb-5 rounded" type="number" :value="postInStore?.number_of_days || 0"
              @change="onChangeNumberOfDays" />
          </div>
          <div>
            <label class="block text-sm">User Tags</label>
            <input class="w-full mb-5 rounded" type="text" :value="postInStore?.user_tags || ''"
              @change="onChangeUserTags" />
          </div>
          <div>
            <label class="block text-sm">Release Form Tags</label>
            <input class="w-full mb-5 rounded" type="text" :value="postInStore?.form_tags || ''"
              @change="onChangeFormTags" />
          </div>
          <div class="w-full text-right">
            <BaseButton label="View Images" color="info" rounded small @click="onViewImages" />
          </div>
          <div class="w-full text-right mt-5">
            <BaseButton label="View Captions" color="info" rounded small @click="onViewCaptions" />
          </div>

          <div class="mt-10">
            <div class="flex justify-between">
              <label class="block text-sm">Time</label>
              <label class="block text-sm">Actions</label>
            </div>
            <BaseDivider class="border-gray-500 mx-0 mt-1" />
            <div class="row ">
              <div v-for="postTime of postTimesInStore.sort((a, b) => a.time.localeCompare(b.time))" :key="postTime.id"
                class="col flex justify-between ">
                <label class="cursor-pointer" @click="clickRow(postTime.id)">{{ convertTo12HourFormat(postTime.time)
                  }}</label>
                <div>
                  <BaseButtons type="justify-start lg:justify-end" no-wrap>
                    <BaseButton transparent no-border color="grey" :icon="mdiPen" @click="clickRow(postTime.id)" />
                    <BaseButton transparent no-border color="grey" :icon="mdiTrashCan"
                      @click="onDeletePostTime(postTime.id)" />
                  </BaseButtons>
                </div>

              </div>
            </div>
            <BaseDivider class="border-gray-500 mx-0 mt-1" />
          </div>
          <div class="w-full text-right">
            <BaseButton label="Add Time" color="info" rounded small @click="onAddTime" />
          </div>
        </CardBox>
      </div>
      <CardBoxModal v-model="isContentModalActive" title="Content"
        size="xxl:!w-11/12 xl:!w-11/12 md:w-4/5 lg:w-4/5 w-4/5" :hasCancel="true" @confirm="onCloseContentModal">
        <CardBox is-form>
          <div class="flex flex-col mt-5">
            <div class="flex flex-wrap">
              <PostImageVideoUpload :id="postStore.post?.id || 0" />
            </div>
          </div>
        </CardBox>
      </CardBoxModal>


      <CardBoxModal v-model="isTimeModalActive" title="Time" size="xxl:!w-8/12 xl:!w-8/12 md:w-4/5 lg:w-4/5 w-4/5"
        :buttonLabel="selectedPostTime.isEdit ? 'Update Time' : 'Add Time'" @confirm="onAddTimeDone" has-cancel="true">
        <CardBox is-form>
          <div class="flex flex-col">
            <div class="flex flex-wrap">
              <FormField label="Post Time" help="Required. Post Time">
                <FormControl v-model="selectedPostTime.time" name="post_time" required type="time"
                  autocomplete="post_time" @change="onChangePostTime" />
              </FormField>
            </div>
          </div>
        </CardBox>
      </CardBoxModal>

      <CardBoxModal v-model="isCaptionsModalActive" title="Captions"
        size="xxl:!w-8/12 xl:!w-8/12 md:w-4/5 lg:w-4/5 w-4/5" :buttonLabel="'Add Caption'" :hasCancel="true"
        @confirm="onAddCaption">
        <div class="flex items-center mb-3">
          <input
            id="selectAll"
            type="checkbox"
            :checked="selectedCaptionIds.length === postCaptionsInStore.length"
            @change="toggleSelectAll"
          />
          <label for="selectAll" class="ml-2 text-sm">Select All</label>
        </div>

        <CardBox is-form>
          <div class="flex flex-col">
            <div class="mt-4 text-right">
              <BaseButton
                label="Delete Selected"
                color="danger"
                :disabled="selectedCaptionIds.length === 0"
                @click="onDeleteSelectedCaptions"
              />
            </div>
            <div class="flex mt-5 mb-1 justify-end">
              <BaseButton label="Upload" color="info" rounded small @click="openFileInput" />
              <input ref="fileInputRef" type="file" @change="handleFileChange" accept=".xlsx, .xls" hidden />
              <!-- image/*, video/*-->
            </div>

            <div class="flex border-b mt-5 mb-1">
              <label class="flex-1">Caption</label>
              <label>Actions</label>
            </div>

            <div class="w-full">
              <div v-for="postCaption of postCaptionsInStore" :key="postCaption.id" class="flex ">
                <input v-model="selectedCaptionIds"
                       :value="postCaption.id"
                       type="checkbox"
                       class="mr-2"
                />
                <pre class="w-full overflow-hidden text-ellipsis mb-3">{{ postCaption.caption }}</pre>
                <div class="">
                  <BaseButtons type="justify-start lg:justify-end" no-wrap>
                    <BaseButton transparent no-border color="grey" :icon="mdiPen"
                      @click="clickCaptionRow(postCaption.id)" />
                    <BaseButton transparent no-border color="grey" :icon="mdiTrashCan"
                      @click="onDeletePostCaption(postCaption.id)" />
                  </BaseButtons>
                </div>
              </div>
              <div class="mt-4 text-right">
                <BaseButton
                  label="Delete Selected"
                  color="danger"
                  :disabled="selectedCaptionIds.length === 0"
                  @click="onDeleteSelectedCaptions"
                />
              </div>
            </div>

          </div>
        </CardBox>
      </CardBoxModal>

      <CardBoxModal v-model="isCaptionModalActive" title="Caption" size="xxl:!w-6/12 xl:!w-6/12 md:w-3/5 lg:w-4/5 w-3/5"
        :buttonLabel="'Save'" :hasCancel="true" @confirm="onSubmitPostContent">
        <CardBox is-form>
          <div class="flex flex-col mt-5">
            <FormControl name="caption" required autocomplete="caption" type="textarea" placeholder=""
              v-model="selectedPostCaption.caption" />
            <!-- <div class="mb-3" v-for="error of  $mv.message.$errors " :key="error.$uid">
                    <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
                  </div> -->

          </div>
        </CardBox>
      </CardBoxModal>

      <CardBoxModal v-model="isModalDangerActive" title="Please confirm" button="danger" button-label="Delete"
        has-cancel @confirm="confirmDelete">
        <p v-if="!isCaptionsModalActive" class="text-red-600">Before you delete time, please remove all captions </p>
        <p>Are you sure you want to delete? </p>
      </CardBoxModal>
    </SectionMain>
  </LayoutAuthenticated>
</template>
