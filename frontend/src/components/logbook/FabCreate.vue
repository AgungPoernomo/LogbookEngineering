<template>
  <button
    type="button"
    class="lg:hidden fixed bottom-20 right-4 sm:right-6 z-40 w-14 h-14 rounded-full bg-primary hover:bg-blue-700 active:bg-blue-800 text-white shadow-tooltip flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 select-none"
    aria-label="Buat Logbook"
    @click="$emit('create')"
  >
    <Plus class="w-6 h-6 stroke-[2.5]" />
  </button>
</template>

<script setup>
import { Plus } from 'lucide-vue-next'

defineEmits(['create'])
</script>
