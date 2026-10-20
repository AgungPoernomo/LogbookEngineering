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
    </div>

    <!-- Right Form Area -->
    <div class="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
      <div class="w-full max-w-md">
        <slot />
      </div>
    </div>
  </div>
</template>
