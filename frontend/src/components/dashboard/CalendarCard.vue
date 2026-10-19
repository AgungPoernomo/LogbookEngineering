<template>
  <div class="bg-surface rounded-lg shadow-card p-4 min-w-0 flex flex-col justify-between">
    <!-- Header per 11.5.10 -->
    <div class="flex items-center justify-between pb-3 mb-2 border-b border-line">
      <h2 class="text-[16px] font-semibold text-ink leading-snug">
        Pilih Tanggal
      </h2>

      <!-- Month Selector Dropdown per 11.5.10 -->
      <div class="relative">
        <label for="calendar-month-select" class="sr-only">Pilih Bulan Kalender</label>
        <div class="relative flex items-center h-7 px-2 rounded-md border border-line bg-surface text-ink text-[12px]">
          <select
            id="calendar-month-select"
            v-model="currentMonth"
            class="bg-transparent text-[12px] font-medium text-ink focus:outline-none cursor-pointer pr-4 appearance-none"
          >
            <option v-for="(name, idx) in monthNames" :key="idx" :value="idx">
              {{ name }}
            </option>
          </select>
          <ChevronDown class="w-3.5 h-3.5 text-ink-3 absolute right-1.5 pointer-events-none" />
        </div>
      </div>
    </div>

    <!-- Day Headers: Sn Sl Rb Km Jm Sb Mg (starts Monday) per 11.5.10 -->
    <div class="grid grid-cols-7 gap-1 text-center mb-1">
      <span
        v-for="d in dayNames"
        :key="d"
        class="text-[12px] font-medium text-ink py-1 select-none"
      >
        {{ d }}
      </span>
    </div>

    <!-- Date Cells Grid (7 cols, height ~32px) per 11.5.10 -->
    <div class="grid grid-cols-7 gap-1" role="grid" aria-label="Kalender aktivitas">
      <div
        v-for="cell in calendarCells"
        :key="cell.dateKey"
        role="gridcell"
        :class="[
          'relative flex flex-col items-center justify-center h-8 rounded-[4px] text-[12px] select-none transition-colors cursor-pointer',
          cell.isCurrentMonth ? (cell.isSelected ? 'bg-primary text-white font-medium' : (cell.isToday ? 'border border-primary text-primary font-semibold' : 'text-ink hover:bg-muted')) : 'text-ink-3 cursor-default'
        ]"
        @click="cell.isCurrentMonth && selectDate(cell)"
      >
        <span>{{ cell.day }}</span>

        <!-- 4px primary dot if date has logbooks per 11.5.10 -->
        <span
          v-if="cell.hasLogbook && !cell.isSelected"
          class="w-1 h-1 rounded-full bg-primary absolute bottom-1"
        />
        <span
          v-else-if="cell.hasLogbook && cell.isSelected"
          class="w-1 h-1 rounded-full bg-white absolute bottom-1"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  year: {
    type: Number,
    default: () => new Date().getFullYear()
  },
  month: {
    type: Number,
    default: () => new Date().getMonth()
  },
  highlightDates: {
    type: Array, // Array of 'YYYY-MM-DD'
    default: () => []
  }
})

const emit = defineEmits(['select-date'])

const dayNames = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg']
const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const currentMonth = ref(props.month)
const selectedDateKey = ref(formatDateKey(new Date()))

function formatDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const calendarCells = computed(() => {
  const y = props.year
  const m = currentMonth.value
  const todayKey = formatDateKey(new Date())

  const firstDay = new Date(y, m, 1)
  const lastDay = new Date(y, m + 1, 0)
  const daysInMonth = lastDay.getDate()

  // Monday is 1, Sunday is 0 in JS getDay(). Convert so Monday = 0, Sunday = 6
  let firstDayIndex = firstDay.getDay() - 1
  if (firstDayIndex < 0) firstDayIndex = 6

  const prevMonthLastDay = new Date(y, m, 0).getDate()
  const cells = []

  // Preceding days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i
    const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      day: d,
      dateKey: key,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      hasLogbook: false
    })
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isToday = key === todayKey
    const isSelected = key === selectedDateKey.value
    const hasLogbook = props.highlightDates.includes(key)
    cells.push({
      day: d,
      dateKey: key,
      isCurrentMonth: true,
      isToday,
      isSelected,
      hasLogbook
    })
  }

  // Next month filler days to complete 5 or 6 full rows (multiple of 7)
  const totalSlots = cells.length > 35 ? 42 : 35
  const remaining = totalSlots - cells.length
  for (let d = 1; d <= remaining; d++) {
    const key = `${y}-${String(m + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      day: d,
      dateKey: key,
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      hasLogbook: false
    })
  }

  return cells
})

function selectDate(cell) {
  selectedDateKey.value = cell.dateKey
  emit('select-date', cell.dateKey)
}
</script>
