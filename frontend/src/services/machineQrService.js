import api from './api'

// FASE 5.3 — Generator QR Code Mesin (Admin).
// Endpoint backend (KHUSUS ADMIN):
//   GET /machines/:id/qr        → PNG (Content-Type image/png)
//   GET /machines/:id/qr-data   → info mesin + string QR (JSON standar)
//   GET /machines/qr-batch      → daftar mesin untuk cetak batch per Line
//
// Catatan autentikasi: endpoint PNG butuh header Authorization, sedangkan tag
// `<img src>` tidak bisa mengirim header. Karena itu service di sini mengunduh
// PNG sebagai blob (pakai token) lalu meng-cache object URL-nya per sesi.

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '')

// Cache buster — `FRONTEND_URL` di backend bisa berubah kapan pun (mis. setelah
// update env di Vercel), sedangkan endpoint PNG mengirim
// `Cache-Control: private, max-age=3600`. Tanpa query unik, browser bisa
// menyajikan PNG lama (QR masih berisi URL localhost) meski backend sudah benar.
// Setiap permintaan diberi `?t=<timestamp>` + `cache: 'no-store'` agar gambar QR
// selalu fresh dan tidak bergantung pada sisa cache browser.
const NO_CACHE = { cache: 'no-store' }

function cacheBuster() {
  return Date.now()
}

/**
 * URL absolut endpoint PNG QR (untuk debug / dibuka di tab baru).
 * Default menyertakan cache buster; pakai `{ cacheBust: false }` bila butuh URL bersih.
 */
export function getMachineQrEndpoint(machineId, { cacheBust = true } = {}) {
  const base = `${API_BASE_URL}/machines/${Number(machineId)}/qr`
  return cacheBust ? `${base}?t=${cacheBuster()}` : base
}

// Cache object URL QR per sesi (Map machineId → { blobUrl, dataUrl, data, promise }).
// Modul bersifat singleton selama tab aktif → modal yang dibuka ulang tidak
// memicu request ulang untuk mesin yang sama.
const qrCache = new Map()

function getCacheEntry(machineId) {
  const key = String(machineId)
  if (!qrCache.has(key)) {
    qrCache.set(key, { blobUrl: '', dataUrl: '', data: null, promise: null })
  }
  return qrCache.get(key)
}

/**
 * GET /machines/:id/qr-data — info mesin + string QR (dipakai header modal).
 * Cache buster dipakai juga di sini karena `qr_url_string` ikut berubah saat
 * `FRONTEND_URL` backend diperbarui.
 *
 * @param {number|string} machineId
 * @param {{ force?: boolean }} [options]
 */
export async function getMachineQrData(machineId, { force = false } = {}) {
  const entry = getCacheEntry(machineId)
  if (!force && entry.data) return entry.data
  const data = await api.get(
    `/machines/${Number(machineId)}/qr-data`,
    { t: cacheBuster() },
    NO_CACHE
  )
  entry.data = data
  return data
}

/**
 * Konversi Blob → data URL (dipakai window cetak).
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Gagal membaca gambar QR.'))
    reader.readAsDataURL(blob)
  })
}

/**
 * GET /machines/:id/qr — PNG blob, dikonversi menjadi object URL + data URL.
 * URL selalu diberi cache buster (`?t=`) + `no-store` sehingga hasil QR tidak
 * pernah diambil dari HTTP cache browser.
 * Hasil di-cache selama sesi (tidak re-fetch setiap buka modal) kecuali `force`.
 *
 * @param {number|string} machineId
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<{blobUrl:string, dataUrl:string}>}
 */
