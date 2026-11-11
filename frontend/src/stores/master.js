import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { masterService } from '../services/masterService'

// F1.2: Stale-While-Revalidate (SWR)
// - Data master di-cache di localStorage (non-sensitif) agar dropdown tetap terisi saat jaringan buruk.
// - Tampilkan cache seketika, fetch di belakang layar, dan HANYA timpa state bila respons sukses & tidak kosong.
const CACHE_KEY = 'satoria_master_cache_v1'
const CACHE_TTL = 5 * 60 * 1000 // 5 menit

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null
    return parsed
  } catch (e) {
    return null
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, fetchedAt: Date.now() }))
  } catch (e) {
    // localStorage penuh / mode privat → abaikan, cache hanya optimasi
  }
}

export const useMasterStore = defineStore('master', () => {
  const plants = ref([])
  const shifts = ref([])
  const machines = ref([])
  const subMachines = ref([])
  const workGroups = ref([])
  const roles = ref([])
  // FASE 5.2 — Katalog sparepart. Tidak ikut `getAllMaster()` (dipakai dropdown
  // form) agar payload master tetap ringan; di-fetch terpisah oleh halaman admin.
  const spareparts = ref([])

  // ── Cache state ──
  const isLoaded = ref(false)
  const lastFetchedAt = ref(0)
  const isLoading = ref(false)
  const loadPromise = ref(null) // dedup concurrent calls
  const isOffline = ref(false) // true bila penyegaran terakhir gagal (memakai cache)

  // Hanya timpa bila respons sukses dan tidak kosong (F1.2) → jangan pernah mengosongkan dropdown
  function applyData(data) {
    if (Array.isArray(data.plants) && data.plants.length > 0) plants.value = data.plants
    if (Array.isArray(data.shifts) && data.shifts.length > 0) shifts.value = data.shifts
    if (Array.isArray(data.machines) && data.machines.length > 0) machines.value = data.machines
    const subs = data.sub_machines || data.subMachines || []
    if (Array.isArray(subs) && subs.length > 0) subMachines.value = subs
    const groups = data.work_groups || data.workGroups || []
    if (Array.isArray(groups) && groups.length > 0) workGroups.value = groups
    if (Array.isArray(data.roles) && data.roles.length > 0) roles.value = data.roles
  }

  function hydrateFromCache() {
    const cached = readCache()
    if (!cached) return false
    applyData(cached.data)
    lastFetchedAt.value = cached.fetchedAt || 0
    isLoaded.value = true
    return true
  }

  async function fetchAll(force = false) {
    // 1. Hidrasi instan dari cache bila memori masih kosong
    if (!isLoaded.value) {
      hydrateFromCache()
    }

    // 2. Cache masih fresh → tidak perlu fetch
    if (!force && isLoaded.value && Date.now() - lastFetchedAt.value < CACHE_TTL) {
      return
    }

    // 3. Ada fetch sedang berjalan → tunggu promise yang sama (dedup)
    if (isLoading.value && loadPromise.value) {
      return loadPromise.value
    }

    isLoading.value = true
    loadPromise.value = masterService.getAllMaster()
      .then((data) => {
        applyData(data)
        const hasAny = (data.plants?.length || data.machines?.length || data.shifts?.length || 0) > 0
        if (hasAny) {
          writeCache({
            plants: plants.value,
            shifts: shifts.value,
            machines: machines.value,
            sub_machines: subMachines.value,
            work_groups: workGroups.value,
            roles: roles.value
          })
          isOffline.value = false
        } else if (plants.value.length > 0 || machines.value.length > 0 || shifts.value.length > 0) {
          // Respons kosong/gagal → pertahankan cache lama & tandai offline
          isOffline.value = true
        }
        lastFetchedAt.value = Date.now()
        isLoaded.value = true
      })
      .catch((err) => {
        // Jangan pernah set array menjadi [] saat gagal
        console.warn('Gagal menyegarkan master data, memakai cache lokal:', err)
        isOffline.value = true
      })
      .finally(() => {
        isLoading.value = false
        loadPromise.value = null
      })

    // 4. Stale-While-Revalidate: bila sudah ada data, kembalikan kontrol segera (revalidate di latar belakang)
    const hasData = plants.value.length > 0 || machines.value.length > 0 || shifts.value.length > 0
    if (hasData && !force) {
      loadPromise.value.catch(() => {})
      return
    }

    return loadPromise.value
  }

  // Force refresh untuk admin setelah CRUD.
  // Cache localStorage ikut dibuang agar tidak ada jalur (hydrate SWR) yang
  // mengembalikan daftar mesin/sub-mesin lama setelah aksi Admin.
  function invalidate() {
    isLoaded.value = false
    lastFetchedAt.value = 0
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch (e) {
      // noop — localStorage penuh / mode privat
    }
  }

  // F1.2: bersihkan cache saat logout
  function clearCache() {
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch (e) {
      // noop
    }
    plants.value = []
    shifts.value = []
    machines.value = []
    subMachines.value = []
    workGroups.value = []
    roles.value = []
    spareparts.value = []
    isLoaded.value = false
    lastFetchedAt.value = 0
    isOffline.value = false
  }

  // Label kecil untuk indikator "Data offline (terakhir diperbarui …)"
  const cacheStatusText = computed(() => {
    if (!isOffline.value) return ''
    if (!lastFetchedAt.value) return 'Data offline'
    try {
      const formatted = new Date(lastFetchedAt.value).toLocaleString('id-ID', {
        hour12: false,
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
      return `Data offline (terakhir diperbarui ${formatted})`
    } catch (e) {
      return 'Data offline'
    }
  })

  async function addItem(type, payload) {
    const res = await masterService.addItem(type, payload)
    invalidate()
    await fetchAll(true)
    return res
  }

  async function updateItem(type, id, payload) {
    const res = await masterService.updateItem(type, id, payload)
    invalidate()
    await fetchAll(true)
    return res
  }

  async function toggleActive(type, id) {
    const res = await masterService.toggleActive(type, id)
    invalidate()
    await fetchAll(true)
    return res
  }

  // ── FASE 5.2 — Sparepart (fetch terpisah, selalu menyertakan part nonaktif) ──
  // `params.itemType` (MACHINE_PART | CONSUMABLE_WORKSHOP) dan `params.search`
  // dikerjakan server-side (satu query), lalu hasilnya disimpan di state.
  const isLoadingSpareparts = ref(false)

  async function fetchSpareparts(params = {}) {
    isLoadingSpareparts.value = true
    try {
      const data = await masterService.getSpareparts({ includeInactive: true, ...params })
      spareparts.value = Array.isArray(data) ? data : []
      return spareparts.value
    } catch (err) {
      console.warn('Gagal memuat master sparepart:', err)
      throw err
    } finally {
      isLoadingSpareparts.value = false
    }
  }

  async function addSparepart(payload) {
    const res = await masterService.addItem('spareparts', payload)
    await fetchSpareparts()
    return res
  }

  async function updateSparepart(id, payload) {
    const res = await masterService.updateItem('spareparts', id, payload)
    await fetchSpareparts()
    return res
  }

  // Soft delete: backend mengubah `is_active` menjadi false.
  async function deactivateSparepart(id) {
    const res = await masterService.deleteItem('spareparts', id)
    await fetchSpareparts()
    return res
  }

  return {
    plants,
    shifts,
    machines,
    subMachines,
    workGroups,
    roles,
    spareparts,
    isLoaded,
    lastFetchedAt,
    isLoading,
    loading: isLoading,
    isOffline,
    cacheStatusText,
    fetchAll,
    invalidate,
    clearCache,
    addItem,
    updateItem,
    toggleActive,
    isLoadingSpareparts,
    fetchSpareparts,
    addSparepart,
    updateSparepart,
    deactivateSparepart
  }
})
