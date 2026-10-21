<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Pemeriksaan & Persetujuan</div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">Approval Logbook Teknisi</h1>
        <p class="text-xs text-ink-2 mt-0.5">
          Proses approval dilakukan per teknisi. Menyetujui teknisi akan otomatis menyetujui seluruh logbook yang diajukan ke database.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-status-pending-bg text-status-pending-fg text-xs font-medium border border-warning/20">
          <span class="w-1.5 h-1.5 rounded-full bg-status-pending-dot animate-pulse" />
          {{ pendingTechCount }} Teknisi Menunggu Approval ({{ pendingLogCount }} Logbook)
        </span>
      </div>
    </div>

    <!-- Filter & Toolbar -->
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

      <!-- Search Input & Mode Switcher -->
      <div class="flex items-center gap-2 w-full md:w-auto justify-end">
        <div class="relative w-full md:w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari teknisi / plant / mesin..."
            class="w-full h-9 pl-8 pr-3 rounded-md border border-line text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-muted placeholder:text-ink-3"
          />
          <svg class="w-4 h-4 text-ink-3 absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Mode Toggle (Per Teknisi vs Semua Logbook) -->
        <div class="hidden sm:flex items-center bg-muted border border-line rounded-md p-0.5">
          <button
            type="button"
            :class="[
              'px-2.5 py-1 text-xs rounded transition font-medium',
              viewMode === 'technician' ? 'bg-surface text-ink font-semibold shadow-xs' : 'text-ink-3 hover:text-ink'
            ]"
            @click="viewMode = 'technician'"
            title="Kelompokkan persetujuan per teknisi"
          >
            Per Teknisi
          </button>
          <button
            type="button"
            :class="[
              'px-2.5 py-1 text-xs rounded transition font-medium',
              viewMode === 'logbook' ? 'bg-surface text-ink font-semibold shadow-xs' : 'text-ink-3 hover:text-ink'
            ]"
            @click="viewMode = 'logbook'"
            title="Tampilan daftar per entri logbook"
          >
            Semua Log
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAMPILAN 1: Approval Berdasarkan User (Teknisi)            -->
    <!-- ======================================================== -->
    <div v-if="viewMode === 'technician'" class="space-y-3.5">
      <!-- Empty State -->
      <div
        v-if="filteredTechnicians.length === 0"
        class="bg-surface rounded-lg shadow-card border border-line p-10 text-center text-ink-3 text-xs"
      >
        <svg class="w-10 h-10 mx-auto mb-2 text-ink-3/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-sm font-semibold text-ink">Tidak ada pengajuan yang sesuai filter</div>
        <div class="text-xs text-ink-2 mt-0.5">
          {{ selectedFilter === LOG_STATUS.PENDING ? 'Seluruh logbook teknisi telah diproses dengan baik.' : 'Tidak ada riwayat pada kriteria ini.' }}
        </div>
      </div>

      <!-- Kartu Per Teknisi -->
      <div
        v-for="tech in filteredTechnicians"
        :key="tech.user_id"
        class="bg-surface rounded-lg shadow-card border border-line overflow-hidden transition-all duration-150"
      >
        <!-- Header Kartu Teknisi -->
        <div class="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface hover:bg-muted/10 transition-colors">
          <!-- Info Teknisi -->
          <div class="flex items-start sm:items-center gap-3.5 min-w-0">
            <Avatar
              :src="tech.user_photo_url"
              :name="tech.user_name"
              size="lg"
            />
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-sm sm:text-base font-bold text-ink leading-tight truncate">
                  {{ tech.user_name }}
                </h2>
                <span class="text-xs font-mono text-ink-3 bg-muted px-2 py-0.5 rounded border border-line">
                  {{ tech.user_nik }}
                </span>
                <span class="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded">
                  {{ tech.plant_name }}
                </span>
                <span v-if="tech.work_group_name && tech.work_group_name !== '-'" class="text-xs text-ink-2 bg-muted px-2 py-0.5 rounded">
                  {{ tech.work_group_name }}
                </span>
              </div>

              <!-- Metrik Ringkas Pengajuan -->
              <div class="flex flex-wrap items-center gap-3 text-xs text-ink-2 mt-1.5">
                <div class="flex items-center gap-1">
                  <span class="font-semibold text-ink">{{ tech.logs.length }} Logbook</span>
                  <span v-if="tech.pendingCount > 0" class="text-status-pending-fg font-semibold">
                    ({{ tech.pendingCount }} diajukan)
                  </span>
                </div>
                <span>•</span>
                <div>
                  Total Durasi: <span class="font-semibold text-primary">{{ formatDuration(tech.totalDurationMinutes) }}</span>
                </div>
                <span v-if="tech.machines.length > 0">•</span>
                <div v-if="tech.machines.length > 0" class="truncate max-w-xs text-ink-3">
                  Mesin: {{ tech.machines.slice(0, 2).join(', ') }}{{ tech.machines.length > 2 ? ' +' + (tech.machines.length - 2) : '' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Aksi Persetujuan Per Teknisi -->
          <div class="flex flex-wrap items-center gap-2 shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-line">
            <!-- Tombol Setujui Semua Logbook Milik Teknisi Ini -->
            <button
              v-if="tech.pendingCount > 0"
              type="button"
              :disabled="actionLoading"
              class="h-8 px-4 rounded-md text-xs font-semibold bg-success hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              @click="approveTechnician(tech)"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span>Setujui Semua Log ({{ tech.pendingCount }})</span>
            </button>

            <!-- Tombol Tolak Seluruh Pengajuan Teknisi Ini -->
            <button
              v-if="tech.pendingCount > 0"
              type="button"
              :disabled="actionLoading"
              class="h-8 px-3 rounded-md text-xs font-medium bg-status-rejected-bg text-status-rejected-fg hover:bg-danger/10 border border-danger/20 transition flex items-center gap-1 disabled:opacity-50"
              @click="openRejectModal(tech)"
            >
              <svg class="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Tolak dengan Catatan</span>
            </button>

            <!-- Status Lencana Jika Sudah Diproses -->
            <div v-else class="flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted text-xs font-medium text-ink-2">
              <span v-if="tech.approvedCount > 0" class="text-success font-semibold flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-success" /> {{ tech.approvedCount }} Disetujui
              </span>
              <span v-if="tech.rejectedCount > 0" class="text-danger font-semibold flex items-center gap-1 ml-2">
                <span class="w-2 h-2 rounded-full bg-danger" /> {{ tech.rejectedCount }} Ditolak
              </span>
            </div>

            <!-- Toggle Rincian Logbook -->
            <button
              type="button"
              class="h-8 px-3 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition flex items-center gap-1"
              @click="toggleTechDetails(tech.user_id)"
            >
              <span>{{ isTechExpanded(tech.user_id) ? 'Tutup Rincian' : 'Lihat Rincian' }}</span>
              <svg
                :class="['w-3.5 h-3.5 text-ink-3 transition-transform duration-200', isTechExpanded(tech.user_id) ? 'rotate-180' : '']"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Tabel Rincian Logbook Teknisi (Expandable Accordion) -->
        <div v-if="isTechExpanded(tech.user_id)" class="border-t border-line bg-muted/20">
          <div class="px-4 py-2 bg-muted/40 border-b border-line flex items-center justify-between text-xs text-ink-2 font-medium">
            <span>Daftar Logbook yang diajukan oleh {{ tech.user_name }}:</span>
            <span class="text-ink-3">{{ tech.logs.length }} entri log</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead class="bg-muted/50 text-[11px] font-semibold text-ink-3 border-b border-line">
                <tr>
                  <th class="px-4 py-2.5">Waktu & Shift</th>
                  <th class="px-4 py-2.5">Mesin & Komponen</th>
                  <th class="px-4 py-2.5">Durasi</th>
                  <th class="px-4 py-2.5">Uraian Pekerjaan & Suku Cadang</th>
                  <th class="px-4 py-2.5">Status</th>
                  <th class="px-4 py-2.5 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line text-ink">
                <tr
                  v-for="log in tech.logs"
                  :key="log.id"
                  class="hover:bg-muted/30 transition-colors"
                >
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="font-semibold text-ink">{{ log.task_date }}</div>
                    <div class="text-[11px] text-ink-2">{{ log.shift_name }}</div>
                    <div class="text-[11px] font-mono text-ink-3">{{ log.start_time }} - {{ log.end_time }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-ink">{{ log.machine_name }}</div>
                    <div class="text-[11px] text-ink-2">{{ log.sub_machine_name || '-' }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="font-medium text-primary">{{ formatDuration(log.duration_minutes) }}</span>
                    <div class="text-[10px] text-ink-3 font-mono">({{ log.duration_minutes }} mnt)</div>
                  </td>
                  <td class="px-4 py-3 max-w-sm">
                    <p class="text-ink-2 line-clamp-2 leading-relaxed">
                      {{ log.activity_description }}
                    </p>
                    <div v-if="log.sparepart && log.sparepart !== '-'" class="text-[11px] text-primary mt-0.5 font-medium truncate">
                      Part: {{ log.sparepart }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <AppBadge :status="log.status" />
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                      @click="activeLogDetail = log"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAMPILAN 2: Tabel Flat Semua Logbook (Existing Mode)       -->
    <!-- ======================================================== -->
    <div v-else class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
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

    <!-- Modal Catatan Penolakan Per Teknisi -->
    <AppModal
      :is-open="!!rejectTarget"
      title="Tolak Pengajuan Logbook Teknisi"
      @close="rejectTarget = null"
    >
      <form v-if="rejectTarget" @submit.prevent="submitRejection" class="space-y-3.5 text-xs">
        <div class="p-3 bg-status-rejected-bg border border-danger/20 rounded-md text-status-rejected-fg">
          <div class="font-semibold text-sm">Teknisi: {{ rejectTarget.user_name }} ({{ rejectTarget.user_nik }})</div>
          <div class="text-[11px] mt-0.5">
            Menolak akan mengembalikan seluruh <strong>{{ rejectTarget.pendingCount || rejectTarget.logs?.length }} logbook</strong> yang diajukan oleh teknisi ini ke status DITOLAK agar dapat diperbaiki. Catatan revisi wajib diisi.
          </div>
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
            placeholder="Tuliskan alasan penolakan dan instruksi perbaikan untuk teknisi ini..."
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
            :disabled="actionLoading"
            class="h-8 px-4 rounded-md bg-danger hover:bg-red-600 active:bg-red-700 text-white font-medium text-xs transition shadow-card disabled:opacity-50"
          >
            {{ actionLoading ? 'Memproses...' : 'Konfirmasi Tolak Seluruh Logbook' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- Modal Detail Logbook Satuan -->
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
            <div class="text-ink-2">{{ activeLogDetail.sub_machine_name || '-' }}</div>
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
          <div class="p-3 bg-muted rounded-md leading-relaxed border border-line text-ink whitespace-pre-line">
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

    <!-- Toast Notifikasi Umpan Balik -->
    <Toast
      :show="toast.show"
      :title="toast.title"
      :message="toast.message"
      :variant="toast.variant"
      @close="toast.show = false"
    />
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
import Avatar from '../../components/common/Avatar.vue'
import Toast from '../../components/common/Toast.vue'

const authStore = useAuthStore()
const logbookStore = useLogbookStore()

const selectedFilter = ref(LOG_STATUS.PENDING)
const searchQuery = ref('')
const viewMode = ref('technician') // 'technician' (default) | 'logbook'
const activeLogDetail = ref(null)
const rejectTarget = ref(null)
const rejectionReason = ref('')
const actionLoading = ref(false)
const expandedTechMap = ref({})

const toast = ref({
  show: false,
  title: '',
  message: '',
  variant: 'success'
})

function showToast(title, message, variant = 'success') {
  toast.value = { show: true, title, message, variant }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

onMounted(async () => {
  await logbookStore.fetchLogbooks()
})

const filterTabs = [
  { label: 'Perlu Approval', value: LOG_STATUS.PENDING },
  { label: 'Semua', value: 'ALL' },
  { label: 'Disetujui', value: LOG_STATUS.APPROVED },
  { label: 'Ditolak', value: LOG_STATUS.REJECTED }
]

// Pengelompokan Logbook Per Teknisi (User)
const allTechniciansGrouped = computed(() => {
  const map = new Map()

  for (const log of logbookStore.logbooks) {
    const uId = log.user_id || log.user?.id || log.user_nik || log.user_name || 'unknown'
    if (!map.has(uId)) {
      map.set(uId, {
        user_id: log.user_id || log.user?.id,
        user_name: log.user_name || log.user?.full_name || 'Teknisi',
        user_nik: log.user_nik || log.user?.nik || '-',
        user_email: log.user_email || log.user?.email || '',
        user_photo_url: log.user_photo_url || log.user?.photo_url,
        plant_name: log.plant_name || log.plant?.name || '-',
        work_group_name: log.work_group_name || log.user?.work_group?.name || '-',
        logs: [],
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        totalDurationMinutes: 0,
        machines: []
      })
    }

    const tech = map.get(uId)
    tech.logs.push(log)
    if (log.status === LOG_STATUS.PENDING || log.status === 'PENDING') tech.pendingCount++
    if (log.status === LOG_STATUS.APPROVED || log.status === 'APPROVED') tech.approvedCount++
    if (log.status === LOG_STATUS.REJECTED || log.status === 'REJECTED') tech.rejectedCount++
    tech.totalDurationMinutes += (log.duration_minutes || 0)

    if (log.machine_name && !tech.machines.includes(log.machine_name)) {
      tech.machines.push(log.machine_name)
    }
  }

  return Array.from(map.values())
})

// Teknisi Terfilter
const filteredTechnicians = computed(() => {
  let list = allTechniciansGrouped.value

  // Filter berdasarkan status
  if (selectedFilter.value === LOG_STATUS.PENDING) {
    list = list.filter(t => t.pendingCount > 0)
  } else if (selectedFilter.value === LOG_STATUS.APPROVED) {
    list = list.filter(t => t.approvedCount > 0 && t.pendingCount === 0)
  } else if (selectedFilter.value === LOG_STATUS.REJECTED) {
    list = list.filter(t => t.rejectedCount > 0 && t.pendingCount === 0)
  }

  // Filter pencarian
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t =>
      t.user_name.toLowerCase().includes(q) ||
      t.user_nik.toLowerCase().includes(q) ||
      t.plant_name.toLowerCase().includes(q) ||
      t.machines.some(m => m.toLowerCase().includes(q))
    )
  }

  return list
})

// Logbook Flat Terfilter
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

const pendingTechCount = computed(() => {
  return allTechniciansGrouped.value.filter(t => t.pendingCount > 0).length
})

const pendingLogCount = computed(() => {
  return logbookStore.logbooks.filter(l => l.status === LOG_STATUS.PENDING).length
})

function getCount(status) {
  if (status === 'ALL') return allTechniciansGrouped.value.length
  if (status === LOG_STATUS.PENDING) return allTechniciansGrouped.value.filter(t => t.pendingCount > 0).length
  if (status === LOG_STATUS.APPROVED) return allTechniciansGrouped.value.filter(t => t.approvedCount > 0 && t.pendingCount === 0).length
  if (status === LOG_STATUS.REJECTED) return allTechniciansGrouped.value.filter(t => t.rejectedCount > 0 && t.pendingCount === 0).length
  return 0
}

function isTechExpanded(userId) {
  // Default terbuka jika belum pernah diubah agar supervisor langsung melihat rincian log
  return expandedTechMap.value[userId] !== false
}

function toggleTechDetails(userId) {
  expandedTechMap.value[userId] = !isTechExpanded(userId)
}

// Persetujuan Per Teknisi (Menyetujui semua log pending milik teknisi tersebut)
async function approveTechnician(tech) {
  if (!tech.user_id) return
  actionLoading.value = true
  try {
    const res = await logbookStore.approveByTechnician(tech.user_id, 'Disetujui per teknisi sesuai SOP pemeliharaan.')
    showToast(
      'Approval Berhasil Disimpan',
      `Seluruh logbook (${tech.pendingCount} entri) milik Teknisi ${tech.user_name} otomatis disetujui dan tersimpan ke database.`
    )
  } catch (err) {
    showToast('Gagal Menyetujui', err.message || 'Terjadi kesalahan sistem.', 'danger')
  } finally {
    actionLoading.value = false
  }
}

function openRejectModal(tech) {
  rejectTarget.value = tech
  rejectionReason.value = ''
}

async function submitRejection() {
  if (!rejectTarget.value || !rejectionReason.value.trim()) return
  actionLoading.value = true
  try {
    await logbookStore.rejectByTechnician(rejectTarget.value.user_id, rejectionReason.value)
    showToast(
      'Logbook Teknisi Ditolak',
      `Pengajuan logbook milik Teknisi ${rejectTarget.value.user_name} telah ditolak dengan catatan perbaikan.`,
      'danger'
    )
    rejectTarget.value = null
  } catch (err) {
    showToast('Gagal Menolak', err.message || 'Terjadi kesalahan sistem.', 'danger')
  } finally {
    actionLoading.value = false
  }
}
</script>
