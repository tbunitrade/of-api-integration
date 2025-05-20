<script setup>
import { onMounted, ref, computed } from "vue";
import { mdiTableBorder } from '@mdi/js';
import { useNotification } from "@kyvg/vue3-notification";
import { ClipLoader } from "vue3-spinner";
import { useVuelidate } from '@vuelidate/core';
import { required, email, minLength, sameAs } from '@vuelidate/validators';
import { useUserStore } from '@/stores';
import SectionMain from '@/components/SectionMain.vue';
import CardBox from '@/components/CardBox.vue';
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue';
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue';
import BaseButton from '@/components/BaseButton.vue';
import TableUsers from '@/components/TableUsers.vue';

import CardBoxModal from '@/components/CardBoxModal.vue';
import FormField from '@/components/FormField.vue';
import FormControl from '@/components/FormControl.vue';
import { colorsText } from '@/colors.js';

const userStore = useUserStore();
const { notify } = useNotification();

const deleteCallback = ref(null);
const isModalDangerActive = ref(false);


const selectedUser = ref({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: ""
});
const isModalActive = ref(false);


const rules = computed(() => (
  {
    email: {
      required,
      email
    },
    firstName: { required, minLength: minLength(2) },
    lastName: { required },
    password: {
      required,
      // valid: function (value) {
      //   const containsUppercase = /[A-Z]/.test(value);
      //   const containsLowercase = /[a-z]/.test(value);
      //   const containsNumber = /[0-9]/.test(value);
      //   const containsSpecial = /[#?!@$%^&*-]/.test(value);
      //   return containsUppercase && containsLowercase && containsNumber && containsSpecial;
      // },
      minLength: minLength(4),
      // maxLength: maxLength(19),
    },
    confirmPassword: { required, sameAsPassword: sameAs(selectedUser.value.password) },
  }));

const $v = useVuelidate(rules, selectedUser);

const fetchData = async () => {
  try {
    await userStore.getAllUsers();
  } catch (error) {
    console.error('Error fetching data:', error);

  }
};

const onSubmit = async () => {
  if (selectedUser.value.isEdit) {
    if (selectedUser.value.password?.length > 0) {
      const result = await $v.value.$validate();
      if (!result)
        return;
    }
    const updateData = {
      id: selectedUser.value.id,
      ...(selectedUser.value.firstName?.length > 0 && { firstName: selectedUser.value.firstName }),
      ...(selectedUser.value.lastName?.length > 0 && { lastName: selectedUser.value.lastName }),
      ...(selectedUser.value.email?.length > 0 && { email: selectedUser.value.email }),
      ...(selectedUser.value.password?.length > 0 && { password: selectedUser.value.password }),

    };
    const edit_result = await userStore.updateUser(updateData);
    if (edit_result) {
      notify({
        title: "Success",
        type: "success",
        text: "Profile updated successfully",
      });
      isModalActive.value = false;
      $v.value.$reset();
    }

  } else {
    const result = $v.value.$validate();
    result.then(async (res) => {
      if (res) {
        const add_result = await userStore.addUser(selectedUser.value);
        if (add_result) {
          notify({
            title: "Success",
            type: "success",
            text: "Profile added successfully",
          });
        }
        $v.value.$reset();
        isModalActive.value = false;
      }
    }).catch((err) => {
      console.log(err);
    });
  }

};

const onClickEditUser = (id) => {
  const user = (userStore.users || []).filter((it) => it.id === id);

  if (user) {
    selectedUser.value = { ...user[0], isEdit: true };
    isModalActive.value = true;
  }

};
const onAddNewUser = () => {
  selectedUser.value = {
    isEdit: false,
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  };
  $v.value.$reset();
  isModalActive.value = true;
};

const onDeleteUser = (id) => {
  isModalDangerActive.value = true;
  deleteCallback.value = () => { confirmDeleteUser(id); };
};

const confirmDeleteUser = async (id) => {
  const del_result = await userStore.deleteUser(id);
  if (del_result) {
    notify({
      title: "Success",
      type: "success",
      text: "User deleted successfully",
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
      <SectionTitleLineWithButton :icon="mdiTableBorder" title="Users" main>
        <BaseButton label="+ Add new" color="info" rounded-full small @click="onAddNewUser" />
      </SectionTitleLineWithButton>


      <CardBox class="mb-6 relative" has-table>
        <TableUsers checkable :users="userStore.users" @click-row="onClickEditUser" @delete-row="onDeleteUser" />
        <ClipLoader class="absolute top-0 left-0 w-full h-full flex justify-center items-center" :color="info"
          v-if="userStore.isLoading" />
      </CardBox>


      <CardBoxModal v-model="isModalActive" title="User" :buttonLabel="selectedUser.isEdit ? 'Update' : '+ Add'"
        :hasCancel="true" @confirm="onSubmit">

        <CardBox is-form>
          <div class="grid grid-cols-2 lg:grid-cols-2 gap-6">
            <div>
              <FormField label="First Name" help="Required. Your First name">
                <FormControl v-model="selectedUser.firstName" :icon="mdiAccount" name="firstName" required
                  autocomplete="firstName" />
              </FormField>
              <div class="mb-3" v-for="error of  $v.firstName.$errors " :key="error.$uid">
                <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
              </div>
              <FormField label="Last Name" help="Required. Your Last name">
                <FormControl v-model="selectedUser.lastName" :icon="mdiAccount" name="lastName" required
                  autocomplete="lastName" />
              </FormField>
              <div class="mb-3" v-for="error of  $v.lastName.$errors " :key="error.$uid">
                <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
              </div>
              <FormField label="E-mail" help="Required. Your e-mail">
                <FormControl v-model="selectedUser.email" :icon="mdiMail" type="email" name="email" required
                  autocomplete="email" />
              </FormField>
              <div class="mb-3" v-for="error of  $v.email.$errors " :key="error.$uid">
                <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
              </div>
            </div>
            <div>
              <FormField label="New password" help="Required. New password">
                <FormControl v-model="selectedUser.password" :icon="mdiFormTextboxPassword" name="password"
                  type="password" required autocomplete="new-password" />
              </FormField>
              <div class="mb-3" v-for="error of  $v.password.$errors " :key="error.$uid">
                <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
              </div>

              <FormField label="Confirm password" help="Required. New password one more time">
                <FormControl v-model="selectedUser.confirmPassword" :icon="mdiFormTextboxPassword" name="confirmPassword"
                  type="password" required autocomplete="confirmPassword" />
              </FormField>
              <div class="mb-3" v-for="error of  $v.confirmPassword.$errors " :key="error.$uid">
                <div :class="[colorsText['danger'], 'text-sm']">{{ error.$message }}</div>
              </div>
            </div>
          </div>


        </CardBox>
        <ClipLoader class="absolute w-full h-full top-0 left-0 flex justify-center items-center" :color="info"
          v-if="userStore.isLoading" />
      </CardBoxModal>
      <CardBoxModal v-model="isModalDangerActive" title="Please confirm" button="danger" button-label="Delete" has-cancel
        @confirm="deleteCallback">
        <p>Are you sure you want to delete? </p>
      </CardBoxModal>

    </SectionMain>
  </LayoutAuthenticated>
</template>
