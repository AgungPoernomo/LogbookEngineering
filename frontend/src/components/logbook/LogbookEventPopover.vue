<template>
  <div
    v-if="logbook"
    ref="popoverRef"
    class="fixed z-50 w-[300px] bg-surface rounded-lg shadow-tooltip p-4 border border-line text-xs select-none space-y-3"
    :style="positionStyle"
    role="dialog"
    aria-modal="true"
    aria-label="Detail Ringkasan Logbook"
  >
    <!-- Header: Badge Status & Close Button -->
    <div class="flex items-center justify-between pb-2 border-b border-line">
      <AppBadge :status="logbook.status" />
      <button
        type="button"
        class="w-6 h-6 rounded flex items-center justify-center text-ink-2 hover:bg-muted hover:text-ink transition"
        aria-label="Tutup"
        @click="$emit('close')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Informasi Mesin & Waktu -->
    <div class="space-y-1">
      <div class="font-semibold text-sm text-ink">
        {{ logbook.machine_name }}
      </div>
      <div v-if="logbook.sub_machine_name && logbook.sub_machine_name !== '-'" class="text-ink-2 text-xs">
        {{ logbook.sub_machine_name }}
      </div>
      <div class="text-[11px] font-mono text-ink-2 pt-1 flex items-center gap-1.5">
        <Calendar class="w-3.5 h-3.5 text-primary" />
        <span>{{ logbook.task_date }}</span>
        <span>•</span>
        <span>{{ logbook.start_time }} - {{ logbook.end_time }}</span>
      </div>
      <div v-if="isCrossMidnight" class="text-[10px] text-warning font-medium">
        🌙 Melewati tengah malam
      </div>
    </div>

    <!-- Grid Detail: Plant, Shift, Durasi -->
    <div class="grid grid-cols-2 gap-2 p-2 bg-muted rounded-md text-[11px]">
      <div>
        <span class="text-ink-2 block text-[10px] uppercase font-semibold">Fasilitas / Plant</span>
        <span class="font-medium text-ink truncate block">{{ logbook.plant_name }}</span>
      </div>
      <div>
        <span class="text-ink-2 block text-[10px] uppercase font-semibold">Shift Kerja</span>
        <span class="font-medium text-ink truncate block">{{ logbook.shift_name }}</span>
      </div>
      <div class="col-span-2">
        <span class="text-ink-2 block text-[10px] uppercase font-semibold">Durasi Terhitung</span>
        <span class="font-semibold text-primary">{{ formatDuration(logbook.duration_minutes) }} ({{ logbook.duration_minutes }} menit)</span>
      </div>
    </div>

    <!-- Suku Cadang -->
    <div v-if="logbook.sparepart && logbook.sparepart !== '-'">
      <span class="text-ink-2 font-medium block text-[10px] uppercase">Suku Cadang:</span>
      <div class="text-ink text-[11px] mt-0.5">{{ logbook.sparepart }}</div>
    </div>

    <!-- Uraian Aktivitas (max 3 baris elipsis) -->
    <div>
      <span class="text-ink-2 font-medium block text-[10px] uppercase">Uraian Pekerjaan:</span>
      <p class="text-ink text-[11px] mt-0.5 line-clamp-3 leading-relaxed">
        {{ logbook.activity_description }}
      </p>
    </div>

    <!-- Catatan Supervisor bila ada -->
    <div
      v-if="logbook.approval_notes"
      class="p-2 rounded bg-status-approved-bg border border-success/20 text-status-approved-fg text-[11px]"
    >
      <span class="font-semibold block mb-0.5">Catatan Supervisor:</span>
      <span class="leading-relaxed">{{ logbook.approval_notes }}</span>
    </div>

    <!-- Footer: Link ke Riwayat -->
    <div class="pt-2 border-t border-line flex items-center justify-between">
      <span class="text-[10px] text-ink-3">#{{ logbook.id }}</span>
      <RouterLink
        to="/logbook/riwayat"
        class="text-primary hover:underline font-medium text-xs flex items-center gap-1"
        @click="$emit('close')"
      >
        <span>Lihat di Riwayat</span>
        <ArrowUpRight class="w-3.5 h-3.5" />
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { X, Calendar, ArrowUpRight } from 'lucide-vue-next'
import AppBadge from '../common/AppBadge.vue'
import { formatDuration } from '../../utils/duration'

const props = defineProps({
  logbook: {
    type: Object,
    default: null
  },
  anchorRect: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])
const popoverRef = ref(null)

const isCrossMidnight = computed(() => {
  if (!props.logbook?.start_time || !props.logbook?.end_time) return false
  return props.logbook.end_time < props.logbook.start_time
})

const positionStyle = computed(() => {
  if (!props.anchorRect) {
    return { top: '100px', left: '100px' }
  }

  const padding = 12
  const popoverWidth = 300
  const popoverHeight = 360

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Default: place on the right of the anchor rect
  let left = props.anchorRect.right + padding
  let top = props.anchorRect.top

  // If overflows right, place on the left
  if (left + popoverWidth > viewportWidth - padding) {
    left = props.anchorRect.left - popoverWidth - padding
  }

  // Ensure left is not offscreen
  left = Math.max(padding, Math.min(left, viewportWidth - popoverWidth - padding))

  // Ensure top doesn't overflow bottom
  if (top + popoverHeight > viewportHeight - padding) {
    top = Math.max(padding, viewportHeight - popoverHeight - padding)
  }

  return {
    top: `${top}px`,
    left: `${left}px`
  }
})

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

function handleClickOutside(e) {
  if (popoverRef.value && !popoverRef.value.contains(e.target)) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  setTimeout(() => {
    window.addEventListener('click', handleClickOutside)
  }, 10)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('click', handleClickOutside)
})
</script>
