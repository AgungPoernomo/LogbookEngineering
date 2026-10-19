<template>
  <div class="bg-surface rounded-lg shadow-card p-4 flex flex-col justify-between min-h-[190px]">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-[16px] font-semibold text-ink leading-snug">
        {{ title }}
      </h3>

      <!-- Visual More Icon per 11.5.6 -->
      <button
        type="button"
        class="text-ink-3 hover:text-ink p-1 rounded-md transition"
        aria-label="Opsi tambahan"
      >
        <MoreHorizontal class="w-4 h-4" />
      </button>
    </div>

    <!-- Progress List -->
    <div class="space-y-3 flex-1 overflow-y-auto pr-0.5">
      <div
        v-if="items.length === 0"
        class="py-4 text-center text-xs text-ink-3"
      >
        Belum ada data
      </div>
      <div
        v-for="(item, idx) in items"
        :key="item.name"
        class="space-y-1.5"
      >
        <!-- Row: Name (left) and Percent (right) per 11.5.6 -->
        <div class="flex items-center justify-between text-[13px] font-medium text-ink">
          <span class="truncate pr-2">{{ item.name }}</span>
          <span class="tabular-nums font-semibold shrink-0">{{ item.percent }}%</span>
        </div>

        <!-- Progress Bar (height 10px, radius 3, track #EEF0F4) -->
        <ProgressBar
          :value="item.percent"
          :color="getColorForIndex(idx)"
          height="md"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import ProgressBar from '../common/ProgressBar.vue'
import { MoreHorizontal } from 'lucide-vue-next'

defineProps({
  title: {
    type: String,
    default: 'Persetujuan per Shift'
  },
  // items: Array of { name: string, percent: number }
  items: {
    type: Array,
    default: () => []
  }
})

// Color cycle: success, warning, violet, primary per 11.5.6
const colorCycle = ['success', 'warning', 'violet', 'primary']

function getColorForIndex(idx) {
  return colorCycle[idx % colorCycle.length]
}
</script>
