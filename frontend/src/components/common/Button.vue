<template>
  <AppButton v-bind="$attrs">
    <slot />
  </AppButton>
</template>

<script setup>
import AppButton from './AppButton.vue'
</script>
