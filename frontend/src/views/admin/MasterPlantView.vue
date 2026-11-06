<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Konfigurasi Fasilitas Satoria</div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">Master Line Pabrik</h1>
        <p class="text-xs text-ink-2 mt-0.5">Kelola data seluruh unit fasilitas manufaktur dan line operasional Satoria Group.</p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm transition shadow-card"
        @click="openAddModal"
      >
        <span>+ Tambah Line Baru</span>
      </button>
    </div>

    <!-- F1.2: Indikator data offline (cache lokal) -->
    <div
      v-if="masterStore.isOffline"
      class="p-2.5 rounded-md bg-status-pending-bg border border-warning/20 text-status-pending-fg text-xs flex items-center gap-2"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-status-pending-dot animate-pulse" />
      <span>{{ masterStore.cacheStatusText }}</span>
    </div>

    <!-- Stats Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="bg-surface p-4 rounded-lg border border-line shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center text-primary font-semibold text-lg">
          🏢
        </div>
        <div>
          <div class="text-xs text-ink-2 font-medium">Total Line Satoria</div>
          <div class="text-lg font-bold text-ink">{{ masterStore.plants.length }} Line</div>
        </div>
      </div>

      <div class="bg-surface p-4 rounded-lg border border-line shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-status-approved-bg flex items-center justify-center text-status-approved-fg font-semibold text-lg">
          ✅
        </div>
        <div>
          <div class="text-xs text-ink-2 font-medium">Line Operasional Aktif</div>
          <div class="text-lg font-bold text-ink">{{ activePlantsCount }} Line</div>
        </div>
      </div>

      <div class="bg-surface p-4 rounded-lg border border-line shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-ink-2 font-semibold text-lg">
          ⚙️
        </div>
        <div>
          <div class="text-xs text-ink-2 font-medium">Total Mesin Terhubung</div>
          <div class="text-lg font-bold text-ink">{{ masterStore.machines.length }} Mesin</div>
        </div>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-surface p-3 rounded-lg border border-line shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2 flex-1 max-w-md">
        <div class="relative w-full">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama line..."
            class="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-line bg-surface text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary"
          />
          <span class="absolute left-2.5 top-2 text-ink-3 text-xs">🔍</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-xs text-ink-2 font-medium">Status:</label>
        <select
          v-model="statusFilter"
          class="h-8 px-2.5 text-xs rounded-md border border-line bg-surface text-ink focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Dinonaktifkan</option>
        </select>
      </div>
    </div>

    <!-- Data Table Card -->
    <div class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[13px] border-collapse min-w-[650px]">
          <thead class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-3">Kode Plant</th>
              <th class="px-4 py-3">Nama Fasilitas Plant</th>
              <th class="px-4 py-3">Mesin Terdaftar</th>
              <th class="px-4 py-3">Status Penggunaan</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr
              v-for="plant in filteredPlants"
              :key="plant.id"
              class="hover:bg-muted/40 transition-colors"
            >
              <td class="px-4 py-3 font-mono text-xs font-semibold text-primary">
                {{ plant.code || `PLANT-0${plant.id}` }}
              </td>
              <td class="px-4 py-3 font-semibold text-ink">
                {{ plant.name }}
              </td>
              <td class="px-4 py-3 text-xs">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-ink">
                  ⚙️ {{ getPlantMachineCount(plant.id) }} Mesin
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium leading-none',
                    plant.isActive !== false ? 'bg-status-approved-bg text-status-approved-fg' : 'bg-status-draft-bg text-status-draft-fg'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', plant.isActive !== false ? 'bg-status-approved-dot' : 'bg-status-draft-dot']" />
                  {{ plant.isActive !== false ? 'Aktif' : 'Dinonaktifkan' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                    @click="openEditModal(plant)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    :class="[
                      'h-7 px-2.5 rounded-md text-xs font-medium transition',
                      plant.isActive !== false ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10'
                    ]"
                    @click="toggleActiveStatus(plant)"
                  >
                    {{ plant.isActive !== false ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredPlants.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-xs text-ink-3">
                Tidak ada data plant yang sesuai filter.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form (Tambah/Edit Plant) -->
    <AppModal
      :is-open="isModalOpen"
      :title="editingId ? 'Edit Data Plant' : 'Tambah Data Plant Baru'"
      @close="isModalOpen = false"
    >
      <form @submit.prevent="savePlant" class="space-y-3.5 text-xs">
        <div>
          <label class="block font-medium text-ink mb-1">
            Kode Plant <span class="text-danger">*</span>
          </label>
          <input
            v-model="modalForm.code"
            type="text"
            required
            placeholder="Contoh: PLANT-01"
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium font-mono text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">
            Nama Line / Fasilitas <span class="text-danger">*</span>
          </label>
          <input
            v-model="modalForm.name"
            type="text"
            required
            placeholder="Contoh: Line 1 - Satoria Pharma Pasuruan"
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div class="pt-3 flex justify-end gap-2 border-t border-line">
          <button
            type="button"
            class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
            @click="isModalOpen = false"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="h-8 px-4 rounded-md bg-primary hover:bg-blue-700 text-white font-medium text-xs transition shadow-card disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSubmitting ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Tambah Line') }}
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMasterStore } from '../../stores/master'
import { alert } from '../../utils/alert'
import AppModal from '../../components/common/AppModal.vue'

const masterStore = useMasterStore()

const isModalOpen = ref(false)
const editingId = ref(null)
const searchQuery = ref('')
const statusFilter = ref('all')
const modalForm = ref({ name: '', code: '' })
const isSubmitting = ref(false)

onMounted(async () => {
  await masterStore.fetchAll()
})

const activePlantsCount = computed(() => {
  return masterStore.plants.filter(p => p.isActive !== false).length
})

function getPlantMachineCount(plantId) {
  return masterStore.machines.filter(m => m.plant_id === plantId).length
}

const filteredPlants = computed(() => {
  let list = masterStore.plants || []

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q))
    )
  }

  if (statusFilter.value === 'active') {
    list = list.filter(p => p.isActive !== false)
  } else if (statusFilter.value === 'inactive') {
    list = list.filter(p => p.isActive === false)
  }

  return list
})

