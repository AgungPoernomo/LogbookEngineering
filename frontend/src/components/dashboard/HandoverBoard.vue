<template>
  <div class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
    <div class="p-4 sm:p-5 pb-3 border-b border-line">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <ClipboardList class="w-4 h-4 text-primary" />
          <h2 class="text-sm font-bold text-ink uppercase tracking-wide">
            Papan Serah-Terima Shift
          </h2>
          <span
            v-if="!loading && totalCount > 0"
            class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold"
          >
            {{ totalCount }} menggantung
          </span>
          <span
            v-else-if="!loading && totalCount === 0"
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
        Mesin dari shift sebelumnya yang masih perlu tindak lanjut — Tunggu Sparepart atau perbaikan sementara.
      </p>
    </div>

    <div v-if="loading" class="p-4 space-y-2">
      <div v-for="i in 3" :key="i" class="h-20 bg-muted rounded-md animate-pulse" />
    </div>

    <div v-else-if="errorMessage" class="p-6 text-center">
      <AlertCircle class="w-8 h-8 text-danger mx-auto mb-2 opacity-70" />
      <p class="text-xs text-ink-2">{{ errorMessage }}</p>
      <button
        type="button"
        class="mt-2 h-7 px-3 rounded border border-line bg-surface hover:bg-muted text-xs font-medium text-ink"
        @click="loadBoard"
      >
        Coba lagi
      </button>
    </div>

    <div v-else-if="filteredItems.length === 0" class="p-8 text-center">
      <CheckCircle2 class="w-10 h-10 text-success mx-auto mb-2 opacity-70" />
      <p class="text-sm font-medium text-ink">
        {{ activeFilter === 'all' ? 'Tidak ada mesin yang menggantung 🎉' : 'Tidak ada item untuk filter ini' }}
      </p>
      <p class="text-xs text-ink-3 mt-1">
        {{ activeFilter === 'all' ? 'Semua mesin dalam kondisi normal. Shift aman!' : 'Coba pilih filter lain.' }}
      </p>
    </div>

    <ul v-else class="divide-y divide-line max-h-[520px] overflow-y-auto">
      <li
        v-for="item in filteredItems"
        :key="item.id"
        class="p-3 sm:p-4 hover:bg-muted/30 transition cursor-pointer"
        @click="$emit('open-log-detail', item)"
      >
        <div class="flex items-start gap-3">
          <div
            class="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
            :class="item.machine_end_status === 'WAITING_SPAREPART' ? 'bg-amber-500' : 'bg-blue-500'"
            :title="statusLabel(item.machine_end_status)"
          />

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs font-bold text-ink truncate">
                    {{ item.machine_name || 'Aset belum terdaftar' }}
                  </span>
                  <span v-if="item.sub_machine_name" class="text-[10px] text-ink-3 truncate">
                    • {{ item.sub_machine_name }}
                  </span>
                  <span
                    v-if="item.machine_criticality === 'A_CRITICAL'"
                    class="px-1.5 py-0 rounded text-[9px] font-bold bg-danger/10 text-danger border border-danger/20"
                  >
                    A-CRITICAL
                  </span>
                </div>

                <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span
                    class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
                    :class="statusBadgeClass(item.machine_end_status)"
                  >
                    {{ statusLabel(item.machine_end_status) }}
                  </span>
                  <span v-if="item.quick_action_tag" class="text-[10px] text-ink-2 font-medium">
                    {{ item.quick_action_tag }}
                  </span>
                  <span v-if="item.failure_code" class="text-[10px] text-ink-3">
                    • {{ item.failure_code.code }}
                  </span>
                </div>
              </div>

              <span class="text-[10px] text-ink-3 whitespace-nowrap shrink-0 font-mono">
                {{ item.task_date }}
              </span>
            </div>

            <p class="text-[11px] text-ink-2 mt-1.5 line-clamp-2 leading-relaxed">
              {{ item.activity_description }}
            </p>

            <div class="flex items-center justify-between mt-2 gap-2 flex-wrap">
              <div class="flex items-center gap-1.5 text-[10px] text-ink-3">
                <span class="font-medium text-ink-2 truncate max-w-[140px]">
                  {{ item.user_name }}
                </span>
                <span>•</span>
                <span>{{ item.shift_name }}</span>
                <span>•</span>
                <span class="font-mono">{{ item.start_time }}–{{ item.end_time }}</span>
              </div>

              <span
                v-if="item.has_sparepart || item.spareparts.length > 0"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-semibold shrink-0"
              >
                <Package class="w-2.5 h-2.5" />
                {{ item.spareparts.length > 0 ? `${item.spareparts.length} part` : 'Sparepart' }}
              </span>
            </div>
          </div>
        </div>
      </li>
    </ul>

    <div
      v-if="!loading && !errorMessage && filteredItems.length > 0"
      class="px-4 py-2.5 border-t border-line flex items-center justify-between text-[10px] text-ink-3"
    >
      <span>Menampilkan {{ filteredItems.length }} dari {{ totalCount }} item</span>
      <button
        type="button"
        class="text-primary hover:underline font-medium"
        @click="loadBoard"
      >
        Segarkan ↻
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ClipboardList, CheckCircle2, AlertCircle, Package } from 'lucide-vue-next'
import { handoverService } from '../../services/handoverService'

const props = defineProps({
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
    WAITING_SPAREPART: 'bg-amber-50 text-amber-700 border border-amber-200',
    TEMPORARY_FIX: 'bg-blue-50 text-blue-700 border border-blue-200',
    NORMAL_RESOLVED: 'bg-success/10 text-success border border-success/20',
    MONITORING_NEEDED: 'bg-primary-soft text-primary border border-primary/20'
  }[s] || 'bg-muted text-ink-2 border border-line'
}

async function loadBoard() {
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
    errorMessage.value = err.message || 'Gagal memuat papan serah-terima.'
    console.error('[HandoverBoard] load error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadBoard)
defineExpose({ refresh: loadBoard })
</script>