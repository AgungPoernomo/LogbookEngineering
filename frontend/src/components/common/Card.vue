<template>
  <div :class="['bg-surface rounded-lg shadow-card p-4', customClass]">
    <div v-if="$slots.header || title" class="flex items-center justify-between pb-3 mb-3 border-b border-line">
      <slot name="header">
        <div>
          <h3 v-if="title" class="text-base font-semibold text-ink leading-tight">{{ title }}</h3>
          <p v-if="subtitle" class="text-xs text-ink-2 mt-0.5">{{ subtitle }}</p>
        </div>
      </slot>
    </div>
    <slot />
    <div v-if="$slots.footer" class="pt-3 mt-3 border-t border-line">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  customClass: {
    type: String,
    default: ''
  }
})
</script>
