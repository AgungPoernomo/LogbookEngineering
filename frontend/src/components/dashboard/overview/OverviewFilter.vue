<template>
  <div class="p-3.5 bg-surface rounded-lg border border-line shadow-card space-y-3">
    <!-- Header Filter & Reset -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5 text-xs font-semibold text-ink uppercase tracking-wider">
        <Filter class="w-4 h-4 text-primary" />
        <span>FILTER DASHBOARD</span>
      </div>

      <button
        type="button"
        class="text-xs text-ink-2 hover:text-primary flex items-center gap-1 transition"
        @click="handleReset"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span>Reset Filter</span>
      </button>
    </div>

    <!-- Filter Inputs Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
      <!-- 1. Bulan & Tahun -->
      <div>
        <label for="filter-month" class="block text-[11px] font-medium text-ink-2 mb-1">
          Bulan & Tahun
        </label>
        <input
          id="filter-month"
          v-model="localFilters.yearMonth"
          type="month"
          class="w-full h-8 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer"
          @change="emitUpdate"
        />
      </div>

      <!-- 2. Department -->
      <div>
        <label for="filter-dept" class="block text-[11px] font-medium text-ink-2 mb-1">
          Department
        </label>
        <select
          id="filter-dept"
          v-model="localFilters.groupId"
          class="w-full h-8 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer"
          @change="emitUpdate"
        >
          <option value="ALL">Semua Department</option>
          <option v-for="g in workGroups" :key="g.id" :value="g.id">
            {{ g.name }}
          </option>
        </select>
      </div>

      <!-- 3. Group Kerja -->
      <div>
        <label for="filter-group" class="block text-[11px] font-medium text-ink-2 mb-1">
          Work Group
        </label>
        <select
          id="filter-group"
          v-model="localFilters.groupId"
          class="w-full h-8 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer"
          @change="emitUpdate"
        >
          <option value="ALL">Semua Group</option>
          <option v-for="g in workGroups" :key="g.id" :value="g.id">
            {{ g.name }}
          </option>
        </select>
      </div>

      <!-- 4. Shift Kerja -->
      <div>
        <label for="filter-shift" class="block text-[11px] font-medium text-ink-2 mb-1">
          Shift Kerja
        </label>
        <select
          id="filter-shift"
          v-model="localFilters.shiftId"
          class="w-full h-8 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer"
          @change="emitUpdate"
        >
          <option value="ALL">Semua Shift</option>
          <option v-for="s in shifts" :key="s.id" :value="s.id">
            {{ s.name }} ({{ s.start_time }}-{{ s.end_time }})
          </option>
        </select>
      </div>

      <!-- 5. Pencarian Text -->
      <div>
        <label for="filter-search" class="block text-[11px] font-medium text-ink-2 mb-1">
          Pencarian Kata Kunci
        </label>
        <div class="relative">
          <input
            id="filter-search"
            v-model="searchInput"
            type="text"
            placeholder="Cari nama, mesin, aktivitas..."
            class="w-full h-8 pl-8 pr-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            @input="handleSearchInput"
          />
          <Search class="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { getWIBYearMonth } from '../../../utils/dateKeys'
import { Filter, RotateCcw, Search } from 'lucide-vue-next'

const props = defineProps({
  workGroups: {
    type: Array,
    default: () => []
  },
  shifts: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: Object,
    default: () => ({
      yearMonth: getWIBYearMonth(),
      groupId: 'ALL',
      shiftId: 'ALL',
      search: ''
    })
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const localFilters = reactive({
  yearMonth: props.modelValue.yearMonth || getWIBYearMonth(),
  groupId: props.modelValue.groupId || 'ALL',
  shiftId: props.modelValue.shiftId || 'ALL',
  search: props.modelValue.search || ''
})

const searchInput = ref(localFilters.search)
let debounceTimer = null

function handleSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    localFilters.search = searchInput.value
    emitUpdate()
  }, 300)
}

function emitUpdate() {
  emit('update:modelValue', { ...localFilters })
  emit('change', { ...localFilters })
}

function handleReset() {
  localFilters.yearMonth = getWIBYearMonth()
  localFilters.groupId = 'ALL'
  localFilters.shiftId = 'ALL'
  localFilters.search = ''
  searchInput.value = ''
  emitUpdate()
}
</script>
