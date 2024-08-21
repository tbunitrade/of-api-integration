<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { mdiTableBorder } from '@mdi/js';
import { useNotification } from "@kyvg/vue3-notification";
import { ClipLoader } from "vue3-spinner";
import { useModelStore, usePlatformStore, useModelPlatformStore } from '@/stores';
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
import TableModelPlatforms from "@/components/TableModelPlatforms.vue";
import { colorsText } from "@/colors";

const modelStore = useModelStore();
const platformStore = usePlatformStore();
const modelPlatformStore = useModelPlatformStore();
const { notify } = useNotification();

const selectedModel = ref({
  name: ""
});
const isModalDangerActive = ref(false);
const deleteCallback = ref(null);

const selectedModelPlatform = ref({
  model_id: null,
  platform_id: null,
  username: '',
  password: ''

});

const isModalActive = ref(false);
const isPlatformModelActive = ref(false);



const rules = computed(() => (
  {
    name: { required, minLength: minLength(2) },

  }));
const modelPlatfromRules = computed(() => (
  {
    model_id: { required },
    platform_id: { required },
    username: { required, minLength: minLength(2) },
    password: { required, minLength: minLength(2) },
  }));
const $v = useVuelidate(rules, selectedModel);
const $mpv = useVuelidate(modelPlatfromRules, selectedModelPlatform);


const fetchData = async () => {
  try {
    await modelStore.getAllModelsWithPlatforms();
    await platformStore.getAllPlatforms();
    await modelPlatformStore.getAllModelPlatforms();
  } catch (error) {
    console.error('Error fetching data:', error);

  }
};


