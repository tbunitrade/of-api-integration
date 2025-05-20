<script setup>
import { computed, onMounted, onUnmounted} from 'vue';
import { mdiClose } from '@mdi/js';
import BaseButton from '@/components/BaseButton.vue';
import BaseButtons from '@/components/BaseButtons.vue';
import CardBox from '@/components/CardBox.vue';
import OverlayLayer from '@/components/OverlayLayer.vue';
import CardBoxComponentTitle from '@/components/CardBoxComponentTitle.vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  button: {
    type: String,
    default: 'info'
  },
  buttonLabel: {
    type: String,
    default: 'Done'
  },
  hasCancel: Boolean,
  size: {
    type: String,
    default: null,
  },
  modelValue: {
    type: [String, Number, Boolean],
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'cancel', 'confirm']);

const value = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const confirmCancel = (mode) => {
  emit(mode);
  if (mode === "cancel") {
    value.value = false;
  }
};

const confirm = () => confirmCancel('confirm');

const cancel = () => confirmCancel('cancel');

//window.addEventListener('keydown', (e) => {
const handleKeyDown = (e) => {
  if (e.key === 'Escape' && value.value) {
    cancel();
  }
};

onMounted(() => window.addEventListener('keydown', handleKeyDown));
onUnmounted(()=> window.removeEventListener('keydown', handleKeyDown));
</script>

<template>
  <OverlayLayer v-show="value" @overlay-click="cancel">
    <CardBox v-show="value" class="shadow-lg max-h-modal w-11/12 md:w-3/5 lg:w-2/5 xl:w-6/12 z-50 overflow-scroll"
      :class="size ? size : ''" is-modal>
      <CardBoxComponentTitle :title="title">
        <BaseButton v-if="hasCancel" :icon="mdiClose" color="whiteDark" small rounded-full @click.prevent="cancel" />
      </CardBoxComponentTitle>

      <div class="space-y-3">
        <slot />
      </div>

      <template #footer>
        <BaseButtons type="justify-between">
          <BaseButton v-if="hasCancel" label="Cancel" :color="button" outline @click="cancel" />
          <BaseButton :label="buttonLabel" :color="button" @click="confirm" />
        </BaseButtons>
      </template>
    </CardBox>
  </OverlayLayer>
</template>
