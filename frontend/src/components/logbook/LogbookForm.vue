<template>
  <form @submit.prevent="handleSubmit(true)" class="space-y-4">
    <!-- Supervisor notes if in edit/rejected mode -->
    <div
      v-if="supervisorNotes"
      class="p-3 bg-status-rejected-bg border border-danger/20 rounded-md text-status-rejected-fg text-xs"
      role="alert"
    >
      <div class="font-semibold mb-1 flex items-center gap-1.5">
        <AlertCircle class="w-4 h-4 text-danger shrink-0" />
        <span>Catatan Revisi dari Supervisor:</span>
      </div>
      <div class="leading-relaxed pl-5.5">{{ supervisorNotes }}</div>
    </div>

    <!-- Error message banner if validation fails -->
    <div
      v-if="errorMessage"
      class="p-3 rounded-md bg-status-rejected-bg border border-danger/30 text-status-rejected-fg text-xs flex items-center gap-2"
      role="alert"
    >
      <AlertCircle class="w-4 h-4 shrink-0 text-danger" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- 1. Tanggal Pekerjaan -->
    <div>
      <label for="form-task-date" class="block text-xs font-medium text-ink mb-1">
        Tanggal Pekerjaan <span class="text-danger" aria-hidden="true">*</span>
      </label>
      <input
        id="form-task-date"
        v-model="form.task_date"
        type="date"
        required
        aria-required="true"
        :aria-invalid="!!errors.task_date"
        :aria-describedby="errors.task_date ? 'err-task-date' : undefined"
        class="w-full h-9 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
        @input="emitChange"
      />
      <p v-if="errors.task_date" id="err-task-date" class="text-[11px] text-danger mt-1">
        {{ errors.task_date }}
      </p>
    </div>

    <!-- 2. Lokasi Fasilitas (Plant) & 3. Shift Kerja -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label for="form-plant" class="block text-xs font-medium text-ink mb-1">
          Lokasi Fasilitas (Plant) <span class="text-danger" aria-hidden="true">*</span>
        </label>
        <select
          id="form-plant"
          v-model="form.plant_id"
          required
          aria-required="true"
          class="w-full h-9 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer"
          @change="emitChange"
        >
          <option v-for="p in masterStore.plants" :key="p.id" :value="p.id">
            {{ p.name }}
          </option>
        </select>
      </div>

      <div>
        <label for="form-shift" class="block text-xs font-medium text-ink mb-1">
          Shift Kerja <span class="text-danger" aria-hidden="true">*</span>
        </label>
        <select
          id="form-shift"
          v-model="form.shift_id"
          required
          aria-required="true"
          class="w-full h-9 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer"
          @change="emitChange"
        >
          <option v-for="s in masterStore.shifts" :key="s.id" :value="s.id">
            {{ s.name }} ({{ s.start_time }} - {{ s.end_time }})
          </option>
        </select>
      </div>
    </div>

    <!-- 4. Mesin & 5. Sub-mesin -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label for="form-machine" class="block text-xs font-medium text-ink mb-1">
          Peralatan Mesin <span class="text-danger" aria-hidden="true">*</span>
        </label>
        <select
          id="form-machine"
          v-model="form.machine_id"
          required
          aria-required="true"
          :aria-invalid="!!errors.machine_id"
          :aria-describedby="errors.machine_id ? 'err-machine-id' : undefined"
          class="w-full h-9 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer"
          @change="handleMachineChange"
        >
          <option :value="null" disabled>Pilih Mesin</option>
          <option v-for="m in filteredMachines" :key="m.id" :value="m.id">
            {{ m.name }} ({{ m.code }})
          </option>
        </select>
        <p v-if="errors.machine_id" id="err-machine-id" class="text-[11px] text-danger mt-1">
          {{ errors.machine_id }}
        </p>
      </div>

      <div>
        <label for="form-submachine" class="block text-xs font-medium text-ink mb-1">
          Bagian Mesin (Sub-Machine)
        </label>
        <select
          id="form-submachine"
          v-model="form.sub_machine_id"
          :disabled="!form.machine_id"
          class="w-full h-9 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          @change="emitChange"
        >
          <option :value="null">Pilih Bagian Mesin (Opsional)</option>
          <option v-for="sm in filteredSubMachines" :key="sm.id" :value="sm.id">
            {{ sm.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- 6. Jam Mulai & 7. Jam Selesai & 8. Durasi -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label for="form-start-time" class="block text-xs font-medium text-ink mb-1">
          Jam Mulai <span class="text-danger" aria-hidden="true">*</span>
        </label>
        <input
          id="form-start-time"
          v-model="form.start_time"
          type="time"
          required
          aria-required="true"
          class="w-full h-9 px-3 rounded-md border border-line bg-surface text-xs font-mono font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
          @input="emitChange"
        />
      </div>

      <div>
        <label for="form-end-time" class="block text-xs font-medium text-ink mb-1">
          Jam Selesai <span class="text-danger" aria-hidden="true">*</span>
        </label>
        <input
          id="form-end-time"
          v-model="form.end_time"
          type="time"
          required
          aria-required="true"
          :aria-invalid="!!errors.end_time"
          :aria-describedby="errors.end_time ? 'err-end-time' : undefined"
          class="w-full h-9 px-3 rounded-md border border-line bg-surface text-xs font-mono font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
          @input="emitChange"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-ink mb-1">
          Durasi Pekerjaan
        </label>
        <div class="h-9 px-3 rounded-md bg-primary-soft/60 border border-primary/20 flex flex-col justify-center">
          <span class="text-xs font-semibold text-primary font-mono truncate leading-tight">
            {{ liveDurationFormatted }}
          </span>
          <span v-if="isCrossMidnight" class="text-[10px] text-warning font-medium leading-none mt-0.5">
            🌙 Melewati tengah malam
          </span>
        </div>
      </div>
    </div>
    <p v-if="errors.end_time" id="err-end-time" class="text-[11px] text-danger -mt-2">
      {{ errors.end_time }}
    </p>

    <!-- 9. Suku Cadang -->
    <div>
      <label for="form-sparepart" class="block text-xs font-medium text-ink mb-1">
        Suku Cadang yang Digunakan
      </label>
      <input
        id="form-sparepart"
        v-model="form.sparepart"
        type="text"
        placeholder="Contoh: Bearing 6204-ZZ (2 pcs), O-ring Viton (1 set)"
        class="w-full h-9 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder:text-ink-3 placeholder:font-normal"
        @input="emitChange"
      />
    </div>

    <!-- 10. Deskripsi Aktivitas -->
    <div>
      <label for="form-activity" class="block text-xs font-medium text-ink mb-1">
        Uraian Lengkap Aktivitas Pekerjaan <span class="text-danger" aria-hidden="true">*</span>
      </label>
      <textarea
        id="form-activity"
        v-model="form.activity_description"
        rows="4"
        required
        aria-required="true"
        :aria-invalid="!!errors.activity_description"
        :aria-describedby="errors.activity_description ? 'err-activity' : undefined"
        placeholder="Jelaskan temuan kondisi mesin, tindakan perbaikan atau pemeliharaan yang dilakukan, parameter hasil uji, dsb..."
        class="w-full p-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition leading-relaxed placeholder:text-ink-3 placeholder:font-normal"
        @input="emitChange"
      />
      <p v-if="errors.activity_description" id="err-activity" class="text-[11px] text-danger mt-1">
        {{ errors.activity_description }}
      </p>
    </div>

    <!-- Footer Action Buttons (Slot or default) -->
    <slot name="footer" :submitting="submitting" :handleSubmit="handleSubmit" :handleCancel="handleCancel">
      <div class="pt-3 border-t border-line flex items-center justify-end gap-2.5">
        <button
          type="button"
          :disabled="submitting"
          class="h-9 px-3.5 rounded-md text-xs font-medium text-ink-2 hover:bg-muted transition disabled:opacity-50"
          @click="handleCancel"
        >
          Batal
        </button>
        <button
          type="button"
          :disabled="submitting"
          class="h-9 px-4 rounded-md border border-line bg-surface text-ink hover:bg-muted text-xs font-medium transition disabled:opacity-50"
          @click="handleSubmit(false)"
        >
          Simpan Draft
        </button>
        <button
          type="submit"
          :disabled="submitting"
          class="h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium transition shadow-card disabled:opacity-50 flex items-center gap-1.5"
        >
          <svg v-if="submitting" class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>Kirim Logbook</span>
        </button>
      </div>
    </slot>
  </form>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { AlertCircle } from 'lucide-vue-next'
import { useAuthStore } from '../../stores/auth'
import { useMasterStore } from '../../stores/master'
import { calculateDurationMinutes, formatDuration } from '../../utils/duration'
import { toLocalDateString } from '../../utils/dateKeys'

const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({})
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  supervisorNotes: {
    type: String,
    default: ''
  },
  submitting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit-draft', 'submit-approval', 'cancel', 'change'])

const authStore = useAuthStore()
const masterStore = useMasterStore()

const errorMessage = ref('')
const errors = ref({})
const isDirty = ref(false)

const form = ref({
  task_date: props.initialData.task_date || toLocalDateString(new Date()),
  plant_id: props.initialData.plant_id || authStore.user?.plant_id || 1,
  shift_id: props.initialData.shift_id || 1,
  machine_id: props.initialData.machine_id || 1,
  sub_machine_id: props.initialData.sub_machine_id || null,
  start_time: props.initialData.start_time || '08:00',
  end_time: props.initialData.end_time || '09:00',
  sparepart: props.initialData.sparepart || '',
  activity_description: props.initialData.activity_description || ''
})

// Watch initialData when opened or changed
watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      form.value = {
        task_date: newData.task_date || form.value.task_date || toLocalDateString(new Date()),
        plant_id: newData.plant_id || form.value.plant_id || authStore.user?.plant_id || 1,
        shift_id: newData.shift_id || form.value.shift_id || 1,
        machine_id: newData.machine_id !== undefined ? newData.machine_id : form.value.machine_id,
        sub_machine_id: newData.sub_machine_id !== undefined ? newData.sub_machine_id : form.value.sub_machine_id,
        start_time: newData.start_time || form.value.start_time || '08:00',
        end_time: newData.end_time || form.value.end_time || '09:00',
        sparepart: newData.sparepart || '',
        activity_description: newData.activity_description || ''
      }
      isDirty.value = false
    }
  },
  { deep: true }
)

