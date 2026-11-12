import api from './api'
import { LOG_STATUS } from '../constants/logStatus'
import { calculateDurationMinutes } from '../utils/duration'

export const logbookService = {
  async getLogbooks(filters = {}, options = {}) {
    const params = {
      limit: filters.limit || 500,
      page: filters.page || 1
    }

    if (filters.status && filters.status !== 'ALL') {
      params.status = filters.status
    }
    if (filters.userId || filters.user_id) {
      params.user_id = filters.userId || filters.user_id
    }
    if (filters.plantId || filters.plant_id) {
      params.plant_id = filters.plantId || filters.plant_id
    }
    if (filters.machineId || filters.machine_id) {
      params.machine_id = filters.machineId || filters.machine_id
    }
    if (filters.shiftId || filters.shift_id) {
      params.shift_id = filters.shiftId || filters.shift_id
    }
    if (filters.task_date) {
      params.task_date = filters.task_date
    }
    if (filters.dateFrom || filters.startDate || filters.start_date) {
      params.start_date = filters.dateFrom || filters.startDate || filters.start_date
    }
    if (filters.dateTo || filters.endDate || filters.end_date) {
      params.end_date = filters.dateTo || filters.endDate || filters.end_date
    }
    if (filters.search) {
      params.search = filters.search
    }

    const res = await api.get('/logbooks', params, options)
    return Array.isArray(res) ? res : (res.data || [])
  },

  async list(filters = {}) {
    return this.getLogbooks(filters)
  },

  async getLogbookById(id) {
    return await api.get(`/logbooks/${id}`)
  },

  async getById(id) {
    return this.getLogbookById(id)
  },

  async createLogbook(payload, user = {}) {
    const isSubmit = payload.is_submit !== undefined
      ? Boolean(payload.is_submit)
      : (payload.status === LOG_STATUS.PENDING || payload.status === 'PENDING')

    const body = {
      plant_id: payload.plant_id || user?.plant_id,
      shift_id: payload.shift_id || 1,
      machine_id: payload.machine_id,
      sub_machine_id: payload.sub_machine_id || null,
      task_date: payload.task_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      sparepart: payload.sparepart || '-',
      activity_description: payload.activity_description,
      status: isSubmit ? 'PENDING' : 'DRAFT'
    }

    // F3.1 / v6 (Bagian 4.1): teruskan field reliability hanya bila dikirim caller.
    // Tanpa ini, payload v6 (kategori, chip, status akhir, downtime, qty) akan terbuang.
    const v6Fields = [
      'activity_category',
      'quick_action_tag',
      'machine_end_status',
      'failure_code_id',
      'root_cause_notes',
      'is_downtime',
      'downtime_minutes',
      'unit_repaired_qty',
      'has_sparepart',
      'unmapped_asset_note',
      'sparepart_items'
    ]
    v6Fields.forEach((key) => {
      if (payload[key] !== undefined) body[key] = payload[key]
    })

    return await api.post('/logbooks', body)
  },

  async create(payload, user) {
    return this.createLogbook(payload, user)
  },

  async updateLogbook(id, payload, user) {
    const isSubmit = payload.is_submit !== undefined
      ? Boolean(payload.is_submit)
      : (payload.status === LOG_STATUS.PENDING || payload.status === 'PENDING')

    const body = {
      plant_id: payload.plant_id,
      shift_id: payload.shift_id,
      machine_id: payload.machine_id,
      sub_machine_id: payload.sub_machine_id || null,
      task_date: payload.task_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      sparepart: payload.sparepart || '-',
      activity_description: payload.activity_description,
      status: isSubmit ? 'PENDING' : (payload.status || 'DRAFT')
    }

    // F3.1 / v6 (Bagian 4.1): field reliability hanya diteruskan bila dikirim caller.
    // Tanpa ini, edit draft (kategori, chip, status akhir, downtime, sparepart_items)
    // akan terbuang dan backend menganggap update sebagai payload legacy.
    const v6Fields = [
      'activity_category',
      'quick_action_tag',
      'machine_end_status',
      'maintenance_type',
      'failure_code_id',
      'root_cause_notes',
      'is_downtime',
      'downtime_minutes',
      'unit_repaired_qty',
      'has_sparepart',
      'unmapped_asset_note',
      'sparepart_items'
    ]
    v6Fields.forEach((key) => {
      if (payload[key] !== undefined) body[key] = payload[key]
    })

    return await api.put(`/logbooks/${id}`, body)
  },

  async update(id, payload, user) {
    return this.updateLogbook(id, payload, user)
  },

  async deleteLogbook(id, user) {
    return await api.delete(`/logbooks/${id}`)
  },

  async delete(id, user) {
    return this.deleteLogbook(id, user)
  },

  async submitAllDrafts(userId, user) {
    return await api.post('/logbooks/submit-all-drafts')
  },

  async approveLogbook(id, supervisorUser, notes = '') {
    return await api.post(`/logbooks/${id}/approval`, {
      status: 'APPROVED',
      notes: notes || 'Disetujui sesuai SOP pemeliharaan.'
    })
  },

  async rejectLogbook(id, supervisorUser, notes) {
    if (!notes || !notes.trim()) {
      throw new Error('Catatan penolakan / alasan revisi wajib diisi.')
    }
    return await api.post(`/logbooks/${id}/approval`, {
      status: 'REJECTED',
      notes: notes.trim()
    })
  },

  // Logika Baru: Approval per User (Teknisi)
  async getPendingByTechnician() {
    const res = await api.get('/approvals/technicians')
    return Array.isArray(res) ? res : (res.data || [])
  },

  async approveByTechnician(userId, notes = '') {
    return await api.post(`/approvals/technician/${userId}`, {
      status: 'APPROVED',
      notes: notes || 'Disetujui per teknisi sesuai SOP pemeliharaan.'
    })
  },

  async rejectByTechnician(userId, notes) {
    if (!notes || !notes.trim()) {
      throw new Error('Catatan penolakan / alasan revisi wajib diisi saat menolak logbook.')
    }
    return await api.post(`/approvals/technician/${userId}`, {
      status: 'REJECTED',
      notes: notes.trim()
    })
  }
}

export default logbookService
