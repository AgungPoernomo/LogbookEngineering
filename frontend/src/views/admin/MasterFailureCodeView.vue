<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Taksonomi Kerusakan ISO 14224</div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">Master Failure Code</h1>
        <p class="text-xs text-ink-2 mt-0.5">
          Kelola kode kerusakan yang muncul di dropdown form input teknisi serta menjadi acuan Pareto kerusakan &amp; repeat failure.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm transition shadow-card"
        @click="openAddModal"
      >
        <span>+ Tambah Kode Kerusakan</span>
      </button>
    </div>

    <!-- Ringkasan taksonomi (jumlah data, bukan peringkat/leaderboard) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="bg-surface p-4 rounded-lg border border-line shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center text-primary text-lg">
          🛡️
        </div>
        <div>
          <div class="text-xs text-ink-2 font-medium">Total Kode</div>
          <div class="text-lg font-bold text-ink">{{ items.length }} Kode</div>
        </div>
      </div>

      <div class="bg-surface p-4 rounded-lg border border-line shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-status-approved-bg flex items-center justify-center text-status-approved-fg text-lg">
          ✅
        </div>
        <div>
          <div class="text-xs text-ink-2 font-medium">Kode Aktif</div>
          <div class="text-lg font-bold text-ink">{{ activeCount }} Kode</div>
        </div>
      </div>

      <div class="bg-surface p-4 rounded-lg border border-line shadow-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-ink-2 text-lg">
          🗂️
        </div>
        <div>
          <div class="text-xs text-ink-2 font-medium">Kategori Terpakai</div>
          <div class="text-lg font-bold text-ink">{{ usedCategoryCount }} / {{ CATEGORY_OPTIONS.length }}</div>
        </div>
      </div>
    </div>

    <!-- Filter Kategori (Tab) -->
    <div class="flex items-center gap-1 border-b border-line overflow-x-auto pb-0.5">
      <button
        v-for="tab in categoryTabs"
        :key="tab.value"
        type="button"
        :class="[
          'px-4 py-2.5 text-xs transition-colors border-b-2 -mb-px flex items-center gap-2 shrink-0',
          categoryFilter === tab.value
            ? 'border-primary text-primary bg-primary-soft/40 font-semibold rounded-t-md'
            : 'border-transparent text-ink-2 hover:text-ink font-medium'
        ]"
        @click="setCategoryFilter(tab.value)"
      >
        <span>{{ tab.emoji }}</span>
        <span>{{ tab.label }}</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-line text-ink-2">
          {{ countByCategory(tab.value) }}
        </span>
      </button>
    </div>

    <!-- Search & Status Toolbar -->
    <div class="bg-surface p-3 rounded-lg border border-line shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 flex-1">
        <div class="relative w-full sm:w-72">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari kode (MECH-01) atau nama kerusakan..."
            class="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-line bg-surface text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary"
          />
          <span class="absolute left-2.5 top-2 text-ink-3 text-xs">🔍</span>
        </div>
        <p class="text-[11px] text-ink-3">Pencarian &amp; filter kategori diproses di server (satu query).</p>
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
          @click="loadFailureCodes"
        >
          {{ isLoading ? 'Memuat…' : 'Muat Ulang' }}
        </button>
      </div>
    </div>

    <!-- Tabel Kode Kerusakan -->
    <div class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <!-- Loading skeleton -->
      <div v-if="isLoading" class="animate-pulse divide-y divide-line">
        <div v-for="n in 5" :key="`sk-${n}`" class="px-4 py-4 flex items-center gap-4">
          <div class="h-3.5 bg-muted rounded w-24" />
          <div class="h-3.5 bg-muted rounded w-32" />
          <div class="h-3.5 bg-muted rounded w-1/3" />
          <div class="h-3.5 bg-muted rounded w-28 ml-auto" />
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-[13px] border-collapse min-w-[820px]">
          <thead class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-3">Kode</th>
              <th class="px-4 py-3">Kategori</th>
              <th class="px-4 py-3">Nama Kerusakan</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr
              v-for="code in pagedItems"
              :key="code.id"
              class="hover:bg-muted/40 transition-colors"
            >
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-0.5 rounded-sm bg-muted border border-line font-mono text-[11px] font-semibold text-ink-2">
                  {{ code.code }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium leading-none',
                    getCategoryMeta(code.category).chipClass
                  ]"
                >
                  <span>{{ getCategoryMeta(code.category).emoji }}</span>
                  {{ getCategoryMeta(code.category).label }}
                </span>
              </td>
              <td class="px-4 py-3 max-w-[360px]">
                <div class="font-semibold text-ink">{{ code.name }}</div>
                <div v-if="code.description" class="text-[11px] text-ink-3 mt-0.5 line-clamp-2">
                  {{ code.description }}
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium leading-none',
                    code.is_active !== false ? 'bg-status-approved-bg text-status-approved-fg' : 'bg-status-draft-bg text-status-draft-fg'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', code.is_active !== false ? 'bg-status-approved-dot' : 'bg-status-draft-dot']" />
                  {{ code.is_active !== false ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                    @click="openEditModal(code)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    :class="[
                      'h-7 px-2.5 rounded-md text-xs font-medium transition',
                      code.is_active !== false ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10'
                    ]"
                    @click="toggleActive(code)"
                  >
                    {{ code.is_active !== false ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredItems.length === 0">
              <td colspan="5" class="px-4 py-10 text-center">
                <div class="text-2xl mb-1">🛡️</div>
                <div class="text-xs font-medium text-ink">Belum ada kode kerusakan yang sesuai filter</div>
                <div class="text-[11px] text-ink-3 mt-0.5">
                  Tambahkan kode baru lewat tombol "Tambah Kode Kerusakan" di kanan atas.
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="!isLoading && filteredItems.length > 0"
        class="px-4 py-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface"
      >
        <p class="text-[11px] text-ink-3">
          Menampilkan {{ rangeStart }}–{{ rangeEnd }} dari {{ filteredItems.length }} kode
        </p>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="h-7 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
          >
            ‹ Sebelumnya
          </button>
          <span class="text-[11px] text-ink-2 font-medium px-1">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            type="button"
            class="h-7 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
          >
            Berikutnya ›
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Form (Tambah/Edit Kode Kerusakan) -->
    <AppModal
      :is-open="isModalOpen"
      :title="editingId ? 'Edit Kode Kerusakan' : 'Tambah Kode Kerusakan Baru'"
      @close="isModalOpen = false"
    >
      <form @submit.prevent="saveFailureCode" class="space-y-3.5 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-medium text-ink mb-1">
              Kode <span class="text-danger">*</span>
            </label>
            <input
              v-model="form.code"
              type="text"
              required
              maxlength="30"
              placeholder="Contoh: MECH-01"
              class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium font-mono text-ink uppercase focus:border-primary focus:outline-none"
            />
            <p class="text-[11px] text-ink-3 mt-1">Wajib unik, tersimpan dalam HURUF BESAR.</p>
          </div>

          <div>
            <label class="block font-medium text-ink mb-1">
              Kategori <span class="text-danger">*</span>
            </label>
            <select
              v-model="form.category"
              required
              class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:border-primary focus:outline-none cursor-pointer"
            >
              <option v-for="opt in CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">
            Nama Kerusakan <span class="text-danger">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            required
            maxlength="150"
            placeholder="Contoh: Bearing aus/overheat/macet"
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">Deskripsi (opsional)</label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Contoh: Bearing bunyi kasar, getaran tinggi, dan suhu rumah bearing naik."
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
            {{ isSubmitting ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Tambah Kode') }}
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

// ── Kategori (selaras enum `failure_codes.category` di schema.prisma) ──
const CATEGORY_OPTIONS = [
  { value: 'MECHANICAL', label: 'Mekanikal', emoji: '⚙️', chipClass: 'bg-primary-soft text-primary' },
  { value: 'ELECTRICAL', label: 'Elektrikal', emoji: '⚡', chipClass: 'bg-status-pending-bg text-status-pending-fg' },
  { value: 'INSTRUMENTATION', label: 'Instrumentasi', emoji: '📶', chipClass: 'bg-status-approved-bg text-status-approved-fg' },
  { value: 'UTILITY', label: 'Utilitas', emoji: '💧', chipClass: 'bg-muted text-ink-2' },
  { value: 'PROCESS', label: 'Proses', emoji: '🏭', chipClass: 'bg-status-rejected-bg text-status-rejected-fg' }
]

const categoryTabs = [
  { value: 'all', label: 'Semua Kategori', emoji: '🗂️' },
  ...CATEGORY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label, emoji: opt.emoji }))
]

const PAGE_SIZE = 10

const isLoading = computed(() => masterStore.isLoadingFailureCodes)
const items = computed(() => masterStore.adminFailureCodes || [])

// Kategori & pencarian dikerjakan server-side; status difilter di klien
// (endpoint yang sama dipakai dropdown form teknisi yang hanya butuh kode aktif).
const categoryFilter = ref('all')
const statusFilter = ref('all')
const searchQuery = ref('')

// Debounce pencarian agar tidak membanjiri API saat mengetik.
let searchTimer = null

const currentPage = ref(1)

const isModalOpen = ref(false)
const editingId = ref(null)
const isSubmitting = ref(false)

function createEmptyForm() {
  return {
    code: '',
    category: 'MECHANICAL',
    name: '',
    description: ''
  }
}

const form = ref(createEmptyForm())

onMounted(() => {
  loadFailureCodes()
})

async function loadFailureCodes() {
  try {
    await masterStore.fetchFailureCodes({
      category: categoryFilter.value === 'all' ? null : categoryFilter.value,
      search: searchQuery.value.trim()
    })
    // Jaga halaman tetap valid setelah filter/pencarian berubah
    // (onMounted baru memanggil fungsi ini setelah seluruh setup dieksekusi).
    if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  } catch (err) {
    await alert.error('Gagal Memuat Kode Kerusakan', err.message || 'Tidak dapat memuat daftar kode kerusakan.')
  }
}

function setCategoryFilter(value) {
  if (categoryFilter.value === value) return
  categoryFilter.value = value
  currentPage.value = 1
  loadFailureCodes()
}

watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadFailureCodes()
  }, 300)
})

