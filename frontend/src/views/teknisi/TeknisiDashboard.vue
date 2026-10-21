<template>
  <div class="space-y-6">
    <!-- ======================================================== -->
    <!-- BAGIAN ATAS: CARD MONITORING LINE USER TEKNISI (PlantCard)-->
    <!-- 1. Header Kartu: Ikon, Nama Plant, 3 Mini-Stat           -->
    <!-- Baris Gabungan: Kiri (Leaderboard) & Kanan (Chart 7 Hari)-->
    <!-- 4. Log Terbaru (Plant n) - 3 Baris                       -->
    <!-- ======================================================== -->
    <section v-if="linePlantData" class="space-y-2">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-primary" />
          <h2 class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wider">
            Monitoring Line Kerja — {{ linePlantData.fullName }}
          </h2>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-soft text-primary">
            Line Anda
          </span>
        </div>
        <span class="text-[11px] text-ink-3">
          Aktivitas real-time & leaderboard khusus line pengerjaan Anda
        </span>
      </div>

      <PlantCard
        :plant="linePlantData"
        @open-log-detail="handleOpenLogDetail"
      />
    </section>

    <!-- Loading Skeleton jika data overview sedang dimuat -->
    <div v-else-if="loading" class="h-64 bg-surface rounded-lg border border-line shadow-card animate-pulse flex items-center justify-center text-xs text-ink-3">
      Memuat informasi Line kerja Anda...
    </div>

      
    
    
    <!-- RIWAYAT & AKTIVITAS LOGBOOK DI LINE (Goal 1 & 2: Riwayat Log Line & Teknisi Lain) -->
      <div class="bg-surface rounded-lg shadow-card p-4 sm:p-5 border border-line space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-line gap-2.5">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-ink uppercase tracking-wide">
                Riwayat & Aktivitas Logbook Line
              </h2>
              <span class="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded text-ink-2">
                {{ currentTableLogs.length }} Aktivitas
              </span>
            </div>
            <p class="text-xs text-ink-3 mt-0.5">
              Pantau logbook pengerjaan rekan teknisi lain dan logbook pribadi di Line ini.
            </p>
          </div>

          <!-- Tab Switcher: Semua Teknisi di Line vs Logbook Saya Saja -->
          <div class="inline-flex rounded-md p-1 bg-muted border border-line text-xs font-medium self-start sm:self-auto">
            <button
              type="button"
              :class="[
                'px-3 py-1 rounded transition text-xs font-medium',
                tableMode === 'all_line' ? 'bg-surface text-ink font-semibold shadow-xs' : 'text-ink-3 hover:text-ink'
              ]"
              @click="tableMode = 'all_line'"
            >
              Semua Teknisi di Line
            </button>
            <button
              type="button"
              :class="[
                'px-3 py-1 rounded transition text-xs font-medium',
                tableMode === 'my_logs' ? 'bg-surface text-ink font-semibold shadow-xs' : 'text-ink-3 hover:text-ink'
              ]"
              @click="tableMode = 'my_logs'"
            >
              Logbook Saya Saja
            </button>
          </div>
        </div>

        <!-- Tabel Aktivitas Logbook Line -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse min-w-[620px]">
            <thead>
              <tr class="border-b border-line text-[11px] font-semibold text-ink-3 uppercase tracking-wider">
                <th class="py-2.5 px-3">Tanggal & Waktu</th>
                <th class="py-2.5 px-3">Teknisi</th>
                <th class="py-2.5 px-3">Mesin & Bagian</th>
                <th class="py-2.5 px-3">Shift</th>
                <th class="py-2.5 px-3">Durasi</th>
                <th class="py-2.5 px-3">Status</th>
                <th class="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line text-ink">
              <tr v-if="currentTableLogs.length === 0">
                <td colspan="7" class="py-8 text-center text-ink-3">
                  Belum ada riwayat aktivitas logbook pada filter ini.
                </td>
              </tr>
              <tr
                v-for="row in currentTableLogs.slice(0, 6)"
                :key="row.id"
                class="hover:bg-muted/40 transition-colors"
              >
                <td class="py-2.5 px-3 whitespace-nowrap">
                  <div class="font-medium text-ink">{{ row.task_date }}</div>
                  <div class="text-[10px] text-ink-3 font-mono">{{ row.start_time }} - {{ row.end_time }}</div>
                </td>
                <td class="py-2.5 px-3 whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <span class="font-medium text-ink">{{ row.user_name }}</span>
                    <span
                      v-if="row.user_id === authStore.user?.id"
                      class="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-primary-soft text-primary border border-primary/20"
                    >
                      Saya
                    </span>
                  </div>
                  <span class="text-[10px] text-ink-3">{{ row.user_nik || 'Teknisi' }}</span>
                </td>
                <td class="py-2.5 px-3">
                  <div class="font-medium text-ink">{{ row.machine_name }}</div>
                  <div class="text-[10px] text-ink-3">{{ row.sub_machine_name || '-' }}</div>
                </td>
                <td class="py-2.5 px-3 text-ink-2 whitespace-nowrap">
                  {{ row.shift_name }}
                </td>
                <td class="py-2.5 px-3 tabular-nums whitespace-nowrap">
                  <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-ink font-mono">
                    {{ formatDuration(row.duration_minutes) }}
                  </span>
                </td>
                <td class="py-2.5 px-3 whitespace-nowrap">
                  <AppBadge :status="row.status" />
                </td>
                <td class="py-2.5 px-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded border border-line bg-surface hover:bg-muted text-ink text-xs font-medium transition shadow-xs"
                    @click="handleOpenLogDetail(row)"
                  >
                    Detail
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer Link Lihat Semua -->
        <div class="pt-2 flex items-center justify-between border-t border-line text-xs">
          <span class="text-ink-3 text-[11px]">
            Menampilkan 6 aktivitas terbaru di Line
          </span>
          <RouterLink
            to="/logbook/riwayat"
            class="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs"
          >
            <span>Buka Seluruh Arsip Riwayat →</span>
          </RouterLink>
        </div>
      </div>

    <!-- ======================================================== -->
    <!-- BAGIAN KONTEN DASHBOARD UTAMA                            -->
    <!-- ======================================================== -->
    <div class="space-y-4">
      <!-- Baris Gabungan: Tren Aktivitas Line & Rekan Teknisi di Line Saya -->
      <div class="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        <StatisticsChartCard
          title="Tren Aktivitas Line"
          :chart-data="monthlyTrend"
          :year="currentYear"
        />

        <!-- Rekan Teknisi di Line Saya -->
        <div class="bg-surface rounded-lg shadow-card p-4 border border-line space-y-3">
          <div class="flex items-center justify-between pb-2.5 border-b border-line">
            <div class="flex items-center gap-1.5">
              <Users class="w-4 h-4 text-primary" />
              <h3 class="text-xs font-bold text-ink uppercase tracking-wide">
                Teknisi di Line Ini
              </h3>
            </div>
            <span class="text-[10px] font-mono text-ink-3">
              {{ lineTechnicians.length }} User
            </span>
          </div>

          <div class="space-y-2">
            <div
              v-for="tech in lineTechnicians"
              :key="tech.id"
              class="p-2 rounded-md border border-line/60 bg-muted/20 flex items-center justify-between gap-2"
            >
              <div class="flex items-center gap-2 min-w-0">
                <img
                  v-if="tech.photo_url"
                  :src="tech.photo_url"
                  :alt="tech.full_name"
                  class="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <div
                  v-else
                  class="w-7 h-7 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center shrink-0"
                >
                  {{ tech.initials }}
                </div>
                <div class="min-w-0 leading-tight">
                  <div class="text-xs font-semibold text-ink truncate flex items-center gap-1">
                    <span>{{ tech.full_name }}</span>
                    <span v-if="tech.id === authStore.user?.id" class="text-[9px] text-primary font-bold">(Anda)</span>
                  </div>
                  <div class="text-[10px] text-ink-3 truncate">{{ tech.group_name }}</div>
                </div>
              </div>
              <span class="w-2 h-2 rounded-full bg-success shrink-0" title="Aktif" />
            </div>
          </div>
        </div>
      </div>

      <!-- AREA & PERALATAN MESIN DI LINE SAYA (Goal 3: Notice Area & Mesin) -->
      <div class="bg-surface rounded-lg shadow-card p-4 sm:p-5 border border-line space-y-3">
        <div class="flex items-center justify-between pb-3 border-b border-line">
          <div class="flex items-center gap-2">
            <Cpu class="w-4 h-4 text-primary" />
            <h2 class="text-sm font-bold text-ink uppercase tracking-wide">
              Area & Mesin Operasional Line
            </h2>
            <span class="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded text-ink-2">
              {{ lineMachines.length }} Mesin Terdaftar
            </span>
          </div>
          <RouterLink
            to="/logbook/input"
            class="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
          </RouterLink>
        </div>

        <!-- Grid Mesin di Line Ini -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="machine in lineMachines"
            :key="machine.id"
            class="p-3 rounded-lg border border-line bg-muted/20 hover:bg-muted/40 transition flex flex-col justify-between space-y-2 group"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <span class="text-[10px] font-mono font-semibold text-primary block">
                  {{ machine.code }}
                </span>
                <h3 class="text-xs font-bold text-ink truncate group-hover:text-primary transition" :title="machine.name">
                  {{ machine.name }}
                </h3>
                <div class="text-[10px] text-ink-3 mt-0.5">
                  {{ machine.subMachinesCount }} Komponen / Sub-Mesin
                </div>
              </div>
              <div class="w-7 h-7 rounded bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <Wrench class="w-3.5 h-3.5" />
              </div>
            </div>

            <!-- Status Servis Terakhir -->
            <div class="pt-2 border-t border-line/60 text-[10px] text-ink-2 flex items-center justify-between">
              <span v-if="machine.lastLog" class="truncate">
                Terakhir: <strong class="text-ink">{{ machine.lastLog.user_name }}</strong> ({{ machine.lastLog.start_time }})
              </span>
              <span v-else class="text-ink-3 italic">
                Belum ada log hari ini
              </span>
              <span class="font-mono text-primary font-semibold shrink-0">
                {{ machine.totalLogs }} log
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal Detail Logbook Pilihan -->
    <AppModal
      :is-open="!!selectedLog"
      title="Detail Logbook Pekerjaan Line"
      @close="selectedLog = null"
    >
      <div v-if="selectedLog" class="space-y-3.5 text-xs">
        <div class="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <div class="text-ink-3 text-[10px]">Logbook ID #{{ selectedLog.id }}</div>
            <div class="font-semibold text-sm text-ink">{{ selectedLog.task_date }} • {{ selectedLog.shift_name }}</div>
          </div>
          <AppBadge :status="selectedLog.status" />
        </div>

        <div v-if="selectedLog.status === 'REJECTED' && selectedLog.approval_notes" class="p-3 bg-status-rejected-bg border border-danger/20 rounded-md text-status-rejected-fg">
          <div class="font-semibold mb-1">Catatan Revisi Supervisor:</div>
          <div class="leading-relaxed">{{ selectedLog.approval_notes }}</div>
        </div>

        <div v-if="selectedLog.status === 'APPROVED'" class="p-3 bg-status-approved-bg border border-success/20 rounded-md text-status-approved-fg flex items-center justify-between">
          <span>Disetujui oleh: <strong>{{ selectedLog.supervisor_name || 'Supervisor' }}</strong></span>
          <span class="text-success text-[11px]">{{ selectedLog.reviewed_at }}</span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-ink">
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">TEKNISI PELAKSANA</span>
            <span class="font-semibold text-ink">{{ selectedLog.user_name }}</span>
            <div class="text-ink-2 text-[11px]">{{ selectedLog.user_nik || '-' }}</div>
          </div>
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">LOKASI LINE / PLANT</span>
            <span class="font-semibold text-ink">{{ selectedLog.plant_name }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-ink">
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">PERALATAN MESIN</span>
            <span class="font-semibold text-ink">{{ selectedLog.machine_name }}</span>
            <div class="text-ink-2">{{ selectedLog.sub_machine_name || '-' }}</div>
          </div>
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">WAKTU & DURASI</span>
            <span class="font-mono font-medium">{{ selectedLog.start_time }} - {{ selectedLog.end_time }}</span>
            <div class="text-primary font-semibold">{{ formatDuration(selectedLog.duration_minutes) }}</div>
          </div>
        </div>

        <div class="p-2.5 bg-muted rounded-md">
          <span class="text-ink-3 block text-[10px] uppercase font-semibold mb-0.5">SUKU CADANG</span>
          <span class="text-ink font-medium">{{ selectedLog.sparepart || '-' }}</span>
        </div>

        <div>
          <span class="font-semibold text-ink-2 uppercase text-[10px] block mb-1">Uraian Aktivitas Pekerjaan</span>
          <div class="p-3 bg-muted rounded-md leading-relaxed border border-line text-ink">
            {{ selectedLog.activity_description }}
          </div>
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
          @click="selectedLog = null"
        >
          Tutup
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useLogbookStore } from '../../stores/logbook'
import { overviewLogbookService } from '../../services/overviewLogbookService'
import { formatDuration } from '../../utils/duration'

