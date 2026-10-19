<template>
  <div class="max-w-3xl mx-auto space-y-5">
    <!-- Header Halaman -->
    <div>
      <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Profil & Keamanan</div>
      <h1 class="text-[20px] font-semibold text-ink tracking-tight">Pengaturan Profil Pengguna</h1>
      <p class="text-xs text-ink-2 mt-0.5">Kelola identitas karyawan, foto profil teroptimasi WebP, dan keamanan akun Satoria Anda.</p>
    </div>

    <!-- Feedback Banner Notifikasi Global -->
    <div
      v-if="statusMessage.text"
      :class="[
        'p-3.5 rounded-lg text-xs font-medium border flex items-start gap-2.5 transition-all shadow-sm',
        statusMessage.type === 'success' ? 'bg-status-approved-bg text-status-approved-fg border-success/20' : 'bg-status-rejected-bg text-status-rejected-fg border-danger/20'
      ]"
    >
      <CheckCircle2 v-if="statusMessage.type === 'success'" class="w-4 h-4 shrink-0 mt-0.5 text-success" />
      <AlertCircle v-else class="w-4 h-4 shrink-0 mt-0.5 text-danger" />
      <div class="flex-1">
        <div class="font-semibold">{{ statusMessage.type === 'success' ? 'Berhasil' : 'Perhatian' }}</div>
        <div>{{ statusMessage.text }}</div>
      </div>
      <button @click="statusMessage.text = ''" class="text-ink-3 hover:text-ink text-xs font-bold px-1">&times;</button>
    </div>

    <!-- 1. KARTU FOTO PROFIL & IDENTITAS PENGGUNA -->
    <div class="bg-surface rounded-lg shadow-card border border-line p-5 space-y-5">
      <div class="flex items-center justify-between pb-3 border-b border-line">
        <h2 class="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
          <User class="w-4 h-4 text-primary" />
          Foto Profil & Identitas
        </h2>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
          <Sparkles class="w-3 h-3 text-primary" />
          Enterprise WebP Engine
        </span>
      </div>

      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <!-- Avatar Preview dengan Indikator Hover -->
        <div class="relative group shrink-0">
          <div class="w-20 h-20 rounded-full overflow-hidden ring-4 ring-slate-100 shadow-md bg-slate-100 flex items-center justify-center">
            <!-- Jika sedang ada preview gambar baru yang dipilih -->
            <img
              v-if="previewUrl"
              :src="previewUrl"
              alt="Preview Foto"
              class="w-full h-full object-cover"
            />
            <!-- Jika tidak, tampilkan avatar utama dari store -->
            <Avatar
              v-else
              :src="authStore.user?.photo_url"
              :name="authStore.user?.full_name"
              size="xl"
              class="w-20 h-20 text-lg"
            />
          </div>

          <!-- Quick Action Icon Overlay -->
          <button
            type="button"
            @click="triggerFileInput"
            title="Klik untuk memilih foto baru"
            class="absolute bottom-0 right-0 p-1.5 bg-primary hover:bg-blue-700 text-white rounded-full shadow-md transition-transform transform active:scale-95 border-2 border-surface"
          >
            <Camera class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Detail Identitas Pengguna -->
        <div class="space-y-1.5 flex-1">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h3 class="text-base font-semibold text-ink">{{ authStore.user?.full_name || 'Pengguna Satoria' }}</h3>
            <AppBadge :role="authStore.role" />
          </div>
          <div class="text-xs text-ink-2 font-mono flex items-center gap-2 flex-wrap">
            <span>{{ authStore.user?.email }}</span>
            <span class="text-ink-3">•</span>
            <span>NIK: {{ authStore.user?.nik || '-' }}</span>
          </div>

          <!-- Kontrol Aksi Upload & Hapus Foto -->
          <div class="pt-2 flex items-center gap-2 flex-wrap">
            <!-- Hidden File Input -->
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              class="hidden"
              @change="handleFileSelected"
            />

            <!-- Jika file baru dipilih dan belum disimpan -->
            <template v-if="selectedFile">
              <button
                type="button"
                :disabled="uploading"
                @click="uploadSelectedPhoto"
                class="h-8 px-3.5 rounded-md bg-primary hover:bg-blue-700 text-white text-xs font-medium transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Upload class="w-3.5 h-3.5" :class="{ 'animate-bounce': uploading }" />
                {{ uploading ? 'Mengonversi & Mengunggah...' : 'Simpan Foto Baru' }}
              </button>
              <button
                type="button"
                :disabled="uploading"
                @click="cancelSelectedPhoto"
                class="h-8 px-3 rounded-md border border-line bg-surface hover:bg-muted text-ink-2 hover:text-ink text-xs font-medium transition"
              >
                Batal
              </button>
            </template>

            <!-- Tampilan tombol default -->
            <template v-else>
              <button
                type="button"
                :disabled="uploading"
                @click="triggerFileInput"
                class="h-8 px-3 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-medium transition flex items-center gap-1.5"
              >
                <Camera class="w-3.5 h-3.5" />
                Pilih Foto
              </button>

              <button
                v-if="authStore.user?.photo_url"
                type="button"
                :disabled="uploading"
                @click="handleDeletePhoto"
                class="h-8 px-3 rounded-md border border-line bg-surface hover:bg-red-50 text-danger hover:border-red-200 text-xs font-medium transition flex items-center gap-1.5"
              >
                <Trash2 class="w-3.5 h-3.5" />
                Hapus Foto
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- Hasil Metrik Optimasi WebP (Muncul setelah upload sukses) -->
      <div
        v-if="optimizationMetrics"
        class="p-3.5 bg-blue-50/60 rounded-md border border-blue-200/70 text-xs space-y-1.5"
      >
        <div class="font-semibold text-primary flex items-center gap-1.5">
          <Sparkles class="w-3.5 h-3.5" />
          Hasil Optimasi Citra Satoria
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-ink-2 pt-1">
          <div class="bg-surface p-2 rounded border border-blue-100">
            <span class="block text-[10px] text-ink-3 uppercase">Format Awal</span>
            <span class="font-bold text-ink uppercase">{{ optimizationMetrics.originalFormat }}</span>
          </div>
          <div class="bg-surface p-2 rounded border border-blue-100">
            <span class="block text-[10px] text-ink-3 uppercase">Format Output</span>
            <span class="font-bold text-success uppercase">WebP (Optimal)</span>
          </div>
          <div class="bg-surface p-2 rounded border border-blue-100">
            <span class="block text-[10px] text-ink-3 uppercase">Ukuran File</span>
            <span class="font-bold text-ink">{{ formatBytes(optimizationMetrics.originalSize) }} &rarr; {{ formatBytes(optimizationMetrics.processedSize) }}</span>
          </div>
          <div class="bg-surface p-2 rounded border border-blue-100">
            <span class="block text-[10px] text-ink-3 uppercase">Efisiensi Bandwidth</span>
            <span class="font-bold text-primary">{{ optimizationMetrics.compressionRatio }} Lebih Ringan</span>
          </div>
        </div>
      </div>

      <!-- Informasi Panduan Foto -->
      <div class="p-3 bg-muted rounded-md border border-line text-[11px] text-ink-2 space-y-1">
        <div class="font-semibold text-ink flex items-center gap-1.5">
          <ShieldCheck class="w-3.5 h-3.5 text-primary" />
          Kriteria Foto & Pemrosesan Otomatis:
        </div>
        <p class="leading-relaxed">
          Mendukung format JPG, PNG, atau WebP (maksimal 10 MB). File akan otomatis di-orientasikan tegak (auto-rotate EXIF), dipotong simetris persegi (320&times;320 px), dan dikompresi ke format **WebP performa tinggi**.
        </p>
      </div>

      <!-- Informasi Lokasi Kerja & Kelompok -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
        <div class="p-3 bg-muted rounded-md border border-line">
          <span class="text-ink-3 block mb-0.5 text-[11px] uppercase font-medium">Penempatan Fasilitas</span>
          <span class="font-semibold text-ink">{{ authStore.user?.plant_name || 'Plant Pasuruan' }}</span>
        </div>
        <div class="p-3 bg-muted rounded-md border border-line">
          <span class="text-ink-3 block mb-0.5 text-[11px] uppercase font-medium">Kelompok Kerja (Work Group)</span>
          <span class="font-semibold text-ink">{{ authStore.user?.group_name || 'Engineering Group' }}</span>
        </div>
      </div>
    </div>

    <!-- 2. KARTU UBAH KATA SANDI -->
    <div class="bg-surface rounded-lg shadow-card border border-line p-5 space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-line">
        <h3 class="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
          <KeyRound class="w-4 h-4 text-primary" />
          Ubah Kata Sandi
        </h3>
      </div>
      
      <div
        v-if="pwdMessage.text"
        :class="[
          'p-3 rounded-md text-xs font-medium border',
          pwdMessage.type === 'success' ? 'bg-status-approved-bg text-status-approved-fg border-success/20' : 'bg-status-rejected-bg text-status-rejected-fg border-danger/20'
        ]"
      >
        {{ pwdMessage.text }}
      </div>

      <form @submit.prevent="handleChangePassword" class="space-y-3.5 text-xs">
        <div>
          <label class="block font-medium text-ink mb-1">Kata Sandi Saat Ini</label>
          <input
            v-model="pwdForm.oldPassword"
            type="password"
            required
            placeholder="••••••••"
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-medium text-ink mb-1">Kata Sandi Baru</label>
            <input
              v-model="pwdForm.newPassword"
              type="password"
              required
              placeholder="••••••••"
              class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label class="block font-medium text-ink mb-1">Konfirmasi Kata Sandi Baru</label>
            <input
              v-model="pwdForm.confirmPassword"
              type="password"
              required
              placeholder="••••••••"
              class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div class="pt-2 flex justify-end">
          <button
            type="submit"
            :disabled="pwdLoading"
            class="h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-medium transition shadow-card disabled:opacity-50 text-xs"
          >
            {{ pwdLoading ? 'Menyimpan...' : 'Perbarui Kata Sandi' }}
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
import Avatar from '../../components/common/Avatar.vue'
import {
  User,
  Camera,
  Upload,
  Trash2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound
} from 'lucide-vue-next'

