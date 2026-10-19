<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Pemeriksaan & Persetujuan</div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">Approval Logbook Teknisi</h1>
        <p class="text-xs text-ink-2 mt-0.5">Periksa keakuratan waktu, mesin, dan suku cadang sebelum menyetujui logbook.</p>
      </div>

      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-status-pending-bg text-status-pending-fg text-xs font-medium border border-warning/20">
          <span class="w-1.5 h-1.5 rounded-full bg-status-pending-dot animate-pulse" />
          {{ pendingCount }} Menunggu Persetujuan Anda
        </span>
      </div>
    </div>

    <!-- Filter & Search Bar per 11.5.11 -->
    <div class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line flex flex-col md:flex-row items-center justify-between gap-3">
      <!-- Status Tabs -->
      <div class="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          type="button"
          :class="[
            'px-3 py-1.5 rounded-md text-xs font-medium transition shrink-0',
            selectedFilter === tab.value
              ? 'bg-primary text-white font-semibold'
              : 'text-ink-2 hover:bg-muted'
          ]"
          @click="selectedFilter = tab.value"
        >
          {{ tab.label }}
          <span
            :class="[
              'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
              selectedFilter === tab.value ? 'bg-white/20 text-white' : 'bg-line text-ink-2'
            ]"
          >
            {{ getCount(tab.value) }}
          </span>
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative w-full md:w-72">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari teknisi / mesin / uraian..."
          class="w-full h-9 pl-8 pr-3 rounded-md border border-line text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-muted placeholder:text-ink-3"
        />
        <svg class="w-4 h-4 text-ink-3 absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>

    <!-- Approval Table Card per 11.5.11 -->
    <div class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[13px] border-collapse min-w-[750px]">
          <thead class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-3">Teknisi & Plant</th>
              <th class="px-4 py-3">Mesin & Bagian</th>
              <th class="px-4 py-3">Waktu & Durasi</th>
              <th class="px-4 py-3">Uraian Pekerjaan</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr v-if="filteredLogs.length === 0">
              <td colspan="6" class="px-4 py-12 text-center text-ink-3 text-xs">
                Tidak ada data logbook yang sesuai dengan filter.
              </td>
            </tr>
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              class="hover:bg-muted/40 transition-colors group"
            >
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="font-semibold text-ink">{{ log.user_name }}</div>
                <div class="text-xs text-ink-3 font-mono">{{ log.user_nik }}</div>
                <div class="text-[11px] text-ink-2">{{ log.plant_name }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-ink">{{ log.machine_name }}</div>
                <div class="text-xs text-ink-2">{{ log.sub_machine_name }}</div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="text-xs text-ink font-medium">{{ log.task_date }} ({{ log.shift_name }})</div>
                <div class="text-xs font-mono text-ink-3">{{ log.start_time }} - {{ log.end_time }}</div>
                <span class="inline-block mt-0.5 px-2 py-0.5 rounded-sm text-[10px] font-medium bg-muted text-ink-2">
                  {{ formatDuration(log.duration_minutes) }}
                </span>
              </td>
              <td class="px-4 py-3 max-w-xs">
                <p class="text-xs text-ink-2 line-clamp-2 leading-relaxed">
                  {{ log.activity_description }}
                </p>
                <div v-if="log.sparepart && log.sparepart !== '-'" class="text-[11px] text-primary mt-1 font-medium truncate">
                  Part: {{ log.sparepart }}
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <AppBadge :status="log.status" />
                <div v-if="log.supervisor_name" class="text-[11px] text-ink-3 mt-1">
                  Oleh: {{ log.supervisor_name }}
                </div>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <template v-if="log.status === 'PENDING'">
                    <button
                      type="button"
                      class="h-7 px-3 rounded-md text-xs font-medium bg-success hover:bg-emerald-600 active:bg-emerald-700 text-white transition shadow-card"
                      @click="approveLog(log)"
                    >
                      Setujui
                    </button>
                    <button
                      type="button"
                      class="h-7 px-3 rounded-md text-xs font-medium bg-status-rejected-bg text-status-rejected-fg hover:bg-danger/10 border border-danger/20 transition"
                      @click="openRejectModal(log)"
                    >
                      Tolak
                    </button>
                  </template>
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                    @click="activeLogDetail = log"
                  >
                    Detail
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Reject Reason Modal (Mandatory Notes) per 11.5.11 & 5.2 -->
    <AppModal
      :is-open="!!rejectTarget"
      title="Tolak Logbook & Beri Catatan Revisi"
      @close="rejectTarget = null"
    >
      <form v-if="rejectTarget" @submit.prevent="submitRejection" class="space-y-3.5 text-xs">
        <div class="p-3 bg-status-pending-bg border border-warning/20 rounded-md text-status-pending-fg">
          <div class="font-semibold">Teknisi: {{ rejectTarget.user_name }} ({{ rejectTarget.machine_name }})</div>
          <div class="text-[11px] mt-0.5">Sesuai SOP Satoria, penolakan mewajibkan catatan jelas agar teknisi dapat merevisi.</div>
        </div>

        <div>
          <label for="reject-textarea" class="block font-medium text-ink mb-1.5">
            Catatan Revisi / Alasan Penolakan <span class="text-danger">*</span>
          </label>
          <textarea
            id="reject-textarea"
            v-model="rejectionReason"
            rows="4"
            required
            placeholder="Tuliskan catatan perbaikan, contoh: parameter pengujian leak rate belum lengkap dicantumkan..."
            class="w-full p-2.5 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-danger focus:ring-1 focus:ring-danger focus:outline-none leading-relaxed"
          />
        </div>

        <div class="pt-2 flex justify-end gap-2 border-t border-line">
          <button
            type="button"
            class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
            @click="rejectTarget = null"
          >
            Batal
          </button>
          <button
            type="submit"
            class="h-8 px-4 rounded-md bg-danger hover:bg-red-600 active:bg-red-700 text-white font-medium text-xs transition shadow-card"
          >
            Konfirmasi Tolak Logbook
          </button>
        </div>
      </form>
    </AppModal>

    <!-- Detail Inspection Modal -->
    <AppModal
      :is-open="!!activeLogDetail"
      title="Pemeriksaan Detail Logbook"
      @close="activeLogDetail = null"
    >
      <div v-if="activeLogDetail" class="space-y-3.5 text-xs">
        <div class="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <div class="text-[10px] text-ink-3">Logbook ID #{{ activeLogDetail.id }}</div>
            <div class="font-semibold text-sm text-ink">{{ activeLogDetail.user_name }} • {{ activeLogDetail.user_nik }}</div>
          </div>
          <AppBadge :status="activeLogDetail.status" />
        </div>

        <div class="grid grid-cols-2 gap-2 text-ink">
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">LOKASI PLANT</span>
            <span class="font-semibold text-ink">{{ activeLogDetail.plant_name }}</span>
          </div>
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">MESIN & SUB-MESIN</span>
            <span class="font-semibold text-ink">{{ activeLogDetail.machine_name }}</span>
            <div class="text-ink-2">{{ activeLogDetail.sub_machine_name }}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-ink">
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">WAKTU</span>
            <span class="font-medium">{{ activeLogDetail.task_date }} ({{ activeLogDetail.shift_name }})</span>
            <div class="font-mono text-ink-2">{{ activeLogDetail.start_time }} - {{ activeLogDetail.end_time }}</div>
          </div>
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold">DURASI</span>
            <span class="font-semibold text-primary">{{ formatDuration(activeLogDetail.duration_minutes) }} ({{ activeLogDetail.duration_minutes }} menit)</span>
          </div>
        </div>

        <div class="p-2.5 bg-muted rounded-md">
          <span class="text-ink-3 block text-[10px] uppercase font-semibold mb-0.5">SUKU CADANG (SPAREPART)</span>
          <span class="text-ink font-medium">{{ activeLogDetail.sparepart || '-' }}</span>
        </div>

        <div>
          <span class="font-semibold text-ink-2 uppercase text-[10px] block mb-1">Uraian Lengkap Aktivitas</span>
          <div class="p-3 bg-muted rounded-md leading-relaxed border border-line text-ink">
            {{ activeLogDetail.activity_description }}
          </div>
        </div>

        <div v-if="activeLogDetail.approval_notes" class="p-3 bg-status-rejected-bg border border-danger/20 rounded-md text-status-rejected-fg">
          <div class="font-semibold mb-0.5">Catatan Pemeriksaan:</div>
          <div>{{ activeLogDetail.approval_notes }}</div>
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
          @click="activeLogDetail = null"
        >
          Tutup
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useLogbookStore } from '../../stores/logbook'
import { LOG_STATUS } from '../../constants/logStatus'
import { formatDuration } from '../../utils/duration'
import AppBadge from '../../components/common/AppBadge.vue'
import AppModal from '../../components/common/AppModal.vue'

