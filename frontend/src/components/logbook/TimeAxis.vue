<template>
  <!-- Kolom jam: lengket (sticky left) & berlatar solid agar label tetap terlihat saat grid digulir horizontal -->
  <div
    class="w-12 sm:w-16 h-[calc(var(--planner-hour-h)*24)] shrink-0 border-r border-line sticky left-0 z-20 select-none bg-surface"
    role="rowheader"
  >
    <div
      v-for="hour in hours"
      :key="hour"
      class="absolute right-0 pr-2 -translate-y-1/2 text-[10px] sm:text-[11px] font-mono text-ink-2"
      :style="{ top: `calc(var(--planner-hour-h) * ${hour})` }"
    >
      {{ String(hour).padStart(2, '0') }}:00
    </div>
  </div>
</template>

<script setup>
// Hours 1 to 23 (00:00 is omitted per 5.6)
const hours = Array.from({ length: 23 }, (_, i) => i + 1)
</script>
