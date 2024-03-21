<script setup>
import { mdiForwardburger, mdiBackburger, mdiMenu } from '@mdi/js';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import menuAside from '@/menuAside.js';
import menuNavBar from '@/menuNavBar.js';
import { useDarkModeStore } from '@/stores/darkMode.js';
import BaseIcon from '@/components/BaseIcon.vue';
import FormControl from '@/components/FormControl.vue';
import NavBar from '@/components/NavBar.vue';
import NavBarItemPlain from '@/components/NavBarItemPlain.vue';
import AsideMenu from '@/components/AsideMenu.vue';
import FooterBar from '@/components/FooterBar.vue';
import { useAuthStore, useModelStore, usePlatformStore } from '@/stores';

const layoutAsidePadding = 'xl:pl-60';

const darkModeStore = useDarkModeStore();
const authStore = useAuthStore();
const modelStore = useModelStore();
const platformStore = usePlatformStore();
const menus = reactive(menuNavBar);
const models = computed(() => modelStore.models);
const selectedModel = computed(() => modelStore.selectedModel);

const router = useRouter();

const isAsideMobileExpanded = ref(false);
const isAsideLgActive = ref(false);

router.beforeEach(() => {
  isAsideMobileExpanded.value = false;
  isAsideLgActive.value = false;
});

const menuClick = (event, item) => {
  if (item.isToggleLightDark) {
    darkModeStore.set();
  }

  if (item.isLogout) {
    authStore.logout();
    window.location.href = "#/login";
  }
  if (item.isModel) {
    const selectedModel = modelStore.models.filter(it => it.id === item.id)[0];
    modelStore.setSelectedModel(selectedModel);
    localStorage.setItem('selectedModel', JSON.stringify(selectedModel));
    location.reload();
  }
};

onMounted(() => {
  modelStore.getAllModels();
  platformStore.getAllPlatforms();
  const selectedModelStr = localStorage.getItem('selectedModel');
  if (selectedModelStr && selectedModelStr !== 'undefined') {
    modelStore.setSelectedModel(JSON.parse(selectedModelStr));
  }
  const selectedPlatformStr = localStorage.getItem('selectedPlatform');
  if (selectedPlatformStr && selectedPlatformStr !== 'undefined') {
    platformStore.setSelectedPlatform(JSON.parse(selectedPlatformStr));
  }

});
watch(models, () => {

  if (models.value.length > 0) {
    const items = models.value.map(it => ({ id: it.id, label: it.name, isModel: true }));
    menus[0].menu = items;
  }
});
watch(selectedModel, () => {
  if (selectedModel.value) {
    menus[0]['label'] = selectedModel.value.name;
  }
});
</script>

<template>
  <div :class="{
    'overflow-hidden lg:overflow-visible': isAsideMobileExpanded
  }">
    <div :class="[layoutAsidePadding, { 'ml-60 lg:ml-0': isAsideMobileExpanded }]"
      class="pt-14 min-h-screen w-screen transition-position lg:w-auto bg-gray-50 dark:bg-slate-800 dark:text-slate-100">
      <NavBar :menu="menus" :class="[layoutAsidePadding, { 'ml-60 lg:ml-0': isAsideMobileExpanded }]"
        @menu-click="menuClick">
        <NavBarItemPlain display="flex lg:hidden" @click.prevent="isAsideMobileExpanded = !isAsideMobileExpanded">
          <BaseIcon :path="isAsideMobileExpanded ? mdiBackburger : mdiForwardburger" size="24" />
        </NavBarItemPlain>
        <NavBarItemPlain display="hidden lg:flex xl:hidden" @click.prevent="isAsideLgActive = true">
          <BaseIcon :path="mdiMenu" size="24" />
        </NavBarItemPlain>
        <NavBarItemPlain use-margin>
          <FormControl placeholder="Search (ctrl+k)" ctrl-k-focus transparent borderless />
        </NavBarItemPlain>
      </NavBar>
      <AsideMenu :is-aside-mobile-expanded="isAsideMobileExpanded" :is-aside-lg-active="isAsideLgActive" :menu="menuAside"
        @menu-click="menuClick" @aside-lg-close-click="isAsideLgActive = false" />
      <slot />
      <FooterBar>

      </FooterBar>
    </div>
  </div>
</template>
