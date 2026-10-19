import { defineStore } from 'pinia'
import { ref } from 'vue'
import { teknisiService } from '../services/teknisiService'

export const useTeknisiStore = defineStore('teknisi', () => {
  const technicians = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchTechnicians() {
    loading.value = true
    error.value = null
    try {
      technicians.value = await teknisiService.getTechnicians()
      return technicians.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addTechnician(payload) {
    loading.value = true
    try {
      const res = await teknisiService.createTechnician(payload)
      await fetchTechnicians()
      return res
    } finally {
      loading.value = false
    }
  }

  async function updateTechnician(id, payload) {
    loading.value = true
    try {
      const res = await teknisiService.updateTechnician(id, payload)
      await fetchTechnicians()
      return res
    } finally {
      loading.value = false
    }
  }

  async function deleteTechnician(id) {
    loading.value = true
    try {
      const res = await teknisiService.deleteTechnician(id)
      await fetchTechnicians()
      return res
    } finally {
      loading.value = false
    }
  }

  return {
    technicians,
    loading,
    error,
    fetchTechnicians,
    addTechnician,
    updateTechnician,
    deleteTechnician
  }
})
