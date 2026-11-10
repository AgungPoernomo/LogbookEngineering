<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <div class="text-[12px] font-medium text-primary uppercase tracking-wider">Penjaga Data & Aset</div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">Radar Aset Belum Terdaftar</h1>
        <p class="text-xs text-ink-2 mt-0.5">
          Aset yang dilaporkan teknisi namun belum ada di master data mesin.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <div class="text-xs text-ink-2 font-medium px-3 py-1.5 rounded-md bg-surface border border-line">
          Menunggu Daftar: <strong class="text-ink">{{ groups.length }} Aset</strong>
          · <strong class="text-ink">{{ totalLogbooks }}</strong> Logbook
        </div>
        <button
          type="button"
          class="h-9 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isLoading"
          @click="fetchAssets()"
        >
          {{ isLoading ? 'Memuat…' : 'Muat Ulang' }}
        </button>
      </div>
    </div>

    <!-- F1.2: indikator memakai cache lokal saat jaringan buruk -->
    <div
      v-if="masterStore.isOffline"
      class="p-2.5 rounded-md bg-status-pending-bg border border-warning/20 text-status-pending-fg text-xs flex items-center gap-2"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-status-pending-dot animate-pulse" />
      <span>{{ masterStore.cacheStatusText }}</span>
    </div>

    <!-- Filter Line/Plant -->
    <div class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="flex items-center gap-1.5">
        <label class="text-xs text-ink-2 font-medium">Line:</label>
        <select
          v-model="plantFilter"
          class="h-9 px-2.5 text-xs rounded-md border border-line bg-surface text-ink focus:outline-none focus:border-primary cursor-pointer max-w-[200px]"
        >
          <option value="all">Semua Line</option>
          <option v-for="p in masterStore.plants" :key="p.id" :value="p.id">
            {{ p.name }}
          </option>
        </select>
      </div>

      <p class="text-[11px] text-ink-3">
        Setelah dipromosikan, aset masuk statistik keandalan (MTTR/MTBF/Pareto).
      </p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="animate-pulse divide-y divide-line">
        <div v-for="n in 4" :key="`sk-${n}`" class="px-4 py-4 flex items-center gap-4">
          <div class="h-3.5 bg-muted rounded w-1/3" />
          <div class="h-3.5 bg-muted rounded w-16" />
          <div class="h-3.5 bg-muted rounded w-24" />
          <div class="h-3.5 bg-muted rounded w-24" />
          <div class="h-7 bg-muted rounded w-28 ml-auto" />
        </div>
      </div>
    </div>

    <!-- Empty state positif -->
    <div
      v-else-if="groups.length === 0"
      class="bg-surface rounded-lg shadow-card border border-line px-6 py-14 text-center"
    >
      <div class="text-3xl mb-2">🎉</div>
      <h3 class="text-sm font-semibold text-ink">Tidak ada aset belum terdaftar 🎉</h3>
      <p class="text-xs text-ink-3 mt-1">
        Semua aset yang dilaporkan teknisi sudah tertaut ke master data mesin.
      </p>
    </div>
    <!-- Tabel Radar Aset -->
    <div v-else class="bg-surface rounded-lg shadow-card border border-line overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-[13px] border-collapse min-w-[760px]">
          <thead class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line">
            <tr>
              <th class="px-4 py-3">Teks Catatan Aset</th>
              <th class="px-4 py-3">Jumlah Logbook</th>
              <th class="px-4 py-3">Line/Plant</th>
              <th class="px-4 py-3">Tanggal Terakhir</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr
              v-for="group in filteredGroups"
              :key="group.key"
              class="hover:bg-muted/40 transition-colors"
            >
              <td class="px-4 py-3">
                <div class="font-semibold text-ink">{{ group.note }}</div>
                <div v-if="group.sample_machine_names.length" class="text-[11px] text-ink-3 mt-0.5">
                  Terkait: {{ group.sample_machine_names.join(', ') }}
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning/10 text-ink">
                  {{ group.count }} logbook
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-ink-2">
                <span class="inline-flex items-center gap-1 font-medium text-ink">
                  🏢 {{ group.plant_name }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-ink-2 font-medium">
                {{ formatDate(group.latest_date) }}
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  class="inline-flex items-center h-7 px-3 rounded-md bg-primary hover:bg-blue-700 text-white font-medium text-[11px] transition shadow-card disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="isSubmitting"
                  @click="openPromoteModal(group)"
                >
                  Jadikan Mesin Baru
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredGroups.length === 0" class="px-4 py-10 text-center text-xs text-ink-3">
        Tidak ada aset belum terdaftar pada Line ini 🎉
      </div>
    </div>

    <!-- Modal Promote → Mesin Baru -->
    <AppModal
      :is-open="isPromoteModalOpen"
      title="Jadikan Mesin Baru"
      @close="closePromoteModal"
    >
      <form class="space-y-3.5 text-xs" @submit.prevent="submitPromote">
        <div class="p-2.5 rounded-md bg-warning/10 border border-warning/20 text-[11px] text-ink-2">
          Catatan aset: <strong class="text-ink">{{ form.note_text }}</strong>
          · {{ selectedGroup?.count || 0 }} logbook akan otomatis ditautkan ke mesin baru.
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">
            Nama Mesin Baru <span class="text-danger">*</span>
          </label>
          <input
            v-model="form.new_machine_name"
            type="text"
            required
            minlength="3"
            maxlength="100"
            placeholder="Contoh: Mesin Filling Cup Line 1"
            class="w-full h-9 px-3 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label class="block font-medium text-ink mb-1">
            Line/Plant <span class="text-danger">*</span>
          </label>
          <select
            v-model="form.plant_id"
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
            :disabled="isSubmitting"
            @click="closePromoteModal"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="h-8 px-4 rounded-md bg-primary hover:bg-blue-700 text-white font-medium text-xs transition shadow-card disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSubmitting ? 'Mendaftarkan…' : 'Daftarkan Mesin' }}
          </button>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMasterStore } from '../../stores/master'
