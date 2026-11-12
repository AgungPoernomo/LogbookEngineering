<template>
  <div class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
    <!-- Header -->
    <div class="p-4 sm:p-5 pb-3 border-b border-line">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <ClipboardList class="w-4 h-4 text-primary" />
          <h2 class="text-sm font-bold text-ink uppercase tracking-wide">
            Antrean Tindak Lanjut Mesin
          </h2>
          <span
            v-if="!loading && totalCount > 0"
            class="px-2 py-0.5 rounded-full bg-warning/10 text-status-pending-fg border border-warning/20 text-[10px] font-bold"
          >
            {{ totalCount }} mesin
          </span>
          <span
            v-else-if="!loading"
            class="px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 text-[10px] font-bold"
          >
            Bersih
          </span>
        </div>

        <div class="inline-flex rounded-md p-0.5 bg-muted border border-line text-[11px] font-medium self-start sm:self-auto">
          <button
            v-for="opt in filterOptions"
            :key="opt.value"
            type="button"
            :class="[
              'px-2.5 py-1 rounded transition font-medium',
              activeFilter === opt.value
                ? 'bg-surface text-ink font-semibold shadow-xs'
                : 'text-ink-3 hover:text-ink'
            ]"
            @click="activeFilter = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
      <p class="text-xs text-ink-3 mt-1">
        Mesin yang masih menggantung dari shift sebelumnya — periksa sebelum menyetujui logbook teknisi.
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="p-4 space-y-2">
      <div v-for="i in 4" :key="i" class="h-10 bg-muted rounded-md animate-pulse" />
    </div>

    <!-- Error -->
    <div v-else-if="errorMessage" class="p-6 text-center">
      <AlertCircle class="w-8 h-8 text-danger mx-auto mb-2 opacity-70" />
      <p class="text-xs text-ink-2">{{ errorMessage }}</p>
      <button
        type="button"
        class="mt-2 h-7 px-3 rounded border border-line bg-surface hover:bg-muted text-xs font-medium text-ink"
        @click="loadQueue"
      >
        Coba lagi
      </button>
    </div>

    <!-- Empty state (pesan positif, bukan peringatan — P1) -->
    <div v-else-if="filteredItems.length === 0" class="p-8 text-center">
      <CheckCircle2 class="w-10 h-10 text-success mx-auto mb-2 opacity-70" />
      <p class="text-sm font-medium text-ink">
        {{ activeFilter === 'all' ? 'Tidak ada mesin yang menggantung 🎉' : 'Tidak ada item untuk filter ini' }}
      </p>
      <p class="text-xs text-ink-3 mt-1">
        {{ activeFilter === 'all' ? 'Seluruh mesin di Line Anda dalam kondisi normal.' : 'Coba pilih filter lain.' }}
      </p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-xs border-collapse min-w-[720px]">
        <thead class="bg-muted/70 text-[11px] font-semibold text-ink-2 border-b border-line">
          <tr>
            <th class="px-3.5 py-2.5">Nama Mesin</th>
            <th class="px-3.5 py-2.5">Status</th>
            <th class="px-3.5 py-2.5">Teknisi Terakhir</th>
            <th class="px-3.5 py-2.5">Tanggal</th>
            <th class="px-3.5 py-2.5">Umur</th>
            <th class="px-3.5 py-2.5 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line text-ink">
          <tr
            v-for="item in filteredItems"
            :key="item.id"
            class="hover:bg-muted/40 transition group"
          >
            <!-- Nama Mesin -->
            <td class="px-3.5 py-3 max-w-[240px]">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-semibold text-ink truncate">
                  {{ item.machine_name || 'Aset belum terdaftar' }}
                </span>
                <span
                  v-if="item.machine_criticality === 'A_CRITICAL'"
                  class="px-1.5 py-0 rounded text-[9px] font-bold bg-danger/10 text-danger border border-danger/20"
                >
                  A-CRITICAL
                </span>
              </div>
              <div v-if="item.sub_machine_name" class="text-[11px] text-ink-3 truncate">
                {{ item.sub_machine_name }}
              </div>
            </td>

            <!-- Status -->
            <td class="px-3.5 py-3 whitespace-nowrap">
              <span
                class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                :class="statusBadgeClass(item.machine_end_status)"
              >
                {{ statusLabel(item.machine_end_status) }}
              </span>
              <div v-if="item.quick_action_tag" class="text-[10px] text-ink-3 mt-0.5">
                {{ item.quick_action_tag }}
              </div>
            </td>

            <!-- Teknisi Terakhir -->
            <td class="px-3.5 py-3 whitespace-nowrap">
              <div class="flex items-center gap-1.5">
                <div class="w-5 h-5 rounded-full bg-primary-soft text-primary font-bold text-[9px] flex items-center justify-center shrink-0">
                  {{ initials(item.user_name) }}
                </div>
                <div class="min-w-0">
                  <div class="font-medium text-ink truncate max-w-[140px]">
                    {{ item.user_name || 'Tidak diketahui' }}
                  </div>
                  <div class="text-[10px] text-ink-3 truncate">
                    {{ item.shift_name || '-' }}
                  </div>
                </div>
              </div>
            </td>

            <!-- Tanggal -->
            <td class="px-3.5 py-3 whitespace-nowrap font-mono text-[11px] text-ink-2">
              {{ item.task_date }}
              <div class="text-[10px] text-ink-3 font-sans">
                {{ item.start_time }}–{{ item.end_time }}
              </div>
            </td>

            <!-- Umur terbuka (hari) -->
            <td class="px-3.5 py-3 whitespace-nowrap">
              <span
                class="px-2 py-0.5 rounded text-[10px] font-bold border"
                :class="ageBadgeClass(item.task_date)"
              >
                {{ ageInDays(item.task_date) }} hari
              </span>
            </td>

            <!-- Aksi -->
            <td class="px-3.5 py-3 text-right whitespace-nowrap">
              <div class="inline-flex items-center gap-1">
                <button
                  type="button"
                  class="h-7 px-2 rounded border border-line bg-surface hover:bg-muted text-[11px] font-medium text-ink inline-flex items-center gap-1"
                  title="Lihat detail logbook"
                  @click="$emit('open-log-detail', item)"
                >
                  Detail
                </button>
                <RouterLink
                  v-if="item.machine_id"
                  :to="{ name: 'machine-history', params: { id: item.machine_id } }"
                  class="h-7 px-2 rounded border border-line bg-surface hover:bg-muted hover:text-primary text-[11px] font-medium text-ink-2 inline-flex items-center gap-1 transition"
                  title="Buka Buku Pintar Mesin"
                >
                  Riwayat
                  <ArrowRight class="w-3 h-3" />
                </RouterLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div
      v-if="!loading && !errorMessage && filteredItems.length > 0"
      class="px-4 py-2.5 border-t border-line flex items-center justify-between text-[10px] text-ink-3"
    >
      <span>
        Menampilkan {{ filteredItems.length }} dari {{ totalCount }} mesin •
        {{ lookbackDays }} hari terakhir
      </span>
      <button type="button" class="text-primary hover:underline font-medium" @click="loadQueue">
        Segarkan ↻
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ClipboardList, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-vue-next'
import { handoverService } from '../../services/handoverService'

