import api from './api'

// FASE 5.1 — Radar Aset Belum Terdaftar (Admin)
// Endpoint: GET /admin/unmapped-assets, POST /admin/unmapped-assets/promote
export const unmappedAssetService = {
  /**
   * Ambil daftar aset belum terdaftar (sudah dikelompokkan backend).
   * @param {{ plant_id?: number|string }} params
   * @returns {Promise<Array<{note: string, count: number, latest_date: string|null,
   *                           plant_id: number|null, plant_name: string,
   *                           sample_machine_names: string[]}>>}
   */
  async getUnmappedAssets(params = {}) {
    const res = await api.get('/admin/unmapped-assets', params)
    const list = Array.isArray(res) ? res : (res?.data || [])
    // Teruskan meta (total_groups / total_logbooks) tanpa merusak serialisasi array.
    if (res && res._meta) {
      try {
        Object.defineProperty(list, '_meta', { value: res._meta, enumerable: false, configurable: true })
      } catch (e) {
        // noop
      }
    }
    return list
  },

  /**
   * Promosikan catatan aset menjadi mesin resmi + relink logbook lama.
   * @param {{ note_text: string, plant_id: number|string, new_machine_name: string }} payload
   * @returns {Promise<{ created_machine: object, affected_logbooks_count: number }>}
   */
  async promoteUnmappedAsset(payload) {
    return await api.post('/admin/unmapped-assets/promote', payload)
  }
}

export default unmappedAssetService
