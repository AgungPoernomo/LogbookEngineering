<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Jadwal & Organisasi Tim</div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">Master Group & Shift Kerja</h1>
        <p class="text-xs text-ink-2 mt-0.5">Kelola pengaturan jadwal shift kerja operasional serta grup/spesialisasi kerja teknisi engineering.</p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm transition shadow-card"
        @click="openAddModal"
      >
        <span>+ Tambah {{ currentTab === 'shifts' ? 'Shift Kerja' : 'Grup Kerja' }}</span>
      </button>
    </div>

    <!-- Shift & Group Tabs -->
    <div class="flex items-center gap-1 border-b border-line overflow-x-auto pb-0.5">
      <button
        type="button"
        :class="[
          'px-4 py-2.5 text-xs transition-colors border-b-2 -mb-px flex items-center gap-2 shrink-0',
          currentTab === 'shifts'
            ? 'border-primary text-primary bg-primary-soft/40 font-semibold rounded-t-md'
            : 'border-transparent text-ink-2 hover:text-ink font-medium'
        ]"
        @click="switchTab('shifts')"
      >
        <span>🕒</span>
        <span>Shift Kerja</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-line text-ink-2">
          {{ masterStore.shifts.length }}
        </span>
      </button>

      <button
        type="button"
        :class="[
          'px-4 py-2.5 text-xs transition-colors border-b-2 -mb-px flex items-center gap-2 shrink-0',
          currentTab === 'workGroups'
            ? 'border-primary text-primary bg-primary-soft/40 font-semibold rounded-t-md'
            : 'border-transparent text-ink-2 hover:text-ink font-medium'
        ]"
        @click="switchTab('workGroups')"
      >
        <span>👥</span>
        <span>Grup Kerja / Departemen</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-line text-ink-2">
          {{ masterStore.workGroups.length }}
        </span>
      </button>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-surface p-3 rounded-lg border border-line shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2 flex-1 max-w-md">
        <div class="relative w-full">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="currentTab === 'shifts' ? 'Cari nama shift...' : 'Cari nama grup atau deskripsi...'"
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

    <!-- TAB 1: Shift Kerja Table -->
    <div v-if="currentTab === 'shifts'" class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[13px] border-collapse min-w-[650px]">
          <thead class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-3">Nama Shift</th>
              <th class="px-4 py-3">Rentang Jam Kerja</th>
              <th class="px-4 py-3">Keterangan</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr
              v-for="shift in filteredShifts"
              :key="shift.id"
              class="hover:bg-muted/40 transition-colors"
            >
              <td class="px-4 py-3 font-semibold text-ink">
                <div class="flex items-center gap-2">
                  <span>🕒</span>
                  <span>{{ shift.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 font-mono text-xs font-semibold text-primary">
                {{ shift.start_time }} - {{ shift.end_time }}
              </td>
              <td class="px-4 py-3 text-xs text-ink-2">
                <span v-if="isCrossMidnight(shift.start_time, shift.end_time)" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-status-pending-bg text-status-pending-fg">
                  🌙 Lintas Hari (Overnight)
                </span>
                <span v-else class="text-ink-2">
                  Shift Reguler ({{ calculateDuration(shift.start_time, shift.end_time) }} Jam)
                </span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium leading-none',
                    shift.isActive !== false ? 'bg-status-approved-bg text-status-approved-fg' : 'bg-status-draft-bg text-status-draft-fg'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', shift.isActive !== false ? 'bg-status-approved-dot' : 'bg-status-draft-dot']" />
                  {{ shift.isActive !== false ? 'Aktif' : 'Dinonaktifkan' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                    @click="openEditShiftModal(shift)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    :class="[
                      'h-7 px-2.5 rounded-md text-xs font-medium transition',
                      shift.isActive !== false ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10'
                    ]"
                    @click="toggleActiveShift(shift)"
                  >
                    {{ shift.isActive !== false ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredShifts.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-xs text-ink-3">
                Tidak ada data shift yang sesuai filter.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: Grup Kerja Table -->
    <div v-else class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[13px] border-collapse min-w-[650px]">
          <thead class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-3">Nama Grup Kerja / Tim</th>
              <th class="px-4 py-3">Deskripsi & Ruang Lingkup</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr
              v-for="group in filteredWorkGroups"
              :key="group.id"
              class="hover:bg-muted/40 transition-colors"
            >
              <td class="px-4 py-3 font-semibold text-ink">
                <div class="flex items-center gap-2">
                  <span>👥</span>
                  <span>{{ group.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-xs text-ink-2 max-w-md">
                {{ group.description || '-' }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium leading-none',
                    group.isActive !== false ? 'bg-status-approved-bg text-status-approved-fg' : 'bg-status-draft-bg text-status-draft-fg'
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', group.isActive !== false ? 'bg-status-approved-dot' : 'bg-status-draft-dot']" />
                  {{ group.isActive !== false ? 'Aktif' : 'Dinonaktifkan' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                    @click="openEditGroupModal(group)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    :class="[
                      'h-7 px-2.5 rounded-md text-xs font-medium transition',
                      group.isActive !== false ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10'
                    ]"
                    @click="toggleActiveGroup(group)"
                  >
                    {{ group.isActive !== false ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredWorkGroups.length === 0">
              <td colspan="4" class="px-4 py-8 text-center text-xs text-ink-3">
                Tidak ada data grup kerja yang sesuai filter.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form (Tambah/Edit Shift) -->
    <AppModal
      :is-open="isShiftModalOpen"
      :title="editingId ? 'Edit Shift Kerja' : 'Tambah Shift Kerja Baru'"
      @close="isShiftModalOpen = false"
    >
      <form @submit.prevent="saveShift" class="space-y-3.5 text-xs">
        <div>
          <label class="block font-medium text-ink mb-1">
            Nama Shift <span class="text-danger">*</span>
          </label>
          <input
            v-model="shiftForm.name"
            type="text"
            required
            placeholder="Contoh: Shift 1 (Pagi)"
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-medium text-ink mb-1">
              Jam Mulai <span class="text-danger">*</span>
            </label>
            <input
              v-model="shiftForm.start_time"
              type="time"
              required
              class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink font-mono focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label class="block font-medium text-ink mb-1">
              Jam Selesai <span class="text-danger">*</span>
            </label>
            <input
              v-model="shiftForm.end_time"
              type="time"
              required
              class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink font-mono focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div class="pt-3 flex justify-end gap-2 border-t border-line">
          <button
            type="button"
            class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
            @click="isShiftModalOpen = false"
          >
            Batal
          </button>
          <button
            type="submit"
            class="h-8 px-4 rounded-md bg-primary hover:bg-blue-700 text-white font-medium text-xs transition shadow-card"
          >
            {{ editingId ? 'Simpan Perubahan' : 'Tambah Shift' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- Modal Form (Tambah/Edit Group) -->
    <AppModal
      :is-open="isGroupModalOpen"
      :title="editingId ? 'Edit Grup Kerja' : 'Tambah Grup Kerja Baru'"
      @close="isGroupModalOpen = false"
    >
      <form @submit.prevent="saveGroup" class="space-y-3.5 text-xs">
        <div>
          <label class="block font-medium text-ink mb-1">
            Nama Grup Kerja / Tim <span class="text-danger">*</span>
          </label>
          <input
            v-model="groupForm.name"
            type="text"
            required
            placeholder="Contoh: Maintenance & Utility"
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">
            Deskripsi / Lingkup Tugas
          </label>
          <textarea
            v-model="groupForm.description"
            rows="3"
            placeholder="Contoh: Pemeliharaan fasilitas umum dan utilitas pabrik"
            class="w-full p-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div class="pt-3 flex justify-end gap-2 border-t border-line">
          <button
            type="button"
            class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
            @click="isGroupModalOpen = false"
          >
            Batal
          </button>
          <button
            type="submit"
            class="h-8 px-4 rounded-md bg-primary hover:bg-blue-700 text-white font-medium text-xs transition shadow-card"
          >
            {{ editingId ? 'Simpan Perubahan' : 'Tambah Grup' }}
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

const currentTab = ref('shifts')
const searchQuery = ref('')
const statusFilter = ref('all')

const isShiftModalOpen = ref(false)
const isGroupModalOpen = ref(false)
const editingId = ref(null)

const shiftForm = ref({ name: '', start_time: '07:00', end_time: '15:00' })
const groupForm = ref({ name: '', description: '' })

onMounted(async () => {
  await masterStore.fetchAll()
})

function switchTab(tab) {
  currentTab.value = tab
  searchQuery.value = ''
  statusFilter.value = 'all'
}

function isCrossMidnight(startTime, endTime) {
  if (!startTime || !endTime) return false
  return startTime > endTime
}

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return 8
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let diffMin = (eh * 60 + em) - (sh * 60 + sm)
  if (diffMin < 0) diffMin += 24 * 60
  return Math.round(diffMin / 60)
}

const filteredShifts = computed(() => {
  let list = masterStore.shifts || []

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

const filteredWorkGroups = computed(() => {
  let list = masterStore.workGroups || []

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(g =>
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.description && g.description.toLowerCase().includes(q))
    )
  }

  if (statusFilter.value === 'active') {
    list = list.filter(g => g.isActive !== false)
  } else if (statusFilter.value === 'inactive') {
    list = list.filter(g => g.isActive === false)
  }

  return list
})

function openAddModal() {
  editingId.value = null
  if (currentTab.value === 'shifts') {
    shiftForm.value = {
      name: '',
      start_time: '07:00',
      end_time: '15:00'
    }
    isShiftModalOpen.value = true
  } else {
    groupForm.value = {
      name: '',
      description: ''
    }
    isGroupModalOpen.value = true
  }
}

function openEditShiftModal(shift) {
  editingId.value = shift.id
  shiftForm.value = {
    name: shift.name,
    start_time: shift.start_time || '07:00',
    end_time: shift.end_time || '15:00'
  }
  isShiftModalOpen.value = true
}

function openEditGroupModal(group) {
  editingId.value = group.id
  groupForm.value = {
    name: group.name,
    description: group.description || ''
  }
  isGroupModalOpen.value = true
}

async function saveShift() {
  if (editingId.value) {
    await masterStore.updateItem('shifts', editingId.value, shiftForm.value)
  } else {
    await masterStore.addItem('shifts', shiftForm.value)
  }
  isShiftModalOpen.value = false
}

async function saveGroup() {
  if (editingId.value) {
    await masterStore.updateItem('work_groups', editingId.value, groupForm.value)
  } else {
    await masterStore.addItem('work_groups', groupForm.value)
  }
  isGroupModalOpen.value = false
}

async function toggleActiveShift(shift) {
  await masterStore.toggleActive('shifts', shift.id)
}

async function toggleActiveGroup(group) {
  await masterStore.toggleActive('work_groups', group.id)
}
</script>
