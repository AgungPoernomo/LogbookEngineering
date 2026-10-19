<template>
  <div
    class="w-12 sm:w-16 h-[1440px] shrink-0 border-r border-line relative select-none bg-surface"
    aria-hidden="true"
  >
    <div
      v-for="hour in hours"
      :key="hour"
      class="absolute right-0 pr-2 -translate-y-1/2 text-[11px] font-mono text-ink-2"
      :style="{ top: `${hour * 60}px` }"
    >
      {{ String(hour).padStart(2, '0') }}:00
    </div>
  </div>
</template>

<script setup>
// Hours 1 to 23 (00:00 is omitted per 5.6)
const hours = Array.from({ length: 23 }, (_, i) => i + 1)
</script>
