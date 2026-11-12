<template>
  <div v-if="canAccess" class="space-y-4 mb-6">
    <!-- Section A: Header Overview & 3 KPI Cards -->
    <OverviewHeader :kpi="overviewData.kpi" />

    <!-- Section B: Filter Dashboard (Month & Year, Department, Group, Shift, Search) -->
    <OverviewFilter
      v-model="filters"
      :work-groups="masterStore.workGroups"
      :shifts="masterStore.shifts"
      @change="fetchOverviewData"
    />

    <!-- Error State -->
    <div
      v-if="error"
      class="p-4 rounded-lg bg-status-rejected-bg border border-danger/30 text-status-rejected-fg text-xs flex items-center justify-between"
      role="alert"
    >
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 shrink-0 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2" />
          <line x1="12" y1="8" x2="12" y2="12" stroke-width="2" stroke-linecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2" stroke-linecap="round" />
        </svg>
        <span>{{ error }}</span>
      </div>
      <button
        type="button"
        class="px-3 py-1 bg-surface border border-line rounded font-semibold text-danger hover:bg-danger hover:text-white transition cursor-pointer"
        :disabled="loading"
        @click="fetchOverviewData"
      >
        <span v-if="loading">Memuat...</span>
        <span v-else>Coba Lagi</span>
      </button>
    </div>

    <!-- Loading Skeleton State -->
    <div v-if="loading && !hasLoadedOnce" class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div v-for="i in 4" :key="i" class="h-80 bg-surface rounded-lg border border-line p-5 animate-pulse space-y-3">
          <div class="w-1/3 h-5 bg-muted rounded" />
          <div class="w-full h-16 bg-muted rounded" />
          <div class="w-full h-24 bg-muted rounded" />
        </div>
      </div>
    </div>

    <!-- Dashboard Content -->
    <template v-else-if="hasLoadedOnce">
      <!-- Section C: Grid 4 Plant (2 kolom x 2 baris pada desktop, 1 kolom pada mobile) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlantCard
          v-for="plant in overviewData.plants"
          :key="plant.id"
          :plant="plant"
          @open-log-detail="selectedLogDetail = $event"
          @open-all-users="openAllUsersModal"
        />
      </div>

      <!-- Section D & E: Aktivitas Terbaru Seluruh Plant + User Aktif per Plant -->
      <div class="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        <!-- Section D: Aktivitas Terbaru (Tabel 5 entri) -->
        <RecentActivitiesTable
          :activities="overviewData.recentActivities"
          @open-log-detail="selectedLogDetail = $event"
        />

        <!-- Section E: % Line dengan Pengisian Logbook Terbanyak -->
        <TopLinesProgressCard
          :summary="overviewData.topLinesSummary"
        />
      </div>
    </template>

    <!-- Modal Lihat Semua User Aktif per Plant -->
    <ActiveUsersModal
      :is-open="isUsersModalOpen"
      :plant="selectedPlantForUsers"
      :users="selectedPlantForUsers?.activeUsersList || []"
      @close="isUsersModalOpen = false"
    />

    <!-- Modal Detail Logbook (Reused AppModal) -->
    <AppModal
      :is-open="!!selectedLogDetail"
      title="Detail Pemeriksaan Logbook"
      @close="selectedLogDetail = null"
    >
      <div v-if="selectedLogDetail" class="space-y-3 text-xs">
        <div class="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <span class="text-[10px] text-ink-3">ID Logbook #{{ selectedLogDetail.id }}</span>
            <div class="font-bold text-sm text-ink">{{ selectedLogDetail.task_date }} • {{ selectedLogDetail.shift_name }}</div>
          </div>
          <AppBadge :status="selectedLogDetail.status" />
        </div>

        <div class="grid grid-cols-2 gap-2 text-ink">
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">LOKASI LINE</span>
            <span class="font-semibold text-ink">{{ selectedLogDetail.plant_name }}</span>
          </div>
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">MESIN & BAGIAN</span>
            <span class="font-semibold text-ink">{{ selectedLogDetail.machine_name }}</span>
            <div class="text-ink-2">{{ selectedLogDetail.sub_machine_name }}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-ink">
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">JAM PENGERJAAN</span>
            <span class="font-mono font-medium">{{ selectedLogDetail.start_time }} - {{ selectedLogDetail.end_time }}</span>
          </div>
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">TEKNISI PELAKSANA</span>
            <span class="font-semibold text-ink">{{ selectedLogDetail.user_name }}</span>
          </div>
        </div>

        <div>
          <span class="font-semibold text-ink-2 uppercase text-[10px] block mb-1">URAIAN AKTIVITAS PEKERJAAN</span>
          <div class="p-3 bg-muted rounded-md leading-relaxed border border-line text-ink">
            {{ selectedLogDetail.activity_description }}
          </div>
        </div>

        <div v-if="selectedLogDetail.sparepart && selectedLogDetail.sparepart !== '-'">
          <span class="font-semibold text-ink-2 uppercase text-[10px] block mb-1">SUKU CADANG</span>
          <div class="p-2.5 bg-muted rounded-md border border-line text-ink">
            {{ selectedLogDetail.sparepart }}
          </div>
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="h-8 px-4 rounded-md border border-line bg-surface text-ink hover:bg-muted text-xs font-medium transition"
          @click="selectedLogDetail = null"
        >
          Tutup
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../../stores/auth'
import { useMasterStore } from '../../../stores/master'
import { overviewLogbookService } from '../../../services/overviewLogbookService'
import { getWIBYearMonth } from '../../../utils/dateKeys'
import OverviewHeader from './OverviewHeader.vue'
import OverviewFilter from './OverviewFilter.vue'
import PlantCard from './PlantCard.vue'
import RecentActivitiesTable from './RecentActivitiesTable.vue'
import TopLinesProgressCard from './TopLinesProgressCard.vue'
import UserActiveProgressCard from './UserActiveProgressCard.vue'
import ActiveUsersModal from './ActiveUsersModal.vue'
import AppModal from '../../common/AppModal.vue'
import AppBadge from '../../common/AppBadge.vue'

