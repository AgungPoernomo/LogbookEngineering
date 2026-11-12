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

  /**
   * Overview aktivitas & frekuensi logbook teknisi (Supervisor / Admin).
   *
   * Endpoint: GET /api/v1/supervisor/team-overview
   *  - Supervisor : backend mengunci ke plant pada JWT (query `plant_id` diabaikan).
   *  - Admin      : `plant_id` opsional. Kosong / 'ALL' = seluruh plant.
   *
   * Penting: error TIDAK ditelan (dulu return [] sehingga halaman tampak kosong
   * tanpa penjelasan). Pemanggil (view) yang menampilkan pesan ke pengguna.
   *
   * @param {{ plant_id?: number|string|null }} [params={}]
   * @returns {Promise<{ technicians: Array, summary: object|null, scope: object|null,
   *                     today: string|null, currentYearMonth: string|null }>}
   */
  async getSupervisorTeamOverview(params = {}) {
    const plantId = params.plant_id
    const data = await api.get('/supervisor/team-overview', {
      plant_id: plantId !== undefined && plantId !== null && plantId !== '' && plantId !== 'ALL'
        ? plantId
        : undefined
    })

    // `api.request` sudah mengembalikan `json.data`, jadi field bisnis ada di root.
    // Tetap toleran bila backend mengembalikan pembungkus `{ data: {...} }`.
    const payload = data && Array.isArray(data.technicians)
      ? data
      : (data && data.data) || {}

    return {
      technicians: Array.isArray(payload.technicians) ? payload.technicians : [],
      summary: payload.summary || null,
      scope: payload.scope || null,
      today: payload.today || null,
      currentYearMonth: payload.current_year_month || payload.currentYearMonth || null
    }
  }
}

export default teknisiService
