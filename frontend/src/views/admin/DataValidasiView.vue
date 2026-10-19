<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="text-xs font-semibold text-brand-600 uppercase tracking-wider">Master Data Variabel</div>
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Data Validasi Form Engineering</h1>
        <p class="text-xs text-slate-500 mt-1">
          Kelola variabel isian dinamis form teknisi (Kategori, Jenis Pekerjaan, Lokasi, dan Peralatan).
        </p>
      </div>

      <button
        type="button"
        @click="openAddModal"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm transition shadow-sm"
      >
        <span>+ Tambah Variabel {{ currentTabTitle }}</span>
      </button>
    </div>

    <!-- Category Tabs -->
    <div class="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="[
          'px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-1 flex items-center gap-2 shrink-0',
          currentTab === tab.id
            ? 'border-brand-600 text-brand-600 bg-brand-50/50 rounded-t-lg'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        ]"
        @click="currentTab = tab.id"
      >
        <span>{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
        <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
          {{ tab.count() }}
        </span>
      </button>
    </div>

    <!-- Variable Items Table Card -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
            <tr>
              <th class="px-6 py-3.5">Nama Variabel</th>
              <th class="px-6 py-3.5">Kode / Kategori Induk</th>
              <th class="px-6 py-3.5">Status Penggunaan</th>
              <th class="px-6 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="item in currentItems"
              :key="item.id"
              class="hover:bg-slate-50/60 transition"
            >
              <td class="px-6 py-4 font-bold text-slate-800">
                {{ item.name }}
              </td>
              <td class="px-6 py-4 text-xs font-mono text-slate-500">
                <span v-if="item.code" class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                  {{ item.code }}
                </span>
                <span v-else-if="item.categoryId" class="text-indigo-600 font-semibold font-sans">
                  {{ getCategoryName(item.categoryId) }}
                </span>
                <span v-else-if="item.locationId" class="text-emerald-600 font-semibold font-sans">
                  {{ getLocationName(item.locationId) }}
                </span>
                <span v-else>-</span>
              </td>
              <td class="px-6 py-4">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                    item.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', item.isActive ? 'bg-emerald-500' : 'bg-slate-400']"></span>
                  {{ item.isActive ? 'Aktif di Form' : 'Dinonaktifkan' }}
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
                    type="button"
                    :class="[
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition',
                      item.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                    ]"
                    @click="toggleItemStatus(item)"
                  >
                    {{ item.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form (Tambah/Edit) -->
    <AppModal
      :is-open="isModalOpen"
      :title="editingId ? `Edit Variabel ${currentTabTitle}` : `Tambah Variabel ${currentTabTitle}`"
      @close="isModalOpen = false"
    >
      <form @submit.prevent="saveVariable" class="space-y-4 text-xs">
        <div>
          <label class="block font-bold text-slate-700 mb-1">
            Nama Variabel / Label <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="modalForm.name"
            type="text"
            required
            placeholder="Contoh nama..."
            class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div v-if="currentTab === 'categories' || currentTab === 'locations'">
          <label class="block font-bold text-slate-700 mb-1">Kode Singkatan (Kode Unik)</label>
          <input
            v-model="modalForm.code"
            type="text"
            placeholder="Contoh: LOC-01 / PM-01"
            class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div v-if="currentTab === 'activityTypes'">
          <label class="block font-bold text-slate-700 mb-1">Pilih Kategori Induk <span class="text-rose-500">*</span></label>
          <select
            v-model="modalForm.categoryId"
            required
            class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option v-for="c in validasiStore.categories" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <div v-if="currentTab === 'equipments'">
          <label class="block font-bold text-slate-700 mb-1">Pilih Lokasi Induk <span class="text-rose-500">*</span></label>
          <select
            v-model="modalForm.locationId"
            required
            class="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option v-for="l in validasiStore.locations" :key="l.id" :value="l.id">
              {{ l.name }}
            </option>
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
            Simpan Variabel
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useValidasiStore } from '../../stores/validasi'
import AppModal from '../../components/common/AppModal.vue'

const validasiStore = useValidasiStore()

const currentTab = ref('categories')
const isModalOpen = ref(false)
const editingId = ref(null)
const modalForm = ref({ name: '', code: '', categoryId: 1, locationId: 1 })

onMounted(async () => {
  await validasiStore.fetchAll()
})

const tabs = [
  { id: 'categories', label: 'Kategori Pekerjaan', icon: '📂', count: () => validasiStore.categories.length },
  { id: 'activityTypes', label: 'Jenis Aktivitas', icon: '⚡', count: () => validasiStore.activityTypes.length },
  { id: 'locations', label: 'Lokasi & Area', icon: '🏢', count: () => validasiStore.locations.length },
  { id: 'equipments', label: 'Peralatan & Mesin', icon: '⚙️', count: () => validasiStore.equipments.length }
]

const currentTabTitle = computed(() => {
  const match = tabs.find(t => t.id === currentTab.value)
  return match ? match.label : 'Variabel'
})

const currentItems = computed(() => {
  return validasiStore[currentTab.value] || []
})

function getCategoryName(catId) {
  const c = validasiStore.categories.find(item => item.id === catId)
  return c ? c.name : '-'
}

function getLocationName(locId) {
  const l = validasiStore.locations.find(item => item.id === locId)
  return l ? l.name : '-'
}

function openAddModal() {
  editingId.value = null
  modalForm.value = {
    name: '',
    code: '',
    categoryId: validasiStore.categories[0]?.id || 1,
    locationId: validasiStore.locations[0]?.id || 1
  }
  isModalOpen.value = true
}

function openEditModal(item) {
  editingId.value = item.id
  modalForm.value = { ...item }
  isModalOpen.value = true
}

async function saveVariable() {
  if (editingId.value) {
    await validasiStore.updateItem(currentTab.value, editingId.value, modalForm.value)
  } else {
    await validasiStore.addItem(currentTab.value, modalForm.value)
  }
  isModalOpen.value = false
}

async function toggleItemStatus(item) {
  await validasiStore.toggleActive(currentTab.value, item.id)
}
</script>
