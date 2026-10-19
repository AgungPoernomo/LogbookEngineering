<template>
  <div class="bg-surface rounded-lg shadow-card p-4 flex flex-col justify-between min-h-[190px]">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[16px] font-semibold text-ink leading-snug">
        {{ title }}
      </h3>

      <!-- Period Dropdown per 11.5.5 -->
      <div class="relative">
        <label :for="`period-select-${title.toLowerCase().replace(/\s+/g, '-')}`" class="sr-only">Periode Donut</label>
        <div class="relative flex items-center h-7 px-2.5 rounded-md border border-line bg-surface text-ink text-[12px]">
          <select
            :id="`period-select-${title.toLowerCase().replace(/\s+/g, '-')}`"
            v-model="selectedPeriod"
            class="bg-transparent text-[12px] font-medium text-ink focus:outline-none cursor-pointer pr-4 appearance-none"
          >
            <option value="monthly">Bulanan</option>
            <option value="yearly">Tahunan</option>
          </select>
          <ChevronDown class="w-3.5 h-3.5 text-ink-3 absolute right-2 pointer-events-none" />
        </div>
      </div>
    </div>

    <!-- Donut and Legend Row -->
    <div class="flex items-center gap-4 sm:gap-6 flex-1">
      <!-- Donut Chart -->
      <DonutChart :items="statusItems" />

      <!-- Legend List -->
      <div class="flex-1 space-y-1.5 min-w-0">
        <div
          v-for="item in statusItems"
          :key="item.status"
          :class="[
            'flex items-center justify-between px-2 py-0.5 rounded-sm text-[12px] leading-5 transition-colors',
            item.status === 'Approved' ? 'bg-row-blue' : (item.status === 'Rejected' ? 'bg-row-red' : '')
          ]"
        >
          <div class="flex items-center gap-2 truncate pr-2">
            <span
              class="w-1.5 h-1.5 rounded-full shrink-0"
              :style="{ backgroundColor: item.color }"
            />
            <span class="text-ink truncate font-normal">
              {{ item.label }} ({{ item.percent }}%)
            </span>
          </div>
          <span class="font-medium text-ink tabular-nums text-right shrink-0">
            {{ item.count }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import DonutChart from '../charts/DonutChart.vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  title: {
    type: String,
    default: 'Status Logbook'
  },
  counts: {
    type: Object,
    default: () => ({
      DRAFT: 0,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0
    })
  }
})

const selectedPeriod = ref('monthly')

const statusConfig = [
  { status: 'Draft', key: 'DRAFT', label: 'Draft', color: '#9CA3AF' },
  { status: 'Pending', key: 'PENDING', label: 'Pending', color: '#EAB308' },
  { status: 'Approved', key: 'APPROVED', label: 'Approved', color: '#22A55B' },
  { status: 'Rejected', key: 'REJECTED', label: 'Rejected', color: '#EF4444' },
  { status: 'Cancelled', key: 'CANCELLED', label: 'Cancelled', color: '#374151' }
]

const total = computed(() => {
  return statusConfig.reduce((acc, curr) => acc + (props.counts[curr.key] || 0), 0)
})

const statusItems = computed(() => {
  const tot = total.value
  return statusConfig.map(cfg => {
    const count = props.counts[cfg.key] || 0
    const percent = tot > 0 ? Math.round((count / tot) * 100) : 0
    return {
      status: cfg.status,
      label: cfg.label,
      color: cfg.color,
      count,
      percent
    }
  })
})
</script>
