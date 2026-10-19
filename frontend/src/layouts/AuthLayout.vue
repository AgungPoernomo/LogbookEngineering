<template>
  <div class="min-h-screen flex flex-col md:flex-row bg-app">
    <!-- Left Hero Section (Satoria Engineering Branding) -->
    <div class="hidden md:flex md:w-1/2 lg:w-5/12 bg-ink text-white p-8 lg:p-12 flex-col justify-between relative overflow-hidden">
      <!-- Ambient Glow Effects -->
      <div class="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute -bottom-32 -right-32 w-96 h-96 bg-success/15 rounded-full blur-3xl pointer-events-none" />

      <!-- Top Branding -->
      <div class="relative z-10">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white shadow-card">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-tight text-white leading-tight">Engineer Logbook Satoria</h1>
            <p class="text-xs font-medium text-primary-soft tracking-wider uppercase">Operational Excellence Portal</p>
          </div>
        </div>
      </div>

      <!-- Center Highlights -->
      <div class="relative z-10 my-10 space-y-6">
        <div>
          <span class="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium bg-primary/20 text-primary-soft border border-primary/30 mb-4">
            Tahap 1 • UI & Prototipe RBAC
          </span>
          <h2 class="text-2xl sm:text-3xl font-semibold leading-tight text-white mb-3">
            Digitalisasi Pencatatan & Validasi Aktivitas Teknisi
          </h2>
          <p class="text-xs sm:text-sm text-ink-3 leading-relaxed">
            Meningkatkan akurasi pemeliharaan mesin pabrik, mempermudah kalkulasi durasi kerja teknisi, serta mempercepat proses persetujuan oleh Supervisor di lingkungan Satoria.
          </p>
        </div>

        <div class="space-y-3 pt-2 text-xs sm:text-sm text-white/90">
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded-full bg-success/20 text-success flex items-center justify-center font-bold text-xs shrink-0">
              ✓
            </div>
            <span>Kalkulasi durasi otomatis (mendukung shift malam lintas hari)</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded-full bg-success/20 text-success flex items-center justify-center font-bold text-xs shrink-0">
              ✓
            </div>
            <span>Alur approval supervisor dengan catatan revisi wajib</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded-full bg-success/20 text-success flex items-center justify-center font-bold text-xs shrink-0">
              ✓
            </div>
            <span>Ekspor rekapitulasi laporan tim ke PDF dan Excel</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded-full bg-success/20 text-success flex items-center justify-center font-bold text-xs shrink-0">
              ✓
            </div>
            <span>Audit trail aktivitas dan manajemen master data terpusat</span>
          </div>
        </div>
      </div>

      <!-- Bottom Credits -->
      <div class="relative z-10 text-xs text-ink-3 flex items-center justify-between border-t border-line/20 pt-4">
        <span>© 2026 Engineer Logbook Satoria</span>
        <span class="text-primary-soft font-medium">TiDB SQL • Vercel Ready</span>
      </div>
    </div>

    <!-- Right Form Area -->
    <div class="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </div>
  </div>
</template>
