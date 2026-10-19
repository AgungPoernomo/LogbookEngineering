<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="text-xs font-semibold text-brand-600 uppercase tracking-wider">Arsip Pekerjaan</div>
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Riwayat Log Saya</h1>
        <p class="text-xs text-slate-500 mt-1">Daftar seluruh aktivitas pekerjaan engineering yang telah Anda input.</p>
      </div>

      <RouterLink
        to="/log/input"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm transition shadow-sm"
      >
        <span>+ Input Log Baru</span>
      </RouterLink>
    </div>

    <!-- Filter Bar & Search -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <!-- Status Tabs -->
      <div class="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          type="button"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0',
            activeStatus === tab.value
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          ]"
          @click="activeStatus = tab.value"
        >
          {{ tab.label }}
          <span
            :class="[
              'ml-1.5 px-1.5 py-0.2 rounded-full text-[10px]',
              activeStatus === tab.value ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
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
          placeholder="Cari alat / deskripsi..."
          class="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50"
        />
        <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>

    <!-- Logs Table Card -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th class="px-6 py-3.5">Tanggal / Shift</th>
              <th class="px-6 py-3.5">Peralatan & Lokasi</th>
              <th class="px-6 py-3.5">Kategori & Aktivitas</th>
              <th class="px-6 py-3.5">Hasil Pekerjaan</th>
              <th class="px-6 py-3.5">Status</th>
              <th class="px-6 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="filteredLogs.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-slate-400 text-sm">
                Tidak ada log aktivitas yang cocok dengan filter saat ini.
              </td>
            </tr>
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              class="hover:bg-slate-50/60 transition group"
            >
              <td class="px-6 py-4">
                <div class="font-bold text-slate-800">{{ log.logDate }}</div>
                <div class="text-xs text-slate-400">{{ log.shift }}</div>
                <div class="text-[11px] text-slate-400 font-mono">{{ log.startTime }} - {{ log.endTime }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="font-semibold text-slate-800">{{ log.equipmentName }}</div>
                <div class="text-xs text-slate-500">{{ log.locationName }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-xs font-bold text-brand-700">{{ log.categoryName }}</div>
                <div class="text-xs text-slate-600 line-clamp-1 max-w-xs">{{ log.activityTypeName }}</div>
              </td>
              <td class="px-6 py-4">
                <span class="inline-block text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {{ log.resultStatus }}
                </span>
              </td>
              <td class="px-6 py-4">
                <AppBadge :status="log.status" />
                <div v-if="log.status === 'REJECTED' && log.rejectionReason" class="text-[11px] text-rose-600 mt-1 line-clamp-1 font-medium">
                  Alasan: {{ log.rejectionReason }}
                </div>
              </td>
              <td class="px-6 py-4 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="log.status === 'REJECTED' || log.status === 'DRAFT'"
                    type="button"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition"
                    @click="openEditModal(log)"
                  >
                    {{ log.status === 'REJECTED' ? 'Revisi Log' : 'Edit Draft' }}
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                    @click="viewLog = log"
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

    <!-- View Detail Modal -->
    <AppModal
      :is-open="!!viewLog"
      title="Detail Log Aktivitas"
      @close="viewLog = null"
    >
      <div v-if="viewLog" class="space-y-4 text-sm">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div class="text-xs text-slate-400">Log ID #{{ viewLog.id }}</div>
            <div class="font-bold text-slate-800">{{ viewLog.logDate }} • {{ viewLog.shift }}</div>
          </div>
          <AppBadge :status="viewLog.status" />
        </div>

        <div v-if="viewLog.status === 'REJECTED' && viewLog.rejectionReason" class="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
          <div class="font-bold flex items-center gap-1.5 mb-1">
            <span>❌</span> Catatan Penolakan dari {{ viewLog.reviewedBy || 'Atasan' }}:
          </div>
          <div class="leading-relaxed">{{ viewLog.rejectionReason }}</div>
        </div>

        <div v-if="viewLog.status === 'APPROVED'" class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <span>Disetujui oleh: <strong>{{ viewLog.reviewedBy }}</strong></span>
          <span class="text-emerald-600">{{ viewLog.reviewedAt }}</span>
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-400 block mb-0.5">Lokasi / Area</span>
            <span class="font-bold text-slate-800">{{ viewLog.locationName }}</span>
          </div>
          <div class="p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-400 block mb-0.5">Peralatan</span>
            <span class="font-bold text-slate-800">{{ viewLog.equipmentName }}</span>
          </div>
        </div>

        <div>
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Deskripsi Aktivitas</span>
          <div class="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-100">
            {{ viewLog.description }}
          </div>
        </div>

        <div v-if="viewLog.notes">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Catatan Tambahan</span>
          <div class="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100">
            {{ viewLog.notes }}
          </div>
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          @click="viewLog = null"
        >
          Tutup
        </button>
      </template>
    </AppModal>

    <!-- Edit / Revision Modal -->
    <AppModal
      :is-open="!!editingLog"
      :title="editingLog?.status === 'REJECTED' ? 'Revisi Log Aktivitas' : 'Edit Draft Log'"
      @close="editingLog = null"
    >
      <form v-if="editingLog" @submit.prevent="saveRevision" class="space-y-4 text-xs">
        <div v-if="editingLog.rejectionReason" class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
          <div class="font-bold mb-1">Catatan Penolakan:</div>
          <div>{{ editingLog.rejectionReason }}</div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Deskripsi Pekerjaan Baru / Revisi</label>
          <textarea
            v-model="editForm.description"
            rows="4"
            required
            class="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          ></textarea>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Catatan Tambahan</label>
          <input
            v-model="editForm.notes"
            type="text"
            class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div class="pt-3 flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition"
            @click="editingLog = null"
          >
            Batal
          </button>
          <button
            type="submit"
            class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition shadow-sm"
          >
            Simpan & Kirim Ulang
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useLogStore } from '../../stores/log'
import { LOG_STATUS } from '../../constants/status'
import AppBadge from '../../components/common/AppBadge.vue'
import AppModal from '../../components/common/AppModal.vue'

const authStore = useAuthStore()
const logStore = useLogStore()

const activeStatus = ref('ALL')
const searchQuery = ref('')
const viewLog = ref(null)
const editingLog = ref(null)
const editForm = ref({ description: '', notes: '' })

onMounted(async () => {
  await logStore.fetchLogs({ userId: authStore.user?.id })
})

const myLogs = computed(() => {
  return logStore.logs.filter(l => l.userId === authStore.user?.id)
})

const statusTabs = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Draft', value: LOG_STATUS.DRAFT },
  { label: 'Menunggu Approval', value: LOG_STATUS.SUBMITTED },
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
      l.description?.toLowerCase().includes(q) ||
      l.equipmentName?.toLowerCase().includes(q) ||
      l.categoryName?.toLowerCase().includes(q)
    )
  }

  return list
})

function openEditModal(log) {
  editingLog.value = log
  editForm.value = {
    description: log.description,
    notes: log.notes || ''
  }
}

async function saveRevision() {
  if (!editingLog.value) return
  await logStore.updateLog(editingLog.value.id, {
    description: editForm.value.description,
    notes: editForm.value.notes,
    submit: true
  })
  editingLog.value = null
}
</script>