onMounted(async () => {
  await masterStore.fetchAll()
  if (!form.value.plant_id && authStore.user?.plant_id) {
    form.value.plant_id = authStore.user.plant_id
  }
  if (!form.value.machine_id && masterStore.machines.length > 0) {
    form.value.machine_id = masterStore.machines[0].id
  }
})

const filteredMachines = computed(() => {
  if (!form.value.plant_id) return masterStore.machines
  const matches = masterStore.machines.filter(m => m.plant_id === Number(form.value.plant_id))
  return matches.length > 0 ? matches : masterStore.machines
})

const filteredSubMachines = computed(() => {
  if (!form.value.machine_id) return []
  return masterStore.subMachines.filter(sm => sm.machine_id === Number(form.value.machine_id))
})

const liveDurationMinutes = computed(() => {
  return calculateDurationMinutes(form.value.start_time, form.value.end_time)
})

const liveDurationFormatted = computed(() => {
  return formatDuration(liveDurationMinutes.value)
})

const isCrossMidnight = computed(() => {
  if (!form.value.start_time || !form.value.end_time) return false
  return form.value.end_time < form.value.start_time
})

function handleMachineChange() {
  const match = filteredSubMachines.value[0]
  form.value.sub_machine_id = match ? match.id : null
  emitChange()
}

