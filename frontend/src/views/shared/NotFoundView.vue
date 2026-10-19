<template>
  <div class="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
    <div class="w-14 h-14 rounded-full bg-status-pending-bg text-warning flex items-center justify-center mb-4 text-2xl font-bold shadow-card">
      🔍
    </div>
    <h1 class="text-2xl font-semibold text-ink tracking-tight mb-2">404 - Halaman Tidak Ditemukan</h1>
    <p class="text-xs sm:text-sm text-ink-2 max-w-md mb-6 leading-relaxed">
      Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
    </p>
    <RouterLink
      to="/dashboard"
      class="h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm transition shadow-card inline-flex items-center justify-center"
    >
      Kembali ke Dashboard
    </RouterLink>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
