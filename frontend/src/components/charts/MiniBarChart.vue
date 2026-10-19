<template>
  <div class="flex items-end gap-1.5 h-10 select-none" aria-hidden="true">
    <div
      v-for="(val, index) in normalizedBars"
      :key="index"
      :class="[
        'w-2.5 rounded-[3px] transition-all duration-300',
        index === normalizedBars.length - 1 ? 'bg-primary' : 'bg-primary-soft'
      ]"
      :style="{ height: `${val.height}%` }"
      :title="`${val.raw}`"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => [3, 5, 2, 8, 6, 4, 7]
  }
})

const normalizedBars = computed(() => {
  const list = props.data && props.data.length ? props.data : [1, 1, 1, 1, 1, 1, 1]
  // Guarantee 7 bars if fewer are provided
  let arr = [...list]
  if (arr.length < 7) {
    const pad = Array(7 - arr.length).fill(0)
    arr = [...pad, ...arr]
  } else if (arr.length > 7) {
    arr = arr.slice(-7)
  }

  const max = Math.max(...arr, 1)
  return arr.map(val => ({
    raw: val,
    height: Math.max(12, Math.round((val / max) * 100))
  }))
})
</script>
