import api from './api'

export const auditService = {
  async getActivities(params = {}) {
    try {
      const res = await api.get('/admin/audit-logs', params)
      return Array.isArray(res) ? res : (res.data || [])
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
