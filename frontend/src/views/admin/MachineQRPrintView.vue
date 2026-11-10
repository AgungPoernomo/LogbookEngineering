<template>
  <div class="space-y-4 qr-print-page">
    <!-- Header / toolbar (disembunyikan saat cetak) -->
    <div class="print-hide bg-surface rounded-lg shadow-card border border-line p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0">
        <button
          type="button"
          class="h-8 px-2.5 rounded-md border border-line bg-surface hover:bg-muted text-ink text-xs font-medium transition shadow-card inline-flex items-center gap-1.5 shrink-0"
          @click="goBack"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>

        <div class="min-w-0">
          <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Cetak Label QR</div>
          <h1 class="text-[20px] font-semibold text-ink tracking-tight">QR Code Mesin per Line</h1>
          <p class="text-xs text-ink-2 mt-0.5">
            Grid kartu QR siap cetak untuk ditempel di mesin fisik (stiker resmi menyusul Fase 3.2).
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <div class="flex items-center gap-1.5">
          <label class="text-xs text-ink-2 font-medium" for="qr-print-plant">Line:</label>
          <select
            id="qr-print-plant"
            v-model="plantId"
            class="h-8 px-2 text-xs rounded-md border border-line bg-surface text-ink focus:outline-none focus:border-primary cursor-pointer max-w-[200px]"
          >
            <option value="">Pilih Line</option>
            <option v-for="p in masterStore.plants" :key="p.id" :value="String(p.id)">
              {{ p.name }}
            </option>
          </select>
        </div>

        <button
          type="button"
          class="h-8 px-3 rounded-md border border-line bg-surface text-ink hover:bg-muted transition text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isLoading || !plantId"
          @click="loadCards()"
        >
          <RefreshCw :class="['w-3.5 h-3.5', isLoading ? 'animate-spin' : '']" />
          <span>Muat Ulang</span>
        </button>

        <button
          type="button"
          class="h-8 px-4 rounded-md bg-primary hover:bg-blue-700 text-white transition text-xs font-medium shadow-card inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isLoading || cards.length === 0"
          @click="printPage"
        >
          <Printer class="w-3.5 h-3.5" />
          <span>Cetak Halaman Ini</span>
        </button>
      </div>
    </div>

    <!-- Progress pemuatan QR -->
    <div
      v-if="isLoading"
      class="print-hide bg-surface rounded-lg border border-line shadow-card p-3"
    >
      <div class="flex items-center justify-between text-xs text-ink-2 mb-1.5">
        <span>Menyiapkan QR Code…</span>
        <span class="font-medium text-ink">{{ progress.done }}/{{ progress.total }}</span>
      </div>
      <div class="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          class="h-full bg-primary transition-all"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </div>

    <!-- Error state -->
    <div
      v-if="errorMessage && !isLoading"
      class="print-hide bg-surface rounded-lg shadow-card border border-line p-6 text-center"
    >
      <AlertCircle class="w-8 h-8 text-danger mx-auto mb-2 opacity-70" />
      <p class="text-sm font-medium text-ink">Gagal memuat QR mesin</p>
      <p class="text-xs text-ink-2 mt-1">{{ errorMessage }}</p>
      <button
        type="button"
        class="mt-3 h-8 px-3 rounded-md bg-primary hover:bg-blue-700 text-white text-xs font-medium transition shadow-card"
        @click="loadCards()"
      >
        Coba lagi
      </button>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!isLoading && cards.length === 0"
      class="print-hide bg-surface rounded-lg shadow-card border border-line p-8 text-center"
    >
      <QrCode class="w-8 h-8 text-ink-3 mx-auto mb-2" />
      <p class="text-sm font-medium text-ink">Belum ada mesin untuk dicetak</p>
      <p class="text-xs text-ink-2 mt-1">Pilih Line di atas, lalu tekan "Muat Ulang".</p>
    </div>

    <!-- Grid kartu QR (2 kolom di layar, 3 kolom saat cetak) -->
    <div
      v-else
      class="bg-surface rounded-lg shadow-card border border-line p-4 print:border-0 print:shadow-none print:p-0"
    >
      <div class="flex items-center justify-between mb-3 print-hide">
        <div class="text-xs text-ink-2">
          <span class="font-semibold text-ink">{{ cards.length }}</span> kartu QR
          <span v-if="plantLabel">• {{ plantLabel }}</span>
        </div>
        <div class="text-[11px] text-ink-3">Satoria - Engineer Logbook</div>
      </div>

      <div class="qr-grid grid grid-cols-1 sm:grid-cols-2 gap-3 print:grid-cols-3 print:gap-3">
        <div
          v-for="card in cards"
          :key="card.id"
          class="qr-card border border-line rounded-lg p-3 text-center break-inside-avoid bg-surface"
        >
          <div class="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Satoria - Engineer Logbook
          </div>

          <div class="my-2 flex items-center justify-center h-[160px]">
            <img
              v-if="card.image_src"
              :src="card.image_src"
              :alt="`QR Code ${card.name}`"
              class="w-[150px] h-[150px] object-contain qr-image"
            />
            <div v-else class="text-[11px] text-danger px-2">
              {{ card.error || 'QR gagal dimuat' }}
            </div>
          </div>

          <div class="text-[13px] font-bold text-ink leading-tight break-words">
            {{ card.name }}
          </div>
          <div class="text-[11px] text-ink-2 mt-0.5 flex items-center justify-center gap-1">
            <Factory class="w-3 h-3 print-hide" />
            <span>{{ card.plant_name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Printer, Factory, QrCode, AlertCircle } from 'lucide-vue-next'
import { useMasterStore } from '../../stores/master'
import { prepareBatchPrint } from '../../services/machineQrService'
import { alert } from '../../utils/alert'

// ============================================================================
// FASE 5.3 — Halaman cetak batch QR per Line (rute /admin/machines/qr-print?plant_id=X)
// - Menampilkan grid kartu QR (nama mesin, Line, QR, "Satoria - Engineer Logbook").
// - Tombol "Cetak Halaman Ini" → window.print() dengan CSS @media print
//   (toolbar, progress & ikon dekoratif disembunyikan; grid 3 kolom).
// ============================================================================

const route = useRoute()
const router = useRouter()
const masterStore = useMasterStore()

const plantId = ref(route.query.plant_id ? String(route.query.plant_id) : '')
const cards = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const progress = ref({ done: 0, total: 0 })

const progressPercent = computed(() => {
  if (!progress.value.total) return 0
  return Math.round((progress.value.done / progress.value.total) * 100)
})

const plantLabel = computed(() => {
  const found = masterStore.plants.find(p => String(p.id) === String(plantId.value))
  return found ? found.name : ''
})

async function loadCards() {
  if (!plantId.value) {
    cards.value = []
    errorMessage.value = ''
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  progress.value = { done: 0, total: 0 }

  try {
    const result = await prepareBatchPrint(
      { plantId: plantId.value },
      (done, total) => {
        progress.value = { done, total }
      }
    )
    cards.value = result.machines
  } catch (err) {
    cards.value = []
    errorMessage.value = err?.message || 'Gagal menyiapkan QR mesin untuk Line ini.'
  } finally {
    isLoading.value = false
  }
}

// Sinkronkan pilihan Line ke query string agar URL dapat dibagikan / di-refresh.
watch(plantId, (value) => {
  router.replace({
    query: {
      ...route.query,
      ...(value ? { plant_id: value } : { plant_id: undefined })
    }
  })
  loadCards()
})

function printPage() {
  if (cards.value.length === 0) {
    alert.info('Belum Ada Kartu QR', 'Pilih Line yang memiliki mesin lalu muat ulang.')
    return
  }
  window.print()
}

function goBack() {
  router.push({ name: 'admin-machines' })
}

onMounted(async () => {
  await masterStore.fetchAll()
  if (plantId.value) loadCards()
})
</script>

<style scoped>
/* Layout & perilaku khusus cetak: kartu QR dipaksa 3 kolom, toolbar disembunyikan. */
@media print {
  .print-hide {
    display: none !important;
  }

  .qr-print-page {
    padding: 0 !important;
    margin: 0 !important;
  }

  .qr-grid {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 8mm !important;
  }

  .qr-card {
    border: 1px solid #E6E9F0 !important;
    border-radius: 3mm !important;
    break-inside: avoid;
    page-break-inside: avoid;
    padding: 4mm !important;
  }

  .qr-image {
    width: 40mm !important;
    height: 40mm !important;
  }

  @page {
    size: A4;
    margin: 10mm;
  }
}
</style>
