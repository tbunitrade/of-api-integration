<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }, // HH:mm
  presets: { type: Array, default: () => ['08:00','10:00','12:00','14:00','16:00','18:00'] },
  label: { type: String, default: 'Message Time' },
  required: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue'])

const value = computed({
  get: () => props.modelValue|| '',
  set: v => emit('update:modelValue', v)
})

const setPreset = (t) => emit('update:modelValue', t)
</script>

<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium"> {{ label }}}</label>

    <input
      v-model="value"
      type="time"
      step="300"
      :required="required"
      class="border rounded px-3 py-2 w-44"
      />

    <div class="flex flex-wrap gap-2">
      <button
        v-for="t in presets"
        :key="t"
        type="button"
        @click="setPreset(t)"
        class="px-2 py-1 rounded border hover:bg-gray-50"
        :class="value === t ? 'border-blue-500 ring-1 ring-blue-300' : 'border-gray-300'"
        title="Set Preset"
        >
        {{t}}
      </button>
      <button
        type="button"
        class="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
        @click="setPreset('')"
      >
        Clear
      </button>
    </div>
  </div>
</template>
