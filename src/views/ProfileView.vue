<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useVuelidate } from '@vuelidate/core';
import { required, email, minLength, sameAs } from '@vuelidate/validators';
import { useNotification } from "@kyvg/vue3-notification";
import { useAuthStore } from '@/stores';
import { colorsText } from '@/colors.js';
import { mdiAccount, mdiMail, mdiAsterisk, mdiFormTextboxPassword, mdiGithub } from '@mdi/js';
import SectionMain from '@/components/SectionMain.vue';
import CardBox from '@/components/CardBox.vue';
import BaseDivider from '@/components/BaseDivider.vue';
import FormField from '@/components/FormField.vue';
import FormControl from '@/components/FormControl.vue';
import FormFilePicker from '@/components/FormFilePicker.vue';
import BaseButton from '@/components/BaseButton.vue';
import BaseButtons from '@/components/BaseButtons.vue';
import UserCard from '@/components/UserCard.vue';
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue';
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue';

const authStore = useAuthStore();
const { notify } = useNotification();

const profileForm = reactive({
  firstName: authStore.user?.firstName || '',
  lastName: authStore.user?.lastName || '',
  email: authStore.user?.email || ''
});

const rules = computed(() => (
  {
    email: {
      required,
      email
    },
    firstName: { required, minLength: minLength(2) },
    lastName: { required },
  }));

const $v = useVuelidate(rules, profileForm);

const fetchData = async () => {
  try {
    const response = await authStore.getMyProfile();
    const { firstName, lastName, email } = response;
    profileForm.firstName = firstName;
    profileForm.lastName = lastName;
    profileForm.email = email;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

onMounted(() => {
  fetchData();
});

const submitProfile = () => {
  const result = $v.value.$validate();
  result.then(async (res) => {
    if (res) {
      const update_result = await authStore.updateMyProfile({ ...profileForm });
      if (update_result) {
        notify({
          title: "Success",
          type: "success",
          text: "Profile updated successfully",
        });
      }

    }
  }).catch((err) => {
    console.log(err);
  });
};

const passwordForm = ref({
  password_current: '',
  password: '',
  password_confirmation: ''
});
const passwordRule = computed(() => (
  {
    password_current: { required, minLength: minLength(2) },
    password: { required, minLength: minLength(2) },
    password_confirmation: { required, sameAsPassword: sameAs(passwordForm.value?.password) }
  }));
const $passwordV = useVuelidate(passwordRule, passwordForm);
const submitPass = () => {
  const result = $passwordV.value.$validate();
  result.then(async (res) => {
    if (res) {
      const update_result = await authStore.changePassword({ currentPassword: passwordForm.value.password_current, newPassword: passwordForm.value.password });
      if (update_result) {
        notify({
          title: "Success",
          type: "success",
          text: "Password updated successfully",
        });
      }

    }
  }).catch((err) => {
    console.log(err);
  });
};
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiAccount" title="Profile" main>
        <!-- <BaseButton href="https://github.com/justboil/admin-one-vue-tailwind" target="_blank" :icon="mdiGithub"
          label="Star on GitHub" color="contrast" rounded-full small /> -->
      </SectionTitleLineWithButton>

      <UserCard class="mb-6" />

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardBox is-form @submit.prevent="submitProfile">
          <FormField label="Avatar" help="Max 500kb">
            <FormFilePicker label="Upload" />
          </FormField>

          <FormField label="First Name" help="Required. Your First name">
            <FormControl v-model="profileForm.firstName" :icon="mdiAccount" name="firstName" required
              autocomplete="firstName" />
          </FormField>
          <div class="mb-3" v-for="error of  $v.firstName.$errors " :key="error.$uid">
            <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
          </div>
          <FormField label="Last Name" help="Required. Your Last name">
            <FormControl v-model="profileForm.lastName" :icon="mdiAccount" name="lastName" required
              autocomplete="lastName" />
          </FormField>
          <div class="mb-3" v-for="error of  $v.lastName.$errors " :key="error.$uid">
            <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
          </div>
          <FormField label="E-mail" help="Required. Your e-mail">
            <FormControl v-model="profileForm.email" :icon="mdiMail" type="email" name="email" required
              autocomplete="email" />
          </FormField>
          <div class="mb-3" v-for="error of  $v.email.$errors " :key="error.$uid">
            <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
          </div>

          <template #footer>
            <BaseButtons>
              <BaseButton color="info" type="submit" label="Submit" />
            </BaseButtons>
          </template>
        </CardBox>

        <CardBox is-form @submit.prevent="submitPass">
          <FormField label="Current password" help="Required. Your current password">
            <FormControl v-model="passwordForm.password_current" :icon="mdiAsterisk" name="password_current"
              type="password" required autocomplete="current-password" />
          </FormField>
          <div class="mb-3" v-for="error of  $passwordV.password_current.$errors " :key="error.$uid">
            <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
          </div>

          <BaseDivider />

          <FormField label="New password" help="Required. New password">
            <FormControl v-model="passwordForm.password" :icon="mdiFormTextboxPassword" name="password" type="password"
              required autocomplete="new-password" />
          </FormField>
          <div class="mb-3" v-for="error of  $passwordV.password.$errors " :key="error.$uid">
            <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
          </div>

          <FormField label="Confirm password" help="Required. New password one more time">
            <FormControl v-model="passwordForm.password_confirmation" :icon="mdiFormTextboxPassword"
              name="password_confirmation" type="password" required autocomplete="new-password" />
          </FormField>
          <div class="mb-3" v-for="error of  $passwordV.password_confirmation.$errors " :key="error.$uid">
            <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
          </div>

          <template #footer>
            <BaseButtons>
              <BaseButton type="submit" color="info" label="Submit" />
            </BaseButtons>
          </template>
        </CardBox>
      </div>
    </SectionMain>
  </LayoutAuthenticated>
</template>
