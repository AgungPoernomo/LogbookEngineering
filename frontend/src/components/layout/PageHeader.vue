<template>
  <div class="flex flex-col justify-center min-w-0">
    <h1 class="text-sm sm:text-base md:text-[18px] font-semibold text-ink leading-snug sm:leading-6 truncate">
      {{ title }}
    </h1>
    <p v-if="subtitle" class="text-[11px] sm:text-[12px] font-normal text-ink-2 leading-tight sm:leading-4 truncate">
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  }
})
</script>
