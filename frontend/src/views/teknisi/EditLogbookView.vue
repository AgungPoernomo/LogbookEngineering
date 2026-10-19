<template>
  <div class="max-w-2xl mx-auto space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between pb-3 border-b border-line">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Perbaikan Logbook Satoria</div>
        <h1 class="text-xl font-semibold text-ink tracking-tight">
          {{ logbook?.status === 'REJECTED' ? 'Perbaiki & Ajukan Ulang Logbook' : 'Edit Draft Logbook' }}
        </h1>
        <p class="text-xs text-ink-2 mt-0.5">
          Logbook ID #{{ route.params.id }} • Status:
          <span class="font-medium text-ink">{{ logbook?.status }}</span>
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line bg-surface text-ink text-xs font-medium hover:bg-muted transition"
        @click="router.back()"
      >
        ← Kembali
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-surface p-12 rounded-lg border border-line text-center text-xs text-ink-2">
      Memuat data logbook...
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4 rounded-lg bg-status-rejected-bg border border-danger/30 text-status-rejected-fg text-xs flex items-center justify-between">
      <span>{{ error }}</span>
      <button type="button" class="underline font-semibold" @click="fetchData">Coba Lagi</button>
    </div>

    <!-- Form Card -->
    <div v-else-if="logbook" class="bg-surface rounded-lg shadow-card p-5 border border-line">
      <LogbookForm
        :initial-data="logbook"
        :is-edit="true"
        :supervisor-notes="logbook.approval_notes"
        :submitting="submitting"
        @submit-draft="handleSaveDraft"
        @submit-approval="handleSaveApproval"
        @cancel="router.back()"
      />
    </div>

    <!-- Toast Notification -->
    <Toast
      :show="toast.show"
      :variant="toast.variant"
      :message="toast.message"
      @close="toast.show = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logbookService } from '../../services/logbookService'
import { useAuthStore } from '../../stores/auth'
import LogbookForm from '../../components/logbook/LogbookForm.vue'
import Toast from '../../components/common/Toast.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const logbook = ref(null)
const loading = ref(true)
const error = ref('')
const submitting = ref(false)

const toast = reactive({
  show: false,
  variant: 'success',
  message: ''
})

function showToast(variant, message) {
  toast.variant = variant
  toast.message = message
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, 3500)
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const data = await logbookService.getLogbookById(route.params.id)
    logbook.value = data
  } catch (err) {
    error.value = err.message || 'Gagal memuat logbook.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

async function handleSaveDraft(payload) {
  submitting.value = true
  try {
    const updated = await logbookService.updateLogbook(route.params.id, { ...payload, is_submit: false }, authStore.user)
    logbook.value = { ...updated }
    showToast('success', 'Perubahan draft logbook berhasil disimpan.')
  } catch (err) {
    showToast('danger', err.message || 'Gagal menyimpan draft.')
  } finally {
    submitting.value = false
  }
}

async function handleSaveApproval(payload) {
  submitting.value = true
  try {
    const updated = await logbookService.updateLogbook(route.params.id, { ...payload, is_submit: true }, authStore.user)
    logbook.value = { ...updated }
    showToast('success', 'Logbook berhasil dikirim untuk persetujuan Supervisor.')
  } catch (err) {
    showToast('danger', err.message || 'Gagal mengirim logbook.')
  } finally {
    submitting.value = false
  }
}
</script>
