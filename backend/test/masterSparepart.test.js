import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  SPAREPART_ITEM_TYPES,
  SPAREPART_DEFAULT_UNIT,
  buildSparepartPayload,
  buildSparepartWhere,
  mapSparepart
} from '../src/controllers/masterController.js'

// ============================================================================
// FASE 5.2 — Master Sparepart (Admin).
// Pengujian MURNI (tanpa database): mengunci kontrak validasi payload
// (nama wajib, enum tipe, satuan default pcs, kode part opsional),
// klausa WHERE filter/daftar, dan mapping response (BigInt → Number).
// ============================================================================

describe('Fase 5.2 - buildSparepartPayload (create)', () => {
  it('menormalisasi payload valid & default satuan pcs', () => {
    const { errors, data } = buildSparepartPayload({
      part_name: '  Deep Groove Ball Bearing 6204-2RS ',
      part_code: ' BRG-6204 ',
      specification: ' 6204-2RS ',
      item_type: 'MACHINE_PART'
    })

    assert.deepEqual(errors, [])
    assert.equal(data.part_name, 'Deep Groove Ball Bearing 6204-2RS')
    assert.equal(data.part_code, 'BRG-6204')
    assert.equal(data.specification, '6204-2RS')
    assert.equal(data.item_type, 'MACHINE_PART')
    assert.equal(data.unit, SPAREPART_DEFAULT_UNIT)
    assert.equal(SPAREPART_DEFAULT_UNIT, 'pcs')
  })

  it('part_code & specification kosong → null (boleh tidak diisi)', () => {
    const { errors, data } = buildSparepartPayload({
      part_name: 'Sealtape',
      part_code: '   ',
      specification: '',
      item_type: 'CONSUMABLE_WORKSHOP',
      unit: 'roll'
    })

    assert.deepEqual(errors, [])
    assert.equal(data.part_code, null)
    assert.equal(data.specification, null)
    assert.equal(data.unit, 'roll')
  })

  it('part_name wajib diisi', () => {
    const { errors, data } = buildSparepartPayload({ item_type: 'MACHINE_PART' })
    assert.equal(errors.length, 1)
    assert.match(errors[0], /Nama sparepart wajib diisi/i)
    assert.equal(data.part_name, undefined)
  })

  it('item_type wajib & hanya menerima enum yang valid', () => {
    const missing = buildSparepartPayload({ part_name: 'Bearing' })
    assert.match(missing.errors[0], /Tipe item wajib/i)

    const invalid = buildSparepartPayload({ part_name: 'Bearing', item_type: 'SOMETHING_ELSE' })
    assert.match(invalid.errors[0], /tidak valid/i)
    assert.equal(invalid.data.item_type, undefined)

    assert.deepEqual(SPAREPART_ITEM_TYPES, ['MACHINE_PART', 'CONSUMABLE_WORKSHOP'])
  })

  it('menolak nilai melebihi batas kolom (150 / 50 / 200 / 20)', () => {
    const tooLongName = buildSparepartPayload({
      part_name: 'x'.repeat(151),
      item_type: 'MACHINE_PART'
    })
    assert.match(tooLongName.errors[0], /maksimal 150/i)

    const tooLongCode = buildSparepartPayload({
      part_name: 'Bearing',
      part_code: 'x'.repeat(51),
      item_type: 'MACHINE_PART'
    })
    assert.match(tooLongCode.errors[0], /maksimal 50/i)

    const tooLongSpec = buildSparepartPayload({
      part_name: 'Bearing',
      specification: 'x'.repeat(201),
      item_type: 'MACHINE_PART'
    })
    assert.match(tooLongSpec.errors[0], /maksimal 200/i)

    const tooLongUnit = buildSparepartPayload({
      part_name: 'Bearing',
      item_type: 'MACHINE_PART',
      unit: 'x'.repeat(21)
    })
    assert.match(tooLongUnit.errors[0], /maksimal 20/i)
  })

  it('is_active string "false" dinormalisasi untuk soft delete', () => {
    const inactive = buildSparepartPayload({ is_active: 'false' }, { partial: true })
    assert.deepEqual(inactive.errors, [])
    assert.equal(inactive.data.is_active, false)

    const truthy = buildSparepartPayload({ is_active: true }, { partial: true })
    assert.equal(truthy.data.is_active, true)

    const invalid = buildSparepartPayload({ is_active: 'mungkin' }, { partial: true })
    assert.match(invalid.errors[0], /Status aktif tidak valid/i)
  })
})

