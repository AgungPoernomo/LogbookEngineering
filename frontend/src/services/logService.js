import { logbookService } from './logbookService'

export const logService = {
  async getLogs(filters = {}) {
    return await logbookService.getLogbooks(filters)
  },

  async getLogById(id) {
    return await logbookService.getLogbookById(id)
  },

  async createLog(payload, user = {}) {
    return await logbookService.createLogbook(payload, user)
  },

  async updateLog(id, payload, user = {}) {
    return await logbookService.updateLogbook(id, payload, user)
  },

  async approveLog(id, reviewerName = '', notes = '') {
    return await logbookService.approveLogbook(id, { full_name: reviewerName }, notes)
  },

  async rejectLog(id, reason = '', reviewerName = '') {
    return await logbookService.rejectLogbook(id, { full_name: reviewerName }, reason)
  },

  async deleteLog(id) {
    return await logbookService.deleteLogbook(id)
  }
}

export default logService
