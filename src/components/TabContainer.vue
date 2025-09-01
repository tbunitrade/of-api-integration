
<script setup>
import { ref } from 'vue';
import TabItem from './TabItem.vue';
const props = defineProps(['tabs']);
const openTab = ref(1);
const emit = defineEmits(['click-tab']);

const toggleTabs = (tabNumber) => {
  openTab.value = tabNumber;
  emit('click-tab', tabNumber);
};
</script>
<style>
table {
  overflow: scroll;
  display: block;
}
</style>

<template>
  <div class="flex flex-wrap ">
    <div class="w-full">
      <ul class="flex mb-0 list-none flex-wrap pt-3 pb-4 flex-row ">
        <TabItem v-for="tab in tabs" :key="tab.id" :tabNumber="tab.id" :isActive="openTab === tab.id"
          @click="toggleTabs(tab.id)">
          {{ tab.title }}
        </TabItem>

      </ul>
      <div
        class="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded border-2 border-gray-300">
        <div class="px-4 py-5 flex-auto">
          <div class="tab-content tab-space">
            <slot :openTab="openTab"></slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

