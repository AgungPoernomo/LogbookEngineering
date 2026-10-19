<template>
  <div class="space-y-6">
    <!-- Section Baru: Overview Log Book Tim Mechanical (DASHBOARD_OVERVIEW_LOGBOOK) -->
    <DashboardOverviewLogBook />

    <!-- Konten Dashboard Admin yang Sudah Ada -->
    <div class="space-y-4">
      <!-- Baris 2: Tren Aktivitas Sistem (AreaChart) per 11.5.4 & 11.6 -->
      <StatisticsChartCard
        title="Tren Aktivitas Sistem"
        :chart-data="monthlyTrend"
        :year="currentYear"
      />

      <!-- Baris 3: RecentTableCard (Aktivitas Pengguna Terbaru) per 11.5.7 & 11.6 -->
      <RecentTableCard
        title="Aktivitas Pengguna Terbaru"
        view-all-route="/admin/audit"
        role-variant="admin"
        :columns="tableColumns"
        :rows="recentAuditLogs"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLogbookStore } from '../../stores/logbook'
import { auditService } from '../../services/auditService'
import DashboardOverviewLogBook from '../../components/dashboard/overview/DashboardOverviewLogBook.vue'
import StatisticsChartCard from '../../components/dashboard/StatisticsChartCard.vue'
import RecentTableCard from '../../components/dashboard/RecentTableCard.vue'

const logbookStore = useLogbookStore()
const loading = ref(false)
const auditLogs = ref([])

const currentYear = new Date().getFullYear()

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      logbookStore.fetchLogbooks(),
      auditService.getActivities().then(res => { auditLogs.value = res })
    ])
  } finally {
    loading.value = false
  }
})

const allLogs = computed(() => logbookStore.logbooks || [])

const tableColumns = [
  { key: 'user_name', label: 'Pengguna' },
  { key: 'activity', label: 'Aktivitas' },
  { key: 'created_at', label: 'Waktu' }
]

const recentAuditLogs = computed(() => {
  return auditLogs.value.slice(0, 5)
})

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
