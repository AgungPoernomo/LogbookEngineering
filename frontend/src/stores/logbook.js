import { defineStore } from 'pinia'
import { ref } from 'vue'
import { logbookService } from '../services/logbookService'

export const useLogbookStore = defineStore('logbook', () => {
  const logbooks = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchLogbooks(filters = {}) {
    loading.value = true
    error.value = null
    try {
      logbooks.value = await logbookService.getLogbooks(filters)
      return logbooks.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createLogbook(payload, user) {
    loading.value = true
    try {
      const res = await logbookService.createLogbook(payload, user)
      await fetchLogbooks()
      return res
    } finally {
      loading.value = false
    }
  }

  async function updateLogbook(id, payload, user) {
    loading.value = true
    try {
      const res = await logbookService.updateLogbook(id, payload, user)
      await fetchLogbooks()
      return res
    } finally {
      loading.value = false
    }
  }

  async function approveLogbook(id, supervisorUser, notes) {
    loading.value = true
    try {
      const res = await logbookService.approveLogbook(id, supervisorUser, notes)
      await fetchLogbooks()
      return res
    } finally {
      loading.value = false
    }
  }

  async function rejectLogbook(id, supervisorUser, notes) {
    loading.value = true
    try {
      const res = await logbookService.rejectLogbook(id, supervisorUser, notes)
      await fetchLogbooks()
      return res
    } finally {
      loading.value = false
    }
  }

  return {
    logbooks,
    loading,
    error,
    fetchLogbooks,
    createLogbook,
    updateLogbook,
    approveLogbook,
    rejectLogbook
  }
})
