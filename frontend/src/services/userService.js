import api from './api'

export const userService = {
  async getUsers(params = {}) {
    const res = await api.get('/users', params)
    const list = Array.isArray(res) ? res : (res.data || [])
    return list.map(u => ({
      ...u,
      role: u.role || u.role_name || 'Teknisi'
    }))
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
