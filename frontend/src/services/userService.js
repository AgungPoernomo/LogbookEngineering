import api from './api'

export const userService = {
  async getUsers(params = {}) {
    const res = await api.get('/users', params)
    const list = Array.isArray(res) ? res : (res.data || [])
    const mapped = list.map(u => ({
      ...u,
      role: u.role || u.role_name || 'Teknisi'
    }))
    // F1.1 (BUG-011): teruskan meta paginasi agar tabel admin dapat menghitung total halaman
    if (res && res._meta) {
      try {
        Object.defineProperty(mapped, '_meta', { value: res._meta, enumerable: false, configurable: true })
      } catch (e) {
        // noop
      }
    }
    return mapped
  },

  async createUser(payload) {
    return await api.post('/users', payload)
  },

  async updateUser(id, payload) {
    return await api.put(`/users/${id}`, payload)
  },

  async toggleStatus(id) {
    return await api.delete(`/users/${id}`)
  }
}

export default userService
