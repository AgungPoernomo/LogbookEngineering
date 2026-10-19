<template>
  <aside
    class="w-[248px] bg-surface rounded-lg shadow-card p-4 border border-line flex flex-col shrink-0 space-y-4 select-none"
    aria-label="Panel Perencanaan & Filter"
  >
    <!-- Mini Calendar -->
    <MiniCalendar
      :selected-date="selectedDate"
      @update:selected-date="$emit('update:selectedDate', $event)"
      @select="$emit('selectDate', $event)"
    />

    <!-- Filter Group: Status Logbook -->
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

    <!-- Filter Group: Shift -->
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
  </aside>
</template>

<script setup>
import MiniCalendar from './MiniCalendar.vue'
import FilterGroup from './FilterGroup.vue'
import FilterCheckbox from './FilterCheckbox.vue'

defineProps({
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

defineEmits(['create', 'update:selectedDate', 'selectDate'])
</script>