import PlantCard from '../../components/dashboard/overview/PlantCard.vue'
import StatisticsChartCard from '../../components/dashboard/StatisticsChartCard.vue'
import AppBadge from '../../components/common/AppBadge.vue'
import AppModal from '../../components/common/AppModal.vue'

import {
  Cpu,
  Wrench,
  Users
} from 'lucide-vue-next'

const authStore = useAuthStore()
const logbookStore = useLogbookStore()

const loading = ref(false)
const selectedLog = ref(null)
const tableMode = ref('all_line') // 'all_line' | 'my_logs'
const lineOverview = ref(null)

const currentYear = new Date().getFullYear()

async function loadData() {
  loading.value = true
  try {
    await logbookStore.fetchLogbooks()
    const overview = await overviewLogbookService.getTechnicianLineOverview(authStore.user)
    lineOverview.value = overview
  } catch (err) {
    console.error('Gagal memuat data dashboard teknisi:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

const linePlantData = computed(() => lineOverview.value?.plantCard || null)
const lineMachines = computed(() => lineOverview.value?.lineMachines || [])
const lineTechnicians = computed(() => lineOverview.value?.plantUsers || [])
const allLineLogs = computed(() => lineOverview.value?.allLineLogs || [])

// Log khusus user ini
const myLogs = computed(() => {
  return logbookStore.logbooks.filter(l => l.user_id === authStore.user?.id)
})

// Current table rows based on tableMode
const currentTableLogs = computed(() => {
  return tableMode.value === 'all_line' ? allLineLogs.value : myLogs.value
})

function handleOpenLogDetail(log) {
  selectedLog.value = log
}

// 12 months trend calculated from Line's logs
const monthlyTrend = computed(() => {
  const months = Array(12).fill(0)
  allLineLogs.value.forEach(l => {
    if (l.task_date) {
      const monthIndex = new Date(l.task_date).getMonth()
      if (monthIndex >= 0 && monthIndex < 12) {
        months[monthIndex] += 1
      }
    }
  })
  return months
})
</script>
