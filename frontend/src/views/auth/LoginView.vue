<template>
  <div class="bg-surface rounded-lg shadow-card p-6 sm:p-8 border border-line space-y-6">
    <!-- Header -->
    <div class="space-y-1.5 text-center md:text-left">
      <div class="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-sm text-xs font-medium bg-primary-soft text-primary-text-on-soft">
        <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Sistem Masuk Satoria
      </div>
      <h2 class="text-xl sm:text-2xl font-semibold text-ink tracking-tight">
        Selamat Datang
      </h2>
      <p class="text-xs sm:text-sm text-ink-2">
        Silakan masuk menggunakan NIK atau Email Satoria Anda.
      </p>
    </div>

    <!-- Error Alert -->
    <div
      v-if="errorMessage"
      class="p-3.5 rounded-md bg-status-rejected-bg border border-danger/20 text-status-rejected-fg text-xs flex items-start gap-2.5"
      role="alert"
    >
      <svg class="w-4 h-4 shrink-0 text-danger mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <div class="font-semibold">Gagal Masuk</div>
        <div>{{ errorMessage }}</div>
      </div>
    </div>

    <!-- Login Form -->
    <form @submit.prevent="handleLogin" class="space-y-4">
      <div>
        <label for="identifier" class="block text-xs font-medium text-ink mb-1.5">
          NIK atau Alamat Email Satoria
        </label>
        <div class="relative">
          <input
            id="identifier"
            v-model="form.identifier"
            type="text"
            required
            placeholder="2024-TKN-001 atau nama@satoria.co.id"
            class="w-full h-10 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder:text-ink-3 placeholder:font-normal"
          />
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label for="password" class="block text-xs font-medium text-ink">
            Kata Sandi
          </label>
          <span class="text-xs text-primary hover:underline cursor-pointer">
            Lupa sandi?
          </span>
        </div>
        <div class="relative">
          <input
            id="password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            required
            placeholder="••••••••"
            class="w-full h-10 pl-3 pr-10 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder:text-ink-3 placeholder:font-normal"
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-3 hover:text-ink"
            aria-label="Tampilkan sandi"
            @click="showPassword = !showPassword"
          >
            <svg v-if="!showPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
            </svg>
          </button>
        </div>
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full h-10 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm transition shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <svg v-if="loading" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span>{{ loading ? 'Memverifikasi...' : 'Masuk ke Portal Satoria' }}</span>
      </button>
    </form>

    <!-- Preset Demo Accounts Divider -->
    <div class="relative my-4">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-line" />
      </div>
      <div class="relative flex justify-center text-xs uppercase">
        <span class="bg-surface px-3 text-ink-3 font-medium tracking-wider">
          Pilihan Akun Demo Satoria (Fase 1)
        </span>
      </div>
    </div>

    <!-- Quick Demo Role Selectors -->
    <div class="space-y-2">
      <button
        v-for="item in demoAccounts"
        :key="item.role"
        type="button"
        class="w-full flex items-center justify-between p-2.5 rounded-md border border-line bg-surface hover:bg-muted transition text-left group"
        @click="fillAndLogin(item)"
      >
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-primary-soft text-primary font-semibold flex items-center justify-center text-xs shrink-0">
            {{ item.role[0] }}
          </div>
          <div>
            <div class="text-xs font-semibold text-ink flex items-center gap-1.5">
              <span>{{ item.roleLabel }}</span>
              <span class="text-[10px] font-normal text-ink-3">({{ item.identifier }})</span>
            </div>
            <div class="text-[11px] text-ink-2">{{ item.name }} • {{ item.dept }}</div>
          </div>
        </div>
        <div class="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          Pilih →
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { ROLES } from '../../constants/roles'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({
  identifier: 'teknisi@satoria.co.id',
  password: 'password123'
})
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const demoAccounts = [
  {
    role: ROLES.TEKNISI,
    roleLabel: 'Teknisi Lapangan',
    name: 'Budi Santoso',
    dept: 'Maintenance & Utility',
    identifier: 'teknisi@satoria.co.id',
    password: 'password123'
  },
  {
    role: ROLES.SUPERVISOR,
    roleLabel: 'Supervisor Engineering',
    name: 'Ir. Hendra Gunawan',
    dept: 'Supervision & Approval',
    identifier: 'spv@satoria.co.id',
    password: 'password123'
  },
  {
    role: ROLES.ADMIN,
    roleLabel: 'Administrator Satoria',
    name: 'Agung Prasetyo',
    dept: 'System & Master Data Admin',
    identifier: 'admin@satoria.co.id',
    password: 'password123'
  }
]

async function handleLogin() {
  loading.value = true
  errorMessage.value = ''
  try {
    await authStore.login(form.value.identifier, form.value.password)
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  } catch (err) {
    errorMessage.value = err.message || 'Login gagal, periksa NIK/Email dan kata sandi.'
  } finally {
    loading.value = false
  }
}

async function fillAndLogin(item) {
  form.value.identifier = item.identifier
  form.value.password = item.password
  await handleLogin()
}
</script>
