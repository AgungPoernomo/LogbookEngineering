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

    <!-- Search Bar per 11.5.11 -->
    <div class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line flex items-center justify-between gap-4">
      <div class="relative w-full max-w-md">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari aktivitas / pengguna / detail..."
          class="w-full h-9 pl-8 pr-3 rounded-md border border-line bg-muted text-xs text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-ink-3"
        />
        <svg class="w-4 h-4 text-ink-3 absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>

    <!-- Audit Table Card per 11.5.11 -->
    <div class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[12px] border-collapse min-w-[700px]">
          <thead class="bg-muted/60 font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-3">Waktu Pencatatan</th>
              <th class="px-4 py-3">Pengguna & Peran</th>
              <th class="px-4 py-3">Jenis Aktivitas</th>
              <th class="px-4 py-3">Rincian Perubahan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr v-if="filteredAudit.length === 0">
              <td colspan="4" class="px-4 py-10 text-center text-ink-3 text-xs">
                Tidak ada log aktivitas audit yang sesuai pencarian.
              </td>
            </tr>
            <tr
              v-for="log in filteredAudit"
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { auditService } from '../../services/auditService'

const auditLogs = ref([])
const searchQuery = ref('')

onMounted(async () => {
  auditLogs.value = await auditService.getActivities()
})

const filteredAudit = computed(() => {
  if (!searchQuery.value.trim()) return auditLogs.value
  const q = searchQuery.value.toLowerCase()
  return auditLogs.value.filter(l =>
    l.activity?.toLowerCase().includes(q) ||
    l.user_name?.toLowerCase().includes(q) ||
    l.user_role?.toLowerCase().includes(q) ||
    l.detail?.toLowerCase().includes(q)
  )
})
</script>
