<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
    <!-- Backdrop Overlay -->
    <div
      class="fixed inset-0 bg-ink/30 backdrop-blur-[1px] transition-opacity duration-200"
      @click="handleRequestClose"
    />

    <!-- Drawer Panel Slide From Right -->
    <div class="fixed inset-y-0 right-0 max-w-full flex pl-10">
      <div
        class="w-screen max-w-full md:max-w-[440px] bg-surface shadow-tooltip flex flex-col transform transition-transform ease-out duration-200"
      >
        <!-- Header Lengket -->
        <div class="h-14 px-5 border-b border-line flex items-center justify-between shrink-0 select-none bg-surface">
          <h2 id="drawer-title" class="text-sm font-semibold text-ink">
            {{ isEdit ? 'Perbaiki Logbook' : 'Logbook Baru' }}
          </h2>
          <button
            type="button"
            class="w-8 h-8 rounded-md flex items-center justify-center text-ink-2 hover:bg-muted hover:text-ink transition"
            aria-label="Tutup"
            @click="handleRequestClose"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Form Content (Scrollable) -->
        <div class="flex-1 overflow-y-auto p-5">
          <LogbookForm
            ref="formRef"
            :initial-data="initialData"
            :is-edit="isEdit"
            :submitting="submitting"
            @submit-draft="handleSubmitDraft"
            @submit-approval="handleSubmitApproval"
            @cancel="handleRequestClose"
            @change="isFormDirty = true"
          >
            <!-- Custom Footer in Drawer -->
            <template #footer="{ submitting: isSub, handleSubmit: submitFn }">
              <div class="hidden">
                <!-- handled in drawer sticky footer below -->
              </div>
            </template>
          </LogbookForm>
        </div>

        <!-- Footer Lengket di Bawah -->
        <div class="p-4 border-t border-line bg-surface flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            :disabled="submitting"
            class="h-9 px-3.5 rounded-md text-xs font-medium text-ink-2 hover:bg-muted transition disabled:opacity-50"
            @click="handleRequestClose"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="submitting"
            class="h-9 px-4 rounded-md border border-line bg-surface text-ink hover:bg-muted text-xs font-medium transition disabled:opacity-50"
            @click="triggerSubmit(false)"
          >
            Simpan Draft
          </button>
          <button
            type="button"
            :disabled="submitting"
            class="h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium transition shadow-card disabled:opacity-50 flex items-center gap-1.5"
            @click="triggerSubmit(true)"
          >
            <svg v-if="submitting" class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Kirim Logbook</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Konfirmasi Buang Perubahan -->
    <AppModal
      :is-open="showDiscardModal"
      title="Buang perubahan?"
      @close="showDiscardModal = false"
    >
      <div class="text-xs text-ink leading-relaxed">
        Data formulir yang belum disimpan akan hilang. Apakah Anda yakin ingin keluar?
      </div>
      <template #footer>
        <button
          type="button"
          class="h-8 px-3 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
          @click="showDiscardModal = false"
        >
          Lanjut Mengisi
        </button>
        <button
          type="button"
          class="h-8 px-3 rounded-md text-xs font-medium bg-danger hover:bg-red-700 text-white transition shadow-sm"
          @click="confirmDiscard"
        >
          Buang
        </button>
      </template>
    </AppModal>

    <!-- Modal Konfirmasi Kirim Logbook -->
    <AppModal
      :is-open="showConfirmSubmitModal"
      title="Kirim logbook?"
      @close="showConfirmSubmitModal = false"
    >
      <div class="text-xs text-ink leading-relaxed">
        Setelah dikirim, logbook tidak dapat diubah sampai ditinjau oleh Supervisor. Pastikan seluruh rincian pengerjaan telah akurat.
      </div>
      <template #footer>
        <button
          type="button"
          class="h-8 px-3 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
          @click="showConfirmSubmitModal = false"
        >
          Periksa Lagi
        </button>
        <button
          type="button"
          class="h-8 px-4 rounded-md text-xs font-medium bg-primary hover:bg-blue-700 text-white transition shadow-sm"
          @click="proceedSubmitApproval"
        >
          Kirim
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import LogbookForm from './LogbookForm.vue'
import AppModal from '../common/AppModal.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  initialData: {
    type: Object,
    default: () => ({})
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  submitting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'save-draft', 'submit-approval'])

const formRef = ref(null)
const isFormDirty = ref(false)
const showDiscardModal = ref(false)
const showConfirmSubmitModal = ref(false)
const pendingPayload = ref(null)

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      isFormDirty.value = false
      showDiscardModal.value = false
      showConfirmSubmitModal.value = false
      pendingPayload.value = null
    }
  }
)

function handleRequestClose() {
  if (isFormDirty.value) {
    showDiscardModal.value = true
  } else {
    emit('close')
  }
}

function confirmDiscard() {
  showDiscardModal.value = false
  isFormDirty.value = false
  emit('close')
}

function triggerSubmit(isSubmitForApproval) {
  if (!formRef.value) return
  if (!formRef.value.validate(isSubmitForApproval)) return

  const payload = formRef.value.getPayload(isSubmitForApproval)
  if (isSubmitForApproval) {
    pendingPayload.value = payload
    showConfirmSubmitModal.value = true
  } else {
    emit('save-draft', payload)
  }
}

function handleSubmitDraft(payload) {
  emit('save-draft', payload)
}

function handleSubmitApproval(payload) {
  pendingPayload.value = payload
  showConfirmSubmitModal.value = true
}

function proceedSubmitApproval() {
  showConfirmSubmitModal.value = false
  if (pendingPayload.value) {
    emit('submit-approval', pendingPayload.value)
  }
}
</script>
