<template>
  <div class="space-y-4">
    <!-- ======================================================== -->
    <!-- HEADER: Kembali + Nama Mesin + Plant + Badge Criticality  -->
    <!-- ======================================================== -->
    <div class="bg-surface rounded-lg shadow-card border border-line p-4 sm:p-5">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div class="flex items-start gap-3 min-w-0">
          <button
            type="button"
            class="h-8 px-2.5 rounded-md border border-line bg-surface hover:bg-muted text-ink text-xs font-medium transition shadow-card inline-flex items-center gap-1.5 shrink-0"
            @click="goBack"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>

          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-base sm:text-lg font-bold text-ink tracking-tight truncate">
                {{ machine?.name || 'Memuat mesin...' }}
              </h1>
              <span
                v-if="machine"
                :class="['px-2 py-0.5 rounded text-[10px] font-bold border', criticalityClass]"
                :title="criticalityLongLabel"
              >
                {{ criticalityShortLabel }}
              </span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-ink-2 mt-1">
              <Factory class="w-3.5 h-3.5 text-ink-3 shrink-0" />
              <span class="truncate">{{ machine?.plant_name || '-' }}</span>
              <span class="text-ink-3">•</span>
              <span class="text-ink-3">{{ machine?.sub_machine_count ?? 0 }} sub-mesin</span>
            </div>
            <p class="text-[11px] text-ink-3 mt-1">
              Buku Pintar Mesin — rekam medis perbaikan &amp; riwayat logbook mesin ini.
            </p>
          </div>
        </div>

        <!-- Filter periode + refresh -->
        <div class="flex items-center gap-2 shrink-0">
          <div class="inline-flex rounded-md p-0.5 bg-muted border border-line text-[11px] font-medium">
            <button
              v-for="opt in periodOptions"
              :key="opt.value"
              type="button"
              :class="[
                'px-2.5 py-1 rounded transition font-medium',
                period === opt.value
                  ? 'bg-surface text-ink font-semibold shadow-xs'
                  : 'text-ink-3 hover:text-ink'
              ]"
              @click="changePeriod(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <button
            type="button"
            class="h-7 w-7 rounded border border-line bg-surface hover:bg-muted text-ink inline-flex items-center justify-center transition shadow-xs"
            title="Segarkan data"
            @click="loadHistory()"
          >
            <RefreshCw :class="['w-3.5 h-3.5', loading ? 'animate-spin' : '']" />
          </button>
        </div>
      </div>

      <!-- ALERT STATUS TERKINI (WAITING_SPAREPART / TEMPORARY_FIX) -->
      <div
        v-if="showStatusAlert"
        :class="['mt-3 p-2.5 rounded-md border flex items-start gap-2', statusAlertClass]"
      >
        <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
        <div class="min-w-0 text-[11px] leading-relaxed">
          <span class="font-bold uppercase tracking-wide">
            Status terkini: {{ endStatusLabel(currentStatus.machine_end_status) }}
          </span>
          <span class="mx-1">—</span>
          <span>{{ statusAlertMessage }}</span>
          <span v-if="currentStatus.last_log_date" class="text-ink-3">
            (log terakhir {{ formatDate(currentStatus.last_log_date) }})
          </span>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-if="errorMessage"
      class="bg-surface rounded-lg shadow-card border border-line p-6 text-center"
    >
      <AlertCircle class="w-8 h-8 text-danger mx-auto mb-2 opacity-70" />
      <p class="text-sm font-medium text-ink">Gagal memuat riwayat mesin</p>
      <p class="text-xs text-ink-2 mt-1">{{ errorMessage }}</p>
      <div class="flex items-center justify-center gap-2 mt-3">
        <button
          type="button"
          class="h-8 px-3 rounded-md bg-primary hover:bg-blue-700 text-white text-xs font-medium transition shadow-card"
          @click="loadHistory()"
        >
          Coba lagi
        </button>
        <button
          type="button"
          class="h-8 px-3 rounded-md border border-line bg-surface hover:bg-muted text-ink text-xs font-medium transition"
          @click="goBack"
        >
          Kembali
        </button>
      </div>
    </div>

    <template v-else>
      <!-- ======================================================== -->
      <!-- STATISTIK (4 KOTAK)                                       -->
      <!-- ======================================================== -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="bg-surface rounded-lg shadow-card border border-line p-3.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold text-ink-3 uppercase tracking-wide">
              Total Log
            </span>
            <FileText class="w-3.5 h-3.5 text-primary" />
          </div>
          <div class="text-xl font-bold text-ink mt-1 tabular-nums">
            {{ loading ? '—' : stats.total_logs }}
          </div>
          <div class="text-[10px] text-ink-3 mt-0.5">{{ periodLabel }}</div>
        </div>

        <div class="bg-surface rounded-lg shadow-card border border-line p-3.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold text-ink-3 uppercase tracking-wide">
              Total Downtime
            </span>
            <TimerOff class="w-3.5 h-3.5 text-danger" />
          </div>
          <div class="text-xl font-bold text-danger mt-1 tabular-nums">
            {{ loading ? '—' : formatMinutesShort(stats.total_downtime_minutes) }}
          </div>
          <div class="text-[10px] text-ink-3 mt-0.5">
            {{ formatDuration(stats.total_downtime_minutes) }}
          </div>
        </div>

        <div class="bg-surface rounded-lg shadow-card border border-line p-3.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold text-ink-3 uppercase tracking-wide">
              Waktu Perbaikan
            </span>
            <Wrench class="w-3.5 h-3.5 text-violet" />
          </div>
          <div class="text-xl font-bold text-ink mt-1 tabular-nums">
            {{ loading ? '—' : formatMinutesShort(stats.total_repair_minutes) }}
          </div>
          <div class="text-[10px] text-ink-3 mt-0.5">
            {{ formatDuration(stats.total_repair_minutes) }}
          </div>
        </div>

        <div class="bg-surface rounded-lg shadow-card border border-line p-3.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold text-ink-3 uppercase tracking-wide">
              Jumlah Breakdown
            </span>
            <Activity class="w-3.5 h-3.5 text-orange" />
          </div>
          <div class="text-xl font-bold text-ink mt-1 tabular-nums">
            {{ loading ? '—' : stats.breakdown_count }}
          </div>
          <div class="text-[10px] text-ink-3 mt-0.5">
            {{ stats.preventive_count }} preventive
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- GRID 2 KOLOM: Timeline (kiri) & Sidebar (kanan)           -->
      <!-- ======================================================== -->
      <div class="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        <!-- ================= KIRI: TIMELINE ================= -->
        <div class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
          <div class="p-4 pb-3 border-b border-line flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 flex-wrap">
              <History class="w-4 h-4 text-primary" />
              <h2 class="text-sm font-bold text-ink uppercase tracking-wide">Timeline Riwayat</h2>
              <span class="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded text-ink-2">
                {{ meta.total }} log
              </span>
            </div>
            <span class="text-[10px] text-ink-3">
              Halaman {{ meta.page }} / {{ Math.max(1, totalPages) }}
            </span>
          </div>

          <!-- Loading skeleton -->
          <div v-if="loading" class="p-4 space-y-3">
            <div v-for="i in 4" :key="i" class="h-24 bg-muted rounded-md animate-pulse" />
          </div>

          <!-- Empty -->
          <div v-else-if="timeline.length === 0" class="p-8 text-center">
            <Inbox class="w-10 h-10 text-ink-3 mx-auto mb-2 opacity-60" />
            <p class="text-sm font-medium text-ink">Belum ada riwayat pada periode ini</p>
            <p class="text-xs text-ink-3 mt-1">
              Coba pilih periode yang lebih panjang atau pastikan logbook sudah diajukan.
            </p>
          </div>

          <!-- Timeline list -->
          <ol v-else class="relative">
            <li
              v-for="(item, index) in timeline"
              :key="item.id"
              class="relative p-4 border-b border-line last:border-b-0 hover:bg-muted/30 transition"
            >
              <div class="flex items-start gap-3">
                <!-- Rail vertikal -->
                <div class="flex flex-col items-center shrink-0 pt-0.5">
                  <div
                    :class="[
                      'w-2.5 h-2.5 rounded-full ring-4',
                      item.activity_category === 'MACHINE_TROUBLE'
                        ? 'bg-danger/80 ring-danger/10'
                        : 'bg-success/80 ring-success/10'
                    ]"
                  />
                  <div
                    v-if="index !== timeline.length - 1"
                    class="w-px flex-1 bg-line mt-1 min-h-[38px]"
                  />
                </div>

                <div class="flex-1 min-w-0">
                  <!-- Baris atas: tanggal, jam, shift, badge status -->
                  <div class="flex items-start justify-between gap-2 flex-wrap">
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap text-xs">
                        <span class="font-bold text-ink">{{ formatDate(item.task_date) }}</span>
                        <span class="text-ink-3">•</span>
                        <span class="text-ink-2 font-mono text-[11px]">
                          {{ item.start_time || '--:--' }}–{{ item.end_time || '--:--' }}
                        </span>
                        <span v-if="item.shift_name" class="text-ink-3 text-[10px]">
                          ({{ item.shift_name }})
                        </span>
                      </div>
                      <div class="flex items-center gap-1.5 text-[11px] text-ink-2 mt-0.5 flex-wrap">
                        <UserCircle2 class="w-3 h-3 text-ink-3 shrink-0" />
                        <span class="font-medium">
                          {{ item.user_name || 'Teknisi tidak tercatat' }}
                        </span>
                        <template v-if="item.sub_machine_name">
                          <span class="text-ink-3">•</span>
                          <span class="inline-flex items-center gap-1">
                            <Cpu class="w-3 h-3 text-ink-3" />
                            {{ item.sub_machine_name }}
                          </span>
                        </template>
                      </div>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <AppBadge :status="item.status" />
                      <span
                        :class="[
                          'px-1.5 py-0.5 rounded text-[9px] font-semibold border',
                          endStatusClass(item.machine_end_status)
                        ]"
                      >
                        {{ endStatusLabel(item.machine_end_status) }}
                      </span>
                    </div>
                  </div>

                  <!-- Chip kategori, quick action, failure code, downtime, durasi -->
                  <div class="flex items-center gap-1.5 flex-wrap mt-2">
                    <span
                      :class="[
                        'px-1.5 py-0.5 rounded text-[9px] font-semibold',
                        item.activity_category === 'MACHINE_TROUBLE'
                          ? 'bg-danger/10 text-danger'
                          : 'bg-primary-soft text-primary'
                      ]"
                    >
                      {{ categoryLabel(item.activity_category) }}
                    </span>
                    <span
                      v-if="item.quick_action_tag"
                      class="px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted text-ink-2 border border-line"
                    >
                      {{ item.quick_action_tag }}
                    </span>
                    <span
                      v-if="item.failure_code"
                      class="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-orange/10 text-orange border border-orange/20 font-mono"
                      :title="item.failure_code.name"
                    >
                      {{ item.failure_code.code }}
                    </span>
                    <span
                      v-if="item.downtime_minutes > 0"
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-danger/10 text-danger border border-danger/20"
                    >
                      <TimerOff class="w-2.5 h-2.5" />
                      Down {{ formatMinutesShort(item.downtime_minutes) }}
                    </span>
                    <span
                      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted text-ink-2 border border-line"
                    >
                      <Clock class="w-2.5 h-2.5" />
                      {{ formatDuration(item.duration_minutes) }}
                    </span>
                  </div>

                  <!-- Deskripsi pekerjaan -->
                  <p class="text-xs text-ink mt-2 leading-relaxed whitespace-pre-line">
                    {{ item.activity_description || '-' }}
                  </p>

                  <!-- Sparepart terpakai -->
                  <div
                    v-if="item.spareparts && item.spareparts.length > 0"
                    class="mt-2 flex items-start gap-1.5 flex-wrap"
                  >
                    <span
                      class="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-3 shrink-0 mt-0.5"
                    >
                      <Package class="w-3 h-3" />
                      Part:
                    </span>
                    <span
                      v-for="(sp, spIdx) in item.spareparts"
                      :key="`${item.id}-sp-${spIdx}`"
                      class="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                    >
                      {{ sp.part_name || sp.part_code || 'Part' }}
                      <span class="font-mono">
                        {{ sp.qty_used }}{{ sp.unit ? ` ${sp.unit}` : '' }}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </li>
          </ol>

          <!-- Footer pagination -->
          <div
            class="px-4 py-2.5 border-t border-line flex items-center justify-between gap-2 text-[11px]"
          >
            <span class="text-ink-3">
              <template v-if="meta.total > 0">
                Menampilkan {{ rangeStart }}–{{ rangeEnd }} dari {{ meta.total }} log
              </template>
              <template v-else>Tidak ada data</template>
            </span>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="h-7 px-2.5 rounded border border-line bg-surface hover:bg-muted text-ink text-xs font-medium transition shadow-xs inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface"
                :disabled="!canPrev || loading"
                @click="changePage(page - 1)"
              >
                <ChevronLeft class="w-3.5 h-3.5" />
                Prev
              </button>
              <span class="px-1 font-mono text-ink-2">
                {{ page }} / {{ Math.max(1, totalPages) }}
              </span>
              <button
                type="button"
                class="h-7 px-2.5 rounded border border-line bg-surface hover:bg-muted text-ink text-xs font-medium transition shadow-xs inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface"
                :disabled="!canNext || loading"
                @click="changePage(page + 1)"
              >
                Next
                <ChevronRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- ================= KANAN: SIDEBAR ================= -->
        <div class="space-y-4">
          <!-- Card Top Failure Codes -->
          <div class="bg-surface rounded-lg shadow-card border border-line p-4">
            <div class="flex items-center justify-between pb-2.5 border-b border-line mb-3">
              <div class="flex items-center gap-1.5">
                <Bug class="w-4 h-4 text-orange" />
                <h3 class="text-xs font-bold text-ink uppercase tracking-wide">
                  Top Failure Codes
                </h3>
              </div>
              <span class="text-[10px] font-mono text-ink-3">{{ periodLabel }}</span>
            </div>

            <div v-if="loading" class="space-y-2">
              <div v-for="i in 3" :key="i" class="h-11 bg-muted rounded-md animate-pulse" />
            </div>

            <div v-else-if="topFailureCodes.length === 0" class="py-4 text-center">
              <CheckCircle2 class="w-7 h-7 text-success mx-auto mb-1.5 opacity-70" />
              <p class="text-[11px] text-ink-3">
                Belum ada kode kerusakan tercatat pada periode ini.
              </p>
            </div>

            <ul v-else class="space-y-2">
              <li
                v-for="(fc, idx) in topFailureCodes.slice(0, 3)"
                :key="fc.code"
                class="p-2 rounded-md border border-line bg-muted/20"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span
                        class="w-4 h-4 rounded bg-orange/10 text-orange text-[9px] font-bold flex items-center justify-center shrink-0"
                      >
                        {{ idx + 1 }}
                      </span>
                      <span class="text-[11px] font-bold text-ink font-mono truncate">
                        {{ fc.code }}
                      </span>
                    </div>
                    <div class="text-[10px] text-ink-2 truncate mt-0.5 pl-5" :title="fc.name">
                      {{ fc.name || '-' }}
                    </div>
                  </div>
                  <span class="text-[11px] font-bold text-ink tabular-nums shrink-0">
                    {{ fc.count }}×
                  </span>
                </div>
                <div class="flex items-center justify-between mt-1.5 pl-5 text-[9px] text-ink-3">
                  <span v-if="fc.category" class="truncate">{{ fc.category }}</span>
                  <span
                    v-if="fc.total_downtime_minutes > 0"
                    class="inline-flex items-center gap-0.5 text-danger font-medium shrink-0"
                  >
                    <TimerOff class="w-2.5 h-2.5" />
                    {{ formatMinutesShort(fc.total_downtime_minutes) }}
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <!-- Card Top Spareparts -->
          <div class="bg-surface rounded-lg shadow-card border border-line p-4">
            <div class="flex items-center justify-between pb-2.5 border-b border-line mb-3">
              <div class="flex items-center gap-1.5">
                <Package class="w-4 h-4 text-amber-600" />
                <h3 class="text-xs font-bold text-ink uppercase tracking-wide">Top Spareparts</h3>
              </div>
              <span class="text-[10px] font-mono text-ink-3">{{ periodLabel }}</span>
            </div>

            <div v-if="loading" class="space-y-2">
              <div v-for="i in 3" :key="i" class="h-11 bg-muted rounded-md animate-pulse" />
            </div>

            <div v-else-if="topSpareparts.length === 0" class="py-4 text-center">
              <Package class="w-7 h-7 text-ink-3 mx-auto mb-1.5 opacity-60" />
              <p class="text-[11px] text-ink-3">
                Belum ada sparepart tercatat pada periode ini.
              </p>
            </div>

            <ul v-else class="space-y-2">
              <li
                v-for="(sp, idx) in topSpareparts.slice(0, 3)"
                :key="sp.part_code || `part-${idx}`"
                class="p-2 rounded-md border border-line bg-muted/20"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span
                        class="w-4 h-4 rounded bg-amber-100 text-amber-700 text-[9px] font-bold flex items-center justify-center shrink-0"
                      >
                        {{ idx + 1 }}
                      </span>
                      <span class="text-[11px] font-semibold text-ink truncate" :title="sp.part_name">
                        {{ sp.part_name || sp.part_code || 'Tanpa nama' }}
                      </span>
                    </div>
                    <div class="text-[10px] text-ink-3 font-mono truncate mt-0.5 pl-5">
                      {{ sp.part_code || '-' }}
                    </div>
                  </div>
                  <span class="text-[11px] font-bold text-ink tabular-nums shrink-0">
                    {{ sp.total_qty }}{{ sp.unit ? ` ${sp.unit}` : '' }}
                  </span>
                </div>
                <div class="mt-1 pl-5 text-[9px] text-ink-3">
                  Dipakai pada {{ sp.usage_count }} logbook
                </div>
              </li>
            </ul>
          </div>

          <!-- Card Info Periode -->
          <div class="bg-surface rounded-lg shadow-card border border-line p-4">
            <div class="flex items-center gap-1.5 pb-2.5 border-b border-line mb-2.5">
              <Info class="w-4 h-4 text-primary" />
              <h3 class="text-xs font-bold text-ink uppercase tracking-wide">Info Periode</h3>
            </div>
            <dl class="space-y-1.5 text-[11px]">
              <div class="flex items-center justify-between gap-2">
                <dt class="text-ink-3">Rentang</dt>
                <dd class="text-ink font-medium text-right">
                  {{ formatDate(meta.period_start) }} – {{ formatDate(meta.period_end) }}
                </dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-ink-3">Durasi</dt>
                <dd class="text-ink font-medium">{{ meta.period_days }} hari terakhir</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-ink-3">Log per halaman</dt>
                <dd class="text-ink font-medium">{{ meta.page_size }}</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-ink-3">Sumber data</dt>
                <dd class="text-ink-2 text-right">Logbook PENDING &amp; APPROVED</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Activity,
  Bug,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Factory,
  FileText,
  History,
  Inbox,
  Info,
  Package,
  RefreshCw,
  TimerOff,
  UserCircle2,
  Wrench
} from 'lucide-vue-next'

