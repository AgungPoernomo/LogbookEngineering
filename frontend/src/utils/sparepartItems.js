/**
 * FASE 5.2 / v6 — Helper item sparepart pada form teknisi.
 *
 * Dipakai bersama oleh `SparepartMultiSelect.vue` (picker) dan
 * `InputLogbookView.vue` (payload `sparepart_items`) agar aturan berikut
 * konsisten di satu tempat:
 *  - qty harus angka > 0 (qty tidak valid tidak pernah dikirim ke backend),
 *  - part duplikat digabung qty-nya, bukan menjadi baris baru,
 *  - metadata part (nama/kode/satuan) di-cache dari respons katalog.
 */

export const DEFAULT_SPAREPART_UNIT = 'pcs'

/** Bulatkan qty ke 2 desimal (step input 0.01). */
export function roundQty(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 100) / 100
}

/** Qty valid bila angka > 0. Mengembalikan `null` bila tidak valid. */
export function parseQty(raw) {
  if (raw === '' || raw === null || raw === undefined) return null
  const num = Number(raw)
  if (!Number.isFinite(num) || num <= 0) return null
  return roundQty(num)
}

/** Bentuk item form dari satu baris respons katalog. */
export function toSelectedItem(part, qty = 1) {
  return {
    sparepart_id: Number(part?.id ?? part?.sparepart_id),
    qty_used: parseQty(qty) ?? 1,
    part_name: part?.part_name || '',
    part_code: part?.part_code || '',
    unit: part?.unit || DEFAULT_SPAREPART_UNIT
  }
}

/**
 * Tambah part ke daftar terpilih.
 * Bila `sparepart_id` sudah ada → qty digabung dengan `incrementQty`.
 */
export function mergeSparepartItem(items = [], part, incrementQty = 1) {
  const candidate = toSelectedItem(part, incrementQty)
  if (!Number.isFinite(candidate.sparepart_id) || candidate.sparepart_id <= 0) {
    return items
  }

  const exists = items.some(
    (entry) => Number(entry.sparepart_id) === candidate.sparepart_id
  )
  if (!exists) return [...items, candidate]

  return items.map((entry) =>
    Number(entry.sparepart_id) === candidate.sparepart_id
      ? { ...entry, qty_used: roundQty(Number(entry.qty_used || 0) + candidate.qty_used) }
      : entry
  )
}

/** Ubah qty satu baris. Qty tidak valid diabaikan (daftar tidak berubah). */
export function updateSparepartQty(items = [], sparepartId, qty) {
  const safeQty = parseQty(qty)
  if (safeQty === null) return items

  return items.map((entry) =>
    Number(entry.sparepart_id) === Number(sparepartId)
      ? { ...entry, qty_used: safeQty }
      : entry
  )
}

/** Payload backend: hanya item dengan `sparepart_id` & qty > 0. */
export function toSparepartPayload(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter((entry) => {
      const sparepartId = Number(entry?.sparepart_id)
      return Number.isFinite(sparepartId) && sparepartId > 0 && parseQty(entry.qty_used) !== null
    })
    .map((entry) => ({
      sparepart_id: Number(entry.sparepart_id),
      qty_used: parseQty(entry.qty_used)
    }))
}

/** Kembalikan `spareparts[]` dari API ke bentuk item form (muat draft). */
export function mapDraftSpareparts(spareparts) {
  if (!Array.isArray(spareparts)) return []

  return spareparts
    .filter((entry) => Number(entry?.sparepart_id) > 0)
    .map((entry) => ({
      sparepart_id: Number(entry.sparepart_id),
      qty_used: parseQty(entry.qty_used) ?? 1,
      part_name: entry.part_name || '',
      part_code: entry.part_code || '',
      unit: entry.unit || DEFAULT_SPAREPART_UNIT
    }))
}