// Status difilter di klien agar tab kategori (yang server-side) tetap konsisten.
watch(statusFilter, () => {
  currentPage.value = 1
})

const activeCount = computed(() => items.value.filter(c => c.is_active !== false).length)

const usedCategoryCount = computed(
  () => new Set(items.value.map(c => c.category)).size
)

function countByCategory(value) {
  if (value === 'all') return items.value.length
  return items.value.filter(c => c.category === value).length
}

function getCategoryMeta(category) {
  const found = CATEGORY_OPTIONS.find(opt => opt.value === category)
  return found || { value: category, label: category || '-', emoji: '❔', chipClass: 'bg-muted text-ink-2' }
}

const filteredItems = computed(() => {
  if (statusFilter.value === 'active') return items.value.filter(c => c.is_active !== false)
  if (statusFilter.value === 'inactive') return items.value.filter(c => c.is_active === false)
  return items.value
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / PAGE_SIZE)))

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredItems.value.slice(start, start + PAGE_SIZE)
})

const rangeStart = computed(() =>
  filteredItems.value.length === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1
)

const rangeEnd = computed(() =>
  Math.min(currentPage.value * PAGE_SIZE, filteredItems.value.length)
)

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

function openAddModal() {
  editingId.value = null
  form.value = createEmptyForm()
  // Bila tab kategori sedang aktif, langsung pilih kategori tersebut.
  if (categoryFilter.value !== 'all') form.value.category = categoryFilter.value
  isModalOpen.value = true
}

