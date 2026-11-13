<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Laporan & Rekapitulasi</div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">Ekspor Laporan Kinerja Tim</h1>
        <p class="text-xs text-ink-2 mt-0.5">Saring data logbook berdasarkan plant, mesin, dan status, lalu unduh dalam format PDF atau Excel.</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-success hover:bg-emerald-600 active:bg-emerald-700 text-white font-medium text-xs transition shadow-card"
          @click="exportExcel"
        >
          <span>📥 Ekspor Excel (.CSV)</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-line bg-surface hover:bg-muted text-ink font-medium text-xs transition shadow-card"
          @click="printPDF"
        >
          <span>🖨️ Cetak / PDF</span>
        </button>
      </div>
    </div>

    <!-- Filter Card per 11.5.11 -->
    <div class="bg-surface p-4 rounded-lg shadow-card border border-line space-y-3.5">
      <div class="text-xs font-semibold text-ink uppercase tracking-wider pb-2 border-b border-line flex items-center gap-1.5">
        <span>Parameter Saringan Laporan</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div>
          <label class="block font-medium text-ink mb-1">Tanggal Mulai</label>
          <input
            v-model="filters.startDate"
            type="date"
            class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-ink text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">Tanggal Akhir</label>
          <input
            v-model="filters.endDate"
            type="date"
            class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-ink text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">Fasilitas Plant</label>
          <select
            v-model="filters.plantId"
            class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-ink text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="">Semua Plant</option>
            <option v-for="p in masterStore.plants" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">Peralatan Mesin</label>
          <select
            v-model="filters.machineId"
            class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-ink text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="">Semua Mesin</option>
            <option v-for="m in masterStore.machines" :key="m.id" :value="m.id">
              {{ m.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">Status Logbook</label>
          <select
            v-model="filters.status"
            class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-ink text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="APPROVED">Hanya Disetujui</option>
            <option value="PENDING">Menunggu Approval</option>
            <option value="REJECTED">Ditolak / Revisi</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line">
        <div class="text-[11px] font-medium text-ink-3 uppercase">Jumlah Catatan Pekerjaan</div>
        <div class="text-xl sm:text-2xl font-semibold text-ink mt-1">{{ reportSummary.totalLogbooks }} Logbook</div>
      </div>
      <div class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line">
        <div class="text-[11px] font-medium text-ink-3 uppercase">Total Akumulasi Durasi</div>
        <div class="text-xl sm:text-2xl font-semibold text-primary mt-1">{{ reportSummary.totalHours }} Jam</div>
      </div>
      <div class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line">
        <div class="text-[11px] font-medium text-ink-3 uppercase">Telah Disetujui</div>
        <div class="text-xl sm:text-2xl font-semibold text-success mt-1">{{ reportSummary.approvedCount }}</div>
      </div>
      <div class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line">
        <div class="text-[11px] font-medium text-ink-3 uppercase">Menunggu / Ditolak</div>
        <div class="text-xl sm:text-2xl font-semibold text-warning mt-1">{{ reportSummary.pendingCount }} / {{ reportSummary.rejectedCount }}</div>
      </div>
    </div>

    <!-- Preview Table Card per 11.5.11 -->
    <div id="printable-report" class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="px-4 py-3 border-b border-line flex items-center justify-between">
        <h2 class="text-xs font-semibold text-ink uppercase tracking-wider">Pratinjau Data Laporan</h2>
        <span class="text-xs text-ink-3">{{ reportItems.length }} rekaman ditemukan</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-[12px] border-collapse min-w-[700px]">
          <thead class="bg-muted/60 font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-2.5">ID & Tanggal</th>
              <th class="px-4 py-2.5">Teknisi & NIK</th>
              <th class="px-4 py-2.5">Plant & Shift</th>
              <th class="px-4 py-2.5">Mesin & Bagian</th>
              <th class="px-4 py-2.5">Durasi</th>
              <th class="px-4 py-2.5">Suku Cadang</th>
              <th class="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr v-if="reportItems.length === 0">
              <td colspan="7" class="px-4 py-10 text-center text-ink-3 text-xs">
                Tidak ada data logbook yang memenuhi kriteria filter.
              </td>
            </tr>
            <tr
              v-for="(item, index) in reportItems"
              :key="item.id"
              v-show="isRowOnCurrentPage(index)"
              class="hover:bg-muted/40 transition-colors"
            >
              <td class="px-4 py-2.5 font-medium text-ink whitespace-nowrap">
                #{{ item.id }}<br>
                <span class="text-ink-3 font-normal">{{ item.task_date }}</span>
              </td>
              <td class="px-4 py-2.5 font-semibold text-ink whitespace-nowrap">
                {{ item.user_name }}<br>
                <span class="text-[10px] text-ink-3 font-mono font-normal">{{ item.user_nik }}</span>
              </td>
              <td class="px-4 py-2.5 whitespace-nowrap">
                <span class="font-medium text-ink">{{ item.plant_name }}</span><br>
                <span class="text-[10px] text-ink-3">{{ item.shift_name }}</span>
              </td>
              <td class="px-4 py-2.5">
                <span class="font-medium text-ink">{{ item.machine_name }}</span><br>
                <span class="text-[10px] text-ink-2">{{ item.sub_machine_name }}</span>
              </td>
              <td class="px-4 py-2.5 font-mono font-semibold text-primary whitespace-nowrap">
                {{ formatDuration(item.duration_minutes) }}
              </td>
              <td class="px-4 py-2.5 text-ink-2 max-w-xs truncate">
                {{ item.sparepart || '-' }}
              </td>
              <td class="px-4 py-2.5 whitespace-nowrap">
                <AppBadge :status="item.status" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination (client-side) — pola sama dengan halaman Approval -->
      <nav
        v-if="reportItems.length > 0"
        class="px-3.5 py-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface print:hidden"
        aria-label="Navigasi halaman pratinjau laporan"
      >
        <p class="text-[11px] text-ink-3">
          Menampilkan
          <span class="font-semibold text-ink font-mono">{{ rangeStart }}–{{ rangeEnd }}</span>
          dari <span class="font-semibold text-ink font-mono">{{ reportItems.length }}</span> logbook
          <span class="text-ink-3/80">({{ itemsPerPage }} baris per halaman)</span>
        </p>
        <div class="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            class="h-7 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
            :disabled="currentPage <= 1"
            title="Halaman sebelumnya"
            @click="goToPage(currentPage - 1)"
          >
            <ChevronLeft class="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>
          <span class="text-[11px] text-ink-2 font-medium px-1 whitespace-nowrap">
            Halaman <strong class="text-ink font-mono">{{ currentPage }}</strong> dari
            <strong class="text-ink font-mono">{{ totalPages }}</strong>
          </span>
          <button
            type="button"
            class="h-7 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
            :disabled="currentPage >= totalPages"
            title="Halaman berikutnya"
            @click="goToPage(currentPage + 1)"
          >
            <span>Next</span>
            <ChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useMasterStore } from '../../stores/master'
import { useLogbookStore } from '../../stores/logbook'
import { reportService } from '../../services/reportService'
import { formatDuration } from '../../utils/duration'
import AppBadge from '../../components/common/AppBadge.vue'

const masterStore = useMasterStore()
const logbookStore = useLogbookStore()

const filters = ref({
  startDate: '',
  endDate: '',
  plantId: '',
  machineId: '',
  status: 'ALL'
})

onMounted(async () => {
  await masterStore.fetchAll()
  await logbookStore.fetchLogbooks()
})

const reportItems = computed(() => {
  let list = logbookStore.logbooks

  if (filters.value.status && filters.value.status !== 'ALL') {
    list = list.filter(l => l.status === filters.value.status)
  }
  if (filters.value.plantId) {
    list = list.filter(l => l.plant_id === Number(filters.value.plantId))
  }
  if (filters.value.machineId) {
    list = list.filter(l => l.machine_id === Number(filters.value.machineId))
  }
  if (filters.value.startDate && filters.value.endDate) {
    list = list.filter(l => l.task_date >= filters.value.startDate && l.task_date <= filters.value.endDate)
  }

  return list
})

const reportSummary = computed(() => {
  const items = reportItems.value
  const totalLogbooks = items.length
  const totalMinutes = items.reduce((acc, l) => acc + (l.duration_minutes || 0), 0)
  return {
    totalLogbooks,
    totalHours: (totalMinutes / 60).toFixed(1),
    approvedCount: items.filter(l => l.status === 'APPROVED').length,
    pendingCount: items.filter(l => l.status === 'PENDING').length,
    rejectedCount: items.filter(l => l.status === 'REJECTED').length
  }
})

// ========================================================
// Pagination client-side (10 baris per halaman)
// `reportItems` tetap sumber kebenaran untuk ringkasan & ekspor,
// sedangkan tabel hanya menampilkan baris pada halaman aktif.
// ========================================================
const itemsPerPage = 10
const currentPage = ref(1)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(reportItems.value.length / itemsPerPage))
)