import { alert } from '../../utils/alert'
import AppModal from '../../components/common/AppModal.vue'
import { unmappedAssetService } from '../../services/unmappedAssetService'

const masterStore = useMasterStore()

const groups = ref([])
const isLoading = ref(true)
const isSubmitting = ref(false) // anti multi-submit (BUG-005)
const plantFilter = ref('all')

const isPromoteModalOpen = ref(false)
const selectedGroup = ref(null)
const form = ref({ note_text: '', plant_id: '', new_machine_name: '' })

const totalLogbooks = computed(() =>
  groups.value.reduce((sum, group) => sum + (Number(group.count) || 0), 0)
)

// Filter Line di sisi klien: respons sudah satu query lengkap (tanpa N+1),
// jadi tidak perlu round-trip tambahan ke server.
const filteredGroups = computed(() => {
  const list = groups.value.map(group => ({
    ...group,
    key: `${group.note}::${group.plant_id ?? 'none'}`
  }))

  if (plantFilter.value === 'all') return list
  return list.filter(group => Number(group.plant_id) === Number(plantFilter.value))
})

onMounted(async () => {
  // Master plants dipakai untuk dropdown Line di modal (SWR cache → instan).
  masterStore.fetchAll()
  await fetchAssets()
})

async function fetchAssets() {
  isLoading.value = true
  try {
    const list = await unmappedAssetService.getUnmappedAssets()
    groups.value = list
  } catch (err) {
    groups.value = []
    await alert.error('Gagal Memuat Radar Aset', err.message || 'Tidak dapat mengambil daftar aset belum terdaftar.')
  } finally {
    isLoading.value = false
  }
}

function formatDate(value) {
  if (!value) return '-'
  // `task_date` tersimpan sebagai string YYYY-MM-DD → tampilkan tanpa konversi timezone.
  const parts = String(value).slice(0, 10).split('-')
  if (parts.length !== 3) return String(value)
  const [year, month, day] = parts
  return `${day}/${month}/${year}`
}

function openPromoteModal(group) {
  selectedGroup.value = group
  form.value = {
    note_text: group.note,
    plant_id: group.plant_id ?? masterStore.plants[0]?.id ?? '',
    new_machine_name: group.note.slice(0, 100)
  }
  isPromoteModalOpen.value = true
}

function closePromoteModal() {
  if (isSubmitting.value) return
  isPromoteModalOpen.value = false
  selectedGroup.value = null
}

async function submitPromote() {
  if (isSubmitting.value) return

  const machineName = String(form.value.new_machine_name || '').trim()

  // Validasi field wajib (F1.3: SweetAlert, bukan banner inline)
  if (!machineName) {
    await alert.error('Data Belum Lengkap', 'Nama mesin baru wajib diisi.')
    return
  }
  if (machineName.length < 3) {
    await alert.error('Nama Mesin Terlalu Pendek', 'Nama mesin minimal 3 karakter.')
    return
  }
  if (!form.value.plant_id) {
    await alert.error('Data Belum Lengkap', 'Line/Plant wajib dipilih.')
    return
  }

  const isConfirmed = await alert.confirm(
    'Jadikan Mesin Baru?',
    `Aset "${form.value.note_text}" akan didaftarkan sebagai mesin "${machineName}". ` +
      `Seluruh logbook terkait otomatis ditautkan dan masuk statistik keandalan.`,
    'Ya, daftarkan'
  )
  if (!isConfirmed) return

  isSubmitting.value = true
  try {
    const result = await unmappedAssetService.promoteUnmappedAsset({
      note_text: form.value.note_text,
      plant_id: form.value.plant_id,
      new_machine_name: machineName
    })

    isPromoteModalOpen.value = false
    selectedGroup.value = null

    // Segerakan daftar mesin di store agar dropdown lain langsung memuat mesin baru.
    masterStore.invalidate()

    await fetchAssets()

    const affected = result?.affected_logbooks_count ?? 0
    await alert.success(
      'Mesin Berhasil Didaftarkan',
      `Mesin "${result?.created_machine?.name || machineName}" dibuat. ${affected} logbook berhasil ditautkan.`
    )
  } catch (err) {
    // Pesan duplikat (409) / validasi (400) dari backend ditampilkan apa adanya.
    await alert.error('Gagal Mendaftarkan Mesin', err.message || 'Terjadi kesalahan saat mendaftarkan mesin baru.')
  } finally {
    isSubmitting.value = false
  }
}
</script>
