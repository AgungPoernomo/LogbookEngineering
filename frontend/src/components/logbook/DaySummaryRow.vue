<template>
  <div class="flex items-start border-b border-line bg-surface shrink-0 min-h-[26px] py-1">
    <!-- Kolom Kosong di Kiri (menyamakan lebar TimeAxis) -->
    <div class="w-12 sm:w-16 shrink-0 border-r border-line" aria-hidden="true" />

    <!-- Kolom Summary per Hari -->
    <div class="flex-1 min-w-0 flex items-stretch">
      <div
        v-for="day in days"
        :key="day.dateStr"
        class="flex-1 min-w-0 px-1 sm:px-1.5 space-y-1 border-r border-line last:border-r-0"
      >
        <DaySummaryChip
          v-for="chip in day.summaryChips"
          :key="chip.id"
          :chip="chip"
          @open-edit="$emit('openEdit', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import DaySummaryChip from './DaySummaryChip.vue'

defineProps({
  days: {
    type: Array,
    required: true
  }
})

defineEmits(['openEdit'])
</script>
