<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="text-xs font-semibold text-brand-600 uppercase tracking-wider">Manajemen Personel</div>
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Data Teknisi Engineering</h1>
        <p class="text-xs text-slate-500 mt-1">Kelola data teknisi lapangan, spesialisasi mesin, dan shift kerja operasional.</p>
      </div>

      <button
        type="button"
        @click="openAddModal"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm transition shadow-sm"
      >
        <span>+ Tambah Teknisi</span>
      </button>
    </div>

    <!-- Filter & Search -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
      <div class="text-xs font-semibold text-slate-500">
        Total Terdaftar: <span class="text-slate-800 font-bold">{{ teknisiStore.technicians.length }} Personel</span>
      </div>
      <div class="relative w-64">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama / NIK..."
          class="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50"
        />
        <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>

    <!-- Table Card -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th class="px-6 py-3.5">Nama & NIK</th>
              <th class="px-6 py-3.5">Departemen</th>
              <th class="px-6 py-3.5">Spesialisasi</th>
              <th class="px-6 py-3.5">Kontak</th>
              <th class="px-6 py-3.5">Status</th>
              <th class="px-6 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="item in filteredTeknisi"
              :key="item.id"
              class="hover:bg-slate-50/60 transition"
            >
              <td class="px-6 py-4">
                <div class="font-bold text-slate-800">{{ item.name }}</div>
                <div class="text-xs text-slate-400 font-mono">{{ item.employeeNo }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-xs font-semibold text-slate-700">{{ item.department }}</div>
                <div class="text-[11px] text-slate-400">{{ item.shift }}</div>
              </td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                  {{ item.specialization }}
                </span>
              </td>
              <td class="px-6 py-4 text-xs font-mono text-slate-600">
                {{ item.phone }}
              </td>
              <td class="px-6 py-4">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                    item.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', item.isActive ? 'bg-emerald-500' : 'bg-slate-400']"></span>
                  {{ item.isActive ? 'Aktif' : 'Non-Aktif' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold text-brand-600 hover:bg-brand-50 transition"
                    @click="openEditModal(item)"
                  >
                    Edit
                  </button>
                  <button
                    v-if="item.isActive"
                    type="button"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    @click="confirmDelete(item)"
                  >
                    Nonaktifkan
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
      :title="editingId ? 'Edit Data Teknisi' : 'Tambah Teknisi Baru'"
      @close="isModalOpen = false"
    >
      <form @submit.prevent="saveTeknisi" class="space-y-4 text-xs">
        <div>
          <label class="block font-bold text-slate-700 mb-1">Nama Lengkap <span class="text-rose-500">*</span></label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="Contoh: Budi Pratama"
            class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Nomor Induk (NIK) <span class="text-rose-500">*</span></label>
            <input
              v-model="form.employeeNo"
              type="text"
              required
              placeholder="TKN-005"
              class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Nomor Telepon / WA <span class="text-rose-500">*</span></label>
            <input
              v-model="form.phone"
              type="text"
              required
              placeholder="0812-xxxx-xxxx"
              class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Departemen <span class="text-rose-500">*</span></label>
            <select
              v-model="form.department"
              required
              class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="Maintenance & Utility">Maintenance & Utility</option>
              <option value="Electrical & Instrumentation">Electrical & Instrumentation</option>
              <option value="Mechanical Maintenance">Mechanical Maintenance</option>
              <option value="Water Treatment & Boiler">Water Treatment & Boiler</option>
              <option value="HVAC & Cleanroom">HVAC & Cleanroom</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Spesialisasi Teknis</label>
            <input
              v-model="form.specialization"
              type="text"
              placeholder="Contoh: HVAC & Chiller"
              class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Shift Kerja Rutin</label>
          <select
            v-model="form.shift"
            class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="Shift 1 (Pagi)">Shift 1 (Pagi)</option>
            <option value="Shift 2 (Siang)">Shift 2 (Siang)</option>
            <option value="Shift 3 (Malam)">Shift 3 (Malam)</option>
            <option value="General Office">General Office</option>
          </select>
        </div>

        <div class="pt-3 flex justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            class="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition"
            @click="isModalOpen = false"
          >
            Batal
          </button>
          <button
            type="submit"
            class="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition shadow-sm"
          >
            Simpan Data
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTeknisiStore } from '../../stores/teknisi'
import AppModal from '../../components/common/AppModal.vue'

const teknisiStore = useTeknisiStore()

const searchQuery = ref('')
const isModalOpen = ref(false)
const editingId = ref(null)

const form = ref({
  name: '',
  employeeNo: '',
  department: 'Maintenance & Utility',
  phone: '',
  specialization: '',
  shift: 'Shift 1 (Pagi)'
})

onMounted(async () => {
  await teknisiStore.fetchTechnicians()
})

const filteredTeknisi = computed(() => {
  let list = teknisiStore.technicians
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      t.employeeNo?.toLowerCase().includes(q) ||
      t.department?.toLowerCase().includes(q)
    )
  }
  return list
})

function openAddModal() {
  editingId.value = null
  form.value = {
    name: '',
    employeeNo: `TKN-00${teknisiStore.technicians.length + 1}`,
    department: 'Maintenance & Utility',
    phone: '',
    specialization: '',
    shift: 'Shift 1 (Pagi)'
  }
  isModalOpen.value = true
}

function openEditModal(item) {
  editingId.value = item.id
  form.value = { ...item }
  isModalOpen.value = true
}

async function saveTeknisi() {
  if (editingId.value) {
    await teknisiStore.updateTechnician(editingId.value, form.value)
  } else {
    await teknisiStore.addTechnician(form.value)
  }
  isModalOpen.value = false
}

async function confirmDelete(item) {
  if (confirm(`Nonaktifkan teknisi ${item.name}? Data riwayat pekerjaan akan tetap tersimpan.`)) {
    await teknisiStore.deleteTechnician(item.id)
  }
}
</script>
