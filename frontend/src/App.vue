<template>
  <component :is="layoutComponent">
    <RouterView />
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AuthLayout from './layouts/AuthLayout.vue'
import MainLayout from './layouts/MainLayout.vue'

const route = useRoute()

const layoutComponent = computed(() => {
  if (route.name === 'login') {
    return AuthLayout
  }
  return MainLayout
})
</script>