const authStore = useAuthStore()
const masterStore = useMasterStore()

// Access Control: Khusus Admin dan Supervisor (Section 1 & 6)
const canAccess = computed(() => {
  return authStore.isAdmin || authStore.isSupervisor
})

const loading = ref(true)
const hasLoadedOnce = ref(false)
const error = ref('')

const filters = reactive({
  yearMonth: getWIBYearMonth(),
  groupId: 'ALL',
  shiftId: 'ALL',
  search: ''
})

const overviewData = reactive({
  kpi: {},
  plants: [],
  recentActivities: [],
  topLinesSummary: { lines: [], totalLogs: 0, topLine: null },
  userActiveSummary: { plants: [], total: {} }
})

const selectedLogDetail = ref(null)
const selectedPlantForUsers = ref(null)
const isUsersModalOpen = ref(false)

let pollTimer = null

async function fetchOverviewData() {
  if (!canAccess.value) return

  loading.value = true
  error.value = ''
  try {
    const res = await overviewLogbookService.getOverviewData(authStore.user, filters)
    overviewData.kpi = res.kpi
    overviewData.plants = res.plants
    overviewData.recentActivities = res.recentActivities
    overviewData.topLinesSummary = res.topLinesSummary || { lines: [], totalLogs: 0, topLine: null }
    overviewData.userActiveSummary = res.userActiveSummary
    hasLoadedOnce.value = true
  } catch (err) {
    error.value = err.message || 'Gagal memuat ringkasan overview logbook.'
  } finally {
    loading.value = false
  }
}

function openAllUsersModal(plant) {
  selectedPlantForUsers.value = plant
  isUsersModalOpen.value = true
}

// Real-time Polling 30-45 detik, dihentikan saat tab tidak aktif (Section 7)
function handleVisibilityChange() {
  if (document.hidden) {
    if (pollTimer) clearInterval(pollTimer)
  } else {
    fetchOverviewData()
    startPolling()
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(() => {
    fetchOverviewData()
  }, 35000)
}

onMounted(async () => {
  if (canAccess.value) {
    await masterStore.fetchAll()
    await fetchOverviewData()
    startPolling()
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>
