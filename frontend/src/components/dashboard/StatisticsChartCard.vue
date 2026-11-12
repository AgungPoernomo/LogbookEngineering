<template>
  <div class="bg-surface rounded-lg shadow-card p-4 flex flex-col justify-between h-full">
    <!-- Header -->
    <div class="flex items-center justify-between pb-2.5 border-b border-line mb-3 shrink-0">
      <div class="flex items-center gap-1.5">
        <component :is="icon" class="w-4 h-4 text-primary shrink-0" />
        <h2 class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide leading-6">
          {{ title }}
        </h2>
      </div>

      <!-- Date Range Indicator -->
      <div class="flex items-center gap-1.5 h-[30px] px-2.5 rounded-md border border-line bg-surface text-ink-2 text-xs">
        <Calendar class="w-3.5 h-3.5 text-ink-3" />
        <span>{{ dateRangeLabel }}</span>
      </div>
    </div>

    <!-- Area Chart Canvas (PERUBAHAN DI SINI) -->
    <div class="flex-1 w-full pt-2 min-h-0 flex flex-col">
      <AreaChart :data="chartData" :initial-month="currentMonth" class="h-full w-full flex-1" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AreaChart from '../charts/AreaChart.vue'
import { TrendingUp, Calendar } from 'lucide-vue-next'

const props = defineProps({
  title: {
    type: String,
    default: 'Tren Aktivitas'
  },
  icon: {
    type: [Object, Function],
    default: () => TrendingUp
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
