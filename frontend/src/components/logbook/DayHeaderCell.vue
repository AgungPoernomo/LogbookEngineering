<template>
  <div
    class="flex-1 min-w-0 h-[72px] flex flex-col items-center justify-center border-r border-line last:border-r-0 select-none"
    role="columnheader"
    :aria-label="ariaLabel"
  >
    <!-- Singkatan Hari -->
    <span
      :class="[
        'text-[11px] font-semibold tracking-wider uppercase',
        isToday ? 'text-primary font-bold' : 'text-ink-2'
      ]"
    >
      {{ dayAbbr }}
    </span>

    <!-- Angka Tanggal -->
    <div class="mt-1 flex items-center justify-center">
      <div
        v-if="isToday"
        class="w-10 h-10 rounded-full bg-primary text-white font-medium text-base flex items-center justify-center shadow-card"
      >
        {{ dateNumber }}
      </div>
      <span
        v-else
        class="text-xl font-normal text-ink leading-none py-1.5"
      >
        {{ dateNumber }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  dateStr: {
    type: String,
    required: true
  },
  isToday: {
    type: Boolean,
    default: false
  }
})

const dateObj = computed(() => {
  if (!props.dateStr) return new Date()
  const [y, m, d] = props.dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
})

const DAY_ABBR_ID = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']
const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

const dayAbbr = computed(() => DAY_ABBR_ID[dateObj.value.getDay()])
const dateNumber = computed(() => dateObj.value.getDate())

const ariaLabel = computed(() => {
  const dName = DAY_NAMES_ID[dateObj.value.getDay()]
  return `${dName}, ${props.dateStr}${props.isToday ? ' (Hari ini)' : ''}`
})
</script>