const authStore = useAuthStore()

// State Foto Avatar
const fileInputRef = ref(null)
const selectedFile = ref(null)
const previewUrl = ref(null)
const uploading = ref(false)
const optimizationMetrics = ref(null)

// State Banner Notifikasi
const statusMessage = ref({ text: '', type: 'success' })

// State Password
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdMessage = ref({ text: '', type: 'success' })
const pwdLoading = ref(false)

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return

  // Validasi tipe file
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    statusMessage.value = {
      text: 'Format file tidak valid. Harap pilih gambar dengan ekstensi JPG, PNG, atau WebP.',
      type: 'error'
    }
    return
  }

  // Validasi ukuran file (maksimal 10MB)
  if (file.size > 10 * 1024 * 1024) {
    statusMessage.value = {
      text: 'Ukuran file terlalu besar (maksimal 10 MB).',
      type: 'error'
    }
    return
  }

  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
  statusMessage.value = { text: '', type: 'success' }
}

function cancelSelectedPhoto() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  selectedFile.value = null
  previewUrl.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

async function uploadSelectedPhoto() {
  if (!selectedFile.value) return

  uploading.value = true
  statusMessage.value = { text: '', type: 'success' }

  try {
    const res = await authService.uploadAvatar(selectedFile.value)
    
    // Update state store Pinia secara reaktif
    if (res?.photo_url) {
      authStore.updateUserAvatar(res.photo_url)
    }

    if (res?.optimization) {
      optimizationMetrics.value = res.optimization
    }

    statusMessage.value = {
      text: 'Foto profil berhasil diunggah, otomatis dikonversi ke WebP, dan siap ditampilkan di seluruh sistem!',
      type: 'success'
    }

    cancelSelectedPhoto()
  } catch (err) {
    statusMessage.value = {
      text: err.message || 'Gagal mengunggah foto profil.',
      type: 'error'
    }
  } finally {
    uploading.value = false
  }
}

