import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getMachineQrData,
  getMachineQrImage,
  clearMachineQrCache
} from '../services/machineQrService'

// FASE 5.3 — Cache QR mesin selama sesi (in-memory, TIDAK di localStorage).
// - Info mesin (`qr-data`) dan gambar QR (object/data URL) disimpan per mesin.
// - Modal yang dibuka ulang untuk mesin yang sama tidak memicu request baru.
// - `clear()` dipanggil saat logout / ganti pengguna agar gambar QR & object URL
//   tidak tertinggal di memori.
export const useMachineQrStore = defineStore('machineQr', () => {
  // Map machineId(string) → { data, blobUrl, dataUrl, error }
  const entries = ref({})
  const loadingIds = ref([])

  function getId(machineId) {
    return String(machineId)
  }

  function isLoading(machineId) {
    return loadingIds.value.includes(getId(machineId))
  }

  function getEntry(machineId) {
    return entries.value[getId(machineId)] || null
  }

  function setLoading(machineId, value) {
    const key = getId(machineId)
    const next = loadingIds.value.filter(id => id !== key)
    if (value) next.push(key)
    loadingIds.value = next
  }

  /**
   * Muat info mesin + gambar QR (memakai cache sesi bila sudah ada).
   *
   * @param {number|string} machineId
   * @param {{ force?: boolean }} [options]
   * @returns {Promise<{ data: object|null, blobUrl: string, dataUrl: string, error: string }>}
   */
  async function load(machineId, { force = false } = {}) {
    const key = getId(machineId)
    const cached = entries.value[key]

    if (!force && cached && cached.data && cached.blobUrl) {
      return cached
    }

    setLoading(machineId, true)
    try {
      const [data, image] = await Promise.all([
        getMachineQrData(machineId),
        getMachineQrImage(machineId, { force })
      ])
      const entry = {
        data,
        blobUrl: image.blobUrl,
        dataUrl: image.dataUrl,
        error: ''
      }
      entries.value = { ...entries.value, [key]: entry }
      return entry
    } catch (err) {
      const entry = {
        data: cached?.data || null,
        blobUrl: cached?.blobUrl || '',
        dataUrl: cached?.dataUrl || '',
        error: err?.message || 'Gagal memuat QR Code mesin.'
      }
      entries.value = { ...entries.value, [key]: entry }
      return entry
    } finally {
      setLoading(machineId, false)
    }
  }

  /**
   * Hapus cache seluruh sesi (logout).
   */
  function clear() {
    clearMachineQrCache()
    entries.value = {}
    loadingIds.value = []
  }

  return {
    entries,
    loadingIds,
    isLoading,
    getEntry,
    load,
    clear
  }
})

export default useMachineQrStore
