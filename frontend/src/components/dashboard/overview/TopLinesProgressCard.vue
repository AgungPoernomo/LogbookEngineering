<template>
  <div class="bg-surface rounded-lg border border-line shadow-card p-4 sm:p-5 flex flex-col justify-between space-y-4">
    <!-- Header Card -->
    <div class="flex items-center justify-between pb-3 border-b border-line">
      <div class="flex items-center gap-2 min-w-0">
        <Activity class="w-4 h-4 text-primary shrink-0" />
        <h3 class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wider truncate">
          DISTRIBUSI LOGBOOK PER LINE & MESIN
        </h3>
      </div>
      <span class="text-[10px] text-ink-3 shrink-0">Distribusi % Aktivitas</span>
    </div>

    <div class="space-y-4 flex-1">
      <!-- Section 1: Line dengan Pengisian Log Terbanyak -->
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
            <Layers class="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Line dengan Pengisian Log Terbanyak</span>
          </div>
          <span class="text-[10px] text-ink-3">Total per Line</span>
        </div>

        <div
          v-if="!summary.lines || summary.lines.length === 0"
          class="text-center py-3 text-xs text-ink-3"
        >
          Belum ada data pengerjaan line tercatat.
        </div>

        <div
          v-for="item in summary.lines"
          :key="item.plantId || item.name"
          class="space-y-1.5"
        >
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2 min-w-0">
              <!-- Rank badge -->
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
                class="w-2.5 h-2.5 rounded-full shrink-0"
                :style="{ backgroundColor: item.color.hex }"
              />

              <span class="font-semibold text-ink truncate">{{ item.name }}</span>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <span class="text-ink-2 font-mono text-[11px]">
                {{ item.count.toLocaleString() }} log
              </span>
              <span class="font-bold text-ink text-xs w-10 text-right font-mono text-primary">
                {{ item.percentage }}%
              </span>
            </div>
          </div>

          <!-- Progress Bar Baris Line -->
          <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{
                width: `${Math.min(100, Math.max(item.percentage, item.count > 0 ? 3 : 0))}%`,
                backgroundColor: item.color.hex
              }"
            />
          </div>
        </div>
      </div>

      <!-- Section 2: Mesin (disertai keterangan Linenya) dengan Log Terbanyak -->
      <div class="pt-3.5 border-t border-line space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
            <Cpu class="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Mesin dengan Log Terbanyak</span>
          </div>
          <span class="text-[10px] text-ink-3">Top 5 Mesin</span>
        </div>

        <div
          v-if="!summary.machines || summary.machines.length === 0"
          class="text-center py-3 text-xs text-ink-3"
        >
          Belum ada data pengerjaan mesin tercatat.
        </div>

        <div
          v-for="item in summary.machines"
          :key="item.machineId || (item.name + '_' + item.plantId)"
          class="space-y-1.5"
        >
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2 min-w-0">
              <!-- Rank badge -->
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

              <span class="font-semibold text-ink truncate">{{ item.name }}</span>

              <!-- Badge Keterangan Line Mesin -->
              <span
                class="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0"
                :style="{
                  backgroundColor: `${item.color.hex}18`,
                  color: item.color.hex
                }"
              >
                {{ item.plantName }}
              </span>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <span class="text-ink-2 font-mono text-[11px]">
                {{ item.count.toLocaleString() }} log
              </span>
              <span class="font-bold text-ink text-xs w-10 text-right font-mono text-primary">
                {{ item.percentage }}%
              </span>
            </div>
          </div>

          <!-- Progress Bar Baris Mesin -->
          <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{
                width: `${Math.min(100, Math.max(item.percentage, item.count > 0 ? 3 : 0))}%`,
                backgroundColor: item.color.hex
              }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Summary Total -->
    <div class="pt-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5">
      <div class="text-ink-2 truncate">
        Total: <strong class="text-ink">{{ summary.totalLogs?.toLocaleString() || 0 }}</strong> logbook terdistribusi
      </div>

      <div class="flex items-center gap-2.5 text-[11px] shrink-0 font-medium text-ink-2">
        <div v-if="summary.topLine" class="flex items-center gap-1">
          <span class="text-ink-3">Line Teraktif:</span>
          <span class="font-semibold text-primary truncate max-w-[120px]">
            {{ summary.topLine.name }}
          </span>
        </div>
        <div v-if="summary.topMachine" class="flex items-center gap-1 border-l border-line pl-2.5">
          <span class="text-ink-3">Mesin Terbanyak:</span>
          <span class="font-semibold text-ink truncate max-w-[140px]">
            {{ summary.topMachine.name }} ({{ summary.topMachine.plantName }})
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Activity, Layers, Cpu } from 'lucide-vue-next'

defineProps({
  summary: {
    type: Object,
    default: () => ({
      lines: [],
      machines: [],
      totalLogs: 0,
      topLine: null,
      topMachine: null
    })
  }
})
</script>
