<template>
  <div
    class="absolute left-1 right-2 z-20 bg-primary-soft/75 border-[1.5px] border-dashed border-primary rounded-md p-1.5 pointer-events-none select-none flex flex-col justify-start"
    :style="{ top: `${top}px`, height: `${height}px` }"
    aria-hidden="true"
  >
    <span class="text-[11px] font-mono font-semibold text-primary leading-none">
      {{ label }}
    </span>
  </div>
</template>

<script setup>
defineProps({
  top: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  }
})
</script>
