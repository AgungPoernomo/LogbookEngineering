<template>
  <AppModal
    :is-open="isOpen"
    title="QR Code Mesin"
    @close="handleClose"
  >
    <div class="space-y-4 text-xs">
      <!-- Info mesin (dari endpoint qr-data) -->
      <div class="p-3 rounded-md border border-line bg-muted/60 space-y-1.5">
        <div class="flex items-start gap-1.5">
          <Cpu class="w-3.5 h-3.5 text-ink-3 mt-0.5 shrink-0" />
          <div class="min-w-0">
            <div class="text-[11px] text-ink-2">Nama Mesin</div>
            <div class="text-sm font-semibold text-ink break-words">{{ machineName }}</div>
          </div>
        </div>

        <div class="flex items-start gap-1.5">
          <Factory class="w-3.5 h-3.5 text-ink-3 mt-0.5 shrink-0" />
          <div class="min-w-0">
            <div class="text-[11px] text-ink-2">Line / Plant</div>
            <div class="font-medium text-ink break-words">{{ plantName || '-' }}</div>
          </div>
        </div>

        <div v-if="subMachineNames.length > 0" class="flex items-start gap-1.5">
          <Wrench class="w-3.5 h-3.5 text-ink-3 mt-0.5 shrink-0" />
          <div class="min-w-0">
            <div class="text-[11px] text-ink-2">
              Sub-Mesin ({{ subMachineNames.length }})
            </div>
            <div class="flex flex-wrap gap-1 mt-0.5">
              <span
                v-for="name in subMachineNames"
                :key="name"
                class="px-1.5 py-0.5 rounded-sm bg-surface border border-line text-[10px] text-ink-2"
              >
                {{ name }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview QR -->
      <div class="flex flex-col items-center justify-center p-4 rounded-lg border border-line bg-surface">
        <div
          v-if="isLoadingQr"
          class="w-[200px] h-[200px] rounded-md bg-muted animate-pulse flex items-center justify-center text-[11px] text-ink-3"
        >
          Memuat QR...
        </div>

        <div
          v-else-if="errorMessage"
          class="w-full py-6 text-center space-y-2"
        >
          <AlertCircle class="w-7 h-7 text-danger mx-auto opacity-70" />
          <p class="text-xs text-ink-2">{{ errorMessage }}</p>
          <button
            type="button"
            class="h-7 px-3 rounded-md border border-line bg-surface text-ink hover:bg-muted transition text-xs font-medium"
            @click="loadQr(true)"
          >
            Coba lagi
          </button>
        </div>

        <img
          v-else-if="qrImageSrc"
          :src="qrImageSrc"
          :alt="`QR Code mesin ${machineName}`"
          class="w-[200px] h-[200px] object-contain bg-surface"
          data-testid="machine-qr-image"
        />

        <p class="mt-2 text-[10px] text-ink-3 text-center break-all">
          {{ qrUrlString || `Tempel di mesin • scan untuk membuka Buku Pintar Mesin` }}
        </p>

        <!-- Cache buster: paksa ambil ulang QR dari server (abaikan cache Pinia & HTTP). -->
        <button
          type="button"
          class="mt-1.5 h-6 px-2 rounded-sm border border-line bg-surface text-ink-2 hover:bg-muted hover:text-ink transition text-[10px] font-medium inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Muat ulang QR dari server tanpa cache"
          :disabled="isLoadingQr"
          @click="loadQr(true)"
        >
          <RefreshCw :class="['w-3 h-3', isLoadingQr ? 'animate-spin' : '']" />
          <span>Muat Ulang QR</span>
        </button>
      </div>

      <p class="text-[11px] text-ink-3 leading-relaxed">
        Stiker QR fisik masih menunggu Fase 3.2. Unduh/cetak label di bawah sekarang agar
        siap ditempel saat pengadaan stiker tersedia.
      </p>
    </div>

    <template #footer>
      <button
        type="button"
        v-if="batchPrintTarget"
        class="h-8 px-3 rounded-md border border-line bg-surface text-ink hover:bg-muted transition text-xs font-medium inline-flex items-center gap-1.5 mr-auto"
        title="Cetak QR semua mesin pada Line yang sama"
        @click="openBatchPrint"
      >
        <Grid3x3 class="w-3.5 h-3.5" />
        <span>Cetak Batch</span>
      </button>
      <button
        type="button"
        class="h-8 px-3 rounded-md border border-line bg-surface text-ink hover:bg-muted transition text-xs font-medium"
        @click="handleClose"
      >
        Tutup
      </button>
      <button
        type="button"
        class="h-8 px-3 rounded-md border border-line bg-surface text-ink hover:bg-muted transition text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!qrImageSrc"
        @click="downloadPng"
      >
        <Download class="w-3.5 h-3.5" />
        <span>Unduh PNG</span>
      </button>
      <button
        type="button"
        class="h-8 px-3 rounded-md bg-primary hover:bg-blue-700 text-white transition text-xs font-medium shadow-card inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!qrImageSrc"
        @click="printSingle"
      >
        <Printer class="w-3.5 h-3.5" />
        <span>Cetak</span>
      </button>
    </template>
  </AppModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Cpu, Factory, Wrench, Download, Printer, AlertCircle, Grid3x3, RefreshCw } from 'lucide-vue-next'
