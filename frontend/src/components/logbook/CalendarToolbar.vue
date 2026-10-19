<template>
  <div class="h-14 px-4 border-b border-line flex items-center justify-between shrink-0 select-none bg-surface">
    <!-- Kiri: Hari Ini, Navigasi Panah, Judul Rentang -->
    <div class="flex items-center gap-2 sm:gap-3 min-w-0">
      <button
        type="button"
        class="h-8 px-3 rounded-md border border-line bg-surface text-ink text-xs font-medium hover:bg-muted active:bg-muted/80 transition"
        @click="$emit('today')"
      >
        Hari ini
      </button>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="w-8 h-8 rounded-md flex items-center justify-center text-ink-2 hover:bg-muted transition"
          aria-label="Rentang sebelumnya"
          @click="$emit('prev')"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          type="button"
          class="w-8 h-8 rounded-md flex items-center justify-center text-ink-2 hover:bg-muted transition"
          aria-label="Rentang berikutnya"
          @click="$emit('next')"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

      <h2 class="text-xs sm:text-sm md:text-base font-semibold text-ink truncate ml-1">
        {{ title }}
      </h2>
    </div>

    <!-- Kanan: Tombol Filter (di bawah 1280px) -->
    <div class="flex items-center gap-2">
      <!-- Tombol Buka Filter Drawer (< 1280px) -->
      <button
        type="button"
        class="xl:hidden h-8 px-2.5 rounded-md border border-line bg-surface text-ink-2 hover:text-ink hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition"
        aria-label="Buka filter"
        @click="$emit('openFilter')"
      >
        <SlidersHorizontal class="w-4 h-4" />
        <span class="hidden sm:inline">Filter</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-vue-next'

defineProps({
  title: {
    type: String,
    required: true
  }
})

defineEmits(['today', 'prev', 'next', 'openFilter', 'create'])
</script>
