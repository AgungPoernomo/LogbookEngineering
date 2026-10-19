import api from './api'

export const teknisiService = {
  async getTechnicians() {
    const users = await api.get('/users')
    const list = Array.isArray(users) ? users : (users.data || [])
    return list.filter(u => (u.role || u.role_name) === 'Teknisi')
  },

  async getTechnicianById(id) {
    return await api.get(`/users/${id}`)
  },

  async createTechnician(payload) {
    return await api.post('/users', {
      ...payload,
      role_id: 3 // Teknisi
    })
  },

  async updateTechnician(id, payload) {
    return await api.put(`/users/${id}`, payload)
  },

  async getSupervisorTeamOverview(supervisorUser) {
    try {
      const data = await api.get('/supervisor/team-overview')
      const today = new Date()
      const y = today.getFullYear()
      const m = String(today.getMonth() + 1).padStart(2, '0')
      const dStr = String(today.getDate()).padStart(2, '0')

      return {
        supervisor: supervisorUser,
        todayStr: `${y}-${m}-${dStr}`,
        currentYearMonth: `${y}-${m}`,
        technicians: data.technicians || []
      }
    } catch (err) {
      console.error('Gagal mengambil ringkasan tim supervisor dari database:', err)
      return {
        supervisor: supervisorUser,
        todayStr: new Date().toISOString().substring(0, 10),
        currentYearMonth: new Date().toISOString().substring(0, 7),
        technicians: []
      }
    }
  }
}

export default teknisiService