export async function getMachineQrImage(machineId, { force = false } = {}) {
  const entry = getCacheEntry(machineId)
  if (!force && entry.blobUrl) {
    return { blobUrl: entry.blobUrl, dataUrl: entry.dataUrl }
  }

  // Dedup permintaan bersamaan (mis. modal & batch print meminta mesin yang sama).
  if (entry.promise) return entry.promise

  entry.promise = (async () => {
    const url = `/machines/${Number(machineId)}/qr?t=${cacheBuster()}`
    const blob = await api.getBlob(url, {}, NO_CACHE)
    const blobUrl = URL.createObjectURL(blob)
    const dataUrl = await blobToDataUrl(blob)

    // Lepas object URL lama agar tidak menumpuk di memori saat refresh paksa.
    if (entry.blobUrl && entry.blobUrl !== blobUrl) {
      try {
        URL.revokeObjectURL(entry.blobUrl)
      } catch (e) {
        // noop
      }
    }

    entry.blobUrl = blobUrl
    entry.dataUrl = dataUrl
    return { blobUrl, dataUrl }
  })()

  try {
    return await entry.promise
  } finally {
    entry.promise = null
  }
}

/**
 * Jalankan fungsi untuk setiap item dengan batas konkurensi
 * (hindari puluhan request serentak pada cetak batch).
 */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index], index)
    }
  })

  await Promise.all(runners)
  return results
}

/**
 * GET /machines/qr-batch — daftar mesin untuk cetak batch (grid kartu QR).
 * Meta (total, plant_id, frontend_url) ditempel sebagai properti non-enumerable
 * `_meta` (pola sama dengan unmappedAssetService) agar serialisasi array aman.
 * `frontend_url` di meta ikut berubah saat env backend diperbarui → cache buster
 * dipakai agar data batch tidak berasal dari cache browser.
 *
 * @param {{ plantId?: number|string|null, machineIds?: Array<number|string> }} params
 */
export async function getMachineQrBatch({ plantId = null, machineIds = [] } = {}) {
  const params = {}
  if (plantId) params.plant_id = plantId
  if (Array.isArray(machineIds) && machineIds.length > 0) params.machine_ids = machineIds.join(',')
  params.t = cacheBuster()

  const res = await api.get('/machines/qr-batch', params, NO_CACHE)
  const list = Array.isArray(res) ? res : []
  if (res && res._meta) {
    try {
      Object.defineProperty(list, '_meta', { value: res._meta, enumerable: false, configurable: true })
    } catch (e) {
      // noop
    }
  }
  return list
}

/**
 * Siapkan data cetak batch: daftar mesin + gambar QR (data URL) masing-masing.
 * `onProgress(done, total)` dipanggil setiap satu QR selesai agar UI bisa
 * menampilkan progress bar.
 *
 * @param {{ plantId?: number|string|null, machineIds?: Array<number|string>, force?: boolean }} params
 * @param {(done:number, total:number) => void} [onProgress]
 */
export async function prepareBatchPrint({ plantId = null, machineIds = [], force = false } = {}, onProgress) {
  const machines = await getMachineQrBatch({ plantId, machineIds })
  let done = 0

  const cards = await mapWithConcurrency(machines, 4, async (machine) => {
    try {
      const { dataUrl } = await getMachineQrImage(machine.id, { force })
      return { ...machine, image_src: dataUrl }
    } catch (err) {
      // Satu QR gagal tidak boleh menggagalkan seluruh batch.
      return { ...machine, image_src: '', error: err?.message || 'Gagal memuat QR' }
    } finally {
      done += 1
      if (typeof onProgress === 'function') onProgress(done, machines.length)
    }
  })

  return { machines: cards, meta: machines._meta || null }
}

/**
 * Bersihkan seluruh cache QR (dipanggil saat logout / ganti pengguna).
 */
export function clearMachineQrCache() {
  for (const entry of qrCache.values()) {
    if (entry.blobUrl) {
      try {
        URL.revokeObjectURL(entry.blobUrl)
      } catch (e) {
        // noop
      }
    }
  }
  qrCache.clear()
}

export const machineQrService = {
  getMachineQrEndpoint,
  getMachineQrData,
  getMachineQrImage,
  getMachineQrBatch,
  prepareBatchPrint,
  clearMachineQrCache
}

export default machineQrService