function openEditModal(code) {
  editingId.value = code.id
  form.value = {
    code: code.code || '',
    category: code.category || 'MECHANICAL',
    name: code.name || '',
    description: code.description || ''
  }
  isModalOpen.value = true
}

function buildPayload() {
  return {
    code: String(form.value.code || '').trim().toUpperCase(),
    category: form.value.category,
    name: String(form.value.name || '').trim(),
    description: String(form.value.description || '').trim() || null
  }
}

async function saveFailureCode() {
  // Anti multi-submit (double click).
  if (isSubmitting.value) return

  const payload = buildPayload()

  // Validasi klien (server tetap memvalidasi ulang).
  if (!payload.code) {
    await alert.error('Data Belum Lengkap', 'Kode kerusakan wajib diisi (contoh: MECH-01).')
    return
  }
  if (!CATEGORY_OPTIONS.some(opt => opt.value === payload.category)) {
    await alert.error('Kategori Tidak Valid', 'Pilih salah satu kategori kerusakan yang tersedia.')
    return
  }
  if (!payload.name) {
    await alert.error('Data Belum Lengkap', 'Nama kerusakan wajib diisi.')
    return
  }

  const isConfirmed = await alert.confirm(
    editingId.value ? 'Simpan Perubahan Kode Kerusakan?' : 'Tambah Kode Kerusakan Baru?',
    editingId.value
      ? `Perubahan pada kode ${payload.code} akan disimpan.`
      : `Kode ${payload.code} — ${payload.name} akan ditambahkan ke taksonomi kerusakan.`,
    editingId.value ? 'Ya, simpan' : 'Ya, tambah'
  )
  if (!isConfirmed) return

  isSubmitting.value = true
  try {
    if (editingId.value) {
      await masterStore.updateFailureCode(editingId.value, payload)
    } else {
      await masterStore.addFailureCode(payload)
    }
    await loadFailureCodes()
    isModalOpen.value = false
    await alert.success(
      'Berhasil',
      editingId.value ? 'Data kode kerusakan berhasil diperbarui.' : 'Kode kerusakan baru berhasil ditambahkan.'
    )
  } catch (err) {
    // 409 Conflict (kode duplikat) diteruskan apa adanya dari server.
    await alert.error('Gagal Menyimpan Kode Kerusakan', err.message || 'Terjadi kesalahan saat menyimpan data kode kerusakan.')
  } finally {
    isSubmitting.value = false
  }
}

async function toggleActive(code) {
  const willActivate = code.is_active === false

  const isConfirmed = await alert.confirm(
    willActivate ? 'Aktifkan Kode Kerusakan?' : 'Nonaktifkan Kode Kerusakan?',
    willActivate
      ? `Kode ${code.code} akan muncul kembali di dropdown form teknisi.`
      : `Kode ${code.code} akan dinonaktifkan (soft delete) sehingga tidak muncul di dropdown form teknisi. Histori logbook, Pareto kerusakan, dan repeat failure tetap utuh.`,
    willActivate ? 'Ya, aktifkan' : 'Ya, nonaktifkan'
  )
  if (!isConfirmed) return

  try {
    await masterStore.toggleFailureCode(code.id, !willActivate)
    await loadFailureCodes()
  } catch (err) {
    await alert.error('Gagal Mengubah Status', err.message || 'Gagal mengubah status aktif kode kerusakan.')
  }
}
</script>
