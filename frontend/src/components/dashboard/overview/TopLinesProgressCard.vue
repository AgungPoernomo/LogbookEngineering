<template>
  <div class="bg-surface rounded-lg border border-line shadow-card p-4 sm:p-5 flex flex-col justify-between space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between pb-3 border-b border-line">
      <div class="flex items-center gap-2 min-w-0">
        <Activity class="w-4 h-4 text-primary shrink-0" />
        <h3 class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wider truncate">
          LINE DENGAN PENGISIAN LOG TERBANYAK
        </h3>
      </div>
      <span class="text-[10px] text-ink-3 shrink-0">Distribusi % line</span>
    </div>

    <!-- Progress List untuk Top Line / Mesin -->
    <div class="space-y-3 flex-1 justify-center flex flex-col">
      <div
        v-if="!summary.lines || summary.lines.length === 0"
        class="text-center py-6 text-xs text-ink-3"
      >
        Belum ada data pengerjaan line mesin tercatat.
      </div>

      <div
        v-for="item in summary.lines"
        :key="item.machineId || item.name"
        class="space-y-1.5"
      >
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 min-w-0">
            <!-- Rank number badge -->
            <span
              class="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0"
              :class="[
                item.rank === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                item.rank === 2 ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                item.rank === 3 ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                'bg-muted text-ink-3'
              ]"
            >
              {{ item.rank }}
            </span>

            <span
              class="w-2 h-2 rounded-full shrink-0"
              :style="{ backgroundColor: item.color.hex }"
            />

            <span class="font-semibold text-ink truncate">{{ item.name }}</span>
            <span class="text-[10px] font-mono text-ink-3 shrink-0 hidden sm:inline">({{ item.code }})</span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="text-ink-2 font-mono text-[11px]">
              {{ item.count }} log
            </span>
            <span class="font-bold text-ink text-xs w-9 text-right font-mono text-primary">
              {{ item.percentage }}%
            </span>
          </div>
        </div>

        <!-- Progress Bar Baris -->
        <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{
              width: `${Math.min(100, Math.max(item.percentage, item.count > 0 ? 4 : 0))}%`,
              backgroundColor: item.color.hex
            }"
          />
        </div>
      </div>
    </div>

    <!-- Footer Summary Total -->
    <div class="pt-3 border-t border-line flex items-center justify-between text-xs">
      <div class="text-ink-2 truncate">
        Total: <strong class="text-ink">{{ summary.totalLogs || 0 }}</strong> logbook terdistribusi
      </div>

      <div v-if="summary.topLine" class="flex items-center gap-1 text-[11px] shrink-0 font-medium text-ink-2">
        <span>Line Paling Intensif:</span>
        <span class="font-semibold text-primary truncate max-w-[120px]">
          {{ summary.topLine.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Activity } from 'lucide-vue-next'

defineProps({
  summary: {
    type: Object,
    default: () => ({
      lines: [],
      totalLogs: 0,
      topLine: null
    })
  }
})
</script>
