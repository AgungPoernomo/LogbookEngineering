import { defineStore } from 'pinia'
import { ref } from 'vue'
import { masterService } from '../services/masterService'

export const useMasterStore = defineStore('master', () => {
  const plants = ref([])
  const shifts = ref([])
  const machines = ref([])
  const subMachines = ref([])
  const workGroups = ref([])
  const roles = ref([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const data = await masterService.getAllMaster()
      plants.value = data.plants || []
      shifts.value = data.shifts || []
      machines.value = data.machines || []
      subMachines.value = data.sub_machines || []
      workGroups.value = data.work_groups || []
      roles.value = data.roles || []
    } finally {
      loading.value = false
    }
  }

  async function addItem(type, payload) {
    const res = await masterService.addItem(type, payload)
    await fetchAll()
    return res
  }

  async function updateItem(type, id, payload) {
    const res = await masterService.updateItem(type, id, payload)
    await fetchAll()
    return res
  }

  async function toggleActive(type, id) {
    const res = await masterService.toggleActive(type, id)
    await fetchAll()
    return res
  }

  return {
    plants,
    shifts,
    machines,
    subMachines,
    workGroups,
    roles,
    loading,
    fetchAll,
    addItem,
    updateItem,
    toggleActive
  }
})
