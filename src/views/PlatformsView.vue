<script setup>
import { computed, onMounted, ref } from "vue";
import { mdiTableBorder } from '@mdi/js';
import { useNotification } from "@kyvg/vue3-notification";
import { ClipLoader } from "vue3-spinner";
import { usePlatformStore } from '@/stores';
import SectionMain from '@/components/SectionMain.vue';
import CardBox from '@/components/CardBox.vue';
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue';
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue';
import BaseButton from '@/components/BaseButton.vue';
import BaseButtons from "@/components/BaseButtons.vue";
import { minLength, required } from "@vuelidate/validators";
import useVuelidate from "@vuelidate/core";
import FormControl from '@/components/FormControl.vue';
import FormField from '@/components/FormField.vue';
import CardBoxModal from '@/components/CardBoxModal.vue';
import TablePlatforms from "@/components/TablePlatforms.vue";
import { colorsText } from "@/colors";

const platformStore = usePlatformStore();
const { notify } = useNotification();
const deleteCallback = ref(null);
const isModalDangerActive = ref(false);


const selectedPlatform = ref({
  name: ""
});
const isModalActive = ref(false);



const rules = computed(() => (
  {
    name: { required, minLength: minLength(2) },

  }));
const $v = useVuelidate(rules, selectedPlatform);


const fetchData = async () => {
  try {
    await platformStore.getAllPlatforms();
  } catch (error) {
    console.error('Error fetching data:', error);

  }
};


const onSubmit = async () => {
  if (selectedPlatform.value.isEdit) {

    const result = $v.value.$validate();
    result.then(async (res) => {
      if (res) {
        const add_result = await platformStore.updatePlatform(selectedPlatform.value);
        if (add_result) {
          notify({
            title: "Success",
            type: "success",
            text: "Platform updated successfully",
          });
          $v.value.$reset();
        }

        isModalActive.value = false;
      }
    });

  } else {
    const result = $v.value.$validate();
    result.then(async (res) => {
      if (res) {
        const add_result = await platformStore.addPlatform(selectedPlatform.value);
        if (add_result) {
          notify({
            title: "Success",
            type: "success",
            text: "Platform added successfully",
          });
          $v.value.$reset();
        }

        isModalActive.value = false;
      }
    }).catch((err) => {
      console.log(err);
    });
  }

};
const onClickEditPlatform = (id) => {
  const platform = (platformStore.platforms || []).filter((it) => it.id === id);

  if (platform) {
    selectedPlatform.value = { ...platform[0], isEdit: true };
    isModalActive.value = true;
  }

};

const onAddNewPlatform = () => {
  selectedPlatform.value = {
    isEdit: false,
    name: "",
  };
  $v.value.$reset();
  isModalActive.value = true;
};

const onDeletePlatform = (id) => {
  isModalDangerActive.value = true;
  deleteCallback.value = () => { confirmDeletePlatform(id); };
};

const confirmDeletePlatform = async (id) => {
  const del_result = await platformStore.deletePlatform(id);
  if (del_result) {
    notify({
      title: "Success",
      type: "success",
      text: "Platform deleted successfully",
    });
    $v.value.$reset();
    isModalDangerActive.value = false;
  }
};

onMounted(() => {
  fetchData();
})

</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiTableBorder" title="Platforms" main>

        <BaseButtons>
          <BaseButton label="+ Add Platform" color="info" rounded-full small @click="onAddNewPlatform" />
        </BaseButtons>

      </SectionTitleLineWithButton>
      <!-- <NotificationBar color="info" :icon="mdiMonitorCellphone">
        <b>Responsive table.</b> Collapses on mobile
      </NotificationBar> -->

      <CardBox class="mb-6" has-table>
        <TablePlatforms checkable :platforms="platformStore.platforms || []" @click-row="onClickEditPlatform"
          @delete-row="onDeletePlatform" />
        <ClipLoader class="absolute top-0 left-0 w-full h-full flex justify-center items-center" :color="info"
          v-if="platformStore.isLoading" />
      </CardBox>

      <CardBoxModal v-model="isModalActive" title="Platform" :buttonLabel="selectedPlatform.isEdit ? 'Update' : '+ Add'"
        :hasCancel="true" @confirm="onSubmit">

        <CardBox is-form>
          <div>
            <FormField label="Name" help="Required. Platform name">
              <FormControl v-model="selectedPlatform.name" name="name" required autocomplete="name" />
            </FormField>
            <div class="mb-3" v-for="error of  $v.name.$errors " :key="error.$uid">
              <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
            </div>
          </div>
        </CardBox>
        <ClipLoader class="absolute w-full h-full top-0 left-0 flex justify-center items-center" :color="info"
          v-if="platformStore.isLoading" />
      </CardBoxModal>

      <CardBoxModal v-model="isModalDangerActive" title="Please confirm" button="danger" button-label="Delete" has-cancel
        @confirm="deleteCallback">
        <p>Are you sure you want to delete? </p>
      </CardBoxModal>
    </SectionMain>
  </LayoutAuthenticated>
</template>
