<template>
  <div
    :class="[
      'inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none font-semibold text-white bg-primary',
      sizeClasses[size] || sizeClasses.md,
      customClass
    ]"
    :title="name"
  >
    <img
      v-if="src && !hasError"
      :src="src"
      :alt="name || 'Avatar'"
      class="w-full h-full object-cover"
      @error="hasError = true"
    />
    <span v-else :class="textSizeClasses[size] || 'text-xs'">
      {{ initials }}
    </span>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md' // 'sm' (28px), 'md' (32px), 'lg' (36px), 'xl' (40px)
  },
  customClass: {
    type: String,
    default: ''
  }
})

const hasError = ref(false)

watch(() => props.src, () => {
  hasError.value = false
})

const initials = computed(() => {
  if (!props.name) return '?'
  const parts = props.name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
})

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-7 h-7', // 28px
  md: 'w-8 h-8', // 32px
  lg: 'w-9 h-9', // 36px
  xl: 'w-10 h-10' // 40px
}

const textSizeClasses = {
  xs: 'text-[10px]',
  sm: 'text-[11px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-sm'
}
</script>
