import { defineStore } from 'pinia'
import { ref } from 'vue'
import { masterService } from '../services/masterService'

const CACHE_TTL = 5 * 60 * 1000 // 5 menit

export const useMasterStore = defineStore('master', () => {
  const plants = ref([])
  const shifts = ref([])
  const machines = ref([])
  const subMachines = ref([])
  const workGroups = ref([])
  const roles = ref([])

  // ── Cache state ──
  const isLoaded = ref(false)
  const lastFetchedAt = ref(0)
  const isLoading = ref(false)
  const loadPromise = ref(null) // dedup concurrent calls

  async function fetchAll(force = false) {
    // 1. Cache masih valid → skip
    if (!force && isLoaded.value && Date.now() - lastFetchedAt.value < CACHE_TTL) {
      return
    }

    // 2. Ada fetch sedang berjalan → tunggu promise yang sama (dedup)
    if (isLoading.value && loadPromise.value) {
      return loadPromise.value
    }

    isLoading.value = true
    loadPromise.value = masterService.getAllMaster()
      .then((data) => {
        plants.value = data.plants || []
        shifts.value = data.shifts || []
        machines.value = data.machines || []
        subMachines.value = data.sub_machines || data.subMachines || []
        workGroups.value = data.work_groups || data.workGroups || []
        roles.value = data.roles || []
        isLoaded.value = true
        lastFetchedAt.value = Date.now()
      })
      .finally(() => {
        isLoading.value = false
        loadPromise.value = null
      })

    return loadPromise.value
  }

  // Force refresh untuk admin setelah CRUD
  function invalidate() {
    isLoaded.value = false
    lastFetchedAt.value = 0
  }

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

  return {
    plants,
    shifts,
    machines,
    subMachines,
    workGroups,
    roles,
    isLoaded,
    lastFetchedAt,
    isLoading,
    loading: isLoading,
    fetchAll,
    invalidate,
    addItem,
    updateItem,
    toggleActive
  }
})
