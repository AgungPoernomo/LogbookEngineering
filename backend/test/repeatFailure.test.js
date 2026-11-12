import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  REPEAT_FAILURE_WINDOW_DAYS,
  buildRepeatFailureMap
} from '../src/utils/repeatFailure.js'

// ============================================================================
// FASE 4.1a — Repeat Failure (banner kuning di halaman /approval)
// Bug yang dikunci: `GET /api/v1/logbooks` (endpoint yang dipakai halaman
// /approval) TIDAK mengirim flag repeat failure, sehingga banner kuning tidak
// pernah muncul walau ada >= 2 logbook PENDING dengan machine_id + failure_code_id
// yang sama. Util ini kini dipakai bersama oleh /logbooks dan /approvals/technicians.
// ============================================================================

const MECH_01 = 1 // failure_code_id untuk kode "1n" / MECH-01
const MACHINE_A = 10

const log = (id, task_date, extra = {}) => ({
  id,
  machine_id: MACHINE_A,
  failure_code_id: MECH_01,
  task_date,
  ...extra
})

const failureCodeById = new Map([[MECH_01, { code: 'MECH-01', name: 'Bearing aus' }]])

describe('F4.1a - buildRepeatFailureMap: deteksi dasar', () => {
  it('2 logbook PENDING dengan mesin & kode sama => keduanya repeat (>= 2)', () => {
    const map = buildRepeatFailureMap(
      [log(1, '2026-03-01'), log(2, '2026-03-02')],
      { failureCodeById }
    )

    assert.equal(map.size, 2)
    assert.equal(map.get(1).occurrence_count, 2)
    assert.equal(map.get(2).occurrence_count, 2)
    assert.equal(map.get(1).failure_code, 'MECH-01')
    assert.equal(map.get(1).failure_code_name, 'Bearing aus')
    assert.equal(map.get(1).machine_id, MACHINE_A)
    assert.equal(map.get(1).failure_code_id, MECH_01)
    assert.equal(map.get(1).window_days, REPEAT_FAILURE_WINDOW_DAYS)
  })

  it('4 logbook sama (kasus lapangan) => occurrence_count 4', () => {
    const map = buildRepeatFailureMap(
      [
        log(1, '2026-03-01'),
        log(2, '2026-03-03'),
        log(3, '2026-03-05'),
        log(4, '2026-03-07')
      ],
      { failureCodeById }
    )

    assert.equal(map.size, 4)
    for (const id of [1, 2, 3, 4]) {
      assert.equal(map.get(id).occurrence_count, 4)
    }
  })

  it('logbook tunggal tidak dianggap repeat', () => {
    const map = buildRepeatFailureMap([log(1, '2026-03-01')], { failureCodeById })
    assert.equal(map.size, 0)
  })

  it('mesin berbeda TIDAK dianggap repeat', () => {
    const map = buildRepeatFailureMap(
      [log(1, '2026-03-01'), log(2, '2026-03-02', { machine_id: 99 })],
      { failureCodeById }
    )
    assert.equal(map.size, 0)
  })

  it('kode kerusakan berbeda TIDAK dianggap repeat', () => {
    const map = buildRepeatFailureMap(
      [log(1, '2026-03-01'), log(2, '2026-03-02', { failure_code_id: 2 })],
      { failureCodeById }
    )
    assert.equal(map.size, 0)
  })

  it('logbook tanpa machine_id / failure_code_id dilewati (tidak crash)', () => {
    const map = buildRepeatFailureMap(
      [
        log(1, '2026-03-01', { machine_id: null }),
        log(2, '2026-03-02', { failure_code_id: null }),
        log(3, '2026-03-03'),
        log(4, '2026-03-04')
      ],
      { failureCodeById }
    )
    // Hanya 2 log lengkap => keduanya repeat, yang tanpa kunci tidak masuk peta
    assert.equal(map.size, 2)
    assert.ok(map.has(3))
    assert.ok(map.has(4))
  })

  it('array kosong / null mengembalikan Map kosong', () => {
    assert.equal(buildRepeatFailureMap([]).size, 0)
    assert.equal(buildRepeatFailureMap(null).size, 0)
    assert.equal(buildRepeatFailureMap(undefined).size, 0)
  })
})

describe('F4.1a - buildRepeatFailureMap: window 30 hari', () => {
  it('kejadian 32 hari sebelumnya TIDAK dihitung (di luar window)', () => {
    // 2026-03-31 minus 32 hari = 2026-02-27 => di luar window 30 hari
    const map = buildRepeatFailureMap(
      [log(1, '2026-02-27'), log(2, '2026-03-31')],
      { failureCodeById }
    )
    assert.equal(map.size, 0)
  })

  it('kejadian tepat 30 hari sebelumnya dihitung (batas inklusif)', () => {
    // 2026-03-31 minus 30 hari = 2026-03-01
    const map = buildRepeatFailureMap(
      [log(1, '2026-03-01'), log(2, '2026-03-31')],
      { failureCodeById }
    )
    assert.equal(map.get(2).occurrence_count, 2)
    // Log lama ikut ditandai sebagai anggota pola (konteks untuk reviewer)
    assert.equal(map.get(1).occurrence_count, 2)
  })

  it('windowDays dapat di-override', () => {
    const map = buildRepeatFailureMap(
      [log(1, '2026-03-01'), log(2, '2026-03-10')],
      { windowDays: 3, failureCodeById }
    )
    assert.equal(map.size, 0)
  })

  it('minOccurrences dapat di-override (>= 3)', () => {
    const pair = [log(1, '2026-03-01'), log(2, '2026-03-02')]
    assert.equal(buildRepeatFailureMap(pair, { failureCodeById }).size, 2)
    assert.equal(
      buildRepeatFailureMap(pair, { minOccurrences: 3, failureCodeById }).size,
      0
    )
  })
})

describe('F4.1a - buildRepeatFailureMap: label kode & tipe id', () => {
  it('tanpa failureCodeById, label memakai fallback #id', () => {
    const map = buildRepeatFailureMap([log(1, '2026-03-01'), log(2, '2026-03-02')])
    assert.equal(map.get(2).failure_code, '#1')
    assert.equal(map.get(2).failure_code_name, '-')
  })

  it('menerima id berupa BigInt (hasil Prisma)', () => {
    const map = buildRepeatFailureMap(
      [
        log(1n, '2026-03-01', { machine_id: 10n, failure_code_id: 1n }),
        log(2n, '2026-03-02', { machine_id: 10n, failure_code_id: 1n })
      ],
      { failureCodeById }
    )
    assert.equal(map.get(1).occurrence_count, 2)
    assert.equal(map.get(2).occurrence_count, 2)
    assert.equal(map.get(1).machine_id, 10)
  })

  it('menerima id berupa string (query param / JSON)', () => {
    const map = buildRepeatFailureMap(
      [
        log('1', '2026-03-01', { machine_id: '10', failure_code_id: '1' }),
        log('2', '2026-03-02', { machine_id: '10', failure_code_id: '1' })
      ],
      { failureCodeById }
    )
    assert.equal(map.get(1).occurrence_count, 2)
    assert.equal(map.get(2).occurrence_count, 2)
  })
})
