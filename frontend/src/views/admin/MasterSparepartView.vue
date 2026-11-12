<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Katalog Suku Cadang & Bahan Workshop</div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">Master Sparepart</h1>
        <p class="text-xs text-ink-2 mt-0.5">
          Kelola katalog Suku Cadang Mesin dan Bahan Habis Pakai yang muncul di dropdown form input teknisi.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm transition shadow-card"
        @click="openAddModal"
      >
        <span>+ Tambah Sparepart</span>
      </button>
    </div>

    <!-- Ringkasan katalog (jumlah data, bukan peringkat/leaderboard) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="bg-surface p-4 rounded-lg border border-line shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center text-primary text-lg">
          🧰
        </div>
        <div>
          <div class="text-xs text-ink-2 font-medium">Total Katalog</div>
          <div class="text-lg font-bold text-ink">{{ items.length }} Part</div>
        </div>
      </div>

      <div class="bg-surface p-4 rounded-lg border border-line shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-status-approved-bg flex items-center justify-center text-status-approved-fg text-lg">
          ✅
        </div>
        <div>
          <div class="text-xs text-ink-2 font-medium">Part Aktif</div>
          <div class="text-lg font-bold text-ink">{{ activeCount }} Part</div>
        </div>
      </div>

      <div class="bg-surface p-4 rounded-lg border border-line shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-ink-2 text-lg">
          ⚙️
        </div>
        <div>
          <div class="text-xs text-ink-2 font-medium">Suku Cadang Mesin</div>
          <div class="text-lg font-bold text-ink">{{ machinePartCount }} Part</div>
        </div>
      </div>
    </div>

    <!-- Filter Tipe (Tab) -->
    <div class="flex items-center gap-1 border-b border-line overflow-x-auto pb-0.5">
      <button
        v-for="tab in typeTabs"
        :key="tab.value"
        type="button"
        :class="[
          'px-4 py-2.5 text-xs transition-colors border-b-2 -mb-px flex items-center gap-2 shrink-0',
          typeFilter === tab.value
            ? 'border-primary text-primary bg-primary-soft/40 font-semibold rounded-t-md'
            : 'border-transparent text-ink-2 hover:text-ink font-medium'
        ]"
        @click="setTypeFilter(tab.value)"
      >
        <span>{{ tab.emoji }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- Search & Status Toolbar -->
    <div class="bg-surface p-3 rounded-lg border border-line shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 flex-1">
        <div class="relative w-full sm:w-72">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama, kode part, atau spesifikasi..."
            class="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-line bg-surface text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary"
          />
          <span class="absolute left-2.5 top-2 text-ink-3 text-xs">🔍</span>
        </div>
        <p class="text-[11px] text-ink-3">Pencarian & filter tipe diproses di server (satu query).</p>
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
        <button
          type="button"
          class="h-8 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isLoading"
          @click="loadSpareparts"
        >
          {{ isLoading ? 'Memuat…' : 'Muat Ulang' }}
        </button>
      </div>
    </div>

    <!-- Tabel Sparepart -->
    <div class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <!-- Loading skeleton -->
      <div v-if="isLoading" class="animate-pulse divide-y divide-line">
        <div v-for="n in 5" :key="`sk-${n}`" class="px-4 py-4 flex items-center gap-4">
          <div class="h-3.5 bg-muted rounded w-24" />
          <div class="h-3.5 bg-muted rounded w-1/3" />
          <div class="h-3.5 bg-muted rounded w-32" />
          <div class="h-3.5 bg-muted rounded w-28 ml-auto" />
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-[13px] border-collapse min-w-[880px]">
          <thead class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-3">Kode Part</th>
              <th class="px-4 py-3">Nama Part</th>
              <th class="px-4 py-3">Spesifikasi</th>
              <th class="px-4 py-3">Tipe</th>
              <th class="px-4 py-3">Satuan</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr
              v-for="part in filteredItems"
              :key="part.id"
              class="hover:bg-muted/40 transition-colors"
            >
              <td class="px-4 py-3 font-mono text-[11px] text-ink-2 whitespace-nowrap">
                {{ part.part_code || '—' }}
              </td>
              <td class="px-4 py-3">
                <div class="font-semibold text-ink">{{ part.part_name }}</div>
              </td>
              <td class="px-4 py-3 text-xs text-ink-2 max-w-[260px]">
                <span class="line-clamp-2">{{ part.specification || '—' }}</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium leading-none',
                    part.item_type === 'MACHINE_PART'
                      ? 'bg-primary-soft text-primary'
                      : 'bg-status-pending-bg text-status-pending-fg'
                  ]"
                >
                  <span>{{ part.item_type === 'MACHINE_PART' ? '⚙️' : '🧴' }}</span>
                  {{ getItemTypeLabel(part.item_type) }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-ink whitespace-nowrap">
                {{ part.unit || 'pcs' }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium leading-none',
                    part.is_active !== false ? 'bg-status-approved-bg text-status-approved-fg' : 'bg-status-draft-bg text-status-draft-fg'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', part.is_active !== false ? 'bg-status-approved-dot' : 'bg-status-draft-dot']" />
                  {{ part.is_active !== false ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                    @click="openEditModal(part)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    :class="[
                      'h-7 px-2.5 rounded-md text-xs font-medium transition',
                      part.is_active !== false ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10'
                    ]"
                    @click="toggleActive(part)"
                  >
                    {{ part.is_active !== false ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredItems.length === 0">
              <td colspan="7" class="px-4 py-10 text-center">
                <div class="text-2xl mb-1">🧰</div>
                <div class="text-xs font-medium text-ink">Belum ada sparepart yang sesuai filter</div>
                <div class="text-[11px] text-ink-3 mt-0.5">
                  Tambahkan part baru lewat tombol "Tambah Sparepart" di kanan atas.
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form (Tambah/Edit Sparepart) -->
    <AppModal
      :is-open="isModalOpen"
      :title="editingId ? 'Edit Sparepart' : 'Tambah Sparepart Baru'"
      @close="isModalOpen = false"
    >
      <form @submit.prevent="saveSparepart" class="space-y-3.5 text-xs">
        <div>
          <label class="block font-medium text-ink mb-1">
            Nama Part <span class="text-danger">*</span>
          </label>
          <input
            v-model="form.part_name"
            type="text"
            required
            maxlength="150"
            placeholder="Contoh: Deep Groove Ball Bearing 6204-2RS"
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-medium text-ink mb-1">Kode Part (opsional)</label>
            <input
              v-model="form.part_code"
              type="text"
              maxlength="50"
              placeholder="Contoh: BRG-6204"
              class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium font-mono text-ink focus:border-primary focus:outline-none"
            />
            <p class="text-[11px] text-ink-3 mt-1">Harus unik bila diisi.</p>
          </div>

          <div>
            <label class="block font-medium text-ink mb-1">
              Satuan <span class="text-danger">*</span>
            </label>
            <input
              v-model="form.unit"
              type="text"
              list="sparepart-unit-options"
              maxlength="20"
              placeholder="pcs"
              class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
            />
            <datalist id="sparepart-unit-options">
              <option v-for="u in unitOptions" :key="u" :value="u" />
            </datalist>
            <p class="text-[11px] text-ink-3 mt-1">Default: pcs.</p>
          </div>
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">
            Tipe Item <span class="text-danger">*</span>
          </label>
          <select
            v-model="form.item_type"
            required
            class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:border-primary focus:outline-none cursor-pointer"
          >
            <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">Spesifikasi (opsional)</label>
          <textarea
            v-model="form.specification"
            rows="2"
            maxlength="200"
            placeholder="Contoh: 6204-2RS / 20 x 47 x 14 mm"
            class="w-full px-3 py-2 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none resize-none"
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
            {{ isSubmitting ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Tambah Sparepart') }}
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useMasterStore } from '../../stores/master'
import { alert } from '../../utils/alert'
import AppModal from '../../components/common/AppModal.vue'

const masterStore = useMasterStore()

// ── Konstanta tipe (selaras enum SparepartItemType di schema.prisma) ──
const TYPE_OPTIONS = [
  { value: 'MACHINE_PART', label: 'Suku Cadang Mesin' },
  { value: 'CONSUMABLE_WORKSHOP', label: 'Bahan Habis Pakai' }
]
const typeOptions = TYPE_OPTIONS

const typeTabs = [
  { value: 'all', label: 'Semua Tipe', emoji: '🗂️' },
  { value: 'MACHINE_PART', label: 'Suku Cadang Mesin', emoji: '⚙️' },
  { value: 'CONSUMABLE_WORKSHOP', label: 'Bahan Habis Pakai', emoji: '🧴' }
]

// Saran satuan (datalist, tetap bebas diketik ulang).
const unitOptions = ['pcs', 'set', 'unit', 'roll', 'meter', 'kg', 'liter', 'batang', 'lembar']

const isLoading = computed(() => masterStore.isLoadingSpareparts)
const items = computed(() => masterStore.spareparts || [])

// Tipe & pencarian dikerjakan server-side; status difilter di klien
// (endpoint yang sama dipakai dropdown form teknisi yang hanya butuh part aktif).
const typeFilter = ref('all')
const statusFilter = ref('all')
const searchQuery = ref('')

// Debounce pencarian agar tidak membanjiri API saat mengetik.
let searchTimer = null

const isModalOpen = ref(false)
const editingId = ref(null)
const isSubmitting = ref(false)

function createEmptyForm() {
  return {
    part_name: '',
    part_code: '',
    specification: '',
    item_type: 'MACHINE_PART',
    unit: 'pcs'
  }
}

const form = ref(createEmptyForm())

onMounted(() => {
  loadSpareparts()
})

async function loadSpareparts() {
  try {
    await masterStore.fetchSpareparts({
      itemType: typeFilter.value === 'all' ? null : typeFilter.value,
      search: searchQuery.value.trim()
    })
  } catch (err) {
    await alert.error('Gagal Memuat Katalog', err.message || 'Tidak dapat memuat daftar sparepart.')
  }
}

function setTypeFilter(value) {
  if (typeFilter.value === value) return
  typeFilter.value = value
  loadSpareparts()
}

watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadSpareparts(), 300)
})

const activeCount = computed(() => items.value.filter(p => p.is_active !== false).length)
const machinePartCount = computed(() => items.value.filter(p => p.item_type === 'MACHINE_PART').length)

function getItemTypeLabel(itemType) {
  const found = TYPE_OPTIONS.find(t => t.value === itemType)
  return found ? found.label : (itemType || '-')
}

const filteredItems = computed(() => {
  if (statusFilter.value === 'active') return items.value.filter(p => p.is_active !== false)
  if (statusFilter.value === 'inactive') return items.value.filter(p => p.is_active === false)
  return items.value
})

function openAddModal() {
  editingId.value = null
  form.value = createEmptyForm()
  // Bila tab tipe sedang aktif, langsung pilih tipe tersebut.
  if (typeFilter.value !== 'all') form.value.item_type = typeFilter.value
  isModalOpen.value = true
}

function openEditModal(part) {
  editingId.value = part.id
  form.value = {
    part_name: part.part_name || '',
    part_code: part.part_code || '',
    specification: part.specification || '',
    item_type: part.item_type || 'MACHINE_PART',
    unit: part.unit || 'pcs'
  }
  isModalOpen.value = true
}

function buildPayload() {
  return {
    part_name: String(form.value.part_name || '').trim(),
    part_code: String(form.value.part_code || '').trim() || null,
    specification: String(form.value.specification || '').trim() || null,
    item_type: form.value.item_type,
    unit: String(form.value.unit || '').trim() || 'pcs'
  }
}

async function saveSparepart() {
  // Anti multi-submit (double click).
  if (isSubmitting.value) return

  const payload = buildPayload()

  // Validasi klien (server tetap memvalidasi ulang).
  if (!payload.part_name) {
    await alert.error('Data Belum Lengkap', 'Nama part wajib diisi.')
    return
  }
  if (!TYPE_OPTIONS.some(t => t.value === payload.item_type)) {
    await alert.error('Tipe Tidak Valid', 'Pilih tipe item: Suku Cadang Mesin atau Bahan Habis Pakai.')
    return
  }

  const isConfirmed = await alert.confirm(
    editingId.value ? 'Simpan Perubahan Sparepart?' : 'Tambah Sparepart Baru?',
    editingId.value
      ? `Perubahan data part "${payload.part_name}" akan disimpan.`
      : `Part baru "${payload.part_name}" akan ditambahkan ke katalog.`,
    editingId.value ? 'Ya, simpan' : 'Ya, tambah'
  )
  if (!isConfirmed) return

  isSubmitting.value = true
  try {
    if (editingId.value) {
      await masterStore.updateSparepart(editingId.value, payload)
    } else {
      await masterStore.addSparepart(payload)
    }
    await loadSpareparts()
    isModalOpen.value = false
    await alert.success(
      'Berhasil',
      editingId.value ? 'Data sparepart berhasil diperbarui.' : 'Sparepart baru berhasil ditambahkan.'
    )
  } catch (err) {
    // 409 Conflict (kode part duplikat) diteruskan apa adanya dari server.
    await alert.error('Gagal Menyimpan Sparepart', err.message || 'Terjadi kesalahan saat menyimpan data sparepart.')
  } finally {
    isSubmitting.value = false
  }
}

async function toggleActive(part) {
  const willActivate = part.is_active === false

  const isConfirmed = await alert.confirm(
    willActivate ? 'Aktifkan Sparepart?' : 'Nonaktifkan Sparepart?',
    willActivate
      ? `Part "${part.part_name}" akan muncul kembali di dropdown form teknisi.`
      : `Part "${part.part_name}" akan dinonaktifkan (soft delete) sehingga tidak muncul di dropdown form teknisi. Histori pemakaian tetap tersimpan.`,
    willActivate ? 'Ya, aktifkan' : 'Ya, nonaktifkan'
  )
  if (!isConfirmed) return

  try {
    if (willActivate) {
      await masterStore.updateSparepart(part.id, { is_active: true })
    } else {
      await masterStore.deactivateSparepart(part.id)
    }
    await loadSpareparts()
  } catch (err) {
    await alert.error('Gagal Mengubah Status', err.message || 'Gagal mengubah status aktif sparepart.')
  }
}
</script>


