<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Keamanan & Kepatuhan</div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">Audit Trail Aktivitas Sistem</h1>
        <p class="text-xs text-ink-2 mt-0.5">Rekam jejak seluruh tindakan penting pengguna dan perubahan master data Satoria.</p>
      </div>

      <div class="text-xs text-ink-2 font-medium px-3 py-1.5 rounded-md bg-surface border border-line">
        Total Aktivitas: <strong class="text-ink">{{ auditLogs.length }} Log</strong>
      </div>
    </div>

    <!-- Filter & Search Bar (BUG-013) -->
    <div class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line flex flex-col lg:flex-row lg:items-center gap-3">
      <div class="relative w-full lg:max-w-xs">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari aktivitas / detail..."
          class="w-full h-9 pl-8 pr-3 rounded-md border border-line bg-muted text-xs text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-ink-3"
        />
        <svg class="w-4 h-4 text-ink-3 absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="activityFilter"
          class="h-9 px-2.5 rounded-md border border-line bg-surface text-xs text-ink focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="ALL">Semua Jenis Aktivitas</option>
          <option v-for="a in activityOptions" :key="a.value" :value="a.value">{{ a.label }}</option>
        </select>

        <label class="text-xs text-ink-2">Dari</label>
        <input
          v-model="startDate"
          type="date"
          class="h-9 px-2.5 rounded-md border border-line bg-surface text-xs text-ink focus:outline-none focus:border-primary"
        />
        <label class="text-xs text-ink-2">s.d.</label>
        <input
          v-model="endDate"
          type="date"
          class="h-9 px-2.5 rounded-md border border-line bg-surface text-xs text-ink focus:outline-none focus:border-primary"
        />

        <button
          type="button"
          class="h-9 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink hover:bg-muted transition"
          @click="resetFilters"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Audit Table Card per 11.5.11 -->
    <div class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[12px] border-collapse min-w-[700px]">
          <thead class="bg-muted/60 font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-3 cursor-pointer select-none" @click="toggleSort('created_at')">
                Waktu Pencatatan <span class="text-ink-3">{{ sortIndicator('created_at') }}</span>
              </th>
              <th class="px-4 py-3">Pengguna & Peran</th>
              <th class="px-4 py-3 cursor-pointer select-none" @click="toggleSort('activity')">
                Jenis Aktivitas <span class="text-ink-3">{{ sortIndicator('activity') }}</span>
              </th>
              <th class="px-4 py-3">Rincian Perubahan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr v-if="auditLogs.length === 0">
              <td colspan="4" class="px-4 py-10 text-center text-ink-3 text-xs">
                Tidak ada log aktivitas audit yang sesuai pencarian.
              </td>
            </tr>
            <tr
              v-for="log in auditLogs"
              :key="log.id"
              class="hover:bg-muted/40 transition-colors"
            >
              <td class="px-4 py-3 font-mono text-ink-2 whitespace-nowrap">
                {{ log.created_at }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="font-semibold text-ink">{{ log.user_name }}</div>
                <div class="text-[10px] text-ink-3">{{ log.user_role }}</div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium bg-muted text-ink border border-line">
                  {{ log.activity }}
                </span>
              </td>
              <td class="px-4 py-3 text-ink-2 leading-relaxed max-w-md">
                {{ log.detail }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginasi server-side (BUG-013) -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-line text-xs text-ink-2">
        <span>
          Halaman <strong class="text-ink">{{ page }}</strong> dari <strong class="text-ink">{{ totalPages }}</strong>
          · total <strong class="text-ink">{{ total }}</strong> log
        </span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="h-7 px-2.5 rounded-md border border-line bg-surface hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="page <= 1 || loading"
            @click="goToPage(page - 1)"
          >
            ← Sebelumnya
          </button>
          <button
            type="button"
            class="h-7 px-2.5 rounded-md border border-line bg-surface hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="page >= totalPages || loading"
            @click="goToPage(page + 1)"
          >
            Berikutnya →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { auditService } from '../../services/auditService'

const auditLogs = ref([])
const loading = ref(false)
const searchQuery = ref('')
const activityFilter = ref('ALL')
const startDate = ref('')
const endDate = ref('')

// Paginasi & pengurutan server-side (BUG-013)
const page = ref(1)
const limit = ref(25)
const total = ref(0)
const sortBy = ref('created_at')
const sortDir = ref('desc')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

const activityOptions = [
  { label: 'Logbook', value: 'LOGBOOK' },
  { label: 'Approval (Setuju)', value: 'APPROVE' },
  { label: 'Approval (Tolak)', value: 'REJECT' },
  { label: 'Master Data', value: 'MASTER' },
  { label: 'Akun Pengguna', value: 'USER' },
  { label: 'Login', value: 'LOGIN' }
]

async function fetchLogs() {
  loading.value = true
  try {
    const res = await auditService.getActivities({
      search: searchQuery.value.trim(),
      activity: activityFilter.value,
      start_date: startDate.value,
      end_date: endDate.value,
      page: page.value,
      limit: limit.value,
      sort_by: sortBy.value,
      sort_dir: sortDir.value
    })
    auditLogs.value = res
    total.value = res._meta?.total ?? res.length
    if (page.value > totalPages.value) page.value = totalPages.value
  } finally {
    loading.value = false
  }
}

onMounted(fetchLogs)

let filterTimer = null
watch([searchQuery, activityFilter, startDate, endDate], () => {
  page.value = 1
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(fetchLogs, 350)
})

function toggleSort(field) {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortDir.value = 'asc'
  }
  page.value = 1
  fetchLogs()
}

function sortIndicator(field) {
  if (sortBy.value !== field) return ''
  return sortDir.value === 'asc' ? '▲' : '▼'
}

function goToPage(target) {
  if (target < 1 || target > totalPages.value) return
  page.value = target
  fetchLogs()
}

function resetFilters() {
  searchQuery.value = ''
  activityFilter.value = 'ALL'
  startDate.value = ''
  endDate.value = ''
  page.value = 1
  fetchLogs()
}
</script>
