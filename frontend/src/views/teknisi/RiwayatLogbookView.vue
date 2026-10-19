<template>
  <div class="space-y-8 relative w-full">
    <!-- Header Halaman Riwayat Logbook -->
    <div class="pb-2 border-b border-line">
      <div>
        <div class="text-[12px] font-semibold text-primary uppercase tracking-wider">Arsip & Jadwal Kerja Teknisi</div>
        <h1 class="text-xl sm:text-2xl font-bold text-ink tracking-tight">Riwayat & Perencana Logbook</h1>
        <p class="text-xs text-ink-2 mt-0.5">Pemantauan jadwal mingguan, status persetujuan supervisor, dan arsip riwayat pekerjaan.</p>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- BAGIAN 1: Kalender Mingguan Teknisi (UI dari Input Logbook) -->
    <!-- ======================================================== -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-primary" />
          <h2 class="text-sm font-bold text-ink uppercase tracking-wide">
            Jadwal & Visualisasi Logbook Mingguan
          </h2>
        </div>
        <span class="text-[11px] text-ink-3">
          Klik slot waktu atau kartu logbook untuk detail
        </span>
      </div>

      <!-- Layout Kalender: Sidebar Kiri + Kartu Kalender Utama -->
      <div class="flex items-start gap-4 w-full">
        <!-- Panel Kiri (>= 1280px) -->
        <div class="hidden xl:block shrink-0">
          <PlannerSidebarPanel
            :selected-date="selectedDate"
            :filters="filters"
            :shifts="masterStore.shifts"
            @update:selected-date="handleDateSelect"
            @select-date="handleDateSelect"
            @create="handleNavigateInput"
          />
        </div>

        <!-- Kartu Kalender Utama -->
        <WeekCalendarCard
          :days="calculatedDays"
          :toolbar-title="toolbarTitle"
          :loading="loadingCalendar"
          :is-empty="isCalendarEmpty"
          :all-filters-disabled="allFiltersDisabled"
          :has-today="rangeIncludesToday"
          :selected-logbook-id="selectedLogbookForPopover?.id"
          @today="handleGoToday"
          @prev="handlePrevRange"
          @next="handleNextRange"
          @open-filter="isFilterDrawerOpen = true"
          @create="handleNavigateInput"
          @create-slot="handleCreateFromSlot"
          @click-block="handleBlockClick"
          @open-edit="handleNavigateEdit"
        />
      </div>

      <!-- Popover Ringkasan Logbook -->
      <LogbookEventPopover
        v-if="selectedLogbookForPopover"
        :logbook="selectedLogbookForPopover"
        :anchor-rect="popoverAnchorRect"
        @close="selectedLogbookForPopover = null"
      />

      <!-- Drawer Filter untuk layar < 1280px -->
      <FilterDrawer
        :is-open="isFilterDrawerOpen"
        :selected-date="selectedDate"
        :filters="filters"
        :shifts="masterStore.shifts"
        @close="isFilterDrawerOpen = false"
        @update:selected-date="handleDateSelect"
        @select-date="handleDateSelect"
      />

      <!-- FAB Mobile -->
      <FabCreate @create="handleNavigateInput" />
    </section>

    <!-- ======================================================== -->
    <!-- BAGIAN 2: Arsip & Tabel Riwayat Logbook (Existing UI)      -->
    <!-- ======================================================== -->
    <section class="space-y-4 pt-4 border-t border-line">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-ink-2" />
          <h2 class="text-sm font-bold text-ink uppercase tracking-wide">
            Daftar Arsip Riwayat Logbook
          </h2>
        </div>
        <span class="text-[11px] text-ink-3">
          Total: {{ myLogs.length }} entri tercatat
        </span>
      </div>

      <!-- Filter Bar & Search -->
      <div class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line flex flex-col md:flex-row items-center justify-between gap-3">
        <!-- Status Tabs -->
        <div class="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            :class="[
              'px-3 py-1.5 rounded-md text-xs font-medium transition shrink-0',
              activeStatus === tab.value
                ? 'bg-primary text-white font-semibold'
                : 'text-ink-2 hover:bg-muted'
            ]"
            @click="activeStatus = tab.value"
          >
            {{ tab.label }}
            <span
              :class="[
                'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                activeStatus === tab.value ? 'bg-white/20 text-white' : 'bg-line text-ink-2'
              ]"
            >
              {{ getCountForStatus(tab.value) }}
            </span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative w-full md:w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari mesin / uraian / part..."
            class="w-full h-9 pl-8 pr-3 rounded-md border border-line text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-muted placeholder:text-ink-3"
          />
          <svg class="w-4 h-4 text-ink-3 absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <!-- Logs Table Card -->
      <div class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[13px] border-collapse min-w-[700px]">
            <thead class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line">
              <tr>
                <th class="px-4 py-3">Tanggal / Shift</th>
                <th class="px-4 py-3">Mesin & Bagian Mesin</th>
                <th class="px-4 py-3">Waktu & Durasi</th>
                <th class="px-4 py-3">Suku Cadang</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line text-ink">
              <tr v-if="filteredLogs.length === 0">
                <td colspan="6" class="px-4 py-12 text-center text-ink-3 text-xs">
                  Tidak ada data logbook yang cocok dengan filter saat ini.
                </td>
              </tr>
              <tr
                v-for="log in filteredLogs"
                :key="log.id"
                class="hover:bg-muted/40 transition-colors group"
              >
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="font-semibold text-ink">{{ log.task_date }}</div>
                  <div class="text-xs text-ink-2">{{ log.shift_name }}</div>
                  <div class="text-[11px] text-ink-3">{{ log.plant_name }}</div>
                </td>
                <td class="px-4 py-3">
                  <div class="font-medium text-ink">{{ log.machine_name }}</div>
                  <div class="text-xs text-ink-2">{{ log.sub_machine_name }}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-xs font-mono text-ink">{{ log.start_time }} - {{ log.end_time }}</div>
                  <span class="inline-block mt-0.5 px-2 py-0.5 rounded-sm text-[10px] font-medium bg-primary-soft text-primary-text-on-soft">
                    {{ formatDuration(log.duration_minutes) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-ink-2 text-xs">
                  {{ log.sparepart || '-' }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <AppBadge :status="log.status" />
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded border border-line bg-surface text-ink hover:bg-muted text-xs font-medium transition"
                    @click="viewLog = log"
                  >
                    Detail
                  </button>
                  <button
                    v-if="log.status === 'REJECTED' || log.status === 'DRAFT'"
                    type="button"
                    class="h-7 px-2.5 rounded bg-primary text-white hover:bg-blue-700 text-xs font-medium transition shadow-sm"
                    @click="handleNavigateEdit(log.id)"
                  >
                    {{ log.status === 'REJECTED' ? 'Revisi' : 'Edit' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Modal Detail Logbook -->
    <AppModal
      :is-open="!!viewLog"
      title="Detail Logbook Pekerjaan"
      @close="viewLog = null"
    >
      <div v-if="viewLog" class="space-y-3.5 text-xs">
        <div class="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <div class="text-ink-3 text-[10px]">Logbook ID #{{ viewLog.id }}</div>
            <div class="font-semibold text-sm text-ink">{{ viewLog.task_date }} • {{ viewLog.shift_name }}</div>
          </div>
          <AppBadge :status="viewLog.status" />
        </div>

        <div v-if="viewLog.status === 'REJECTED' && viewLog.approval_notes" class="p-3 bg-status-rejected-bg border border-danger/20 rounded-md text-status-rejected-fg">
          <div class="font-semibold mb-1">Catatan Revisi dari {{ viewLog.supervisor_name || 'Supervisor' }}:</div>
          <div class="leading-relaxed">{{ viewLog.approval_notes }}</div>
        </div>

        <div v-if="viewLog.status === 'APPROVED'" class="p-3 bg-status-approved-bg border border-success/20 rounded-md text-status-approved-fg flex items-center justify-between">
          <span>Disetujui oleh: <strong>{{ viewLog.supervisor_name }}</strong></span>
          <span class="text-success text-[11px]">{{ viewLog.reviewed_at }}</span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-ink">
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">LOKASI PLANT</span>
            <span class="font-semibold text-ink">{{ viewLog.plant_name }}</span>
          </div>
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">MESIN & BAGIAN</span>
            <span class="font-semibold text-ink">{{ viewLog.machine_name }}</span>
            <div class="text-ink-2">{{ viewLog.sub_machine_name }}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-ink">
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">WAKTU</span>
            <span class="font-mono font-medium">{{ viewLog.start_time }} - {{ viewLog.end_time }}</span>
          </div>
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">DURASI</span>
            <span class="font-semibold text-primary">{{ formatDuration(viewLog.duration_minutes) }} ({{ viewLog.duration_minutes }} mnt)</span>
          </div>
        </div>

        <div class="p-2.5 bg-muted rounded-md">
          <span class="text-ink-3 block text-[10px] uppercase font-semibold mb-0.5">SUKU CADANG</span>
          <span class="text-ink font-medium">{{ viewLog.sparepart || '-' }}</span>
        </div>

        <div>
          <span class="font-semibold text-ink-2 uppercase text-[10px] block mb-1">Uraian Aktivitas</span>
          <div class="p-3 bg-muted rounded-md leading-relaxed border border-line text-ink">
            {{ viewLog.activity_description }}
          </div>
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
          @click="viewLog = null"
        >
          Tutup
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useMasterStore } from '../../stores/master'
import { useLogbookStore } from '../../stores/logbook'
import { logbookService } from '../../services/logbookService'
import { LOG_STATUS } from '../../constants/logStatus'
import { formatDuration } from '../../utils/duration'
import {
  toLocalDateString,
  addDays,
  getWeekStart,
  formatDateRange
} from '../../utils/dateKeys'
import {
  splitLogbookToSegments,
  layoutDaySegments,
  computeDaySummary
} from '../../utils/calendarLayout'

import PlannerSidebarPanel from '../../components/logbook/PlannerSidebarPanel.vue'
import WeekCalendarCard from '../../components/logbook/WeekCalendarCard.vue'
import LogbookEventPopover from '../../components/logbook/LogbookEventPopover.vue'
import FilterDrawer from '../../components/logbook/FilterDrawer.vue'
import FabCreate from '../../components/logbook/FabCreate.vue'
import AppBadge from '../../components/common/AppBadge.vue'
import AppModal from '../../components/common/AppModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const masterStore = useMasterStore()
const logbookStore = useLogbookStore()

// State Tanggal Kalender (default hari ini)
const todayStr = toLocalDateString(new Date())
const selectedDate = ref(todayStr)

// Responsive Visible Day Count
const visibleDayCount = ref(7)

function updateVisibleDays() {
  const w = window.innerWidth
  if (w >= 1024) {
    visibleDayCount.value = 7
  } else if (w >= 768) {
    visibleDayCount.value = 3
  } else {
    visibleDayCount.value = 1
  }
}

// Filter State Kalender
const filters = reactive({
  status: {
    DRAFT: true,
    PENDING: true,
    APPROVED: true,
    REJECTED: true,
    CANCELLED: true
  },
  shifts: {}
})

// UI Interaction State Kalender
const loadingCalendar = ref(false)
const rawCalendarLogs = ref([])
const isFilterDrawerOpen = ref(false)
const selectedLogbookForPopover = ref(null)
const popoverAnchorRect = ref(null)

// State Tabel Riwayat
const activeStatus = ref('ALL')
const searchQuery = ref('')
const viewLog = ref(null)

// Rentang Tanggal Kalender
const startDateStr = computed(() => {
  if (visibleDayCount.value === 7) {
    return getWeekStart(selectedDate.value, 1)
  }
  return selectedDate.value
})

const rangeDays = computed(() => {
  const days = []
  const count = visibleDayCount.value
  const start = startDateStr.value
  for (let i = 0; i < count; i++) {
    days.push(addDays(start, i))
  }
  return days
})

const endDateStr = computed(() => {
  const arr = rangeDays.value
  return arr[arr.length - 1]
})

const toolbarTitle = computed(() => {
  if (visibleDayCount.value === 1) {
    return formatDateRange(selectedDate.value, selectedDate.value)
  }
  return formatDateRange(startDateStr.value, endDateStr.value)
})

const rangeIncludesToday = computed(() => {
  return rangeDays.value.includes(todayStr)
})

const allFiltersDisabled = computed(() => {
  const allStatusOff = Object.values(filters.status).every(v => v === false)
  const allShiftOff = Object.values(filters.shifts).length > 0 &&
    Object.values(filters.shifts).every(v => v === false)
  return allStatusOff || allShiftOff
})

const filteredCalendarLogs = computed(() => {
  return rawCalendarLogs.value.filter(log => {
    if (filters.status[log.status] === false) return false
    if (filters.shifts[log.shift_id] === false) return false
    return true
  })
})

const calculatedDays = computed(() => {
  const logs = filteredCalendarLogs.value

  return rangeDays.value.map(dayDate => {
    const daySegments = []
    logs.forEach(log => {
      const segs = splitLogbookToSegments(log)
      segs.forEach(s => {
        if (s.dateKey === dayDate) {
          daySegments.push(s)
        }
      })
    })

    const layoutedBlocks = layoutDaySegments(daySegments)
    const summary = computeDaySummary(daySegments)

    return {
      dateKey: dayDate,
      blocks: layoutedBlocks,
      summary
    }
  })
})

const isCalendarEmpty = computed(() => {
  if (loadingCalendar.value) return false
  return calculatedDays.value.every(d => d.blocks.length === 0)
})

// Data Tabel Riwayat
const myLogs = computed(() => {
  return logbookStore.logbooks.filter(l => l.user_id === authStore.user?.id)
})

const statusTabs = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Draft', value: LOG_STATUS.DRAFT },
  { label: 'Menunggu Approval', value: LOG_STATUS.PENDING },
  { label: 'Disetujui', value: LOG_STATUS.APPROVED },
  { label: 'Ditolak', value: LOG_STATUS.REJECTED }
]

function getCountForStatus(status) {
  if (status === 'ALL') return myLogs.value.length
  return myLogs.value.filter(l => l.status === status).length
}

const filteredLogs = computed(() => {
  let list = myLogs.value

  if (activeStatus.value !== 'ALL') {
    list = list.filter(l => l.status === activeStatus.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(l =>
      l.activity_description?.toLowerCase().includes(q) ||
      l.machine_name?.toLowerCase().includes(q) ||
      l.sub_machine_name?.toLowerCase().includes(q) ||
      l.sparepart?.toLowerCase().includes(q)
    )
  }

  return list
})

// Actions & Methods Kalender
async function loadCalendarData() {
  loadingCalendar.value = true
  try {
    const list = await logbookService.list({
      dateFrom: startDateStr.value,
      dateTo: endDateStr.value,
      userId: authStore.user?.id
    })
    rawCalendarLogs.value = list
  } finally {
    loadingCalendar.value = false
  }
}

function handleDateSelect(dateKey) {
  selectedDate.value = dateKey
}

function handleGoToday() {
  selectedDate.value = todayStr
}

function handlePrevRange() {
  selectedDate.value = addDays(selectedDate.value, -visibleDayCount.value)
}

function handleNextRange() {
  selectedDate.value = addDays(selectedDate.value, visibleDayCount.value)
}

function handleBlockClick({ logbook, rect }) {
  selectedLogbookForPopover.value = logbook
  popoverAnchorRect.value = rect
}

function handleNavigateInput() {
  router.push('/logbook/input')
}

function handleCreateFromSlot(slot) {
  router.push({
    path: '/logbook/input',
    query: {
      date: slot.date,
      time: slot.time
    }
  })
}

function handleNavigateEdit(id) {
  router.push(`/logbook/edit/${id}`)
}

watch([startDateStr, endDateStr], () => {
  loadCalendarData()
})

onMounted(async () => {
  updateVisibleDays()
  window.addEventListener('resize', updateVisibleDays)

  if (masterStore.shifts.length === 0) {
    await masterStore.fetchAll()
  }

  masterStore.shifts.forEach(s => {
    if (filters.shifts[s.id] === undefined) {
      filters.shifts[s.id] = true
    }
  })

  await Promise.all([
    loadCalendarData(),
    logbookStore.fetchLogbooks({ userId: authStore.user?.id })
  ])
})

onUnmounted(() => {
  window.removeEventListener('resize', updateVisibleDays)
})
</script>
