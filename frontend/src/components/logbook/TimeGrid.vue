<template>
  <div
    ref="scrollContainerRef"
    class="flex-1 overflow-y-auto min-h-0 relative bg-surface select-none"
    role="grid"
    :aria-label="ariaLabel"
  >
    <!-- Grid Body: TimeAxis (kiri) + DayColumns (kanan) -->
    <div class="flex items-start min-w-[320px]">
      <TimeAxis />

      <div class="flex-1 min-w-0 flex items-stretch relative">
        <!-- Skeleton blocks when loading -->
        <div
          v-if="loading"
          class="absolute inset-0 z-30 pointer-events-none p-4 space-y-8"
        >
          <div class="w-3/4 h-16 bg-muted/80 rounded-md animate-pulse border border-line/60" />
          <div class="w-1/2 h-20 bg-muted/80 rounded-md animate-pulse border border-line/60 ml-auto" />
          <div class="w-2/3 h-14 bg-muted/80 rounded-md animate-pulse border border-line/60" />
        </div>

        <!-- Empty state helper text if no logbooks -->
        <div
          v-if="!loading && isEmpty"
          class="absolute inset-x-0 top-32 z-20 pointer-events-none flex flex-col items-center justify-center p-6 text-center text-xs text-ink-2"
        >
          <div class="p-3 bg-surface/95 backdrop-blur-sm rounded-lg border border-line shadow-card max-w-md">
            <p v-if="allFiltersDisabled" class="font-medium text-warning">
              Semua status disembunyikan. Aktifkan filter status atau shift untuk melihat logbook.
            </p>
            <p v-else class="text-ink-2">
              Belum ada logbook pada rentang ini. Klik slot waktu kosong atau tombol Buat Logbook untuk mencatat pekerjaan.
            </p>
          </div>
        </div>

        <!-- Day Columns -->
        <DayColumn
          v-for="day in days"
          :key="day.dateStr"
          :date-str="day.dateStr"
          :is-today="day.isToday"
          :segments="day.segments"
          :selected-logbook-id="selectedLogbookId"
          @create-slot="$emit('create-slot', $event)"
          @click-block="$emit('click-block', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import TimeAxis from './TimeAxis.vue'
import DayColumn from './DayColumn.vue'

const props = defineProps({
  days: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  isEmpty: {
    type: Boolean,
    default: false
  },
  allFiltersDisabled: {
    type: Boolean,
    default: false
  },
  hasToday: {
    type: Boolean,
    default: false
  },
  selectedLogbookId: {
    type: [Number, String],
    default: null
  },
  ariaLabel: {
    type: String,
    default: 'Kalender Mingguan Logbook'
  }
})

defineEmits(['create-slot', 'click-block'])

const scrollContainerRef = ref(null)

function scrollToInitialPosition() {
  if (!scrollContainerRef.value) return

  if (props.hasToday) {
    const d = new Date()
    const nowMinutes = d.getHours() * 60 + d.getMinutes()
    const nowPx = (nowMinutes / 60) * 60
    // Scroll so current time is ~ 1/3 from top
    const targetScroll = Math.max(0, nowPx - 180)
    scrollContainerRef.value.scrollTop = targetScroll
  } else {
    // Scroll to 06:00 (6 * 60 = 360px)
    scrollContainerRef.value.scrollTop = 360
  }
}

onMounted(() => {
  nextTick(() => {
    scrollToInitialPosition()
  })
})

watch(
  () => props.hasToday,
  () => {
    nextTick(() => {
      scrollToInitialPosition()
    })
  }
)
</script>
