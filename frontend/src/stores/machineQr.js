import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getMachineQrData,
  getMachineQrImage,
  clearMachineQrCache
} from '../services/machineQrService'

// Cache QR mesin berlaku maksimal 5 menit di memori. Setelah itu entri dianggap
// stale dan dimuat ulang otomatis saat modal dibuka lagi — mencegah gambar QR
// lama (mis. berisi URL localhost) tertahan setelah `FRONTEND_URL` backend diubah.
const CACHE_TTL_MS = 5 * 60 * 1000

// FASE 5.3 — Cache QR mesin selama sesi (in-memory, TIDAK di localStorage).
// - Info mesin (`qr-data`) dan gambar QR (object/data URL) disimpan per mesin.
// - Modal yang dibuka ulang untuk mesin yang sama tidak memicu request baru
//   selama cache masih fresh (TTL di atas).
// - Cache buster (`?t=<timestamp>`) ditangani `machineQrService`, jadi HTTP
//   cache browser tidak pernah menyajikan PNG lama.
// - `clear()` dipanggil saat logout / ganti pengguna agar gambar QR & object URL
//   tidak tertinggal di memori.
export const useMachineQrStore = defineStore('machineQr', () => {
  // Map machineId(string) → { data, blobUrl, dataUrl, error, loadedAt }
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
   * Cek apakah entri cache sudah kedaluwarsa (lebih dari CACHE_TTL_MS).
   */
  function isStale(entry) {
    if (!entry || !entry.loadedAt) return true
    return Date.now() - entry.loadedAt > CACHE_TTL_MS
  }

  /**
   * Muat info mesin + gambar QR.
   * - `force: true` → abaikan cache Pinia & HTTP (cache buster di service).
   * - Entri yang lebih tua dari CACHE_TTL_MS otomatis dimuat ulang.
   *
   * @param {number|string} machineId
   * @param {{ force?: boolean }} [options]
   * @returns {Promise<{ data: object|null, blobUrl: string, dataUrl: string, error: string }>}
   */
  async function load(machineId, { force = false } = {}) {
    const key = getId(machineId)
    const cached = entries.value[key]
    const needsRefresh = force || !cached || !cached.data || !cached.blobUrl || isStale(cached)

    if (!needsRefresh) {
      return cached
    }

    setLoading(machineId, true)
    try {
      const [data, image] = await Promise.all([
        getMachineQrData(machineId, { force: needsRefresh }),
        getMachineQrImage(machineId, { force: needsRefresh })
      ])
      const entry = {
        data,
        blobUrl: image.blobUrl,
        dataUrl: image.dataUrl,
        error: '',
        loadedAt: Date.now()
      }
      entries.value = { ...entries.value, [key]: entry }
      return entry
    } catch (err) {
      const entry = {
        data: cached?.data || null,
        blobUrl: cached?.blobUrl || '',
        dataUrl: cached?.dataUrl || '',
        error: err?.message || 'Gagal memuat QR Code mesin.',
        loadedAt: cached?.loadedAt || 0
      }
      entries.value = { ...entries.value, [key]: entry }
      return entry
    } finally {
      setLoading(machineId, false)
    }
  }

  /**
   * Paksa muat ulang QR dari server (abaikan seluruh cache).
   */
  function refresh(machineId) {
    return load(machineId, { force: true })
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
    isStale,
    load,
    refresh,
    clear
  }
})

export default useMachineQrStore
