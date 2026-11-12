import { describe, it, expect } from 'vitest'
import {
  parseQty,
  roundQty,
  toSelectedItem,
  mergeSparepartItem,
  updateSparepartQty,
  toSparepartPayload,
  mapDraftSpareparts
} from './sparepartItems'

// ============================================================================
// FASE 5.2 / v6 — Aturan item sparepart form teknisi.
// Mengunci kontrak: qty wajib > 0 (tidak dikirim bila tidak valid), part
// duplikat digabung qty-nya, dan payload hanya `{ sparepart_id, qty_used }`.
// ============================================================================

const bearing = {
  id: 3,
  part_code: 'BRG-6204',
  part_name: 'Deep Groove Ball Bearing 6204',
  unit: 'pcs',
  item_type: 'MACHINE_PART'
}

describe('parseQty / roundQty', () => {
  it('menerima angka > 0 dan membulatkan ke 2 desimal', () => {
    expect(parseQty('1.234')).toBe(1.23)
    expect(parseQty(2)).toBe(2)
    expect(roundQty(0.1 + 0.2)).toBe(0.3)
  })

  it('menolak kosong, nol, negatif, dan bukan angka', () => {
    expect(parseQty('')).toBeNull()
    expect(parseQty(null)).toBeNull()
    expect(parseQty(undefined)).toBeNull()
    expect(parseQty(0)).toBeNull()
    expect(parseQty('0')).toBeNull()
    expect(parseQty(-2)).toBeNull()
    expect(parseQty('abc')).toBeNull()
  })
})

describe('toSelectedItem', () => {
  it('meng-cache metadata part dari respons katalog dengan qty default 1', () => {
    expect(toSelectedItem(bearing)).toEqual({
      sparepart_id: 3,
      qty_used: 1,
      part_name: 'Deep Groove Ball Bearing 6204',
      part_code: 'BRG-6204',
      unit: 'pcs'
    })
  })

  it('memakai satuan default pcs saat part tanpa unit', () => {
    expect(toSelectedItem({ id: 9, part_name: 'Seal Piston' }).unit).toBe('pcs')
  })
})

describe('mergeSparepartItem', () => {
  it('menambah part baru sebagai baris baru', () => {
    const items = mergeSparepartItem([], bearing)

    expect(items).toHaveLength(1)
    expect(items[0].sparepart_id).toBe(3)
    expect(items[0].qty_used).toBe(1)
  })

  it('menggabung qty part duplikat, bukan membuat baris baru', () => {
    const first = mergeSparepartItem([], bearing, 2)
    const second = mergeSparepartItem(first, bearing, 1.5)

    expect(second).toHaveLength(1)
    expect(second[0].qty_used).toBe(3.5)
  })

  it('mengabaikan part tanpa id valid', () => {
    const items = mergeSparepartItem([], { part_name: 'Tanpa ID' })

    expect(items).toEqual([])
  })
})

describe('updateSparepartQty', () => {
  const items = [toSelectedItem(bearing, 1)]

  it('mengubah qty baris yang sesuai', () => {
    expect(updateSparepartQty(items, 3, '2.5')[0].qty_used).toBe(2.5)
  })

  it('tidak mengubah daftar saat qty tidak valid', () => {
    expect(updateSparepartQty(items, 3, '0')).toBe(items)
    expect(updateSparepartQty(items, 3, '')).toBe(items)
  })
})

describe('toSparepartPayload', () => {
  it('hanya mengirim sparepart_id & qty_used yang valid', () => {
    const payload = toSparepartPayload([
      toSelectedItem(bearing, 2),
      { sparepart_id: 7, qty_used: 0, part_name: 'Qty nol' },
      { sparepart_id: null, qty_used: 1 },
      null
    ])

    expect(payload).toEqual([{ sparepart_id: 3, qty_used: 2 }])
  })

  it('mengembalikan array kosong untuk input bukan array', () => {
    expect(toSparepartPayload(null)).toEqual([])
    expect(toSparepartPayload(undefined)).toEqual([])
  })
})

describe('mapDraftSpareparts', () => {
  it('mengubah spareparts[] API menjadi item form lengkap', () => {
    const mapped = mapDraftSpareparts([
      { sparepart_id: 3, qty_used: 2, part_name: 'Bearing', part_code: 'BRG-6204', unit: 'pcs' }
    ])

    expect(mapped).toEqual([
      { sparepart_id: 3, qty_used: 2, part_name: 'Bearing', part_code: 'BRG-6204', unit: 'pcs' }
    ])
  })

  it('memberi default qty 1 dan satuan pcs bila data draft tidak lengkap', () => {
    const mapped = mapDraftSpareparts([{ sparepart_id: 4, qty_used: null }])

    expect(mapped[0].qty_used).toBe(1)
    expect(mapped[0].unit).toBe('pcs')
  })

  it('aman untuk draft tanpa sparepart', () => {
    expect(mapDraftSpareparts(undefined)).toEqual([])
    expect(mapDraftSpareparts([])).toEqual([])
  })
})
