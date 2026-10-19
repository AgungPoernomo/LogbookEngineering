<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <div class="text-xs font-semibold text-brand-600 uppercase tracking-wider">Formulir Log Harian</div>
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Input Log Aktivitas Engineering</h1>
        <p class="text-xs text-slate-500 mt-1">Catat aktivitas perawatan, perbaikan, kalibrasi, dan utilitas pabrik farmasi.</p>
      </div>

      <RouterLink
        to="/log/riwayat"
        class="text-xs font-semibold text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
      >
        ← Riwayat Log Saya
      </RouterLink>
    </div>

    <!-- Alert Success / Error -->
    <div
      v-if="feedback.message"
      :class="[
        'p-4 rounded-xl text-sm flex items-start gap-3 transition-all',
        feedback.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
      ]"
    >
      <span class="text-lg">{{ feedback.type === 'success' ? '✅' : '⚠️' }}</span>
      <div class="flex-1">
        <div class="font-bold">{{ feedback.title }}</div>
        <div>{{ feedback.message }}</div>
      </div>
    </div>

    <!-- Main Input Form Card -->
    <form @submit.prevent="handleSubmit(true)" class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
      <!-- Section 1: Metadata Waktu & Shift -->
      <div>
        <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
          <span>🕒</span>
          <span>1. Waktu & Shift Kerja</span>
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tanggal Pekerjaan <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.logDate"
              type="date"
              required
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Shift Kerja <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="form.shift"
              required
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50/50"
            >
              <option value="Shift 1 (07:00 - 15:00)">Shift 1 (07:00 - 15:00) Pagi</option>
              <option value="Shift 2 (15:00 - 23:00)">Shift 2 (15:00 - 23:00) Siang</option>
              <option value="Shift 3 (23:00 - 07:00)">Shift 3 (23:00 - 07:00) Malam</option>
              <option value="Non-Shift (08:00 - 17:00)">Non-Shift / General Office</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jam Mulai <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="form.startTime"
                type="time"
                required
                class="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50/50"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jam Selesai <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="form.endTime"
                type="time"
                required
                class="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50/50"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: Klasifikasi & Lokasi Fasilitas -->
      <div>
        <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
          <span>⚙️</span>
          <span>2. Lokasi, Peralatan & Klasifikasi Pekerjaan</span>
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Lokasi / Area Fasilitas <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="form.locationId"
              required
              @change="handleLocationChange"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50/50"
            >
              <option :value="null" disabled>Pilih Area Fasilitas</option>
              <option v-for="loc in validasiStore.locations" :key="loc.id" :value="loc.id">
                {{ loc.name }} ({{ loc.code }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Peralatan / Unit Terkait <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="form.equipmentId"
              required
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50/50"
            >
              <option :value="null" disabled>Pilih Unit Peralatan</option>
              <option v-for="eq in filteredEquipments" :key="eq.id" :value="eq.id">
                {{ eq.name }} ({{ eq.code }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kategori Pekerjaan <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="form.categoryId"
              required
              @change="handleCategoryChange"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50/50"
            >
              <option :value="null" disabled>Pilih Kategori</option>
              <option v-for="cat in validasiStore.categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Jenis Aktivitas Spesifik <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="form.activityTypeId"
              required
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50/50"
            >
              <option :value="null" disabled>Pilih Jenis Aktivitas</option>
              <option v-for="act in filteredActivities" :key="act.id" :value="act.id">
                {{ act.name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Section 3: Rincian Pekerjaan & Hasil -->
      <div>
        <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
          <span>📝</span>
          <span>3. Deskripsi & Hasil Pekerjaan</span>
        </h2>
        <div class="space-y-4 mt-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Deskripsi Detail Pekerjaan Lapangan <span class="text-rose-500">*</span>
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              required
              placeholder="Contoh: Pembersihan filter udara AHU-01, pemeriksaan arus motor 14.5A, penggantian v-belt tipe B-65 baru..."
              class="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50/50"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hasil / Status Akhir Pekerjaan <span class="text-rose-500">*</span>
              </label>
              <select
                v-model="form.resultStatus"
                required
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50/50"
              >
                <option v-for="res in validasiStore.resultStatuses" :key="res" :value="res">
                  {{ res }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Catatan Tambahan / Rekomendasi (Opsional)
              </label>
              <input
                v-model="form.notes"
                type="text"
                placeholder="Nomor SPK, part number cadangan, atau catatan shift..."
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50/50"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
        <button
          type="button"
          :disabled="submitting"
          @click="handleSubmit(false)"
          class="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition disabled:opacity-50"
        >
          Simpan sebagai Draft
        </button>
        <button
          type="submit"
          :disabled="submitting"
          class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-sm transition shadow-lg shadow-brand-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg v-if="submitting" class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>Kirim untuk Approval Atasan</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useLogStore } from '../../stores/log'
import { useValidasiStore } from '../../stores/validasi'

const router = useRouter()
const authStore = useAuthStore()
const logStore = useLogStore()
const validasiStore = useValidasiStore()

const submitting = ref(false)
const feedback = ref({ title: '', message: '', type: 'success' })

const form = ref({
  logDate: new Date().toISOString().substring(0, 10),
  shift: 'Shift 1 (07:00 - 15:00)',
  startTime: '08:00',
  endTime: '11:00',
  locationId: 1,
  equipmentId: 2,
  categoryId: 1,
  activityTypeId: 1,
  description: '',
  resultStatus: 'Pekerjaan Selesai Normal',
  notes: ''
})

onMounted(async () => {
  await validasiStore.fetchAll()
  if (validasiStore.locations.length > 0 && !form.value.locationId) {
    form.value.locationId = validasiStore.locations[0].id
  }
  if (validasiStore.categories.length > 0 && !form.value.categoryId) {
    form.value.categoryId = validasiStore.categories[0].id
  }
})

const filteredEquipments = computed(() => {
  if (!form.value.locationId) return validasiStore.equipments
  const matches = validasiStore.equipments.filter(e => e.locationId === form.value.locationId)
  return matches.length > 0 ? matches : validasiStore.equipments
})

const filteredActivities = computed(() => {
  if (!form.value.categoryId) return validasiStore.activityTypes
  const matches = validasiStore.activityTypes.filter(a => a.categoryId === form.value.categoryId)
  return matches.length > 0 ? matches : validasiStore.activityTypes
})

function handleLocationChange() {
  const firstMatch = filteredEquipments.value[0]
  if (firstMatch) {
    form.value.equipmentId = firstMatch.id
  }
}

function handleCategoryChange() {
  const firstMatch = filteredActivities.value[0]
  if (firstMatch) {
    form.value.activityTypeId = firstMatch.id
  }
}

async function handleSubmit(isSubmitForApproval) {
  if (!form.value.description.trim()) {
    feedback.value = {
      title: 'Validasi Gagal',
      message: 'Deskripsi pekerjaan lapangan wajib diisi.',
      type: 'error'
    }
    return
  }

  submitting.value = true
  feedback.value = { title: '', message: '', type: 'success' }

  try {
    const loc = validasiStore.locations.find(l => l.id === form.value.locationId)
    const eq = validasiStore.equipments.find(e => e.id === form.value.equipmentId)
    const cat = validasiStore.categories.find(c => c.id === form.value.categoryId)
    const act = validasiStore.activityTypes.find(a => a.id === form.value.activityTypeId)

    const payload = {
      ...form.value,
      locationName: loc?.name || 'Area Umum',
      equipmentName: eq?.name || 'Unit Mesin',
      categoryName: cat?.name || 'Maintenance',
      activityTypeName: act?.name || 'Aktivitas Harian',
      submit: isSubmitForApproval
    }

    await logStore.createLog(payload, authStore.user)

    feedback.value = {
      title: isSubmitForApproval ? 'Log Berhasil Dikirim!' : 'Draft Log Tersimpan!',
      message: isSubmitForApproval
        ? 'Aktivitas telah dikirim ke antrean approval Admin & SPV.'
        : 'Data tersimpan sebagai draft dan dapat diedit kembali kapan saja.',
      type: 'success'
    }

    if (isSubmitForApproval) {
      form.value.description = ''
      form.value.notes = ''
    }
  } catch (err) {
    feedback.value = {
      title: 'Gagal Menyimpan Log',
      message: err.message || 'Terjadi kesalahan sistem.',
      type: 'error'
    }
  } finally {
    submitting.value = false
  }
}
</script>
