<template>
  <div class="space-y-6">
    <!-- Section Baru: Overview Log Book Tim Mechanical (DASHBOARD_OVERVIEW_LOGBOOK) -->
    <DashboardOverviewLogBook />

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
import { useLogbookStore } from '../../stores/logbook'
import DashboardOverviewLogBook from '../../components/dashboard/overview/DashboardOverviewLogBook.vue'
import StatisticsChartCard from '../../components/dashboard/StatisticsChartCard.vue'

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
