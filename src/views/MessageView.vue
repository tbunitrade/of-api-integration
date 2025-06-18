<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { mdiKey, mdiMessage } from '@mdi/js';
import { useNotification } from "@kyvg/vue3-notification";
import { ClipLoader } from "vue3-spinner";
import { useGroupStore, useModelPlatformStore, useModelStore, usePlatformStore, useCronStore, useAuthStore } from '@/stores';
import SectionMain from '@/components/SectionMain.vue';
import CardBox from '@/components/CardBox.vue';
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue';
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue';

import { minLength, required } from "@vuelidate/validators";
import useVuelidate from "@vuelidate/core";
import FormControl from '@/components/FormControl.vue';
import FormField from '@/components/FormField.vue';
import CardBoxModal from '@/components/CardBoxModal.vue';
import TabContainer from "@/components/TabContainer.vue";
import TabContent from "@/components/TabContent.vue";
import TableMessageGroup from "@/components/TableMessageGroup.vue";
import BaseButton from "@/components/BaseButton.vue";
import TableMessages from "@/components/TableMessages.vue";
import { useMessageStore } from "@/stores/message.store";
import { useFileStore } from "@/stores/files.store";
import { colorsText } from "@/colors";
import ImageVideoUpload from "@/components/ImageVideoUpload.vue";
import Multiselect from '@vueform/multiselect';
import '@vueform/multiselect/themes/default.css';

const tabs = ref([
  { id: 1, title: 'Schedule' },
  { id: 2, title: 'Message List' }
]);


const groupStore = useGroupStore();
const messageStore = useMessageStore();
const fileStore = useFileStore();
const modelStore = useModelStore();
const platformStore = usePlatformStore();
const modelPlatformStore = useModelPlatformStore();
const authStore = useAuthStore();
const cronStore = useCronStore();
const { notify } = useNotification();

const selectedGroup = ref({
  name: "",
  isEdit: false
});

const selectedMessage = ref({
  name: "",
  group_id: 0,
  price: 0,
  message: "",
  message_time: "",
  message_list: [],
  message_exclude_list: [],
  release_form_tags: "",
  content_attached: false,
  content: "",
});


const isGroupModalActive = ref(false);
const isMessageModalActive = ref(false);
const isModalDangerActive = ref(false);
const isGroupSelected = ref(false);
const checkedGroups = ref([]);

const selectedModel = computed(() => modelStore.selectedModel);
const selectedPlatform = computed(() => platformStore.selectedPlatform);

const filesInStore = computed(() => fileStore.files);
const groupsInStore = computed(() => groupStore.groups || []);
const messagesInStore = computed(() => messageStore.messages || []);
const numberOfDays = computed(() =>
{
  return modelPlatformStore.model_platforms.length > 0 ? modelPlatformStore.model_platforms[0].number_of_days : 0;
});

const proKey = computed(() =>
{
  return authStore.user ? authStore.user.prokey : '';
});

const deleteId = ref(0);
const deleteCallback = ref(null);

const grules = computed(() => (
  {
    name: { required, minLength: minLength(2) },

  }));
const $gv = useVuelidate(grules, selectedGroup);

const mrules = computed(() => (
  {
    name: { required, minLength: minLength(2) },
    group_id: { required },
    message: { required, minLength: minLength(2) },
    message_list: { required, minLength: minLength(1) },
    message_time: { required }

  }
));
const $mv = useVuelidate(mrules, selectedMessage);

const fetchData = async () =>
{
  try
  {
    const params = {
      model_id: selectedModel.value.id,
      platform_id: selectedPlatform.value.id,
    };
    await authStore.getMyProfile();
    await groupStore.getAllGroups(params);
    await modelPlatformStore.getModelPlatform(params.model_id, params.platform_id);
  } catch (error)
  {
    console.error('Error fetching data:', error);

  }
};


const onSubmitGroup = async () =>
{
  if (selectedGroup.value.isEdit)
  {

    const result = $gv.value.$validate();
    result.then(async (res) =>
    {
      if (res)
      {
        const add_result = await groupStore.updateGroup(selectedGroup.value);
        if (add_result)
        {
          notify({
            title: "Success",
            type: "success",
            text: "Group updated successfully",
          });
          $gv.value.$reset();
        }

        isGroupModalActive.value = false;
      }
    });

  } else
  {
    const result = $gv.value.$validate();
    result.then(async (res) =>
    {
      if (res)
      {

        if (!selectedModel.value || !selectedPlatform.value)
        {
          notify({
            title: "Warning",
            type: "error",
            text: "Please select Model and Platform",
          });
          return;
        }
        const add_result = await groupStore.addGroup({ ...selectedGroup.value, model_id: selectedModel.value.id, platform_id: selectedPlatform.value.id });
        if (add_result)
        {
          notify({
            title: "Success",
            type: "success",
            text: "Group added successfully",
          });
          $gv.value.$reset();
        }

        isGroupModalActive.value = false;
      }
    }).catch((err) =>
    {
      console.log(err);
    });
  }

};