const authStore = useAuthStore()
const logbookStore = useLogbookStore()

const selectedFilter = ref(LOG_STATUS.PENDING)
const searchQuery = ref('')
const activeLogDetail = ref(null)
const rejectTarget = ref(null)
const rejectionReason = ref('')

onMounted(async () => {
  await logbookStore.fetchLogbooks()
})

const filterTabs = [
  { label: 'Perlu Approval', value: LOG_STATUS.PENDING },
  { label: 'Semua Logbook', value: 'ALL' },
  { label: 'Disetujui', value: LOG_STATUS.APPROVED },
  { label: 'Ditolak', value: LOG_STATUS.REJECTED }
]

const pendingCount = computed(() => {
  return logbookStore.logbooks.filter(l => l.status === LOG_STATUS.PENDING).length
})

function getCount(status) {
  if (status === 'ALL') return logbookStore.logbooks.length
  return logbookStore.logbooks.filter(l => l.status === status).length
}

const filteredLogs = computed(() => {
  let list = logbookStore.logbooks

  if (selectedFilter.value !== 'ALL') {
    list = list.filter(l => l.status === selectedFilter.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(l =>
      l.user_name?.toLowerCase().includes(q) ||
      l.user_nik?.toLowerCase().includes(q) ||
      l.machine_name?.toLowerCase().includes(q) ||
      l.activity_description?.toLowerCase().includes(q) ||
      l.sparepart?.toLowerCase().includes(q)
    )
  }

  return list
})

async function approveLog(log) {
  await logbookStore.approveLogbook(log.id, authStore.user, 'Disetujui sesuai SOP pemeliharaan.')
}

function openRejectModal(log) {
  rejectTarget.value = log
  rejectionReason.value = ''
}

async function submitRejection() {
  if (!rejectTarget.value || !rejectionReason.value.trim()) return
  await logbookStore.rejectLogbook(rejectTarget.value.id, authStore.user, rejectionReason.value)
  rejectTarget.value = null
}
</script>
