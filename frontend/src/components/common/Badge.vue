<template>
  <AppBadge v-bind="$attrs">
    <slot />
  </AppBadge>
</template>

<script setup>
import AppBadge from './AppBadge.vue'
</script>
