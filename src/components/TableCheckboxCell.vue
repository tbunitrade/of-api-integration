<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  type: {
    type: String,
    default: 'td'
  },
  isChecked: {
    type: Boolean,
    default: false
  }
});
const emit = defineEmits(['checked']);

const checked = ref(props.isChecked);
watch(checked, (newVal) => {
  emit('checked', newVal);
});
watch(props, (newVal) => {
  checked.value = newVal.isChecked;
});
</script>

<template>
  <component :is="type" class="lg:w-1">
    <label class="checkbox">
      <input v-model="checked" type="checkbox" />
      <span class="check" />
    </label>
  </component>
</template>