const props = defineProps({
  // Dibiarkan null untuk Supervisor → backend memakai plant_id dari JWT (Line miliknya).
  plantId: { type: [Number, String], default: null },
  lookbackDays: { type: Number, default: 30 },
  maxItems: { type: Number, default: 50 }
})

defineEmits(['open-log-detail'])

const items = ref([])
const loading = ref(false)
const errorMessage = ref('')
const activeFilter = ref('all')

const filterOptions = [
  { value: 'all', label: 'Semua' },
  { value: 'WAITING_SPAREPART', label: 'Tunggu Sparepart' },
  { value: 'TEMPORARY_FIX', label: 'Sementara' }
]

const totalCount = computed(() => items.value.length)

const filteredItems = computed(() => {
  if (activeFilter.value === 'all') return items.value
  return items.value.filter(i => i.machine_end_status === activeFilter.value)
})

function statusLabel(s) {
  return {
    WAITING_SPAREPART: 'Tunggu Sparepart',
    TEMPORARY_FIX: 'Perbaikan Sementara',
    NORMAL_RESOLVED: 'Normal',
    MONITORING_NEEDED: 'Monitoring'
  }[s] || s
}

function statusBadgeClass(s) {
  return {
    WAITING_SPAREPART: 'bg-warning/10 text-status-pending-fg border border-warning/30',
    TEMPORARY_FIX: 'bg-primary-soft text-primary border border-primary/20',
    NORMAL_RESOLVED: 'bg-success/10 text-success border border-success/20',
    MONITORING_NEEDED: 'bg-primary-soft text-primary border border-primary/20'
  }[s] || 'bg-muted text-ink-2 border border-line'
}

function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

// Umur terbuka dalam hari (F4.2) — dihitung dari tanggal tugas, bukan dari jam server.
function ageInDays(taskDate) {
  if (!taskDate) return 0
  const start = new Date(`${String(taskDate).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(start.getTime())) return 0
  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffMs = todayMidnight.getTime() - start.getTime()
  return Math.max(0, Math.round(diffMs / 86400000))
}

function ageBadgeClass(taskDate) {
  const days = ageInDays(taskDate)
  if (days >= 7) return 'bg-danger/10 text-danger border-danger/20'
  if (days >= 3) return 'bg-warning/10 text-status-pending-fg border-warning/30'
  return 'bg-muted text-ink-2 border-line'
}

async function loadQueue() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await handoverService.getBoard({
      plant_id: props.plantId || undefined,
      days: props.lookbackDays,
      limit: props.maxItems
    })
    items.value = Array.isArray(data) ? data : []
  } catch (err) {
    errorMessage.value = err.message || 'Gagal memuat antrean tindak lanjut.'
    console.error('[SupervisorHandoverQueue] load error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadQueue)
defineExpose({ refresh: loadQueue })
</script>

