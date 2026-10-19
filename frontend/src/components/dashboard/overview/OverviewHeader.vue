<template>
  <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-line">
    <!-- Judul & Logo Header -->
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <svg class="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-semibold text-primary uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-soft">
            Dashboard Log Book
          </span>
          <span class="text-[11px] text-ink-3">• Real-time & Live Monitoring</span>
        </div>
        <h1 class="text-lg sm:text-xl font-bold text-ink tracking-tight mt-0.5">
          Engineering Activity Overview & Monitoring
        </h1>
        <p class="text-xs text-ink-2">
          Real-Time Engineering Team Daily Activity Record Center (All Lines)
        </p>
      </div>
    </div>

    <!-- 3 KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
      <!-- KPI 1: TOTAL LOG -->
      <div class="p-3 bg-surface rounded-lg border border-line shadow-card flex items-center gap-3 min-w-[170px]">
        <div class="w-9 h-9 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <FileText class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] uppercase font-semibold text-ink-2 tracking-wider">
            TOTAL LOG
          </div>
          <div class="text-lg font-bold text-ink leading-tight">
            {{ kpi.totalLog?.toLocaleString('id-ID') || 0 }}
          </div>
          <div class="text-[10px] flex items-center gap-1 mt-0.5">
            <span
              :class="[
                'font-semibold inline-flex items-center px-1 rounded',
                kpi.totalLogDelta?.isUp ? 'text-success bg-status-approved-bg' : 'text-danger bg-status-rejected-bg'
              ]"
            >
              {{ kpi.totalLogDelta?.text || '0%' }}
            </span>
            <span class="text-ink-3">vs. kemarin</span>
          </div>
        </div>
      </div>

      <!-- KPI 2: AKTIVITAS HARI INI -->
      <div class="p-3 bg-surface rounded-lg border border-line shadow-card flex items-center gap-3 min-w-[170px]">
        <div class="w-9 h-9 rounded-md bg-status-approved-bg text-status-approved-fg flex items-center justify-center shrink-0">
          <Activity class="w-5 h-5 text-success" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] uppercase font-semibold text-ink-2 tracking-wider">
            LOG HARIAN
          </div>
          <div class="text-lg font-bold text-ink leading-tight">
            {{ kpi.todayLog?.toLocaleString('id-ID') || 0 }}
          </div>
          <div class="text-[10px] flex items-center gap-1 mt-0.5">
            <span
              :class="[
                'font-semibold inline-flex items-center px-1 rounded',
                kpi.todayLogDelta?.isUp ? 'text-success bg-status-approved-bg' : 'text-danger bg-status-rejected-bg'
              ]"
            >
              {{ kpi.todayLogDelta?.text || '0%' }}
            </span>
            <span class="text-ink-3">vs. kemarin</span>
          </div>
        </div>
      </div>

      <!-- KPI 3: USER AKTIF -->
      <div class="p-3 bg-surface rounded-lg border border-line shadow-card flex items-center gap-3 min-w-[170px]">
        <div class="w-9 h-9 rounded-md bg-status-pending-bg text-status-pending-fg flex items-center justify-center shrink-0">
          <Users class="w-5 h-5 text-warning" />
        </div>
        <div class="min-w-0">
          <div class="text-[10px] uppercase font-semibold text-ink-2 tracking-wider">
            USER AKTIF
          </div>
          <div class="text-lg font-bold text-ink leading-tight">
            {{ kpi.activeUsers || 0 }}
          </div>
          <div class="text-[10px] flex items-center gap-1 mt-0.5">
            <span
              :class="[
                'font-semibold inline-flex items-center px-1 rounded',
                kpi.activeUsersDelta?.isUp ? 'text-success bg-status-approved-bg' : 'text-danger bg-status-rejected-bg'
              ]"
            >
              {{ kpi.activeUsersDelta?.text || '0%' }}
            </span>
            <span class="text-ink-3">vs. kemarin</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { FileText, Activity, Users } from 'lucide-vue-next'

defineProps({
  kpi: {
    type: Object,
    default: () => ({
      totalLog: 0,
      totalLogDelta: { text: '0%', isUp: true },
      todayLog: 0,
      todayLogDelta: { text: '0%', isUp: true },
      activeUsers: 0,
      activeUsersDelta: { text: '0%', isUp: true }
    })
  }
})
</script>