describe('Fase 5.2 - buildSparepartPayload (partial update)', () => {
  it('hanya mengembalikan field yang dikirim (tidak menghapus kolom lain)', () => {
    const { errors, data } = buildSparepartPayload({ is_active: true }, { partial: true })
    assert.deepEqual(errors, [])
    assert.deepEqual(data, { is_active: true })
    // part_name / item_type TIDAK ikut divalidasi wajib pada update parsial.
    assert.equal('part_name' in data, false)
    assert.equal('item_type' in data, false)
  })

  it('unit kosong pada update parsial diabaikan (satuan lama dipertahankan)', () => {
    const { data } = buildSparepartPayload({ unit: '  ' }, { partial: true })
    assert.equal('unit' in data, false)
  })

  it('part_code boleh dikosongkan (null) saat update', () => {
    const { errors, data } = buildSparepartPayload({ part_code: '' }, { partial: true })
    assert.deepEqual(errors, [])
    assert.equal(data.part_code, null)
  })

  it('item_type tidak valid tetap ditolak saat update parsial', () => {
    const { errors } = buildSparepartPayload({ item_type: 'SPAREPART' }, { partial: true })
    assert.match(errors[0], /tidak valid/i)
  })
})

describe('Fase 5.2 - buildSparepartWhere', () => {
  it('default hanya part aktif (dropdown form teknisi)', () => {
    assert.deepEqual(buildSparepartWhere({}), { is_active: true })
  })

  it('include_inactive=true menampilkan semua status', () => {
    assert.deepEqual(buildSparepartWhere({ include_inactive: 'true' }), {})
    assert.deepEqual(buildSparepartWhere({ include_inactive: true }), {})
  })

  it('filter item_type valid diterapkan, nilai tak dikenal diabaikan', () => {
    assert.equal(
      buildSparepartWhere({ item_type: 'CONSUMABLE_WORKSHOP' }).item_type,
      'CONSUMABLE_WORKSHOP'
    )
    assert.equal(buildSparepartWhere({ item_type: 'BOGUS' }).item_type, undefined)
  })

  it('search mencakup nama, kode part, dan spesifikasi (substring)', () => {
    const where = buildSparepartWhere({ search: '  bearing  ' })
    assert.equal(where.OR.length, 3)
    assert.deepEqual(where.OR[0], { part_name: { contains: 'bearing' } })
    assert.deepEqual(where.OR[1], { part_code: { contains: 'bearing' } })
    assert.deepEqual(where.OR[2], { specification: { contains: 'bearing' } })
  })

  it('kombinasi item_type + search + include_inactive', () => {
    const where = buildSparepartWhere({
      item_type: 'MACHINE_PART',
      search: '6204',
      include_inactive: 'true'
    })
    assert.equal(where.item_type, 'MACHINE_PART')
    assert.equal(where.OR.length, 3)
    assert.equal('is_active' in where, false)
  })
})

describe('Fase 5.2 - mapSparepart', () => {
  it('mengubah BigInt id menjadi Number & menormalkan null', () => {
    const mapped = mapSparepart({
      id: 12n,
      part_code: null,
      part_name: 'Bushing IGUS',
      specification: '',
      item_type: 'MACHINE_PART',
      unit: 'pcs',
      is_active: true,
      created_at: new Date('2026-01-02T00:00:00.000Z')
    })

    assert.equal(mapped.id, 12)
    assert.equal(typeof mapped.id, 'number')
    assert.equal(mapped.part_code, null)
    assert.equal(mapped.specification, null)
    assert.equal(mapped.is_active, true)
    assert.equal(mapped.unit, 'pcs')
  })

  it('record kosong → null', () => {
    assert.equal(mapSparepart(null), null)
    assert.equal(mapSparepart(undefined), null)
  })
})

