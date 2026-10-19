<template>
  <div class="bg-surface rounded-lg shadow-card p-4 flex flex-col justify-between min-h-[266px]">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-[18px] font-semibold text-ink leading-6">
        {{ title }}
      </h2>

      <!-- Date Range Indicator per 11.5.4 -->
      <div class="flex items-center gap-1.5 h-[30px] px-2.5 rounded-md border border-line bg-surface text-ink-2 text-xs">
        <Calendar class="w-3.5 h-3.5 text-ink-3" />
        <span>{{ dateRangeLabel }}</span>
      </div>
    </div>

    <!-- Area Chart Canvas -->
    <div class="flex-1 w-full pt-2">
      <AreaChart :data="chartData" :initial-month="currentMonth" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AreaChart from '../charts/AreaChart.vue'
import { Calendar } from 'lucide-vue-next'

const props = defineProps({
  title: {
    type: String,
    default: 'Tren Aktivitas'
  },
  chartData: {
    type: Array,
    default: () => [8, 14, 12, 20, 24, 18, 30, 36, 28, 22, 19, 25]
  },
  year: {
    type: [String, Number],
    default: 2026
  }
})

const currentMonth = new Date().getMonth()

const dateRangeLabel = computed(() => {
  return `Jan - Des ${props.year}`
})
</script>