const pageStartIndex = computed(() => (currentPage.value - 1) * itemsPerPage)

/** Baris ke-`index` termasuk halaman aktif? (dipakai `v-show` agar cetak tetap penuh). */
function isRowOnCurrentPage(index) {
  return index >= pageStartIndex.value && index < pageStartIndex.value + itemsPerPage
}

const rangeStart = computed(() =>
  reportItems.value.length === 0 ? 0 : pageStartIndex.value + 1
)

const rangeEnd = computed(() =>
  Math.min(currentPage.value * itemsPerPage, reportItems.value.length)
)

function goToPage(page) {
  if (!Number.isFinite(page) || page < 1 || page > totalPages.value) return
  currentPage.value = page
}

// Filter berubah → kembali ke halaman pertama agar tidak "terdampar" kosong.
watch(filters, () => {
  currentPage.value = 1
}, { deep: true })

// Data menyusut (mis. filter status) → tarik ke halaman terakhir yang valid.
watch(totalPages, (max) => {
  if (currentPage.value > max) currentPage.value = max
})

function exportExcel() {
  reportService.exportToCSV(reportItems.value, `Laporan-Logbook-Satoria-${new Date().toISOString().substring(0, 10)}.csv`)
}

function printPDF() {
  window.print()
}
</script>

<style scoped>
@media print {
  body * {
    visibility: hidden;
  }
  #printable-report, #printable-report * {
    visibility: visible;
  }
  #printable-report {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
  /* v-show memakai display:none inline — paksa semua baris tampil saat cetak
     agar Cetak/PDF tetap memuat seluruh data hasil filter, bukan 1 halaman. */
  #printable-report tbody tr {
    display: table-row !important;
  }
}
</style>
