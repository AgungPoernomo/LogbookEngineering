<template>
  <div class="bg-surface rounded-lg shadow-card p-4 min-w-0">
    <!-- Header per 11.5.7 -->
    <div class="flex items-center justify-between pb-3 mb-3 border-b border-line">
      <h2 class="text-[18px] font-semibold text-ink leading-6">
        {{ title }}
      </h2>

      <!-- View All Button -->
      <RouterLink
        :to="viewAllRoute"
        class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line bg-surface text-ink text-[13px] font-medium hover:bg-muted transition"
      >
        <span>Lihat Semua</span>
        <ChevronRight class="w-3.5 h-3.5 text-ink-3" />
      </RouterLink>
    </div>

    <!-- Loading Skeleton (5 rows) per 11.5.7 -->
    <div v-if="loading" class="space-y-3 py-2">
      <div
        v-for="i in 5"
        :key="i"
        class="h-10 bg-muted rounded-md animate-pulse"
      />
    </div>

    <!-- Empty State per 11.5.7 -->
    <div
      v-else-if="sortedRows.length === 0"
      class="flex flex-col items-center justify-center min-h-[120px] text-center p-4 text-ink-3"
    >
      <Inbox class="w-8 h-8 mb-1.5 text-ink-3" />
      <span class="text-xs font-normal">Belum ada data</span>
    </div>

    <!-- Table Container -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-[13px] border-collapse min-w-[500px]">
        <thead>
          <tr class="border-b border-line">
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                'py-2.5 px-3 text-[13px] font-medium text-ink select-none',
                col.sortable !== false ? 'cursor-pointer hover:text-primary transition' : ''
              ]"
              @click="col.sortable !== false && handleSort(col.key)"
            >
              <div class="inline-flex items-center gap-1">
                <span>{{ col.label }}</span>
                <!-- Sort Arrow Icon per 11.5.7 -->
                <ArrowUpDown
                  v-if="col.sortable !== false"
                  :class="[
                    'w-3 h-3 transition-colors',
                    sortKey === col.key ? 'text-primary' : 'text-ink-3'
                  ]"
                />
              </div>
            </th>
            <th v-if="roleVariant === 'supervisor'" class="py-2.5 px-3 text-[13px] font-medium text-ink text-right">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line text-ink">
          <!-- Max 5 rows per 11.5.7 -->
          <tr
            v-for="row in sortedRows.slice(0, 5)"
            :key="row.id || JSON.stringify(row)"
            class="hover:bg-muted/40 transition-colors"
          >
            <!-- Teknisi Variant: Tanggal, Mesin, Shift, Durasi, Status per 11.6 -->
            <template v-if="roleVariant === 'teknisi'">
              <td class="py-2.5 px-3 font-normal text-ink-2 whitespace-nowrap">
                {{ row.task_date }}
              </td>
              <td class="py-2.5 px-3 font-medium text-ink">
                <div>{{ row.machine_name }}</div>
                <div v-if="row.sub_machine_name" class="text-[11px] text-ink-3">
                  {{ row.sub_machine_name }}
                </div>
              </td>
              <td class="py-2.5 px-3 font-normal text-ink-2 whitespace-nowrap">
                {{ row.shift_name }}
              </td>
              <td class="py-2.5 px-3 font-normal text-ink tabular-nums whitespace-nowrap">
                {{ row.duration_minutes }} menit
              </td>
              <td class="py-2.5 px-3 whitespace-nowrap">
                <AppBadge :status="row.status" />
              </td>
            </template>

            <!-- Supervisor Variant: Teknisi, Tanggal, Mesin, Plant, Tinjau per 11.6 -->
            <template v-else-if="roleVariant === 'supervisor'">
              <td class="py-2.5 px-3 font-medium text-ink whitespace-nowrap">
                {{ row.user_name || row.teknisi_name }}
              </td>
              <td class="py-2.5 px-3 font-normal text-ink-2 whitespace-nowrap">
                {{ row.task_date }}
              </td>
              <td class="py-2.5 px-3 font-medium text-ink">
                {{ row.machine_name }}
              </td>
              <td class="py-2.5 px-3 font-normal text-ink-2 whitespace-nowrap">
                {{ row.plant_name }}
              </td>
              <td class="py-2.5 px-3 text-right whitespace-nowrap">
                <RouterLink
                  :to="`/approval`"
                  class="inline-flex items-center justify-center h-7 px-3 rounded-md bg-primary hover:bg-blue-700 text-white text-xs font-medium transition shadow-xs"
                >
                  Tinjau
                </RouterLink>
              </td>
            </template>

            <!-- Admin Variant: Pengguna, Aktivitas, Waktu per 11.6 -->
            <template v-else-if="roleVariant === 'admin'">
              <td class="py-2.5 px-3 font-medium text-ink whitespace-nowrap">
                {{ row.user_name }}
              </td>
              <td class="py-2.5 px-3 font-normal text-ink">
                <div>{{ row.activity }}</div>
                <div v-if="row.detail" class="text-[11px] text-ink-3 truncate max-w-xs">
                  {{ row.detail }}
                </div>
              </td>
              <td class="py-2.5 px-3 font-normal text-ink-2 whitespace-nowrap">
                {{ row.created_at }}
              </td>
            </template>

            <!-- Generic fallback if custom columns provided -->
            <template v-else>
              <td
                v-for="col in columns"
                :key="col.key"
                class="py-2.5 px-3"
              >
                <AppBadge v-if="col.key === 'status'" :status="row[col.key]" />
                <span v-else>{{ row[col.key] }}</span>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppBadge from '../common/AppBadge.vue'
import { ChevronRight, ArrowUpDown, Inbox } from 'lucide-vue-next'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  viewAllRoute: {
    type: String,
    required: true
  },
  roleVariant: {
    type: String,
    default: 'teknisi' // 'teknisi', 'supervisor', 'admin', 'custom'
  },
  columns: {
    type: Array,
    default: () => []
  },
  rows: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const sortKey = ref('')
const sortAsc = ref(true)

function handleSort(key) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows || []
  const list = [...(props.rows || [])]
  list.sort((a, b) => {
    const valA = a[sortKey.value]
    const valB = b[sortKey.value]
    if (valA === valB) return 0
    if (valA === null || valA === undefined) return 1
    if (valB === null || valB === undefined) return -1
    const res = valA > valB ? 1 : -1
    return sortAsc.value ? res : -res
  })
  return list
})
</script>
