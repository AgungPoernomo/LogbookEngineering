<template>
  <AppModal v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </AppModal>
</template>

<script setup>
import AppModal from './AppModal.vue'
</script>