const onSubmitMessage = async () =>
{
  if (selectedMessage.value.isEdit)
  {
    const result = $mv.value.$validate();
    result.then(async (res) =>
    {
      if (res)
      {
        if (Array.isArray(selectedMessage.value.message_list)) {
          selectedMessage.value.message_list = selectedMessage.value.message_list.join(',');
        }

        if (Array.isArray(selectedMessage.value.message_exclude_list)) {
          selectedMessage.value.message_exclude_list = selectedMessage.value.message_exclude_list.join(',');
        }

        selectedMessage.value = {
          ...selectedMessage.value,
          ...(fileStore.files.length > 0 ? { content: fileStore.files.join(','), content_attached: true } : { content_attached: false }),
          message_time: selectedMessage.value.message_time.split(":").slice(0, 2).join(":")
        };
        const add_result = await messageStore.updateMessage(selectedMessage.value);
        if (add_result)
        {
          notify({
            title: "Success",
            type: "success",
            text: "Message updated successfully",
          });
          $mv.value.$reset();
          fetchData();
        }

        isMessageModalActive.value = false;
      }
    });

  } else
  {
    const result = $mv.value.$validate();
    result.then(async (res) =>
    {
      if (res)
      {
        if (Array.isArray(selectedMessage.value.message_list)) {
          selectedMessage.value.message_list = selectedMessage.value.message_list.join(',');
        }
        if (Array.isArray(selectedMessage.value.message_exclude_list)) {
          selectedMessage.value.message_exclude_list = selectedMessage.value.message_exclude_list.join(',');
        }

        selectedMessage.value = {
          ...selectedMessage.value,
          ...(fileStore.files.length > 0 ? { content: fileStore.files.join(','), content_attached: true } : { content_attached: false }),
        };
        const add_result = await messageStore.addMessage(selectedMessage.value);
        if (add_result)
        {
          notify({
            title: "Success",
            type: "success",
            text: "Group added successfully",
          });
          $mv.value.$reset();
          fetchData();
        }

        isMessageModalActive.value = false;
      }
    }).catch((err) =>
    {
      console.log(err);
    });
    fileStore.files = [];
  }

};
const onClickEditGroup = (id) =>
{
  const group = (groupStore.groups || []).filter((it) => it.id === id);

  if (group)
  {
    selectedGroup.value = { ...group[0], isEdit: true };
    isGroupModalActive.value = true;
  }

};
const onClickEditMessage = (id) =>
{
  const message = messagesInStore.value.filter((it) => it.id === id);
  if (message)
  {
    selectedMessage.value = {
      group_id: selectedGroup.value.id,
      ...message[0], isEdit: true }; //


    if (typeof selectedMessage.value.message_list === 'string') {
      selectedMessage.value.message_list = selectedMessage.value.message_list.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (typeof selectedMessage.value.message_exclude_list === 'string') {
      selectedMessage.value.message_exclude_list = selectedMessage.value.message_exclude_list.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (selectedMessage.value.content?.length > 0)
    {
      const _files = selectedMessage.value.content.split(',');
      fileStore.setFiles(_files);
    }

    isMessageModalActive.value = true;
  }

};

const onChangeSearchString = (e) =>
{
  if (selectedModel.value && e.target)
  {
    messageStore.getMessagesByModel(selectedModel.value.id, e.target.value);
  }
};

const onViewGroup = (id) =>
{

  selectedGroup.value = groupStore.groups.filter((it) => it.id === id)[0];
  messageStore.getMessagesByGroup(id);
  isGroupSelected.value = true;
};
const onCancelAddMessage = () =>
{
  selectedGroup.value = { name: "" };
  isGroupSelected.value = false;
};
const onClickMessageList = (tabNumber) =>
{
  // If show messages
  if (tabNumber === 2)
  {
    if (selectedModel.value)
    {
      messageStore.getMessagesByModel(selectedModel.value.id);
    }
  }
  checkedGroups.value = [];


};

const onAddNewGroup = () =>
{
  selectedGroup.value = {
    isEdit: false,
    name: "",
  };
  $gv.value.$reset();
  isGroupModalActive.value = true;
};

const onAddNewMessage = () =>
{
  selectedMessage.value = {
    isEdit: false,
    name: "",
    group_id: selectedGroup.value.id || 0,
    price: 0,
    free_preview: 0,
    message: "",
    message_list: "",
    message_time: "",
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

const onDeleteGroup = async (id) =>
{
  isModalDangerActive.value = true;
  deleteId.value = id;
  deleteCallback.value = confirmDeleteGroup;

};
const onDeleteMessage = async (id) =>
{
  isModalDangerActive.value = true;
  deleteId.value = id;
  deleteCallback.value = confirmDeleteMessage;
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
const confirmDelete = async () =>
{
  if (deleteCallback.value)
  {
    deleteCallback.value();
  } else
  {
    console.log("No delete function assigned yet");
  }
};
const onChangeNumberOfDays = async (e) =>
{
  if (modelPlatformStore.model_platforms && modelPlatformStore.model_platforms.length > 0)
  {
    const data = modelPlatformStore.model_platforms[0];
    data.number_of_days = parseInt(e.target.value);
    await modelPlatformStore.updateModelPlatform(data);
    notify({
      title: "Success",
      type: "success",
      text: "Number_Of_Days updated successfully",
    });
  } else
  {
    notify({
      title: "Error",
      type: "error",
      text: "Model_Platform relation is not found",
    });
  }

};

const onChangeProKey = async (e) =>
{
  console.log("authStore.user: ", authStore.user);
  if (authStore.user)
  {
    const data = authStore.user;
    data.prokey = e.target.value;
    await authStore.updateMe(data);
    notify({
      title: "Success",
      type: "success",
      text: "Prokey updated successfully",
    });
  } else
  {
    notify({
      title: "Error",
      type: "error",
      text: "ProKey relation is not found",
    });
  }

};


const onChangeStatus = async (e) =>
{
  bulkUpdateStatus(checkedGroups.value, e.target.value);
};

const onCheckGroups = (ids) =>
{
  checkedGroups.value = ids;
};

const bulkUpdateStatus = async (ids, value) =>
{
  const data = {
    groupIds: ids,
    status: value
  };
  groupStore.bulkUpdateStatus(data);
};

const onStartCronJobManually = async () =>
{
  cronStore.triggerCronJobManually();
  notify({
    title: "Success",
    type: "success",
    text: "Cron job started!",
  });
};

// add new feature for DropDown

const messageNameOptions = [
  'Videos','Games','Custom','Services','Captions','Exclusive', 'Video Chat', 'ReSubscribe'
];

const messageListOptions = [
  'Fans', 'Following', 'Following 2nd Folder', 'Renew On', 'Renew Off'
];

const messageEcludeOptions = [
  'Creators', 'Friends', 'Tagged'
];

const messageTimeOptions = [
  { label:'8:00 am', value:'08:00'},
  { label:'12:00 pm', value:'12:00'},
  { label:'4:00 pm', value:'16:00'},
  { label:'7:00 pm', value:'19:00'},
  { label:'10:00 pm', value:'22:00'},

]

onMounted(() =>
{
  if (!selectedModel.value || !selectedPlatform.value)
  {
    notify({
      title: "Warning",
      type: "error",
      text: "Please select Model and Platform",
    });
    return;
  }
  fetchData();


});
watch(isMessageModalActive, () =>
{
  if (!isMessageModalActive.value)
  {
    fileStore.files = [];
  }
});
watch(filesInStore, () =>
{
  if (selectedMessage.value.name.length > 0 && filesInStore.value.length > 0)
  {
    selectedMessage.value.content = filesInStore.value.join(',');
  }

});
watch(groupsInStore, () =>
{
  if (selectedMessage.value.name.length > 0 && selectedGroup.value.name.length > 0)
  {
    selectedMessage.value = groupsInStore.value.filter(it => it.id === selectedGroup.value.id)[0];
  }
  if (selectedGroup.value.name.length > 0)
  {
    selectedGroup.value = groupsInStore.value.filter(it => it.id === selectedGroup.value.id)[0];
    if (!selectedGroup.value?.name)
    {
      selectedGroup.value = {
        name: ""
      };
    }
  }

})

</script>
<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiMessage" title="Message" main>
        <BaseButton label="Trigger CronJob Manually" color="info" rounded small @click="onStartCronJobManually" />
      </SectionTitleLineWithButton>
      <CardBox class="mb-6">
        <div>
          <label class="block text-sm">Captcha Solver Pro key</label>
          <input class="w-full rounded" type="text" :value="proKey" @change="onChangeProKey" />
        </div>
      </CardBox>
      <CardBox class="mb-6">
        <TabContainer :tabs="tabs" @click-tab="onClickMessageList">
          <template #default="{ openTab }">
            <TabContent :show="openTab === 1">
              <div v-if="!isGroupSelected" class="groups">
                <h1 class="font-bold text-xl">Groups</h1>

                <div class="flex justify-between">
                  <div>
                    <label class="block text-sm">Number of Days Scheduled</label>

                    <input class="w-64 rounded" type="number" :value="numberOfDays" @change="onChangeNumberOfDays" />
                  </div>
                  <div>
                    <label class="block text-sm">Update Status</label>
                    <select class="w-32 rounded" @change="onChangeStatus">
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                </div>
                <TableMessageGroup :groups="groupStore.groups" @view-row="onViewGroup" @click-row="onClickEditGroup"
                  @delete-row="onDeleteGroup" @check-rows="onCheckGroups" checkable="true" />
                <div class="w-full text-right">
                  <BaseButton label="Add Group" color="info" rounded small @click="onAddNewGroup" />
                </div>
              </div>
              <div v-if="isGroupSelected">
                <div>
                  <h1 class="font-bold text-xl">{{ selectedGroup.name }}</h1>
                </div>
                <TableMessages :messages="messagesInStore" @click-row="onClickEditMessage" @delete-row="onDeleteMessage"
                  :showGroup="false" />
                <div class="w-full flex justify-between">
                  <BaseButton label="Back" color="contrast" rounded small @click="onCancelAddMessage" />
                  <BaseButton label="Add Message" color="info" rounded small @click="onAddNewMessage" />
                </div>
              </div>
            </TabContent>
            <TabContent :show="openTab === 2">
              <div>
                <div class="w-full flex justify-between">
                  <h1 class="font-bold text-xl">Message List</h1>
                  <input class="rounded" type="text" @change="onChangeSearchString" placeholder="Search Message" />
                </div>
                <TableMessages :messages="messagesInStore" @click-row="onClickEditMessage"
                  @delete-row="onDeleteMessage" />
                <div class="w-full flex justify-end">
                  <BaseButton label="Add Message" color="info" rounded small @click="onAddNewMessage" />
                </div>
              </div>
            </TabContent>
          </template>
        </TabContainer>
        <ClipLoader class="absolute top-0 left-0 w-full h-full flex justify-center items-center" :color="info"
          v-if="groupStore.isLoading || messageStore.isLoading" />
      </CardBox>

      <CardBoxModal v-model="isGroupModalActive" title="Group" :buttonLabel="selectedGroup?.isEdit ? 'Update' : '+ Add'"
        :hasCancel="true" @confirm="onSubmitGroup">

        <CardBox is-form>
          <div>
            <FormField label="Name" help="Required. Group name">
              <FormControl v-model="selectedGroup.name" name="name" required autocomplete="name" />
            </FormField>
            <div class="mb-3" v-for="error of $gv.name.$errors " :key="error.$uid">
              <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
            </div>
          </div>
        </CardBox>
        <ClipLoader class="absolute w-full h-full top-0 left-0 flex justify-center items-center" :color="info"
          v-if="groupStore.isLoading" />
      </CardBoxModal>

      <CardBoxModal v-model="isMessageModalActive" title="Message"
        size="xxl:!w-11/12 xl:!w-11/12 md:w-4/5 lg:w-4/5 w-4/5"
        :buttonLabel="selectedMessage.isEdit ? 'Update' : 'Save'" :hasCancel="true" @confirm="onSubmitMessage">

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
                      <Multiselect
                        v-model="selectedMessage.message_time"
                        :options="messageTimeOptions"
                        placeholder="Select Time"
                      />
<!--                      <FormControl v-model="selectedMessage.message_time" name="message_time" required type="time"-->
<!--                        autocomplete="message_time" />-->
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
                        :can-clear="true"
                        :searchable="true"
                        mode="tags"
                        placeholder="(separate with commas)"
                      />
<!--                      <FormControl-->
<!--                        v-model="selectedMessage.message_list"-->
<!--                        name="message_list" required-->
<!--                        autocomplete="message_list"-->
<!--                        placeholder="(separate with commas)" />-->
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
                          :can-clear="true"
                          :searchable="true"
                          mode="tags"
                        placeholder="Select or type" />
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
                      <FormControl v-model="selectedMessage.free_preview" name="free_preview" type="number"
                        autocomplete="free_preview" />
                    </FormField>

                  </div>
                  <div class="flex-1"></div>
                </div>

              </div>
            </div>
            <div class="flex flex-col mt-5">
              <div class="flex flex-wrap">
                <ImageVideoUpload :id="selectedMessage.id" />
              </div>
            </div>
          </div>
        </CardBox>

        <ClipLoader class="absolute w-full h-full top-0 left-0 flex justify-center items-center" :color="info"
          v-if="messageStore.isLoading" />
      </CardBoxModal>

      <CardBoxModal v-model="isModalDangerActive" title="Please confirm" button="danger" button-label="Delete"
        has-cancel @confirm="confirmDelete">
        <p>Are you sure you want to delete? </p>
      </CardBoxModal>

    </SectionMain>
  </LayoutAuthenticated>
</template>