function openAddModal() {
  editingId.value = null
  modalForm.value = {
    name: '',
    code: `PLANT-0${(masterStore.plants.length || 0) + 1}`
  }
  isModalOpen.value = true
}

function openEditModal(plant) {
  editingId.value = plant.id
  modalForm.value = {
    name: plant.name,
    code: plant.code || `PLANT-0${plant.id}`
  }
  isModalOpen.value = true
}

async function savePlant() {
  if (isSubmitting.value) return

  // Validasi field wajib (F1.3: SweetAlert, bukan banner inline)
  if (!String(modalForm.value.name || '').trim()) {
    await alert.error('Data Belum Lengkap', 'Nama line pabrik wajib diisi.')
    return
  }

  if (!String(modalForm.value.code || '').trim()) {
    await alert.error('Data Belum Lengkap', 'Kode line pabrik wajib diisi.')
    return
  }

  // F1.3: konfirmasi sebelum menyimpan line
  const isConfirmed = await alert.confirm(
    editingId.value ? 'Simpan Perubahan Line?' : 'Tambah Line Baru?',
    editingId.value
      ? `Perubahan data line "${modalForm.value.name}" akan disimpan.`
      : `Line baru "${modalForm.value.name}" akan ditambahkan.`,
    editingId.value ? 'Ya, simpan' : 'Ya, tambah'
  )
  if (!isConfirmed) return

  isSubmitting.value = true
  try {
    if (editingId.value) {
      await masterStore.updateItem('plants', editingId.value, modalForm.value)
    } else {
      await masterStore.addItem('plants', modalForm.value)
    }
    masterStore.invalidate()
    await masterStore.fetchAll(true)
    isModalOpen.value = false
    await alert.success('Berhasil', editingId.value ? 'Data line berhasil diperbarui.' : 'Line baru berhasil ditambahkan.')
  } catch (err) {
    await alert.error('Gagal Menyimpan Line', err.message || 'Terjadi kesalahan saat menyimpan data line.')
  } finally {
    isSubmitting.value = false
  }
}

async function toggleActiveStatus(plant) {
  // F1.3: konfirmasi sebelum mengubah status aktif line
  const isConfirmed = await alert.confirm(
    plant.isActive === false ? 'Aktifkan Line?' : 'Nonaktifkan Line?',
    `Line "${plant.name}" akan ${plant.isActive === false ? 'diaktifkan' : 'dinonaktifkan'}.`
  )
  if (!isConfirmed) return
  try {
    await masterStore.toggleActive('plants', plant.id)
    masterStore.invalidate()
    await masterStore.fetchAll(true)
  } catch (err) {
    await alert.error('Gagal Mengubah Status', err.message || 'Gagal mengubah status aktif line.')
  }
}
</script>
