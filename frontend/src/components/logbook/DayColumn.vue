<template>
  <div
    ref="columnRef"
    class="flex-1 min-w-0 h-[calc(var(--planner-hour-h)*24)] relative border-r border-line last:border-r-0 select-none cursor-crosshair group"
    role="gridcell"
    :aria-label="`Jadwal ${dateStr}`"
    @mousedown="handleMouseDown"
    @click="handleClick"
  >
    <!-- Background Hour Grid Lines (horizontal 1px border tiap 1 jam = --planner-hour-h) -->
    <div
      v-for="h in 23"
      :key="h"
      class="absolute left-0 right-0 border-b border-line pointer-events-none"
      :style="{ top: `calc(var(--planner-hour-h) * ${h})` }"
    />

    <!-- Now Indicator if this day is today -->
    <NowIndicator v-if="isToday" />

    <!-- Selection Ghost during mouse drag -->
    <SelectionGhost
      v-if="isSelecting && ghostRange"
      :top="ghostRange.topPx"
      :height="ghostRange.heightPx"
      :label="ghostRange.label"
    />

    <!-- Logbook Event Blocks -->
    <LogbookEventBlock
      v-for="seg in segments"
      :key="`${seg.logbookId}-${seg.isContinuation ? 'cont' : 'main'}`"
      :segment="seg"
      :is-selected="selectedLogbookId === seg.logbookId"
      @click="handleBlockClick"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import NowIndicator from './NowIndicator.vue'
import SelectionGhost from './SelectionGhost.vue'
import LogbookEventBlock from './LogbookEventBlock.vue'
import { pxToMinutes, minutesToPx, minutesToHhmm, readPxPerHour } from '../../utils/calendarLayout'

const props = defineProps({
  dateStr: {
    type: String,
    required: true
  },
  isToday: {
    type: Boolean,
    default: false
  },
  segments: {
    type: Array,
    default: () => []
  },
  selectedLogbookId: {
    type: [Number, String],
    default: null
  }
})

const emit = defineEmits(['create-slot', 'click-block'])

const columnRef = ref(null)
const isSelecting = ref(false)
const dragStartMin = ref(0)
const dragCurrentMin = ref(0)
const hasMoved = ref(false)

const ghostRange = computed(() => {
  if (!isSelecting.value) return null
  const pxPerHour = getPxPerHour()
  const minStart = Math.min(dragStartMin.value, dragCurrentMin.value)
  const minEnd = Math.max(dragStartMin.value, dragCurrentMin.value)
  const duration = Math.max(15, minEnd - minStart)
  const finalEnd = minStart + duration

  return {
    topPx: minutesToPx(minStart, pxPerHour),
    heightPx: minutesToPx(duration, pxPerHour),
    label: `${minutesToHhmm(minStart)} - ${minutesToHhmm(finalEnd)}`
  }
})

/**
 * Tinggi 1 jam (px) aktual dari token `--planner-hour-h` pada kolom ini,
 * agar konversi menit <-> piksel selalu sama dengan tinggi grid yang dirender.
 */
function getPxPerHour() {
  return readPxPerHour(columnRef.value)
}

function getYFromEvent(e) {
  if (!columnRef.value) return 0
  const rect = columnRef.value.getBoundingClientRect()
  return e.clientY - rect.top
}

function handleMouseDown(e) {
  // If clicked directly on a block button, do not start selection
  if (e.target.closest('button')) return

  const y = getYFromEvent(e)
  dragStartMin.value = pxToMinutes(y, getPxPerHour())
  dragCurrentMin.value = dragStartMin.value
  isSelecting.value = true
  hasMoved.value = false

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

function handleMouseMove(e) {
  if (!isSelecting.value) return
  hasMoved.value = true
  const y = getYFromEvent(e)
  dragCurrentMin.value = pxToMinutes(y, getPxPerHour())
}

function handleMouseUp(e) {
  if (!isSelecting.value) return
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)

  isSelecting.value = false

  // If dragged range
  if (hasMoved.value) {
    const minStart = Math.min(dragStartMin.value, dragCurrentMin.value)
    const minEnd = Math.max(dragStartMin.value, dragCurrentMin.value)
    const duration = Math.max(15, minEnd - minStart)
    const finalEnd = minStart + duration

    emit('create-slot', {
      date: props.dateStr,
      task_date: props.dateStr,
      time: minutesToHhmm(minStart),
      start_time: minutesToHhmm(minStart),
      end_time: minutesToHhmm(finalEnd)
    })
  }
}

function handleClick(e) {
  // If clicked directly on a block, block click handler takes care of it
  if (e.target.closest('button')) return

  // Only handle simple click if there was no drag movement
  if (!hasMoved.value) {
    const y = getYFromEvent(e)
    const startMin = pxToMinutes(y, getPxPerHour())
    const endMin = Math.min(1440, startMin + 60)

    emit('create-slot', {
      date: props.dateStr,
      task_date: props.dateStr,
      time: minutesToHhmm(startMin),
      start_time: minutesToHhmm(startMin),
      end_time: minutesToHhmm(endMin)
    })
  }
}

function handleBlockClick(payload) {
  emit('click-block', payload)
}
</script>
