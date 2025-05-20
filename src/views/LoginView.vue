<script setup>
import { reactive, computed } from 'vue';
import { useVuelidate } from '@vuelidate/core';
import { required, email, minLength } from '@vuelidate/validators';
import { useNotification } from "@kyvg/vue3-notification";
import { mdiAccount, mdiAsterisk } from '@mdi/js';
import { ClipLoader } from "vue3-spinner";
import SectionFullScreen from '@/components/SectionFullScreen.vue';
import CardBox from '@/components/CardBox.vue';
import FormCheckRadio from '@/components/FormCheckRadio.vue';
import FormField from '@/components/FormField.vue';
import FormControl from '@/components/FormControl.vue';
import BaseButton from '@/components/BaseButton.vue';
import BaseButtons from '@/components/BaseButtons.vue';
import LayoutGuest from '@/layouts/LayoutGuest.vue';
import { colorsText } from '@/colors.js';
import SectionTitle from '@/components/SectionTitle.vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from "../stores";

const router = useRouter();
const { notify } = useNotification();
const authStore = useAuthStore();

const form = reactive({
  email: '',
  password: '',
  remember: true
});
const rules = computed(() => (
  {
    email: {
      required,
      email
    },
    password: { required },
  }));

const $v = useVuelidate(rules, form);
const submitForm = async () => {
  const result = $v.value.$validate();
  result.then(async (res) => {
    if (res) {
      const login_result = await authStore.login({ email: form.email, password: form.password });
      if (login_result.access_token) {
        router.push('./dashboard');
      } else {
        notify({
          title: "Fail",
          type: "error",
          text: "Credentials are incorrect",
          duration: 3000
        });
      }

    }
  }).catch((err) => {
    notify({
      title: "Error",
      type: 'error',
      text: err.toString(),
      duration: 3000
    });
    console.log(err.toString());
  });

};
</script>

<template>
  <LayoutGuest>
    <SectionFullScreen bg="white"  v-slot="{ cardClass }">
      <CardBox title="Login" :class="cardClass" is-form @submit.prevent="submitForm">

        <h1 class="text-3xl text-center w-100 mb-5">Sign in</h1>

        <FormField label="Email" help="Please enter your email">
          <FormControl v-model.trim="form.email" :icon="mdiAccount" autocomplete="email" />

        </FormField>
        <div class="mb-3" v-for="error of  $v.email.$errors " :key="error.$uid">
          <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
        </div>

        <FormField label="Password" help="Please enter your password">
          <FormControl v-model.trim="form.password" :icon="mdiAsterisk" type="password" />
        </FormField>
        <div class="mb-3" v-for="error of  $v.password.$errors " :key="error.$uid">
          <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
        </div>

        <FormCheckRadio v-model="form.remember" name="remember" label="Remember me" :input-value="true" />



        <template #footer>
          <BaseButton type="submit" color="info" label="SIGN IN" class="w-full mb-3" :disabled="authStore.isLoading" />
          <a class="block text-blue-600 text-sm underline cursor-pointer" href="/forgot-password">Forgot password?</a>
        </template>

      </CardBox>

      <ClipLoader class="absolute w-full h-full top-0 left-0 flex justify-center items-center" :color="info"
        v-if="authStore.isLoading" />
    </SectionFullScreen>
  </LayoutGuest>
</template>
