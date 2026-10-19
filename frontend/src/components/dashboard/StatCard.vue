<template>
  <div class="bg-surface rounded-lg shadow-card p-3.5 sm:p-4 flex items-center justify-between min-h-[88px] min-w-0">
    <!-- Left Column: Label, Value, Delta -->
    <div class="flex flex-col justify-between h-full min-w-0 pr-2">
      <!-- Label -->
      <span class="text-[12px] font-normal text-ink-2 leading-4 truncate">
        {{ label }}
      </span>

      <!-- Value -->
      <span class="text-[18px] font-semibold text-ink leading-6 my-1 truncate">
        {{ value }}
      </span>

      <!-- Delta badge (if delta available) -->
      <div v-if="delta !== null && delta !== undefined && delta !== ''" class="flex items-center gap-1.5">
        <span class="inline-flex items-center justify-center w-3.5 h-3.5 rounded-[4px] border border-primary text-primary shrink-0">
          <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </span>
        <span class="text-[12px] font-medium text-primary leading-4">
          {{ formattedDelta }}
        </span>
      </div>
      <div v-else-if="sublabel" class="text-[11px] text-ink-3">
        {{ sublabel }}
      </div>
    </div>

    <!-- Right Column: MiniBarChart or Meter variant -->
    <div class="shrink-0 flex items-center justify-end pl-2">
      <!-- Meter variant for Supervisor "Teknisi Aktif" per 11.5.3 -->
      <div v-if="isMeter" class="w-24 flex flex-col items-end gap-1.5">
        <div class="text-[11px] font-medium text-ink-2">
          <span class="text-primary font-semibold">{{ meterCurrent }}</span> / {{ meterTotal }} aktif
        </div>
        <div class="w-full bg-primary-soft h-2 rounded-[4px] overflow-hidden" role="progressbar" :aria-valuenow="meterCurrent" :aria-valuemax="meterTotal">
          <div
            class="bg-primary h-full rounded-[4px] transition-all duration-300"
            :style="{ width: `${meterPercent}%` }"
          />
        </div>
      </div>

      <!-- Standard 7-bar chart variant -->
      <MiniBarChart v-else :data="chartData" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MiniBarChart from '../charts/MiniBarChart.vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  delta: {
    type: [String, Number],
    default: null
  },
  sublabel: {
    type: String,
    default: ''
  },
  chartData: {
    type: Array,
    default: () => [2, 4, 3, 6, 5, 4, 7]
  },
  isMeter: {
    type: Boolean,
    default: false
  },
  meterCurrent: {
    type: Number,
    default: 0
  },
  meterTotal: {
    type: Number,
    default: 0
  }
})

const formattedDelta = computed(() => {
  if (typeof props.delta === 'number') {
    return props.delta > 0 ? `+${props.delta}%` : `${props.delta}%`
  }
  return String(props.delta)
})

const meterPercent = computed(() => {
  if (!props.meterTotal || props.meterTotal <= 0) return 0
  return Math.min(100, Math.round((props.meterCurrent / props.meterTotal) * 100))
})
</script>
