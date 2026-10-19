<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-hidden xl:hidden" role="dialog" aria-modal="true" aria-label="Filter Kalender Logbook">
    <!-- Overlay -->
    <div
      class="fixed inset-0 bg-ink/30 backdrop-blur-[1px] transition-opacity"
      @click="$emit('close')"
    />

    <!-- Drawer Panel Slide From Left -->
    <div class="fixed inset-y-0 left-0 max-w-full flex pr-10">
      <div class="w-[280px] bg-surface shadow-tooltip flex flex-col p-4 space-y-4 overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-line">
          <h2 class="text-sm font-semibold text-ink">
            Navigasi & Filter
          </h2>
          <button
            type="button"
            class="w-7 h-7 rounded-md flex items-center justify-center text-ink-2 hover:bg-muted transition"
            aria-label="Tutup filter"
            @click="$emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Mini Calendar -->
        <MiniCalendar
          :selected-date="selectedDate"
          @update:selected-date="$emit('update:selectedDate', $event)"
          @select="$emit('selectDate', $event); $emit('close')"
        />

        <!-- Filter Status -->
        <FilterGroup title="Status Logbook">
          <FilterCheckbox
            v-model="filters.status.DRAFT"
            label="Draft"
            color-class="bg-status-draft-dot"
          />
          <FilterCheckbox
            v-model="filters.status.PENDING"
            label="Pending"
            color-class="bg-status-pending-dot"
          />
          <FilterCheckbox
            v-model="filters.status.APPROVED"
            label="Approved"
            color-class="bg-status-approved-dot"
          />
          <FilterCheckbox
            v-model="filters.status.REJECTED"
            label="Rejected"
            color-class="bg-status-rejected-dot"
          />
          <FilterCheckbox
            v-model="filters.status.CANCELLED"
            label="Cancelled"
            color-class="bg-status-cancelled-dot"
          />
        </FilterGroup>

        <!-- Filter Shift -->
        <FilterGroup title="Shift">
          <FilterCheckbox
            v-for="s in shifts"
            :key="s.id"
            v-model="filters.shifts[s.id]"
            :label="s.name"
            :sublabel="`${s.start_time} - ${s.end_time}`"
            color-class="bg-primary"
          />
        </FilterGroup>
      </div>
    </div>
  </div>
</template>

<script setup>
import { X } from 'lucide-vue-next'
import MiniCalendar from './MiniCalendar.vue'
import FilterGroup from './FilterGroup.vue'
import FilterCheckbox from './FilterCheckbox.vue'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  selectedDate: {
    type: String,
    required: true
  },
  filters: {
    type: Object,
    required: true
  },
  shifts: {
    type: Array,
    default: () => []
  }
})

defineEmits(['close', 'update:selectedDate', 'selectDate'])
</script>