function emitChange() {
  isDirty.value = true
  emit('change', true)
}

function validate(isSubmitForApproval) {
  errors.value = {}
  errorMessage.value = ''

  if (!form.value.task_date) {
    errors.value.task_date = 'Tanggal pekerjaan wajib diisi'
  }
  if (!form.value.start_time) {
    errors.value.start_time = 'Jam mulai wajib diisi'
  }
  if (!form.value.end_time) {
    errors.value.end_time = 'Jam selesai wajib diisi'
  }
  if (form.value.start_time && form.value.end_time && form.value.start_time === form.value.end_time) {
    errors.value.end_time = 'Jam selesai tidak boleh sama dengan jam mulai'
  }

  if (isSubmitForApproval) {
    if (!form.value.machine_id) {
      errors.value.machine_id = 'Pilih mesin terlebih dahulu'
    }
    if (!form.value.activity_description || !form.value.activity_description.trim()) {
      errors.value.activity_description = 'Uraian aktivitas pekerjaan wajib diisi'
    }
  }

  if (Object.keys(errors.value).length > 0) {
    errorMessage.value = Object.values(errors.value)[0]
    return false
  }

  return true
}

function getPayload(isSubmit) {
  const plant = masterStore.plants.find(p => p.id === Number(form.value.plant_id))
  const shift = masterStore.shifts.find(s => s.id === Number(form.value.shift_id))
  const machine = masterStore.machines.find(m => m.id === Number(form.value.machine_id))
  const subMachine = masterStore.subMachines.find(sm => sm.id === Number(form.value.sub_machine_id))

  return {
    ...form.value,
    plant_name: plant?.name || 'Plant Satoria',
    shift_name: shift?.name || 'Shift 1',
    machine_name: machine?.name || 'Mesin Pabrik',
    sub_machine_name: subMachine?.name || '-',
    is_submit: isSubmit
  }
}

function handleSubmit(isSubmitForApproval) {
  if (!validate(isSubmitForApproval)) return

  const payload = getPayload(isSubmitForApproval)
  if (isSubmitForApproval) {
    emit('submit-approval', payload)
  } else {
    emit('submit-draft', payload)
  }
}

function handleCancel() {
  emit('cancel')
}

defineExpose({
  form,
  isDirty,
  validate,
  getPayload
})
</script>
