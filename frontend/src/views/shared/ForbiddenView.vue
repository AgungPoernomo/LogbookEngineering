<template>
  <div class="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
    <div class="w-14 h-14 rounded-full bg-status-rejected-bg text-danger flex items-center justify-center mb-4 text-2xl font-bold shadow-card">
      🚫
    </div>
    <h1 class="text-2xl font-semibold text-ink tracking-tight mb-2">403 - Akses Ditolak</h1>
    <p class="text-xs sm:text-sm text-ink-2 max-w-md mb-6 leading-relaxed">
      Peran Anda saat ini (<span class="font-medium text-ink">{{ authStore.role || 'Guest' }}</span>) tidak memiliki izin untuk mengakses halaman ini.
    </p>
    <div class="flex items-center gap-3">
      <RouterLink
        to="/dashboard"
        class="h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm transition shadow-card inline-flex items-center justify-center"
      >
        Kembali ke Dashboard
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
</script>