import AppBadge from '../../components/common/AppBadge.vue'
import {
  getMachineHistory,
  HISTORY_PERIOD_OPTIONS,
  DEFAULT_HISTORY_PERIOD,
  DEFAULT_PAGE_SIZE
} from '../../services/machineHistoryService'
import { formatDuration } from '../../utils/duration'

const route = useRoute()
const router = useRouter()

// ---- State ----
const loading = ref(false)
const errorMessage = ref('')
const period = ref(DEFAULT_HISTORY_PERIOD)
const page = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)

const machine = ref(null)
const currentStatus = ref({
  machine_end_status: 'NORMAL_RESOLVED',
  last_log_date: null,
  is_flagged: false
})
const stats = ref({
  total_logs: 0,
  total_downtime_minutes: 0,
  total_repair_minutes: 0,
  breakdown_count: 0,
  preventive_count: 0
})
const timeline = ref([])
const topFailureCodes = ref([])
const topSpareparts = ref([])
const meta = ref({
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
  period_days: DEFAULT_HISTORY_PERIOD,
  period_start: null,
  period_end: null,
  machine_id: null
})

// Penanda urutan request agar klik Prev/Next beruntun tidak saling menimpa hasil
let requestSeq = 0

const machineId = computed(() => {
  const raw = route.params.id
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isInteger(id) && id > 0 ? id : null
})

