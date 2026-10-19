import api from './api'

export const masterService = {
  async getAllMaster() {
    try {
      const [plants, shifts, machines, subMachines, workGroups, roles] = await Promise.all([
        this.getPlants().catch(() => []),
        this.getShifts().catch(() => []),
        this.getMachines().catch(() => []),
        this.getSubMachines().catch(() => []),
        this.getWorkGroups().catch(() => []),
        this.getRoles().catch(() => [])
      ])

      return {
        plants,
        shifts,
        machines,
        sub_machines: subMachines,
        work_groups: workGroups,
        roles
      }
    } catch (err) {
      console.error('Gagal mengambil seluruh master data:', err)
      return {
        plants: [],
        shifts: [],
        machines: [],
        sub_machines: [],
        work_groups: [],
        roles: []
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
  }
}

export default masterService
