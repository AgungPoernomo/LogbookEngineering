<template>
  <div
    class="h-full flex-1 min-w-0 min-h-0 bg-surface rounded-lg shadow-card border border-line flex flex-col overflow-hidden"
  >
    <!-- Toolbar -->
    <CalendarToolbar
      :title="toolbarTitle"
      @today="$emit('today')"
      @prev="$emit('prev')"
      @next="$emit('next')"
      @open-filter="$emit('openFilter')"
      @create="$emit('create')"
    />

    <!-- Header Hari (Lengket: selalu di atas area scroll) -->
    <WeekHeader :days="days" />

    <!-- Baris Ringkasan Harian (Lengket: selalu di atas area scroll) -->
    <DaySummaryRow
      :days="days"
      @open-edit="$emit('openEdit', $event)"
    />

    <!-- Grid Waktu 24 Jam (mengisi sisa tinggi card & scroll internal) -->
    <TimeGrid
      :days="days"
      :loading="loading"
      :is-empty="isEmpty"
      :all-filters-disabled="allFiltersDisabled"
      :has-today="hasToday"
      :selected-logbook-id="selectedLogbookId"
      :aria-label="`Kalender logbook, ${toolbarTitle}`"
      @create-slot="$emit('create-slot', $event)"
      @click-block="$emit('click-block', $event)"
    />
  </div>
</template>

<script setup>
import CalendarToolbar from './CalendarToolbar.vue'
import WeekHeader from './WeekHeader.vue'
import DaySummaryRow from './DaySummaryRow.vue'
import TimeGrid from './TimeGrid.vue'

defineProps({
  days: {
    type: Array,
    required: true
  },
  toolbarTitle: {
    type: String,
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
  }
})

defineEmits(['today', 'prev', 'next', 'openFilter', 'create', 'create-slot', 'click-block', 'openEdit'])
</script>