const onSubmit = async () => {
  if (selectedModel.value.isEdit) {

    const result = $v.value.$validate();
    result.then(async (res) => {
      if (res) {
        const add_result = await modelStore.updateModel(selectedModel.value);
        if (add_result) {
          notify({
            title: "Success",
            type: "success",
            text: "Model updated successfully",
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
        const add_result = await modelStore.addModel(selectedModel.value);
        if (add_result) {
          notify({
            title: "Success",
            type: "success",
            text: "Model added successfully",
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

const onSubmitPlatform = async () => {
  if (selectedModelPlatform.value.isEdit) {
    const result = $mpv.value.$validate();
    result.then(async (res) => {
      if (res) {
        const edit_result = await modelPlatformStore.updateModelPlatform(selectedModelPlatform.value);
        if (edit_result) {
          notify({
            title: "Success",
            type: "success",
            text: "Model Platform updated successfully",
          });
          $mpv.value.$reset();
          modelStore.getAllModelsWithPlatforms();
        }

        isPlatformModelActive.value = false;
      }
    }).catch((err) => {
      console.log(err);
    });
  } else {
    const result = $mpv.value.$validate();
    result.then(async (res) => {
      if (res) {
        const add_result = await modelPlatformStore.addModelPlatform(selectedModelPlatform.value);
        if (add_result) {
          notify({
            title: "Success",
            type: "success",
            text: "Model Platform added successfully",
          });
          $mpv.value.$reset();
          modelStore.getAllModelsWithPlatforms();
        }

        isPlatformModelActive.value = false;
      }
    }).catch((err) => {
      console.log(err);
    });
  }
};
// const onClickEditModel = (id) => {
//   const model = (modelStore.models || []).filter((it) => it.id === id);

//   if (model) {
//     selectedModel.value = { ...model[0], isEdit: true };
//     isModalActive.value = true;
//   }

// };

const onClickEditModelPlatform = (id) => {
  const model = (modelStore.models || []).find(it => it.id === id);
  if (model) {
    selectedModel.value = model;
    const model_platforms = model.model_platforms;
    selectedModelPlatform.value = {
      model_id: model.id,
      platform_id: null,
      username: '',
      password: ''
    };
    if (model_platforms?.length > 0) {
      selectedModelPlatform.value = { ...model_platforms[0], isEdit: true };

    }
    isPlatformModelActive.value = true;
  }
};
const onClickEditModel = (id) => {
  const model = (modelStore.models || []).find(it => it.id === id);
  if (model) {
    selectedModel.value.id = model.id;
    selectedModel.value.name = model.name;
    selectedModel.value.isEdit = true;
    isModalActive.value = true;
  }
};

const onDeleteModelPlatform = (id) => {
  isModalDangerActive.value = true;
  deleteCallback.value = () => { confirmDeleteModelPlatform(id); };
};

const confirmDeleteModelPlatform = async (id) => {
  const del_result = await modelStore.deleteModel(id);
  if (del_result) {
    notify({
      title: "Success",
      type: "success",
      text: "Model deleted successfully",
    });
    $v.value.$reset();
    isModalDangerActive.value = false;
  }
};


const onAddNewModel = () => {
  selectedModel.value = {
    isEdit: false,
    name: "",
  };
  $v.value.$reset();
  isModalActive.value = true;
};

const onAddModelPlatform = () => {
  selectedModel.value = {
    isEdit: false,
    name: "",
  };
  selectedModelPlatform.value = {
    isEdit: false,
    model_id: null,
    platform_id: null,
    username: '',
    password: ''
  };
  $mpv.value.$reset();
  isPlatformModelActive.value = true;
};

onMounted(() => {
  fetchData();
});

const onChangePlatform = (value) => {
  const ptfm = selectedModel.value.model_platforms?.find(it => it.platforms?.id === parseInt(value));
  if (ptfm) {
    selectedModelPlatform.value = { ...selectedModelPlatform.value, ...ptfm };
  } else {
    selectedModelPlatform.value.username = '';
    selectedModelPlatform.value.password = '';
  }

};

// const onChangeModel = (value) => {
//   const model_platforms = (modelPlatformStore.model_platforms || []).filter((it) => it.id === value);

//   if (model_platforms) {
//     selectedModelPlatform.value = { ...model_platforms[0], isEdit: true };
//     console.log("selectedModelPlatform", selectedModelPlatform.value);
//   }
// }

</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiTableBorder" title="Models" main>
        <BaseButtons>
          <BaseButton label="+ Add Model" color="info" rounded-full small @click="onAddNewModel" />
          <BaseButton label="+ Add Platform" color="info" rounded-full small @click="onAddModelPlatform" />
        </BaseButtons>

      </SectionTitleLineWithButton>


      <CardBox class="mb-6" has-table>
        <TableModelPlatforms checkable :models="modelStore.models" @click-row="onClickEditModelPlatform"
          @delete-row="onDeleteModelPlatform" @edit-model="onClickEditModel" />
        <ClipLoader class="absolute top-0 left-0 w-full h-full flex justify-center items-center" color="info"
          v-if="modelStore.isLoading" />
      </CardBox>

      <CardBoxModal v-model="isModalActive" title="Model" :buttonLabel="selectedModel.isEdit ? 'Update' : '+ Add'"
        :hasCancel="true" @confirm="onSubmit">

        <CardBox is-form>
          <div>
            <FormField label="Full Name" help="Required. Model name">
              <FormControl v-model="selectedModel.name" name="name" required autocomplete="name" />
            </FormField>
            <div class="mb-3" v-for="error of  $v.name.$errors " :key="error.$uid">
              <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
            </div>
          </div>
        </CardBox>
        <ClipLoader class="absolute w-full h-full top-0 left-0 flex justify-center items-center" color="info"
          v-if="modelStore.isLoading" />
      </CardBoxModal>
      <CardBoxModal v-model="isPlatformModelActive" title="Add Platform"
        :buttonLabel="selectedModelPlatform.isEdit ? 'Update' : '+ Add'" :hasCancel="true" @confirm="onSubmitPlatform">

        <CardBox is-form>
          <div>
            <FormField label="Name" help="Required. Model name">
              <FormControl v-model="selectedModelPlatform.model_id" name="model_id" required autocomplete="model_id"
                :disabled="!!selectedModelPlatform.isEdit" placeholder="Select Name"
                :options="modelStore.models.map((it) => ({ id: it.id, label: it.name }))" />
            </FormField>
            <div class="mb-3" v-for="error of  $mpv.model_id.$errors " :key="error.$uid">
              <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
            </div>
            <FormField label="Platform" help="Required. Platform name">
              <FormControl v-model="selectedModelPlatform.platform_id" name="platform_id" required
                autocomplete="platform_id" placeholder="Select Platform" @change="onChangePlatform"
                :options="platformStore.platforms.map((it) => ({ id: it.id, label: it.name }))" />
            </FormField>

            <div class="mb-3" v-for="error of  $mpv.platform_id.$errors " :key="error.$uid">
              <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
            </div>

            <FormField label="Username" help="Required. Username">
              <FormControl v-model="selectedModelPlatform.username" name="username" required autocomplete="username"
                placeholder="Enter Username" />
            </FormField>
            <div class="mb-3" v-for="error of  $mpv.username.$errors " :key="error.$uid">
              <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
            </div>
            <FormField label="Password" help="Required. Password">
              <FormControl v-model="selectedModelPlatform.password" name="password" type="password" required
                autocomplete="password" placeholder="Enter Password" />
            </FormField>
            <div class="mb-3" v-for="error of  $mpv.password.$errors " :key="error.$uid">
              <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
            </div>
          </div>
        </CardBox>
        <ClipLoader class="absolute w-full h-full top-0 left-0 flex justify-center items-center" color="info"
          v-if="modelPlatformStore.isLoading" />
      </CardBoxModal>
      <CardBoxModal v-model="isModalDangerActive" title="Please confirm" button="danger" button-label="Delete"
        has-cancel @confirm="deleteCallback">
        <p>Are you sure you want to delete? </p>
      </CardBoxModal>
    </SectionMain>
  </LayoutAuthenticated>
</template>
