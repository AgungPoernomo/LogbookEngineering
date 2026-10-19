<template>
  <div class="space-y-2 select-none">
    <!-- Header: Bulan & Tahun + Tombol Navigasi -->
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-ink capitalize">
        {{ currentMonthName }} {{ viewYear }}
      </span>
      <div class="flex items-center gap-0.5">
        <button
          type="button"
          class="w-7 h-7 rounded-md flex items-center justify-center text-ink-2 hover:bg-muted transition"
          aria-label="Bulan sebelumnya"
          @click="prevMonth"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          type="button"
          class="w-7 h-7 rounded-md flex items-center justify-center text-ink-2 hover:bg-muted transition"
          aria-label="Bulan berikutnya"
          @click="nextMonth"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Day Headers: S S R K J S M (Senin..Minggu) -->
    <div class="grid grid-cols-7 text-center">
      <span
        v-for="(dayInitial, idx) in dayInitials"
        :key="idx"
        class="text-[11px] font-medium text-ink-2 h-6 flex items-center justify-center"
      >
        {{ dayInitial }}
      </span>
    </div>

    <!-- Date Cells: 7 Kolom x 6 Baris -->
    <div class="grid grid-cols-7 gap-y-0.5 text-center">
      <button
        v-for="cell in calendarCells"
        :key="cell.dateStr"
        type="button"
        :class="[
          'w-7 h-7 mx-auto rounded-full text-xs flex items-center justify-center transition-colors',
          cell.isToday && cell.isSelected
            ? 'bg-primary text-white font-semibold'
            : cell.isToday
              ? 'bg-primary text-white font-semibold'
              : cell.isSelected
                ? 'bg-primary-soft text-primary font-semibold'
                : cell.isCurrentMonth
                  ? 'text-ink hover:bg-muted'
                  : 'text-ink-3 hover:bg-muted/60'
        ]"
        @click="selectDate(cell.dateStr)"
      >
        {{ cell.dayNumber }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { toLocalDateString, parseLocalDate } from '../../utils/dateKeys'

const props = defineProps({
  selectedDate: {
    type: String,
    default: () => toLocalDateString(new Date())
  }
})

const emit = defineEmits(['update:selectedDate', 'select'])

const todayStr = toLocalDateString(new Date())
const initialDate = props.selectedDate ? parseLocalDate(props.selectedDate) : new Date()

const viewYear = ref(initialDate.getFullYear())
const viewMonth = ref(initialDate.getMonth()) // 0-11

watch(
  () => props.selectedDate,
  (newVal) => {
    if (newVal) {
      const d = parseLocalDate(newVal)
      viewYear.value = d.getFullYear()
      viewMonth.value = d.getMonth()
    }
  }
)

const dayInitials = ['S', 'S', 'R', 'K', 'J', 'S', 'M']

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const currentMonthName = computed(() => MONTH_NAMES_ID[viewMonth.value])

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}

function selectDate(dateStr) {
  emit('update:selectedDate', dateStr)
  emit('select', dateStr)
}

// Build 42 calendar cells (Monday start)
const calendarCells = computed(() => {
  const cells = []
  const firstDayOfMonth = new Date(viewYear.value, viewMonth.value, 1)
  const lastDayOfMonth = new Date(viewYear.value, viewMonth.value + 1, 0)

  // Monday = 1, Sunday = 0 -> in Monday-first calendar:
  // Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6
  let firstDayIndex = (firstDayOfMonth.getDay() - 1 + 7) % 7

  // Days from previous month
  const prevMonthLastDate = new Date(viewYear.value, viewMonth.value, 0).getDate()
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthLastDate - i
    const m = viewMonth.value === 0 ? 11 : viewMonth.value - 1
    const y = viewMonth.value === 0 ? viewYear.value - 1 : viewYear.value
    const dateObj = new Date(y, m, d)
    const dateStr = toLocalDateString(dateObj)
    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === props.selectedDate
    })
  }

  // Days in current month
  const totalDays = lastDayOfMonth.getDate()
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(viewYear.value, viewMonth.value, d)
    const dateStr = toLocalDateString(dateObj)
    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === props.selectedDate
    })
  }

  // Remaining days to complete 42 cells (6 rows)
  let nextDay = 1
  while (cells.length < 42) {
    const m = viewMonth.value === 11 ? 0 : viewMonth.value + 1
    const y = viewMonth.value === 11 ? viewYear.value + 1 : viewYear.value
    const dateObj = new Date(y, m, nextDay)
    const dateStr = toLocalDateString(dateObj)
    cells.push({
      dateStr,
      dayNumber: nextDay,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === props.selectedDate
    })
    nextDay++
  }

  return cells
})
</script>
