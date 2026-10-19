import { defineStore } from 'pinia'
import { ref } from 'vue'
import { logService } from '../services/logService'

export const useLogStore = defineStore('log', () => {
  const logs = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchLogs(filters = {}) {
    loading.value = true
    error.value = null
    try {
      logs.value = await logService.getLogs(filters)
      return logs.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createLog(payload, user) {
    loading.value = true
    try {
      const res = await logService.createLog(payload, user)
      await fetchLogs()
      return res
    } finally {
      loading.value = false
    }
  }

  async function updateLog(id, payload) {
    loading.value = true
    try {
      const res = await logService.updateLog(id, payload)
      await fetchLogs()
      return res
    } finally {
      loading.value = false
    }
  }

  async function approveLog(id, reviewerName) {
    loading.value = true
    try {
      const res = await logService.approveLog(id, reviewerName)
      await fetchLogs()
      return res
    } finally {
      loading.value = false
    }
  }

  async function rejectLog(id, reason, reviewerName) {
    loading.value = true
    try {
      const res = await logService.rejectLog(id, reason, reviewerName)
      await fetchLogs()
      return res
    } finally {
      loading.value = false
    }
  }

  return {
    logs,
    loading,
    error,
    fetchLogs,
    createLog,
    updateLog,
    approveLog,
    rejectLog
  }
})
