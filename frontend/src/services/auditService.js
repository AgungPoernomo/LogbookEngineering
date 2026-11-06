import api from './api'

export const auditService = {
  async getActivities(params = {}) {
    try {
      const res = await api.get('/admin/audit-logs', params)
      const list = Array.isArray(res) ? res : (res.data || [])
      // F1.1 (BUG-013): teruskan meta paginasi
      if (res && res._meta) {
        try {
          Object.defineProperty(list, '_meta', { value: res._meta, enumerable: false, configurable: true })
        } catch (e) {
          // noop
        }
      }
      return list
    } catch (err) {
      console.warn('Gagal memuat catatan audit:', err)
      return []
    }
  },

  logActivity(userId, userName, userRole, activity, detail) {
    // Audit log di backend dicatat otomatis oleh controller pada setiap transaksi database.
    return {
      id: Date.now(),
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      activity,
      detail,
      created_at: new Date().toISOString()
    }
  }
}

export default auditService
