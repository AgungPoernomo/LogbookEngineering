import { defineStore } from 'pinia'
import { ref } from 'vue'
import { validasiService } from '../services/validasiService'

export const useValidasiStore = defineStore('validasi', () => {
  const categories = ref([])
  const activityTypes = ref([])
  const locations = ref([])
  const equipments = ref([])
  const resultStatuses = ref([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const all = await validasiService.getAllVariables()
      categories.value = all.categories
      activityTypes.value = all.activityTypes
      locations.value = all.locations
      equipments.value = all.equipments
      resultStatuses.value = all.resultStatuses
    } finally {
      loading.value = false
    }
  }

  async function addItem(type, payload) {
    const res = await validasiService.addItem(type, payload)
    await fetchAll()
    return res
  }

  async function updateItem(type, id, payload) {
    const res = await validasiService.updateItem(type, id, payload)
    await fetchAll()
    return res
  }

  async function toggleActive(type, id) {
    const res = await validasiService.toggleActive(type, id)
    await fetchAll()
    return res
  }

  return {
    categories,
    activityTypes,
    locations,
    equipments,
    resultStatuses,
    loading,
    fetchAll,
    addItem,
    updateItem,
    toggleActive
  }
})