const periodOptions = HISTORY_PERIOD_OPTIONS.map((days) => ({
  value: days,
  label: days >= 365 ? '1 Tahun' : `${days} Hari`
}))

const periodLabel = computed(() => {
  const days = meta.value.period_days || period.value
  return days >= 365 ? '1 tahun terakhir' : `${days} hari terakhir`
})

const totalPages = computed(() => Math.max(1, meta.value.total_pages || 1))
const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < totalPages.value)

const rangeStart = computed(() =>
  meta.value.total === 0 ? 0 : (page.value - 1) * (meta.value.page_size || pageSize.value) + 1
)
const rangeEnd = computed(() =>
  Math.min(page.value * (meta.value.page_size || pageSize.value), meta.value.total)
)

// ---- Label & gaya criticality (A_CRITICAL / B_ESSENTIAL / C_GENERAL) ----
const CRITICALITY_CONFIG = {
  A_CRITICAL: {
    short: 'A',
    long: 'A — Critical (mesin kritis, stop produksi)',
    cls: 'bg-danger/10 text-danger border-danger/30'
  },
  B_ESSENTIAL: {
    short: 'B',
    long: 'B — Essential (penting untuk kelancaran line)',
    cls: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  C_GENERAL: {
    short: 'C',
    long: 'C — General (umum / pendukung)',
    cls: 'bg-muted text-ink-2 border-line'
  }
}

const criticalityConfig = computed(
  () => CRITICALITY_CONFIG[machine.value?.criticality] || CRITICALITY_CONFIG.B_ESSENTIAL
)
const criticalityShortLabel = computed(() => `Criticality ${criticalityConfig.value.short}`)
const criticalityLongLabel = computed(() => criticalityConfig.value.long)
const criticalityClass = computed(() => criticalityConfig.value.cls)

// ---- Label & gaya status akhir mesin ----
const END_STATUS_LABELS = {
  NORMAL_RESOLVED: 'Normal',
  MONITORING_NEEDED: 'Monitoring',
  TEMPORARY_FIX: 'Perbaikan Sementara',
  WAITING_SPAREPART: 'Tunggu Sparepart'
}

function endStatusLabel(status) {
  return END_STATUS_LABELS[status] || status || '-'
}

function endStatusClass(status) {
  return {
    NORMAL_RESOLVED: 'bg-success/10 text-success border-success/20',
    MONITORING_NEEDED: 'bg-primary-soft text-primary border-primary/20',
    TEMPORARY_FIX: 'bg-blue-50 text-blue-700 border-blue-200',
    WAITING_SPAREPART: 'bg-amber-50 text-amber-700 border-amber-200'
  }[status] || 'bg-muted text-ink-2 border-line'
}

// ---- Alert status terkini (hanya WAITING_SPAREPART / TEMPORARY_FIX) ----
const showStatusAlert = computed(() =>
  ['WAITING_SPAREPART', 'TEMPORARY_FIX'].includes(currentStatus.value.machine_end_status)
)

const statusAlertClass = computed(() =>
  currentStatus.value.machine_end_status === 'WAITING_SPAREPART'
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-blue-50 border-blue-200 text-blue-800'
)

const statusAlertMessage = computed(() =>
  currentStatus.value.machine_end_status === 'WAITING_SPAREPART'
    ? 'Mesin masih menunggu sparepart. Cek Top Spareparts di samping untuk part yang dibutuhkan.'
    : 'Mesin berjalan dengan perbaikan sementara. Perlu tindak lanjut perbaikan permanen.'
)

// ---- Label kategori aktivitas (mengikuti InputLogbookView F3.1) ----
const CATEGORY_LABELS = {
  MACHINE_TROUBLE: 'Perbaikan Mesin',
  PREVENTIVE_PM: 'Preventive / PM',
  KERETA_TRAY_REPAIR: 'Kereta & Tray',
  FABRICATION_PROJECT: 'Fabrikasi / Project',
  SUPPORT_NON_MACHINE: 'Non-Mesin'
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || 'Lainnya'
}

// ---- Format tanggal & durasi ----
const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
]

