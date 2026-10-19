<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="text-xs font-semibold text-brand-600 uppercase tracking-wider">Validasi & Supervisi</div>
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Approval Log Aktivitas Teknisi</h1>
        <p class="text-xs text-slate-500 mt-1">Tinjau, setujui, atau kembalikan log aktivitas harian dengan catatan revisi.</p>
      </div>

      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
          <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          {{ pendingCount }} Menunggu Persetujuan
        </span>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <!-- Status Tabs -->
      <div class="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          type="button"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0',
            selectedFilter === tab.value
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          ]"
          @click="selectedFilter = tab.value"
        >
          {{ tab.label }}
          <span
            :class="[
              'ml-1.5 px-1.5 py-0.2 rounded-full text-[10px]',
              selectedFilter === tab.value ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
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
          placeholder="Cari teknisi / alat / kategori..."
          class="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50"
        />
        <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>

    <!-- Approval Table Card -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th class="px-6 py-3.5">Teknisi & Shift</th>
              <th class="px-6 py-3.5">Peralatan & Lokasi</th>
              <th class="px-6 py-3.5">Kategori & Aktivitas</th>
              <th class="px-6 py-3.5">Deskripsi Pekerjaan</th>
              <th class="px-6 py-3.5">Status</th>
              <th class="px-6 py-3.5 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="filteredLogs.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-slate-400 text-sm">
                Tidak ada data log yang sesuai dengan filter.
              </td>
            </tr>
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              class="hover:bg-slate-50/60 transition group"
            >
              <td class="px-6 py-4">
                <div class="font-bold text-slate-800">{{ log.userName }}</div>
                <div class="text-xs text-slate-400">{{ log.employeeNo }} • {{ log.shift }}</div>
                <div class="text-[11px] text-slate-500 font-mono">{{ log.logDate }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="font-semibold text-slate-800">{{ log.equipmentName }}</div>
                <div class="text-xs text-slate-500">{{ log.locationName }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-xs font-bold text-indigo-700">{{ log.categoryName }}</div>
                <div class="text-xs text-slate-600 line-clamp-1 max-w-xs">{{ log.activityTypeName }}</div>
              </td>
              <td class="px-6 py-4 max-w-xs">
                <p class="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                  {{ log.description }}
                </p>
                <div class="text-[11px] text-slate-400 mt-0.5">Hasil: {{ log.resultStatus }}</div>
              </td>
              <td class="px-6 py-4">
                <AppBadge :status="log.status" />
                <div v-if="log.reviewedBy" class="text-[11px] text-slate-400 mt-1">
                  Oleh: {{ log.reviewedBy }}
                </div>
              </td>
              <td class="px-6 py-4 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Quick actions for SUBMITTED status -->
                  <template v-if="log.status === 'SUBMITTED'">
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                      @click="approveLog(log)"
                    >
                      Setujui
                    </button>
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                      @click="openRejectModal(log)"
                    >
                      Tolak
                    </button>
                  </template>
                  <button
                    type="button"
                    class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
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

    <!-- Reject Reason Modal -->
    <AppModal
      :is-open="!!rejectTarget"
      title="Tolak Log Aktivitas & Beri Catatan"
      @close="rejectTarget = null"
    >
      <form v-if="rejectTarget" @submit.prevent="submitRejection" class="space-y-4 text-xs">
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
          <div class="font-bold">Log Teknisi: {{ rejectTarget.userName }} ({{ rejectTarget.equipmentName }})</div>
          <div class="text-[11px] text-amber-700 mt-0.5">Penolakan mewajibkan alasan jelas agar teknisi dapat merevisi pekerjaan.</div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1.5">
            Alasan Penolakan / Catatan Perbaikan <span class="text-rose-500">*</span>
          </label>
          <textarea
            v-model="rejectionReason"
            rows="4"
            required
            placeholder="Tuliskan kekurangan, misalnya: data parameter tekanan belum dicantumkan, mohon lengkapi..."
            class="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
          ></textarea>
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition"
            @click="rejectTarget = null"
          >
            Batal
          </button>
          <button
            type="submit"
            class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-sm"
          >
            Konfirmasi Tolak
          </button>
        </div>
      </form>
    </AppModal>

    <!-- Detail Modal -->
    <AppModal
      :is-open="!!activeLogDetail"
      title="Tinjauan Detail Log Aktivitas"
      @close="activeLogDetail = null"
    >
      <div v-if="activeLogDetail" class="space-y-4 text-xs">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div class="text-[11px] text-slate-400">Log ID #{{ activeLogDetail.id }}</div>
            <div class="font-bold text-sm text-slate-800">{{ activeLogDetail.userName }} • {{ activeLogDetail.employeeNo }}</div>
          </div>
          <AppBadge :status="activeLogDetail.status" />
        </div>

        <div class="grid grid-cols-2 gap-2 text-slate-700">
          <div class="p-2.5 bg-slate-50 rounded-xl">
            <span class="text-slate-400 block text-[10px]">WAKTU</span>
            <span class="font-semibold">{{ activeLogDetail.logDate }} ({{ activeLogDetail.shift }})</span>
          </div>
          <div class="p-2.5 bg-slate-50 rounded-xl">
            <span class="text-slate-400 block text-[10px]">DURASI</span>
            <span class="font-semibold">{{ activeLogDetail.startTime }} - {{ activeLogDetail.endTime }}</span>
          </div>
        </div>

        <div class="p-2.5 bg-slate-50 rounded-xl">
          <span class="text-slate-400 block text-[10px]">LOKASI & PERALATAN</span>
          <span class="font-bold text-slate-800">{{ activeLogDetail.equipmentName }}</span>
          <div class="text-slate-500">{{ activeLogDetail.locationName }}</div>
        </div>

        <div class="p-2.5 bg-slate-50 rounded-xl">
          <span class="text-slate-400 block text-[10px]">KATEGORI PEKERJAAN</span>
          <span class="font-bold text-indigo-700">{{ activeLogDetail.categoryName }}</span>
          <div class="text-slate-600">{{ activeLogDetail.activityTypeName }}</div>
        </div>

        <div>
          <span class="font-bold text-slate-600 uppercase text-[10px] block mb-1">Rincian Deskripsi</span>
          <div class="p-3 bg-slate-50 rounded-xl leading-relaxed border border-slate-100 text-slate-800">
            {{ activeLogDetail.description }}
          </div>
        </div>

        <div v-if="activeLogDetail.rejectionReason" class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
          <div class="font-bold mb-0.5">Catatan Penolakan:</div>
          <div>{{ activeLogDetail.rejectionReason }}</div>
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 transition"
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
import { useLogStore } from '../../stores/log'
import { LOG_STATUS } from '../../constants/status'
import AppBadge from '../../components/common/AppBadge.vue'
import AppModal from '../../components/common/AppModal.vue'

const authStore = useAuthStore()
const logStore = useLogStore()

const selectedFilter = ref(LOG_STATUS.SUBMITTED)
const searchQuery = ref('')
const activeLogDetail = ref(null)
const rejectTarget = ref(null)
const rejectionReason = ref('')

onMounted(async () => {
  await logStore.fetchLogs()
})

const filterTabs = [
  { label: 'Perlu Approval', value: LOG_STATUS.SUBMITTED },
  { label: 'Semua Log', value: 'ALL' },
  { label: 'Disetujui', value: LOG_STATUS.APPROVED },
  { label: 'Ditolak', value: LOG_STATUS.REJECTED }
]

const pendingCount = computed(() => {
  return logStore.logs.filter(l => l.status === LOG_STATUS.SUBMITTED).length
})

function getCount(status) {
  if (status === 'ALL') return logStore.logs.length
  return logStore.logs.filter(l => l.status === status).length
}

const filteredLogs = computed(() => {
  let list = logStore.logs

  if (selectedFilter.value !== 'ALL') {
    list = list.filter(l => l.status === selectedFilter.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(l =>
      l.userName?.toLowerCase().includes(q) ||
      l.equipmentName?.toLowerCase().includes(q) ||
      l.categoryName?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q)
    )
  }

  return list
})

async function approveLog(log) {
  const reviewer = `${authStore.user?.name} (${authStore.role})`
  await logStore.approveLog(log.id, reviewer)
}

function openRejectModal(log) {
  rejectTarget.value = log
  rejectionReason.value = ''
}

async function submitRejection() {
  if (!rejectTarget.value || !rejectionReason.value.trim()) return
  const reviewer = `${authStore.user?.name} (${authStore.role})`
  await logStore.rejectLog(rejectTarget.value.id, rejectionReason.value, reviewer)
  rejectTarget.value = null
}
</script>
