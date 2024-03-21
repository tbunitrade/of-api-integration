<template>
  <div v-show="show">
    <slot></slot>
  </div>
</template>

<script setup>
const props = defineProps(['show']);

</script>
