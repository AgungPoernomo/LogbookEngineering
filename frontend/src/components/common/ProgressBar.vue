<template>
  <div class="w-full">
    <div
      :class="[
        'w-full bg-[#EEF0F4] overflow-hidden rounded-sm',
        heightClass
      ]"
      role="progressbar"
      :aria-valuenow="clampedValue"
      :aria-valuemin="0"
      :aria-valuemax="100"
    >
      <div
        :class="[
          'h-full rounded-sm transition-all duration-300',
          colorClass
        ]"
        :style="{ width: `${clampedValue}%` }"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: Number,
    default: 0
  },
  color: {
    type: String,
    default: 'primary' // 'primary', 'success', 'warning', 'violet', 'danger'
  },
  height: {
    type: String,
    default: 'md' // 'sm' (8px), 'md' (10px)
  }
})

const clampedValue = computed(() => {
  return Math.min(100, Math.max(0, Math.round(props.value || 0)))
})

const heightClass = computed(() => {
  return props.height === 'sm' ? 'h-2' : 'h-2.5'
})

const colorClass = computed(() => {
  const map = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    violet: 'bg-violet',
    danger: 'bg-danger'
  }
  return map[props.color] || (props.color.startsWith('bg-') ? props.color : 'bg-primary')
})
</script>