import AppModal from '../common/AppModal.vue'
import { useMachineQrStore } from '../../stores/machineQr'
import { alert } from '../../utils/alert'
import {
  buildPrintDocumentHtml,
  openPrintWindow,
  downloadDataUrl,
  buildQrDownloadFilename
} from '../../utils/qrPrint'

// FASE 5.3 — Modal "QR Code Mesin".
// Menampilkan info mesin (nama, Line/Plant, sub-mesin), preview QR dari backend,
// tombol Unduh PNG, dan Cetak (window baru + window.print()).
// Cache QR dikelola store Pinia `machineQr` (TTL 5 menit) + cache buster di
// `machineQrService` → buka-tutup modal tidak re-fetch, tapi data tidak pernah
// tertahan lama saat `FRONTEND_URL` backend berubah. Tombol "Muat Ulang QR"
// memaksa ambil ulang tanpa cache.

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  // Objek mesin dari masterStore (minimal { id, name }).
  machine: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])
const router = useRouter()
const qrStore = useMachineQrStore()

const isLoadingQr = ref(false)
const errorMessage = ref('')

const currentId = computed(() => (props.machine?.id ? Number(props.machine.id) : null))
const entry = computed(() => (currentId.value ? qrStore.getEntry(currentId.value) : null))

const machineName = computed(() => entry.value?.data?.name || props.machine?.name || 'Mesin')
const plantName = computed(() => entry.value?.data?.plant_name || '-')
const qrUrlString = computed(() => entry.value?.data?.qr_url_string || '')
const subMachineNames = computed(() => {
  const list = entry.value?.data?.sub_machines
  return Array.isArray(list) ? list.map(sm => sm.name) : []
})

// Prioritas data URL (aman untuk window cetak), fallback object URL.
const qrImageSrc = computed(() => entry.value?.dataUrl || entry.value?.blobUrl || '')

async function loadQr(force = false) {
  if (!currentId.value) return
  isLoadingQr.value = true
  errorMessage.value = ''
  try {
    const result = await qrStore.load(currentId.value, { force })
    if (!result?.blobUrl) {
      errorMessage.value = result?.error || 'Gagal memuat QR Code mesin.'
    }
  } catch (err) {
    errorMessage.value = err?.message || 'Gagal memuat QR Code mesin.'
  } finally {
    isLoadingQr.value = false
  }
}

// Muat saat modal dibuka untuk mesin tertentu (atau saat mesin diganti).
watch(
  () => [props.isOpen, currentId.value],
  ([isOpen, id]) => {
    if (isOpen && id) loadQr()
    if (!isOpen) errorMessage.value = ''
  },
  { immediate: true }
)

function handleClose() {
  emit('close')
}

function downloadPng() {
  if (!qrImageSrc.value || !currentId.value) return
  const filename = buildQrDownloadFilename({
    id: currentId.value,
    name: entry.value?.data?.name || props.machine?.name
  })
  downloadDataUrl(qrImageSrc.value, filename)
}

function printSingle() {
  if (!qrImageSrc.value || !currentId.value) return
  const html = buildPrintDocumentHtml(
    [{
      name: machineName.value,
      plant_name: plantName.value,
      image_src: qrImageSrc.value
    }],
    {
      title: 'Label QR Mesin',
      subtitle: `${machineName.value} • ${plantName.value}`
    }
  )

  if (!openPrintWindow(html)) {
    alert.error(
      'Popup Diblokir',
      'Browser memblokir jendela cetak. Izinkan popup untuk situs ini lalu coba lagi.'
    )
  }
}

// Tombol "Cetak Batch" (opsional): buka halaman cetak batch untuk Line mesin ini.
const batchPrintTarget = computed(() => {
  const plantId = entry.value?.data?.plant_id
  if (!plantId) return null
  return { name: 'admin-machines-qr-print', query: { plant_id: plantId } }
})

function openBatchPrint() {
  if (!batchPrintTarget.value) return
  emit('close')
  router.push(batchPrintTarget.value)
}
</script>
