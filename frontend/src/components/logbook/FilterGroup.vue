<template>
  <div class="border-t border-line pt-3">
    <!-- Header: Title + Collapse Chevron -->
    <button
      type="button"
      class="w-full flex items-center justify-between text-left py-1 text-xs font-semibold text-ink hover:text-primary transition"
      @click="isOpen = !isOpen"
    >
      <span>{{ title }}</span>
      <ChevronUp v-if="isOpen" class="w-4 h-4 text-ink-2" />
      <ChevronDown v-else class="w-4 h-4 text-ink-2" />
    </button>

    <!-- Content slot -->
    <div v-show="isOpen" class="mt-2 space-y-0.5">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChevronUp, ChevronDown } from 'lucide-vue-next'

defineProps({
  title: {
    type: String,
    required: true
  },
  defaultOpen: {
    type: Boolean,
    default: true
  }
})

const isOpen = ref(true)
</script>
