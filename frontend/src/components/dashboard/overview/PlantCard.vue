<template>
  <div class="bg-surface rounded-lg border border-line shadow-card overflow-hidden flex flex-col">
    <!-- Accent Color Top Border Stripe -->
    <div class="h-1 w-full" :style="{ backgroundColor: plant.color.hex }" />

    <div class="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
      <!-- 1. Header Kartu: Ikon, Nama Plant, 3 Mini-Stat -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-line gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            :style="{ backgroundColor: `${plant.color.hex}18`, color: plant.color.hex }"
          >
            <Factory class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-ink truncate">
              {{ plant.fullName || plant.name }}
            </h3>
            <span class="text-[10px] font-mono text-ink-3">{{ plant.code }}</span>
          </div>
        </div>

        <!-- 2. 3 Mini-Stat: Total Log, Hari Ini, User Aktif (di KIRI) -->
        <div class="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 bg-muted/60 px-3 py-1.5 rounded-md border border-line/60 overflow-x-auto">
          <!-- Stat 1: Total Log -->
          <div class="text-left shrink-0">
            <div class="text-[9px] uppercase font-semibold text-ink-3">Total Log</div>
            <div class="flex items-baseline gap-1">
              <span class="text-xs sm:text-sm font-bold text-ink font-mono">
                {{ plant.totalLog?.toLocaleString('id-ID') || 0 }}
              </span>
              <span :class="plant.totalLogDelta?.isUp ? 'text-success font-semibold text-[9px]' : 'text-danger font-semibold text-[9px]'">
                {{ plant.totalLogDelta?.text || '0%' }}
              </span>
            </div>
          </div>

          <div class="h-6 w-px bg-line shrink-0" />

          <!-- Stat 2: Hari Ini -->
          <div class="text-left shrink-0">
            <div class="text-[9px] uppercase font-semibold text-ink-3">Log Harian</div>
            <div class="flex items-baseline gap-1">
              <span class="text-xs sm:text-sm font-bold text-ink font-mono">
                {{ plant.todayLog || 0 }}
              </span>
              <span :class="plant.todayDelta?.isUp ? 'text-success font-semibold text-[9px]' : 'text-danger font-semibold text-[9px]'">
                {{ plant.todayDelta?.text || '0%' }}
              </span>
            </div>
          </div>

          <div class="h-6 w-px bg-line shrink-0" />

          <!-- Stat 3: User Aktif -->
          <div class="text-left shrink-0">
            <div class="text-[9px] uppercase font-semibold text-ink-3">User Aktif</div>
            <div class="flex items-baseline gap-1">
              <span class="text-xs sm:text-sm font-bold text-ink font-mono">
                {{ plant.activeUsersCount || 0 }}
              </span>
              <span :class="plant.activeUsersDelta?.isUp ? 'text-success font-semibold text-[9px]' : 'text-danger font-semibold text-[9px]'">
                {{ plant.activeUsersDelta?.text || '0%' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Chart 7 Hari Terakhir (Leaderboard teknisi dihapus sesuai P1) -->
      <div class="grid grid-cols-1 gap-3 items-stretch">
        <!-- Placeholder slot (akan diisi pada Fase 3/4) -->

        <!-- 3. Chart Aktivitas 7 Hari Terakhir (SVG Bar Chart Responsif) di sebelah KANAN -->
        <div class="p-3 bg-muted/40 border border-line rounded-md flex flex-col justify-between">
          <div class="text-xs font-semibold text-ink mb-1 flex items-center justify-between">
            <span class="truncate">Log 7 Hari Terakhir</span>
            <span class="text-[10px] font-mono text-ink-3 shrink-0">{{ last7DaysTotal }} log</span>
          </div>

          <div class="h-24 w-full relative flex items-end justify-between gap-1.5 pt-5 pb-5 px-1 border-b border-line">
            <div
              v-for="bar in plant.last7Days"
              :key="bar.date"
              class="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              <!-- Angka di atas batang -->
              <span class="text-[10px] font-mono font-medium text-ink-2 mb-1 group-hover:font-bold transition-all">
                {{ bar.count }}
              </span>

              <!-- Batang Bar Chart -->
              <div
                class="w-full max-w-[24px] rounded-t transition-all duration-300 group-hover:opacity-80"
                :style="{
                  height: `${getBarHeight(bar.count)}%`,
                  backgroundColor: bar.count > 0 ? plant.color.hex : undefined,
                  minHeight: bar.count > 0 ? '4px' : '3px'
                }"
                :class="bar.count > 0 ? '' : 'bg-line'"
              />

              <!-- Label Sumbu-X (Sen, Sel, ...) -->
              <span class="text-[10px] font-medium text-ink-3 absolute -bottom-5">
                {{ bar.dayLabel }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Log Terbaru (Plant n) - 3 Baris (Di bawah Leaderboard & Chart) -->
      <div>
        <div class="text-xs font-semibold text-ink mb-2 flex items-center justify-between">
          <span>Log Terbaru</span>
          <span class="text-[10px] text-ink-3">3 entri terakhir</span>
        </div>

        <div class="space-y-2">
          <div
            v-if="!plant.recentLogs || plant.recentLogs.length === 0"
            class="p-4 text-center text-xs text-ink-3 bg-muted/40 rounded-md"
          >
            Belum ada aktivitas tercatat pada plant ini.
          </div>

          <div
            v-for="log in plant.recentLogs"
            :key="log.id"
            class="p-2.5 rounded-md border border-line bg-surface hover:bg-muted/60 transition flex items-center justify-between gap-2.5 cursor-pointer group"
            @click="$emit('open-log-detail', log)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <div
                class="w-7 h-7 rounded-full text-[11px] font-semibold text-white flex items-center justify-center shrink-0"
                :style="{ backgroundColor: plant.color.hex }"
              >
                {{ log.user_initials }}
              </div>
              <div class="min-w-0">
                <div class="text-xs font-semibold text-ink group-hover:text-primary transition truncate">
                  {{ log.user_name }}
                </div>
                <div class="text-[11px] text-ink-2 truncate">
                  {{ log.activity_description }}
                </div>
                <div class="text-[10px] font-mono text-ink-3 mt-0.5">
                  {{ log.formatted_time }}
                </div>
              </div>
            </div>

            <ChevronRight class="w-4 h-4 text-ink-3 group-hover:text-primary group-hover:translate-x-0.5 transition shrink-0" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Factory, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  plant: {
    type: Object,
    required: true
  }
})

defineEmits(['open-log-detail'])

const last7DaysTotal = computed(() => {
  return props.plant.last7Days?.reduce((acc, d) => acc + d.count, 0) || 0
})

const maxDayCount = computed(() => {
  const counts = (props.plant.last7Days || []).map(d => d.count)
  return Math.max(...counts, 1)
})

function getBarHeight(count) {
  if (!count || count <= 0) return 0
  return Math.min(100, Math.max(10, Math.round((count / maxDayCount.value) * 100)))
}
</script>
