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
              <th class="px-4 py-3">Nama & NIK</th>
              <th class="px-4 py-3">Peran (RBAC)</th>
              <th class="px-4 py-3">Plant & Grup Kerja</th>
              <th class="px-4 py-3">Kontak / Email</th>
              <th class="px-4 py-3">Status Akun</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              class="hover:bg-muted/40 transition-colors"
            >
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
            <label class="block font-medium text-ink mb-1">Fasilitas Plant <span class="text-danger">*</span></label>
            <select
              v-model="userForm.plant_id"
              required
              class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="" disabled>-- Pilih Fasilitas Plant --</option>
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
import { ref, computed, onMounted } from 'vue'
import { userService } from '../../services/userService'
import { useMasterStore } from '../../stores/master'
import { useAuthStore } from '../../stores/auth'
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

const userForm = ref({
  full_name: '',
  nik: '',
  email: '',
  role: 'Teknisi',
  plant_id: '',
  group_id: ''
})

async function fetchUsers() {
  loading.value = true
  try {
    users.value = await userService.getUsers()
  } catch (err) {
    console.error('Gagal memuat pengguna dari database:', err)
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

const filteredUsers = computed(() => {
  let list = users.value

  if (selectedRole.value !== 'ALL') {
    list = list.filter(u => (u.role || u.role_name) === selectedRole.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.nik?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  }

  return list
})

function openAddModal() {
  editingId.value = null
  userForm.value = {
    full_name: '',
    nik: `TEK-2026-00${users.value.length + 1}`,
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
  try {
    const roleIdMap = {
      Admin: 1,
      Supervisor: 2,
      Teknisi: 3
    }
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
  } catch (err) {
    alert(err.message || 'Gagal menyimpan data pengguna.')
  }
}

async function toggleUserActive(user) {
  try {
    await userService.toggleStatus(user.id)
    await fetchUsers()
  } catch (err) {
    alert(err.message || 'Gagal mengubah status aktif pengguna.')
  }
}
</script>
