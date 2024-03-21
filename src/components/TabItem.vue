<template>
  <li class="-mb-px mr-2 last:mr-0 text-center w-52 cursor-pointer">
    <a class="text-xs font-bold uppercase px-5 py-3 shadow-lg rounded block border leading-normal"
      :class="isActive ? colorsText['info'] : colorsText['contrast']" @click="$emit('click', tabNumber)">
      <slot></slot>
    </a>
  </li>
</template>

<script setup>
import { colorsText } from '@/colors';


const props = defineProps(['tabNumber', 'isActive']);
</script>

