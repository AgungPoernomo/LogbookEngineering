<template>
  <div
    class="flex items-center border-b border-line bg-surface shrink-0"
    role="row"
  >
    <!-- Kolom Zona Waktu (Sel Kiri, menyamakan lebar TimeAxis sticky) -->
    <div
      class="w-12 sm:w-16 h-14 shrink-0 border-r border-line flex items-end justify-end pb-2 pr-2 select-none"
      aria-hidden="true"
    >
      <span class="text-[9px] sm:text-[10px] font-medium text-ink-3 text-right leading-tight">
        WIB
        <span class="hidden sm:inline">(GMT+7)</span>
      </span>
    </div>

    <!-- Kolom Hari -->
    <div class="flex-1 min-w-0 flex items-stretch">
      <DayHeaderCell
        v-for="day in days"
        :key="day.dateStr"
        :date-str="day.dateStr"
        :is-today="day.isToday"
      />
    </div>
  </div>
</template>

<script setup>
import DayHeaderCell from './DayHeaderCell.vue'

defineProps({
  days: {
    type: Array,
    required: true
  }
})
</script>
