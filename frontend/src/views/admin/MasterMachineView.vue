<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Inventaris Peralatan & Mesin</div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">Master Mesin & Sub-Mesin</h1>
        <p class="text-xs text-ink-2 mt-0.5">Kelola data registrasi mesin utama dan komponen sub-mesin / suku cadang terpasang per plant.</p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm transition shadow-card"
        @click="openAddModal"
      >
        <span>+ Tambah {{ currentTab === 'machines' ? 'Mesin Utama' : 'Sub-Mesin' }}</span>
      </button>
    </div>

    <!-- Machine & Sub-Machine Tabs -->
    <div class="flex items-center gap-1 border-b border-line overflow-x-auto pb-0.5">
      <button
        type="button"
        :class="[
          'px-4 py-2.5 text-xs transition-colors border-b-2 -mb-px flex items-center gap-2 shrink-0',
          currentTab === 'machines'
            ? 'border-primary text-primary bg-primary-soft/40 font-semibold rounded-t-md'
            : 'border-transparent text-ink-2 hover:text-ink font-medium'
        ]"
        @click="switchTab('machines')"
      >
        <span>⚙️</span>
        <span>Mesin Utama</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-line text-ink-2">
          {{ masterStore.machines.length }}
        </span>
      </button>

      <button
        type="button"
        :class="[
          'px-4 py-2.5 text-xs transition-colors border-b-2 -mb-px flex items-center gap-2 shrink-0',
          currentTab === 'subMachines'
            ? 'border-primary text-primary bg-primary-soft/40 font-semibold rounded-t-md'
            : 'border-transparent text-ink-2 hover:text-ink font-medium'
        ]"
        @click="switchTab('subMachines')"
      >
        <span>🔩</span>
        <span>Sub-Mesin (Bagian / Komponen)</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-line text-ink-2">
          {{ masterStore.subMachines.length }}
        </span>
      </button>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-surface p-3 rounded-lg border border-line shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 flex-1">
        <!-- Search -->
        <div class="relative w-full sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="currentTab === 'machines' ? 'Cari kode / nama mesin...' : 'Cari nama sub-mesin...'"
            class="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-line bg-surface text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary"
          />
          <span class="absolute left-2.5 top-2 text-ink-3 text-xs">🔍</span>
        </div>

        <!-- Filter Plant -->
        <div class="flex items-center gap-1.5">
          <label class="text-xs text-ink-2 font-medium">Plant:</label>
          <select
            v-model="plantFilter"
            class="h-8 px-2 text-xs rounded-md border border-line bg-surface text-ink focus:outline-none focus:border-primary cursor-pointer max-w-[180px]"
          >
            <option value="all">Semua Plant</option>
            <option v-for="p in masterStore.plants" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>

        <!-- Filter Parent Machine (for SubMachines) -->
        <div v-if="currentTab === 'subMachines'" class="flex items-center gap-1.5">
          <label class="text-xs text-ink-2 font-medium">Mesin Induk:</label>
          <select
            v-model="machineFilter"
            class="h-8 px-2 text-xs rounded-md border border-line bg-surface text-ink focus:outline-none focus:border-primary cursor-pointer max-w-[200px]"
          >
            <option value="all">Semua Mesin</option>
            <option v-for="m in availableMachinesForFilter" :key="m.id" :value="m.id">
              {{ m.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Filter Status -->
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

    <!-- TAB 1: Mesin Utama Table -->
    <div v-if="currentTab === 'machines'" class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[13px] border-collapse min-w-[700px]">
          <thead class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-3">Kode Mesin</th>
              <th class="px-4 py-3">Nama Mesin</th>
              <th class="px-4 py-3">Lokasi Plant</th>
              <th class="px-4 py-3">Sub-Mesin Terdaftar</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr
              v-for="machine in filteredMachines"
              :key="machine.id"
              class="hover:bg-muted/40 transition-colors"
            >
              <td class="px-4 py-3 font-mono text-xs font-semibold text-primary">
                {{ machine.code || '-' }}
              </td>
              <td class="px-4 py-3 font-semibold text-ink">
                {{ machine.name }}
              </td>
              <td class="px-4 py-3 text-xs text-ink-2">
                <span class="inline-flex items-center gap-1 font-medium text-ink">
                  🏢 {{ getPlantName(machine.plant_id) }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-ink hover:bg-primary-soft hover:text-primary transition"
                  @click="viewMachineSubMachines(machine.id)"
                  title="Lihat sub-mesin terkait"
                >
                  🔩 {{ getSubMachinesCount(machine.id) }} Sub-Mesin
                </button>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium leading-none',
                    machine.isActive !== false ? 'bg-status-approved-bg text-status-approved-fg' : 'bg-status-draft-bg text-status-draft-fg'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', machine.isActive !== false ? 'bg-status-approved-dot' : 'bg-status-draft-dot']" />
                  {{ machine.isActive !== false ? 'Aktif' : 'Dinonaktifkan' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                    @click="openEditMachineModal(machine)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    :class="[
                      'h-7 px-2.5 rounded-md text-xs font-medium transition',
                      machine.isActive !== false ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10'
                    ]"
                    @click="toggleActiveMachine(machine)"
                  >
                    {{ machine.isActive !== false ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredMachines.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-xs text-ink-3">
                Tidak ada data mesin yang sesuai filter.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: Sub-Mesin Table -->
    <div v-else class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[13px] border-collapse min-w-[700px]">
          <thead class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-3">Nama Sub-Mesin / Komponen</th>
              <th class="px-4 py-3">Mesin Induk</th>
              <th class="px-4 py-3">Lokasi Plant</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr
              v-for="sub in filteredSubMachines"
              :key="sub.id"
              class="hover:bg-muted/40 transition-colors"
            >
              <td class="px-4 py-3 font-semibold text-ink">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs">🔩</span>
                  <span>{{ sub.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-xs">
                <div class="font-medium text-ink">
                  {{ getMachineName(sub.machine_id) }}
                </div>
                <div class="font-mono text-[11px] text-ink-2">
                  {{ getMachineCode(sub.machine_id) }}
                </div>
              </td>
              <td class="px-4 py-3 text-xs text-ink-2">
                <span class="inline-flex items-center gap-1 font-medium text-ink">
                  🏢 {{ getSubMachinePlantName(sub.machine_id) }}
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium leading-none',
                    sub.isActive !== false ? 'bg-status-approved-bg text-status-approved-fg' : 'bg-status-draft-bg text-status-draft-fg'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', sub.isActive !== false ? 'bg-status-approved-dot' : 'bg-status-draft-dot']" />
                  {{ sub.isActive !== false ? 'Aktif' : 'Dinonaktifkan' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                    @click="openEditSubMachineModal(sub)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    :class="[
                      'h-7 px-2.5 rounded-md text-xs font-medium transition',
                      sub.isActive !== false ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10'
                    ]"
                    @click="toggleActiveSubMachine(sub)"
                  >
                    {{ sub.isActive !== false ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredSubMachines.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-xs text-ink-3">
                Tidak ada data sub-mesin yang sesuai filter.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form (Tambah/Edit Mesin Utama) -->
    <AppModal
      :is-open="isMachineModalOpen"
      :title="editingId ? 'Edit Mesin Utama' : 'Tambah Mesin Utama Baru'"
      @close="isMachineModalOpen = false"
    >
      <form @submit.prevent="saveMachine" class="space-y-3.5 text-xs">
        <div>
          <label class="block font-medium text-ink mb-1">
            Kode Mesin <span class="text-danger">*</span>
          </label>
          <input
            v-model="machineForm.code"
            type="text"
            required
            placeholder="Contoh: EQ-ACV-02"
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium font-mono text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">
            Nama Mesin <span class="text-danger">*</span>
          </label>
          <input
            v-model="machineForm.name"
            type="text"
            required
            placeholder="Contoh: Autoclave Sterilisasi 500L"
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">
            Lokasi Plant Satoria <span class="text-danger">*</span>
          </label>
          <select
            v-model="machineForm.plant_id"
            required
            class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:border-primary focus:outline-none cursor-pointer"
          >
            <option v-for="p in masterStore.plants" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>

        <div class="pt-3 flex justify-end gap-2 border-t border-line">
          <button
            type="button"
            class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
            @click="isMachineModalOpen = false"
          >
            Batal
          </button>
          <button
            type="submit"
            class="h-8 px-4 rounded-md bg-primary hover:bg-blue-700 text-white font-medium text-xs transition shadow-card"
          >
            {{ editingId ? 'Simpan Perubahan' : 'Tambah Mesin' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- Modal Form (Tambah/Edit Sub-Mesin) -->
    <AppModal
      :is-open="isSubMachineModalOpen"
      :title="editingId ? 'Edit Sub-Mesin' : 'Tambah Sub-Mesin Baru'"
      @close="isSubMachineModalOpen = false"
    >
      <form @submit.prevent="saveSubMachine" class="space-y-3.5 text-xs">
        <div>
          <label class="block font-medium text-ink mb-1">
            Pilih Mesin Induk <span class="text-danger">*</span>
          </label>
          <select
            v-model="subMachineForm.machine_id"
            required
            class="w-full h-9 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:border-primary focus:outline-none cursor-pointer"
          >
            <option v-for="m in masterStore.machines" :key="m.id" :value="m.id">
              {{ m.code }} - {{ m.name }} ({{ getPlantName(m.plant_id) }})
            </option>
          </select>
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">
            Nama Sub-Mesin / Bagian / Komponen <span class="text-danger">*</span>
          </label>
          <input
            v-model="subMachineForm.name"
            type="text"
            required
            placeholder="Contoh: Gasket Door Seal & Chamber Silikon"
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div class="pt-3 flex justify-end gap-2 border-t border-line">
          <button
            type="button"
            class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
            @click="isSubMachineModalOpen = false"
          >
            Batal
          </button>
          <button
            type="submit"
            class="h-8 px-4 rounded-md bg-primary hover:bg-blue-700 text-white font-medium text-xs transition shadow-card"
          >
            {{ editingId ? 'Simpan Perubahan' : 'Tambah Sub-Mesin' }}
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

const currentTab = ref('machines')
const searchQuery = ref('')
const plantFilter = ref('all')
const machineFilter = ref('all')
const statusFilter = ref('all')

const isMachineModalOpen = ref(false)
const isSubMachineModalOpen = ref(false)
const editingId = ref(null)

const machineForm = ref({ name: '', code: '', plant_id: 1 })
const subMachineForm = ref({ name: '', machine_id: 1 })

onMounted(async () => {
  await masterStore.fetchAll()
})

function switchTab(tab) {
  currentTab.value = tab
  searchQuery.value = ''
  plantFilter.value = 'all'
  machineFilter.value = 'all'
  statusFilter.value = 'all'
}

function getPlantName(plantId) {
  const p = masterStore.plants.find(item => item.id === Number(plantId))
  return p ? p.name : '-'
}

function getMachineName(machineId) {
  const m = masterStore.machines.find(item => item.id === Number(machineId))
  return m ? m.name : '-'
}

function getMachineCode(machineId) {
  const m = masterStore.machines.find(item => item.id === Number(machineId))
  return m ? m.code : '-'
}

function getSubMachinePlantName(machineId) {
  const m = masterStore.machines.find(item => item.id === Number(machineId))
  return m ? getPlantName(m.plant_id) : '-'
}

function getSubMachinesCount(machineId) {
  return masterStore.subMachines.filter(s => s.machine_id === Number(machineId)).length
}

const availableMachinesForFilter = computed(() => {
  if (plantFilter.value === 'all') return masterStore.machines || []
  return masterStore.machines.filter(m => m.plant_id === Number(plantFilter.value))
})

const filteredMachines = computed(() => {
  let list = masterStore.machines || []

  if (plantFilter.value !== 'all') {
    list = list.filter(m => m.plant_id === Number(plantFilter.value))
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(m =>
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.code && m.code.toLowerCase().includes(q))
    )
  }

  if (statusFilter.value === 'active') {
    list = list.filter(m => m.isActive !== false)
  } else if (statusFilter.value === 'inactive') {
    list = list.filter(m => m.isActive === false)
  }

  return list
})

const filteredSubMachines = computed(() => {
  let list = masterStore.subMachines || []

  if (plantFilter.value !== 'all') {
    const allowedMachineIds = new Set(
      masterStore.machines
        .filter(m => m.plant_id === Number(plantFilter.value))
        .map(m => m.id)
    )
    list = list.filter(s => allowedMachineIds.has(s.machine_id))
  }

  if (machineFilter.value !== 'all') {
    list = list.filter(s => s.machine_id === Number(machineFilter.value))
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(s => s.name && s.name.toLowerCase().includes(q))
  }

  if (statusFilter.value === 'active') {
    list = list.filter(s => s.isActive !== false)
  } else if (statusFilter.value === 'inactive') {
    list = list.filter(s => s.isActive === false)
  }

  return list
})

function viewMachineSubMachines(machineId) {
  currentTab.value = 'subMachines'
  machineFilter.value = machineId
  const m = masterStore.machines.find(item => item.id === machineId)
  if (m) {
    plantFilter.value = m.plant_id
  }
}

function openAddModal() {
  editingId.value = null
  if (currentTab.value === 'machines') {
    machineForm.value = {
      name: '',
      code: `EQ-NEW-0${(masterStore.machines.length || 0) + 1}`,
      plant_id: masterStore.plants[0]?.id || 1
    }
    isMachineModalOpen.value = true
  } else {
    subMachineForm.value = {
      name: '',
      machine_id: masterStore.machines[0]?.id || 1
    }
    isSubMachineModalOpen.value = true
  }
}

function openEditMachineModal(machine) {
  editingId.value = machine.id
  machineForm.value = {
    name: machine.name,
    code: machine.code || '',
    plant_id: machine.plant_id || masterStore.plants[0]?.id || 1
  }
  isMachineModalOpen.value = true
}

function openEditSubMachineModal(sub) {
  editingId.value = sub.id
  subMachineForm.value = {
    name: sub.name,
    machine_id: sub.machine_id || masterStore.machines[0]?.id || 1
  }
  isSubMachineModalOpen.value = true
}

async function saveMachine() {
  if (editingId.value) {
    await masterStore.updateItem('machines', editingId.value, machineForm.value)
  } else {
    await masterStore.addItem('machines', machineForm.value)
  }
  masterStore.invalidate()
  await masterStore.fetchAll(true)
  isMachineModalOpen.value = false
}

async function saveSubMachine() {
  if (editingId.value) {
    await masterStore.updateItem('sub_machines', editingId.value, subMachineForm.value)
  } else {
    await masterStore.addItem('sub_machines', subMachineForm.value)
  }
  masterStore.invalidate()
  await masterStore.fetchAll(true)
  isSubMachineModalOpen.value = false
}

async function toggleActiveMachine(machine) {
  await masterStore.toggleActive('machines', machine.id)
  masterStore.invalidate()
  await masterStore.fetchAll(true)
}

async function toggleActiveSubMachine(sub) {
  await masterStore.toggleActive('sub_machines', sub.id)
  masterStore.invalidate()
  await masterStore.fetchAll(true)
}
</script>