function formatDate(value) {
  if (!value) return '-'
  const raw = String(value).slice(0, 10)
  const [year, month, day] = raw.split('-').map(Number)
  if (!year || !month || !day) return raw
  return `${day} ${MONTH_SHORT_ID[month - 1] || ''} ${year}`.trim()
}

/**
 * Ringkas menit menjadi "12j 30m" / "45m" untuk kotak statistik & chip.
 */
function formatMinutesShort(minutes) {
  const total = Number(minutes) || 0
  if (total <= 0) return '0m'
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours > 0 && mins > 0) return `${hours}j ${mins}m`
  if (hours > 0) return `${hours}j`
  return `${mins}m`
}

// ---- Data loading ----
async function loadHistory() {
  if (!machineId.value) {
    errorMessage.value = 'ID mesin pada URL tidak valid.'
    machine.value = null
    return
  }

  const seq = ++requestSeq
  loading.value = true
  errorMessage.value = ''

  try {
    const data = await getMachineHistory(machineId.value, {
      period: period.value,
      page: page.value,
      page_size: pageSize.value
    })

    // Abaikan respons lama bila pengguna sudah memicu request berikutnya
    if (seq !== requestSeq) return

    machine.value = data.machine
    currentStatus.value = data.currentStatus
    stats.value = data.stats
    timeline.value = data.timeline
    topFailureCodes.value = data.topFailureCodes
    topSpareparts.value = data.topSpareparts
    meta.value = data.meta

    // Sinkronkan state halaman dengan meta backend (mis. page > total_pages)
    page.value = data.meta.page
    pageSize.value = data.meta.page_size
    period.value = data.meta.period_days
  } catch (err) {
    if (seq !== requestSeq) return
    console.error('[MachineHistoryView] gagal memuat riwayat mesin:', err)
    errorMessage.value = err?.message || 'Terjadi kesalahan saat memuat riwayat mesin.'
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

function changePage(target) {
  const next = Math.min(Math.max(1, Number(target) || 1), totalPages.value)
  if (next === page.value) return
  page.value = next
  loadHistory()
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
}

function changePeriod(days) {
  if (days === period.value) return
  period.value = days
  page.value = 1
  loadHistory()
}

function goBack() {
  // Kembali ke halaman sebelumnya bila ada riwayat navigasi, jika tidak ke dashboard
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  router.push('/dashboard')
}

// Muat ulang bila ID mesin pada URL berubah (navigasi antar mesin tanpa remount)
watch(machineId, (next, prev) => {
  if (!next || next === prev) return
  page.value = 1
  loadHistory()
})

onMounted(loadHistory)
</script>
