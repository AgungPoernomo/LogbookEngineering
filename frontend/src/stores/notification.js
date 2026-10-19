import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const loading = ref(false)

  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.read_at && !n.is_read).length
  })

  async function fetchNotifications() {
    loading.value = true
    try {
      const data = await api.get('/notifications')
      notifications.value = Array.isArray(data) ? data : (data.data || [])
    } catch (err) {
      console.warn('Gagal memuat notifikasi:', err)
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(id) {
    try {
      await api.put(`/notifications/${id}/read`)
      const item = notifications.value.find(n => n.id === id)
      if (item) {
        item.read_at = new Date().toISOString()
        item.is_read = true
      }
    } catch (err) {
      console.warn('Gagal menandai notifikasi dibaca:', err)
    }
  }

  async function markAllAsRead() {
    try {
      await api.put('/notifications/read-all')
      notifications.value.forEach(n => {
        n.read_at = new Date().toISOString()
        n.is_read = true
      })
    } catch (err) {
      console.warn('Gagal menandai seluruh notifikasi dibaca:', err)
    }
  }

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  }
})

export default useNotificationStore
