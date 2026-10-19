<template>
  <div class="space-y-6">
    <!-- Header Banner -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md">
      <div>
        <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
          {{ authStore.isAdmin ? '🛡️ Administrator Engineering' : '👔 Supervisor Engineering' }}
        </div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight">
          Executive Dashboard & Monitoring
        </h1>
        <p class="text-xs sm:text-sm text-slate-300 mt-1">
          Pantau seluruh aktivitas pemeliharaan, validasi fasilitas farmasi, dan antrean approval log.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <RouterLink
          to="/approval"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm transition shadow-lg shadow-amber-500/20"
        >
          <span>Buka Antrean Approval ({{ pendingCount }})</span>
        </RouterLink>
      </div>
    </div>

    <!-- KPI Metric Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl shrink-0">
          📊
        </div>
        <div>
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Seluruh Log</div>
          <div class="text-2xl font-extrabold text-slate-800">{{ stats.total }}</div>
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xl shrink-0">
          ⚡
        </div>
        <div>
          <div class="text-xs font-semibold text-amber-700 uppercase tracking-wider">Perlu Approval</div>
          <div class="text-2xl font-extrabold text-amber-700">{{ stats.submitted }}</div>
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shrink-0">
          ✅
        </div>
        <div>
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Log Disetujui</div>
          <div class="text-2xl font-extrabold text-emerald-600">{{ stats.approved }}</div>
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xl shrink-0">
          ❌
        </div>
        <div>
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Log Ditolak</div>
          <div class="text-2xl font-extrabold text-rose-600">{{ stats.rejected }}</div>
        </div>
      </div>
    </div>

    <!-- Category Summary & Activity Status Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Category breakdown -->
      <div class="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-800 mb-1">Distribusi per Kategori</h2>
          <p class="text-xs text-slate-400 mb-4">Proporsi pekerjaan engineering bulan ini</p>

          <div class="space-y-3">
            <div v-for="cat in categoryStats" :key="cat.name" class="space-y-1">
              <div class="flex items-center justify-between text-xs font-medium">
                <span class="text-slate-700">{{ cat.name }}</span>
                <span class="font-bold text-slate-900">{{ cat.count }}</span>
              </div>
              <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  :class="['h-full rounded-full', cat.color]"
                  :style="{ width: `${cat.pct}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400">
          Data diperbarui otomatis dari log aktivitas teknisi.
        </div>
      </div>

      <!-- Quick Pending Approval Queue -->
      <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-800">Antrean Menunggu Approval</h2>
            <p class="text-xs text-slate-400">Pekerjaan teknisi yang membutuhkan tinjauan Anda</p>
          </div>
          <RouterLink
            to="/approval"
            class="text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
          >
            Buka Halaman Approval →
          </RouterLink>
        </div>

        <div class="flex-1 overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th class="px-6 py-3">Teknisi</th>
                <th class="px-6 py-3">Peralatan & Kategori</th>
                <th class="px-6 py-3">Tanggal / Waktu</th>
                <th class="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="pendingLogs.length === 0">
                <td colspan="4" class="px-6 py-10 text-center text-slate-400 text-sm">
                  <span class="text-emerald-500 font-semibold block text-base mb-1">🎉 Semua Log Bersih!</span>
                  Tidak ada log yang menunggu persetujuan saat ini.
                </td>
              </tr>
              <tr
                v-for="log in pendingLogs"
                :key="log.id"
                class="hover:bg-slate-50/60 transition"
              >
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-800">{{ log.userName }}</div>
                  <div class="text-xs text-slate-400">{{ log.employeeNo }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="font-medium text-slate-800">{{ log.equipmentName }}</div>
                  <div class="text-xs text-brand-700 font-medium">{{ log.categoryName }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-slate-800 font-medium">{{ log.logDate }}</div>
                  <div class="text-xs text-slate-400">{{ log.shift }}</div>
                </td>
                <td class="px-6 py-4 text-right">
                  <RouterLink
                    to="/approval"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition"
                  >
                    Tinjau
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useLogStore } from '../../stores/log'
import { LOG_STATUS } from '../../constants/status'

const authStore = useAuthStore()
const logStore = useLogStore()

onMounted(async () => {
  await logStore.fetchLogs()
})

const stats = computed(() => {
  const all = logStore.logs
  return {
    total: all.length,
    submitted: all.filter(l => l.status === LOG_STATUS.SUBMITTED).length,
    approved: all.filter(l => l.status === LOG_STATUS.APPROVED).length,
    rejected: all.filter(l => l.status === LOG_STATUS.REJECTED).length
  }
})

const pendingCount = computed(() => stats.value.submitted)

const pendingLogs = computed(() => {
  return logStore.logs.filter(l => l.status === LOG_STATUS.SUBMITTED).slice(0, 5)
})

const categoryStats = computed(() => {
  const all = logStore.logs
  const total = all.length || 1

  const pm = all.filter(l => l.categoryId === 1).length
  const cm = all.filter(l => l.categoryId === 2).length
  const cal = all.filter(l => l.categoryId === 3).length
  const util = all.filter(l => l.categoryId === 4).length
  const emg = all.filter(l => l.categoryId === 5).length

  return [
    { name: 'Preventive Maintenance (PM)', count: pm, pct: Math.round((pm / total) * 100), color: 'bg-brand-500' },
    { name: 'Corrective Maintenance (CM)', count: cm, pct: Math.round((cm / total) * 100), color: 'bg-indigo-500' },
    { name: 'Kalibrasi & Validasi', count: cal, pct: Math.round((cal / total) * 100), color: 'bg-purple-500' },
    { name: 'Utility & Facility Check', count: util, pct: Math.round((util / total) * 100), color: 'bg-emerald-500' },
    { name: 'Breakdown Emergency', count: emg, pct: Math.round((emg / total) * 100), color: 'bg-rose-500' }
  ]
})
</script>
