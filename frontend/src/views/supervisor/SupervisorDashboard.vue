<template>
  <div class="space-y-6">
    <!-- Section Baru: Overview Log Book Tim Mechanical (DASHBOARD_OVERVIEW_LOGBOOK) -->
    <DashboardOverviewLogBook />

    <!-- ANTREAN TINDAK LANJUT MESIN (Fase 4.1b) — high visibility: tepat di bawah KPI overview,
         sebelum chart tren, agar Supervisor melihat mesin menggantung sebelum menyetujui logbook.
         plantId sengaja TIDAK dikirim (null): backend memakai plant_id dari JWT Supervisor. -->
    <SupervisorHandoverQueue @open-log-detail="handleOpenLogDetail" />

    <!-- Tren Aktivitas Tim (AreaChart) per 11.5.4 & 11.6 -->
    <StatisticsChartCard
      title="Tren Aktivitas Tim"
      :chart-data="monthlyTrend"
      :year="currentYear"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLogbookStore } from '../../stores/logbook'
import DashboardOverviewLogBook from '../../components/dashboard/overview/DashboardOverviewLogBook.vue'
import StatisticsChartCard from '../../components/dashboard/StatisticsChartCard.vue'
import SupervisorHandoverQueue from '../../components/dashboard/SupervisorHandoverQueue.vue'

const router = useRouter()
const logbookStore = useLogbookStore()

const loading = ref(false)
const currentYear = new Date().getFullYear()

onMounted(async () => {
  loading.value = true
  try {
    await logbookStore.fetchLogbooks()
  } finally {
    loading.value = false
  }
})

/**
 * Aksi "Detail" pada antrean handover.
 * Dashboard Supervisor belum memiliki modal detail logbook sendiri (itu scope F4.1 di
 * halaman /approval), jadi klik diarahkan ke Buku Pintar Mesin agar konteks mesin tetap terlihat.
 * TODO(F4.1): ganti dengan modal detail logbook + aksi Approve/Reject saat halaman approval dibuka.
 */
function handleOpenLogDetail(item) {
  if (item?.machine_id) {
    router.push({ name: 'machine-history', params: { id: item.machine_id } })
  }
}

// Team logbooks
const allLogs = computed(() => logbookStore.logbooks || [])

// Monthly trend for team
const monthlyTrend = computed(() => {
  const months = Array(12).fill(0)
  allLogs.value.forEach(l => {
    if (l.task_date) {
      const d = new Date(l.task_date)
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth()
        if (m >= 0 && m < 12) {
          months[m] += 1
        }
      }
    }
  })
  return months
})
</script>
