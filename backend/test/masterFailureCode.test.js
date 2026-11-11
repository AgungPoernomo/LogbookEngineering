import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mapFailureCode } from '../src/controllers/masterController.js'

// ============================================================================
// FASE 4.1a — Master Kode Kerusakan (ISO 14224).
// Pengujian MURNI (tanpa database): mengunci kontrak respons
// `GET /api/v1/master/failure-codes` yang dikonsumsi dropdown
// "Kode Kerusakan" pada form Input Logbook teknisi.
// ============================================================================

describe('Fase 4.1a - mapFailureCode', () => {
  it('mengubah id BigInt menjadi Number (JSON-safe untuk v-model select)', () => {
    const mapped = mapFailureCode({
      id: 7n,
      code: 'MECH-01',
      name: 'Bearing aus/overheat/macet',
      category: 'MECHANICAL'
    })

    assert.equal(mapped.id, 7)
    assert.equal(typeof mapped.id, 'number')
    assert.equal(mapped.code, 'MECH-01')
    assert.equal(mapped.name, 'Bearing aus/overheat/macet')
    assert.equal(mapped.category, 'MECHANICAL')
  })

  it('description kosong / hanya spasi dinormalkan menjadi null', () => {
    assert.equal(
      mapFailureCode({ id: 1, code: 'MECH-02', name: 'Kebocoran seal', category: 'MECHANICAL' })
        .description,
      null
    )
    assert.equal(
      mapFailureCode({
        id: 1,
        code: 'MECH-02',
        name: 'Kebocoran seal',
        category: 'MECHANICAL',
        description: '   '
      }).description,
      null
    )
  })

  it('description terisi dikembalikan apa adanya (di-trim)', () => {
    const mapped = mapFailureCode({
      id: 2,
      code: 'ELEC-01',
      name: 'Motor overload/trip',
      category: 'ELECTRICAL',
      description: '  Motor trip karena beban lebih  '
    })

    assert.equal(mapped.description, 'Motor trip karena beban lebih')
  })

  it('hanya mengekspos field yang dipakai dropdown (tanpa created_at / is_active)', () => {
    const mapped = mapFailureCode({
      id: 3,
      code: 'UTIL-01',
      name: 'Tekanan angin/vacuum drop',
      category: 'UTILITY',
      description: null,
      is_active: true,
      created_at: new Date()
    })

    assert.deepEqual(Object.keys(mapped).sort(), ['category', 'code', 'description', 'id', 'name'])
  })

  it('setiap baris hasil mapping bisa dipakai sebagai opsi select (id unik, code & name terisi)', () => {
    const rows = [
      { id: 1n, code: 'MECH-01', name: 'Bearing aus/overheat/macet', category: 'MECHANICAL' },
      { id: 2n, code: 'ELEC-02', name: 'Inverter/VFD/servo fault', category: 'ELECTRICAL' }
    ].map(mapFailureCode)

    const ids = rows.map((r) => r.id)
    assert.equal(new Set(ids).size, rows.length)
    rows.forEach((row) => {
      assert.equal(Number.isInteger(row.id), true)
      assert.ok(row.code.length > 0)
      assert.ok(row.name.length > 0)
    })
  })
})
