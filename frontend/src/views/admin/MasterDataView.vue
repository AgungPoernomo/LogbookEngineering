<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Konfigurasi Master Data</div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">Manajemen Master Data Satoria</h1>
        <p class="text-xs text-ink-2 mt-0.5">Kelola data referensi Plant, Shift kerja, Mesin, Sub-Mesin, dan Grup Kerja.</p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm transition shadow-card"
        @click="openAddModal"
      >
        <span>+ Tambah Data {{ currentTabTitle }}</span>
      </button>
    </div>

    <!-- Master Tabs per 11.5.11 -->
    <div class="flex items-center gap-1 border-b border-line overflow-x-auto pb-0.5">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="[
          'px-3.5 py-2 text-xs transition-colors border-b-2 -mb-px flex items-center gap-2 shrink-0',
          currentTab === tab.id
            ? 'border-primary text-primary bg-primary-soft/40 font-semibold rounded-t-md'
            : 'border-transparent text-ink-2 hover:text-ink font-medium'
        ]"
        @click="currentTab = tab.id"
      >
        <span>{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-line text-ink-2">
          {{ tab.count() }}
        </span>
      </button>
    </div>

    <!-- Data Table Card per 11.5.11 -->
    <div class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[13px] border-collapse min-w-[650px]">
          <thead class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-3">Nama Referensi</th>
              <th class="px-4 py-3">Detail / Relasi</th>
              <th class="px-4 py-3">Status Penggunaan</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr
              v-for="item in currentItems"
              :key="item.id"
              class="hover:bg-muted/40 transition-colors"
            >
              <td class="px-4 py-3 font-semibold text-ink">
                {{ item.name }}
              </td>
              <td class="px-4 py-3 text-xs">
                <!-- Shifts -->
                <span v-if="currentTab === 'shifts'" class="font-mono text-ink font-medium">
                  {{ item.start_time }} - {{ item.end_time }}
                </span>
                <!-- Machines -->
                <span v-else-if="currentTab === 'machines'" class="text-primary font-medium">
                  {{ item.code }} • {{ getPlantName(item.plant_id) }}
                </span>
                <!-- Sub Machines -->
                <span v-else-if="currentTab === 'subMachines'" class="text-success font-medium">
                  Mesin: {{ getMachineName(item.machine_id) }}
                </span>
                <!-- Plants -->
                <span v-else-if="currentTab === 'plants'" class="font-mono text-ink-2 font-medium">
                  {{ item.code || '-' }}
                </span>
                <!-- Work Groups -->
                <span v-else-if="currentTab === 'workGroups'" class="text-ink-2">
                  {{ item.description || '-' }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium leading-none',
                    item.isActive !== false ? 'bg-status-approved-bg text-status-approved-fg' : 'bg-status-draft-bg text-status-draft-fg'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', item.isActive !== false ? 'bg-status-approved-dot' : 'bg-status-draft-dot']" />
                  {{ item.isActive !== false ? 'Aktif' : 'Dinonaktifkan' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                    @click="openEditModal(item)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    :class="[
                      'h-7 px-2.5 rounded-md text-xs font-medium transition',
                      item.isActive !== false ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10'
                    ]"
                    @click="toggleActiveStatus(item)"
                  >
                    {{ item.isActive !== false ? 'Nonaktifkan' : 'Aktifkan' }}
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
      :title="editingId ? `Edit ${currentTabTitle}` : `Tambah ${currentTabTitle}`"
      @close="isModalOpen = false"
    >
      <form @submit.prevent="saveItem" class="space-y-3.5 text-xs">
        <div>
          <label class="block font-medium text-ink mb-1">
            Nama Referensi <span class="text-danger">*</span>
          </label>
          <input
            v-model="modalForm.name"
            type="text"
            required
            placeholder="Masukkan nama..."
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <!-- Shift times -->
        <div v-if="currentTab === 'shifts'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-medium text-ink mb-1">Jam Mulai Shift</label>
            <input
              v-model="modalForm.start_time"
              type="time"
              required
              class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink font-mono focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label class="block font-medium text-ink mb-1">Jam Selesai Shift</label>
            <input
              v-model="modalForm.end_time"
              type="time"
              required
              class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink font-mono focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <!-- Machines: Code & Plant ID -->
        <div v-if="currentTab === 'machines'" class="space-y-3">
          <div>
            <label class="block font-medium text-ink mb-1">Kode Mesin</label>
            <input
              v-model="modalForm.code"
              type="text"
              placeholder="EQ-xxx"
              class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink font-mono focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label class="block font-medium text-ink mb-1">Lokasi Plant Satoria <span class="text-danger">*</span></label>
            <select
              v-model="modalForm.plant_id"
              required
              class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:border-primary focus:outline-none cursor-pointer"
            >
              <option v-for="p in masterStore.plants" :key="p.id" :value="p.id">
                {{ p.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Sub Machines: Machine ID -->
        <div v-if="currentTab === 'subMachines'">
          <label class="block font-medium text-ink mb-1">Pilih Mesin Induk <span class="text-danger">*</span></label>
          <select
            v-model="modalForm.machine_id"
            required
            class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:border-primary focus:outline-none cursor-pointer"
          >
            <option v-for="m in masterStore.machines" :key="m.id" :value="m.id">
              {{ m.name }}
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
            Simpan Master Data
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMasterStore } from '../../stores/master'
import AppModal from '../../components/common/AppModal.vue'

const masterStore = useMasterStore()

const currentTab = ref('plants')
const isModalOpen = ref(false)
const editingId = ref(null)
const modalForm = ref({ name: '', code: '', start_time: '07:00', end_time: '15:00', plant_id: 1, machine_id: 1 })

onMounted(async () => {
  await masterStore.fetchAll()
})

const tabs = [
  { id: 'plants', label: 'Plant Pabrik', icon: '🏢', count: () => masterStore.plants.length },
  { id: 'shifts', label: 'Shift Kerja', icon: '🕒', count: () => masterStore.shifts.length },
  { id: 'machines', label: 'Mesin Pabrik', icon: '⚙️', count: () => masterStore.machines.length },
  { id: 'subMachines', label: 'Sub-Mesin (Bagian)', icon: '🔩', count: () => masterStore.subMachines.length },
  { id: 'workGroups', label: 'Grup Kerja', icon: '👥', count: () => masterStore.workGroups.length }
]

const currentTabTitle = computed(() => {
  const match = tabs.find(t => t.id === currentTab.value)
  return match ? match.label : 'Data'
})

const currentItems = computed(() => {
  return masterStore[currentTab.value] || []
})

function getPlantName(plantId) {
  const p = masterStore.plants.find(item => item.id === plantId)
  return p ? p.name : '-'
}

function getMachineName(machineId) {
  const m = masterStore.machines.find(item => item.id === machineId)
  return m ? m.name : '-'
}

function openAddModal() {
  editingId.value = null
  modalForm.value = {
    name: '',
    code: '',
    start_time: '07:00',
    end_time: '15:00',
    plant_id: masterStore.plants[0]?.id || 1,
    machine_id: masterStore.machines[0]?.id || 1
  }
  isModalOpen.value = true
}

function openEditModal(item) {
  editingId.value = item.id
  modalForm.value = { ...item }
  isModalOpen.value = true
}

async function saveItem() {
  const mappedType = currentTab.value === 'subMachines' ? 'sub_machines' : (currentTab.value === 'workGroups' ? 'work_groups' : currentTab.value)
  if (editingId.value) {
    await masterStore.updateItem(mappedType, editingId.value, modalForm.value)
  } else {
    await masterStore.addItem(mappedType, modalForm.value)
  }
  isModalOpen.value = false
}

async function toggleActiveStatus(item) {
  const mappedType = currentTab.value === 'subMachines' ? 'sub_machines' : (currentTab.value === 'workGroups' ? 'work_groups' : currentTab.value)
  await masterStore.toggleActive(mappedType, item.id)
}
</script>