async function handleDeletePhoto() {
  if (!confirm('Apakah Anda yakin ingin menghapus foto profil dan kembali menggunakan inisial nama?')) {
    return
  }

  uploading.value = true
  statusMessage.value = { text: '', type: 'success' }

  try {
    await authService.deleteAvatar()
    authStore.updateUserAvatar(null)
    optimizationMetrics.value = null

    statusMessage.value = {
      text: 'Foto profil berhasil dihapus.',
      type: 'success'
    }
  } catch (err) {
    statusMessage.value = {
      text: err.message || 'Gagal menghapus foto profil.',
      type: 'error'
    }
  } finally {
    uploading.value = false
  }
}

async function handleChangePassword() {
  if (pwdForm.value.newPassword !== pwdForm.value.confirmPassword) {
    pwdMessage.value = { text: 'Konfirmasi kata sandi baru tidak cocok.', type: 'error' }
    return
  }

  pwdLoading.value = true
  pwdMessage.value = { text: '', type: 'success' }

  try {
    const res = await authService.changePassword(pwdForm.value.oldPassword, pwdForm.value.newPassword)
    pwdMessage.value = { text: res.message || 'Kata sandi berhasil diperbarui!', type: 'success' }
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err) {
    pwdMessage.value = { text: err.message || 'Gagal mengubah kata sandi.', type: 'error' }
  } finally {
    pwdLoading.value = false
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
</script>
