<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Administrasi Akses</div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">Manajemen Akun Pengguna Satoria</h1>
        <p class="text-xs text-ink-2 mt-0.5">Kelola hak akses RBAC, NIK, penempatan plant, dan grup kerja engineering.</p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm transition shadow-card"
        @click="openAddModal"
      >
        <span>+ Tambah Akun Baru</span>
      </button>
    </div>

    <!-- Filter & Search Bar per 11.5.11 -->
    <div class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line flex flex-col md:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
        <button
          v-for="r in ['ALL', 'Teknisi', 'Supervisor', 'Admin']"
          :key="r"
          type="button"
          :class="[
            'px-3 py-1.5 rounded-md text-xs font-medium transition shrink-0',
            selectedRole === r ? 'bg-primary text-white font-semibold' : 'text-ink-2 hover:bg-muted'
          ]"
          @click="selectedRole = r"
        >
          {{ r === 'ALL' ? 'Semua Peran' : r }}
        </button>
      </div>

      <div class="relative w-full md:w-64">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama / NIK / email..."
          class="w-full h-9 pl-8 pr-3 rounded-md border border-line text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-muted placeholder:text-ink-3"
        />
        <svg class="w-4 h-4 text-ink-3 absolute left-2.5 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>

    <!-- Users Table Card per 11.5.11 -->
    <div class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[13px] border-collapse min-w-[700px]">
          <thead class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-3 py-3 w-10">#</th>
              <th class="px-4 py-3 cursor-pointer select-none" @click="toggleSort('full_name')">
                Nama & NIK <span class="text-ink-3">{{ sortIndicator('full_name') }}</span>
              </th>
              <th class="px-4 py-3 cursor-pointer select-none" @click="toggleSort('role')">
                Peran (RBAC) <span class="text-ink-3">{{ sortIndicator('role') }}</span>
              </th>
              <th class="px-4 py-3 cursor-pointer select-none" @click="toggleSort('plant')">
                Line & Grup Kerja <span class="text-ink-3">{{ sortIndicator('plant') }}</span>
              </th>
              <th class="px-4 py-3 cursor-pointer select-none" @click="toggleSort('email')">
                Kontak / Email <span class="text-ink-3">{{ sortIndicator('email') }}</span>
              </th>
              <th class="px-4 py-3 cursor-pointer select-none" @click="toggleSort('is_active')">
                Status Akun <span class="text-ink-3">{{ sortIndicator('is_active') }}</span>
              </th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr
              v-for="(user, index) in users"
              :key="user.id"
              class="hover:bg-muted/40 transition-colors"
            >
              <td class="px-3 py-3 text-xs text-ink-3 font-mono">{{ (page - 1) * limit + index + 1 }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="font-semibold text-ink">{{ user.full_name }}</div>
                <div class="text-xs text-ink-3 font-mono">NIK: {{ user.nik }}</div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <AppBadge :role="user.role" />
              </td>
              <td class="px-4 py-3">
                <div class="text-xs font-medium text-ink">{{ user.plant_name }}</div>
                <div class="text-[11px] text-ink-3">{{ user.group_name }}</div>
              </td>
              <td class="px-4 py-3 text-xs font-mono text-ink-2 whitespace-nowrap">
                {{ user.email }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium leading-none',
                    user.is_active ? 'bg-status-approved-bg text-status-approved-fg' : 'bg-status-draft-bg text-status-draft-fg'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', user.is_active ? 'bg-status-approved-dot' : 'bg-status-draft-dot']" />
                  {{ user.is_active ? 'Aktif' : 'Non-Aktif' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                    @click="openEditModal(user)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    :class="[
                      'h-7 px-2.5 rounded-md text-xs font-medium transition',
                      user.is_active ? 'text-danger hover:bg-danger/10' : 'text-success hover:bg-success/10'
                    ]"
                    @click="toggleUserActive(user)"
                  >
                    {{ user.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginasi server-side (BUG-011) -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-line text-xs text-ink-2">
        <div class="flex items-center gap-2">
          <span>
            Menampilkan
            <strong class="text-ink">{{ users.length === 0 ? 0 : (page - 1) * limit + 1 }}</strong>–<strong class="text-ink">{{ (page - 1) * limit + users.length }}</strong>
            dari <strong class="text-ink">{{ total }}</strong> akun
          </span>
          <select
            v-model.number="limit"
            class="h-7 px-1.5 rounded-md border border-line bg-surface text-xs focus:outline-none focus:border-primary cursor-pointer"
            @change="changeLimit"
          >
            <option :value="10">10 / hal</option>
            <option :value="25">25 / hal</option>
            <option :value="50">50 / hal</option>
          </select>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="h-7 px-2.5 rounded-md border border-line bg-surface hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="page <= 1 || loading"
            @click="goToPage(page - 1)"
          >
            ← Sebelumnya
          </button>
          <span class="px-2 font-medium">Hal {{ page }} / {{ totalPages }}</span>
          <button
            type="button"
            class="h-7 px-2.5 rounded-md border border-line bg-surface hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="page >= totalPages || loading"
            @click="goToPage(page + 1)"
          >
            Berikutnya →
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Form (Tambah / Edit) -->
    <AppModal
      :is-open="isModalOpen"
      :title="editingId ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'"
      @close="isModalOpen = false"
    >
      <form @submit.prevent="saveUser" class="space-y-3.5 text-xs">
        <div>
          <label class="block font-medium text-ink mb-1">Nama Lengkap <span class="text-danger">*</span></label>
          <input
            v-model="userForm.full_name"
            type="text"
            required
            placeholder="Contoh: Budi Santoso"
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-medium text-ink mb-1">NIK <span class="text-danger">*</span></label>
            <input
              v-model="userForm.nik"
              type="text"
              required
              placeholder="2024-TKN-005"
              class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink font-mono focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label class="block font-medium text-ink mb-1">Email Satoria <span class="text-danger">*</span></label>
            <input
              v-model="userForm.email"
              type="email"
              required
              placeholder="user@satoria.co.id"
              class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-medium text-ink mb-1">Peran (Role) <span class="text-danger">*</span></label>
            <select
              v-model="userForm.role"
              required
              class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="Teknisi">Teknisi</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div>
            <label class="block font-medium text-ink mb-1">Line / Fasilitas <span class="text-danger">*</span></label>
            <select
              v-model="userForm.plant_id"
              required
              class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="" disabled>-- Pilih Line --</option>
              <option v-for="p in masterStore.plants" :key="p.id" :value="p.id">
                {{ p.name }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">Kelompok Kerja (Work Group) <span class="text-danger">*</span></label>
          <select
            v-model="userForm.group_id"
            required
            class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:border-primary focus:outline-none cursor-pointer"
          >
            <option value="" disabled>-- Pilih Kelompok Kerja --</option>
            <option v-for="g in masterStore.workGroups" :key="g.id" :value="g.id">
              {{ g.name }}
            </option>
          </select>
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
            class="h-8 px-4 rounded-md bg-primary hover:bg-blue-700 text-white font-medium text-xs transition shadow-card"
          >
            Simpan Akun
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { userService } from '../../services/userService'
import { useMasterStore } from '../../stores/master'
import { useAuthStore } from '../../stores/auth'
import { alert } from '../../utils/alert'
import AppBadge from '../../components/common/AppBadge.vue'
import AppModal from '../../components/common/AppModal.vue'

const masterStore = useMasterStore()
const authStore = useAuthStore()

const users = ref([])
const loading = ref(false)
const selectedRole = ref('ALL')
const searchQuery = ref('')
const isModalOpen = ref(false)
const editingId = ref(null)

// Paginasi & pengurutan server-side (BUG-010/011)
const page = ref(1)
const limit = ref(25)
const total = ref(0)
const sortBy = ref('created_at')
const sortDir = ref('desc')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

const userForm = ref({
  full_name: '',
  nik: '',
  email: '',
  role: 'Teknisi',
  plant_id: '',
  group_id: ''
})

// BUG-009: email harus local@domain.tld
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/

async function fetchUsers() {
  loading.value = true
  try {
    const res = await userService.getUsers({
      role: selectedRole.value,
      search: searchQuery.value.trim(),
      page: page.value,
      limit: limit.value,
      sort_by: sortBy.value,
      sort_dir: sortDir.value
    })
    users.value = res
    total.value = res._meta?.total ?? res.length
    if (page.value > totalPages.value) {
      page.value = totalPages.value
    }
  } catch (err) {
    console.error('Gagal memuat pengguna dari database:', err)
    await alert.error('Gagal Memuat Data', err.message || 'Tidak dapat mengambil daftar pengguna.')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    masterStore.fetchAll(),
    fetchUsers()
  ])
})

// Reset ke halaman 1 & fetch ulang saat filter/pencarian berubah (debounce sederhana)
let searchTimer = null
watch([selectedRole, searchQuery], () => {
  page.value = 1
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchUsers, 350)
})

function toggleSort(field) {
  if (sortBy.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortDir.value = 'asc'
  }
  page.value = 1
  fetchUsers()
}

function sortIndicator(field) {
  if (sortBy.value !== field) return ''
  return sortDir.value === 'asc' ? '▲' : '▼'
}

function goToPage(target) {
  if (target < 1 || target > totalPages.value) return
  page.value = target
  fetchUsers()
}

function changeLimit() {
  page.value = 1
  fetchUsers()
}

function openAddModal() {
  editingId.value = null
  userForm.value = {
    full_name: '',
    nik: `TEK-2026-00${total.value + 1}`,
    email: '',
    role: 'Teknisi',
    plant_id: masterStore.plants[0]?.id || 1,
    group_id: masterStore.workGroups[0]?.id || 1
  }
  isModalOpen.value = true
}

function openEditModal(user) {
  editingId.value = user.id
  userForm.value = {
    full_name: user.full_name,
    nik: user.nik,
    email: user.email,
    role: user.role || user.role_name || 'Teknisi',
    plant_id: user.plant_id,
    group_id: user.group_id
  }
  isModalOpen.value = true
}

async function saveUser() {
  // Validasi field wajib (F1.3: SweetAlert, bukan banner inline)
  if (!String(userForm.value.full_name || '').trim()) {
    await alert.error('Data Belum Lengkap', 'Nama lengkap wajib diisi.')
    return
  }

  if (!String(userForm.value.nik || '').trim()) {
    await alert.error('Data Belum Lengkap', 'NIK wajib diisi.')
    return
  }

  // BUG-009: validasi email di sisi klien sebelum kirim
  if (!EMAIL_REGEX.test(String(userForm.value.email || '').trim())) {
    await alert.error('Email Tidak Valid', 'Gunakan format email yang benar, contoh: nama@domain.co.id')
    return
  }

  // F1.3: konfirmasi sebelum menyimpan pengguna
  const isConfirmed = await alert.confirm(
    editingId.value ? 'Simpan Perubahan Pengguna?' : 'Buat Akun Pengguna Baru?',
    editingId.value
      ? `Perubahan data ${userForm.value.full_name} akan disimpan.`
      : `Akun baru untuk ${userForm.value.full_name} akan dibuat.`,
    editingId.value ? 'Ya, simpan' : 'Ya, buat'
  )
  if (!isConfirmed) return

  try {
    const roleIdMap = { Admin: 1, Supervisor: 2, Teknisi: 3 }
    const roleId = roleIdMap[userForm.value.role] || 3
    const payload = {
      ...userForm.value,
      role_id: roleId,
      plant_id: Number(userForm.value.plant_id),
      group_id: Number(userForm.value.group_id)
    }

    if (editingId.value) {
      await userService.updateUser(editingId.value, payload)
    } else {
      await userService.createUser(payload)
    }

    await fetchUsers()
    isModalOpen.value = false
    await alert.success('Berhasil', editingId.value ? 'Data pengguna berhasil diperbarui.' : 'Akun pengguna baru berhasil dibuat.')
  } catch (err) {
    // BUG-005 (ACC-02): NIK duplikat dsb → tampilkan via SweetAlert
    await alert.error('Gagal Menyimpan', err.message || 'Gagal menyimpan data pengguna.')
  }
}

async function toggleUserActive(user) {
  const ok = await alert.confirm(
    user.is_active ? 'Nonaktifkan Akun?' : 'Aktifkan Akun?',
    `${user.full_name} (${user.nik}) akan ${user.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`
  )
  if (!ok) return
  try {
    await userService.toggleStatus(user.id)
    await fetchUsers()
  } catch (err) {
    await alert.error('Gagal', err.message || 'Gagal mengubah status aktif pengguna.')
  }
}
</script>
