<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Header -->
    <div>
      <div class="text-xs font-semibold text-brand-600 uppercase tracking-wider">Preferensi & Keamanan</div>
      <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Pengaturan Akun</h1>
      <p class="text-xs text-slate-500 mt-1">Kelola profil pengguna dan keamanan kata sandi akun Anda.</p>
    </div>

    <!-- User Profile Card -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      <div class="flex items-center gap-4 pb-6 border-b border-slate-100">
        <img
          :src="authStore.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80'"
          class="w-16 h-16 rounded-full object-cover ring-4 ring-brand-50"
        />
        <div>
          <h2 class="text-lg font-bold text-slate-800">{{ authStore.user?.name }}</h2>
          <div class="text-xs text-slate-500">{{ authStore.user?.email }}</div>
          <div class="mt-2 flex items-center gap-2">
            <AppBadge :role="authStore.role" />
            <span class="text-xs text-slate-400 font-mono">NIK: {{ authStore.user?.employeeNo || '-' }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span class="text-slate-400 block mb-0.5">Departemen</span>
          <span class="font-bold text-slate-800">{{ authStore.user?.department || 'Engineering' }}</span>
        </div>
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span class="text-slate-400 block mb-0.5">Nomor Telepon</span>
          <span class="font-bold text-slate-800">{{ authStore.user?.phone || '-' }}</span>
        </div>
      </div>
    </div>

    <!-- Change Password Card -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
      <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Ubah Kata Sandi</h3>
      
      <div v-if="pwdMessage.text" :class="['p-3 rounded-xl text-xs font-medium', pwdMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200']">
        {{ pwdMessage.text }}
      </div>

      <form @submit.prevent="handleChangePassword" class="space-y-4 text-xs">
        <div>
          <label class="block font-bold text-slate-700 mb-1">Kata Sandi Saat Ini</label>
          <input
            v-model="pwdForm.oldPassword"
            type="password"
            required
            placeholder="••••••••"
            class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Kata Sandi Baru</label>
            <input
              v-model="pwdForm.newPassword"
              type="password"
              required
              placeholder="••••••••"
              class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
            <input
              v-model="pwdForm.confirmPassword"
              type="password"
              required
              placeholder="••••••••"
              class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="pt-2 flex justify-end">
          <button
            type="submit"
            :disabled="loading"
            class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold transition shadow-sm disabled:opacity-50"
          >
            {{ loading ? 'Menyimpan...' : 'Perbarui Kata Sandi' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { authService } from '../../services/authService'
import AppBadge from '../../components/common/AppBadge.vue'

const authStore = useAuthStore()

const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdMessage = ref({ text: '', type: 'success' })
const loading = ref(false)

async function handleChangePassword() {
  if (pwdForm.value.newPassword !== pwdForm.value.confirmPassword) {
    pwdMessage.value = { text: 'Konfirmasi kata sandi baru tidak cocok', type: 'error' }
    return
  }

  loading.value = true
  pwdMessage.value = { text: '', type: 'success' }

  try {
    const res = await authService.changePassword(pwdForm.value.oldPassword, pwdForm.value.newPassword)
    pwdMessage.value = { text: res.message || 'Kata sandi berhasil diubah!', type: 'success' }
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err) {
    pwdMessage.value = { text: err.message || 'Gagal mengubah kata sandi', type: 'error' }
  } finally {
    loading.value = false
  }
}
</script>
