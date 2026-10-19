import { masterService } from './masterService'

export const validasiService = {
  async getAllVariables() {
    try {
      const master = await masterService.getAllMaster()
      return {
        categories: [],
        activityTypes: [],
        locations: master.plants || [],
        equipments: master.machines || [],
        resultStatuses: ['Normal', 'Perlu Pemantauan', 'Perbaikan Ulang']
      }
    } catch {
      return {
        categories: [],
        activityTypes: [],
        locations: [],
        equipments: [],
        resultStatuses: []
      }
    }
  },

  async getCategories() {
    return []
  },

  async getActivityTypes() {
    return []
  },

  async getLocations() {
    return await masterService.getPlants()
  },

  async getEquipments(plantId = null) {
    return await masterService.getMachines(plantId)
  },

  async getResultStatuses() {
    return ['Normal', 'Perlu Pemantauan', 'Perbaikan Ulang']
  },

  async addItem() {
    return {}
  },

  async updateItem() {
    return {}
  },

  async toggleActive() {
    return {}
  }
}

export default validasiService
