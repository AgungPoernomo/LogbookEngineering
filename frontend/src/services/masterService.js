import api from './api'

export const masterService = {
  async getAllMaster() {
    try {
      const [plants, shifts, machines, subMachines, workGroups, roles, failureCodes] = await Promise.all([
        this.getPlants().catch(() => []),
        this.getShifts().catch(() => []),
        this.getMachines().catch(() => []),
        this.getSubMachines().catch(() => []),
        this.getWorkGroups().catch(() => []),
        this.getRoles().catch(() => []),
        this.getFailureCodes().catch(() => [])
      ])

      return {
        plants,
        shifts,
        machines,
        sub_machines: subMachines,
        work_groups: workGroups,
        roles,
        failure_codes: failureCodes
      }
    } catch (err) {
      console.error('Gagal mengambil seluruh master data:', err)
      return {
        plants: [],
        shifts: [],
        machines: [],
        sub_machines: [],
        work_groups: [],
        roles: [],
        failure_codes: []
      }
    }
  },

  async getPlants() {
    return await api.get('/master/plants')
  },

  async getShifts() {
    return await api.get('/master/shifts')
  },

  async getMachines(plantId = null) {
    const params = plantId ? { plant_id: plantId } : {}
    return await api.get('/master/machines', params)
  },

  async getSubMachines(machineId = null) {
    const params = machineId ? { machine_id: machineId } : {}
    return await api.get('/master/sub-machines', params)
  },

  async getWorkGroups() {
    return await api.get('/master/groups')
  },

  async getRoles() {
    return await api.get('/master/roles')
  },

  // FASE 4.1a — Master kode kerusakan ISO 14224 (dropdown "Kode Kerusakan").
  // Default backend hanya mengembalikan kode AKTIF.
  // Halaman Admin Master Failure Code mengirim `include_inactive: true`.
  async getFailureCodes({ includeInactive = false, category = null, search = '' } = {}) {
    const params = {}
    if (includeInactive) params.include_inactive = true
    if (category) params.category = category
    if (search) params.search = search
    return await api.get('/master/failure-codes', params)
  },

  // FASE 5.2 — Katalog sparepart & bahan habis pakai.
  // Default backend hanya mengembalikan part AKTIF (untuk dropdown form teknisi).
  // Halaman admin mengirim `include_inactive: true` agar part nonaktif tetap terlihat.
  // `limit` opsional dipakai dropdown form teknisi (daftar awal sebelum mengetik).
  async getSpareparts({ itemType = null, search = '', includeInactive = false, limit = null } = {}) {
    const params = {}
    if (itemType) params.item_type = itemType
    if (search) params.search = search
    if (includeInactive) params.include_inactive = true
    if (limit) params.limit = limit
    return await api.get('/master/spareparts', params)
  },

  async addItem(type, payload) {
    const normalizedType = type === 'sub_machines' ? 'sub-machines' : (type === 'work_groups' ? 'groups' : type)
    return await api.post(`/master/${normalizedType}`, payload)
  },

  async updateItem(type, id, payload) {
    const normalizedType = type === 'sub_machines' ? 'sub-machines' : (type === 'work_groups' ? 'groups' : type)
    return await api.put(`/master/${normalizedType}/${id}`, payload)
  },

  async toggleActive(type, id) {
    const normalizedType = type === 'sub_machines' ? 'sub-machines' : (type === 'work_groups' ? 'groups' : type)
    return await api.put(`/master/${normalizedType}/${id}`, { is_active: false })
  },

  // FASE 5.2 — hapus master (untuk sparepart = soft delete / nonaktifkan).
  async deleteItem(type, id) {
    return await api.delete(`/master/${type}/${id}`)
  }
}

export default masterService
