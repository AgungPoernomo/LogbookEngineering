import { describe, it, expect } from 'vitest'
import {
  REPEAT_FAILURE_WINDOW_DAYS,
  formatFailureCodeLabel,
  buildRepeatFailureMap,
  resolveRepeatFailure
} from './repeatFailure'

// ============================================================================
// Halaman /approval (SPV) — Kode Kerusakan & Banner Repeat Failure
// Bug yang dikunci:
//   1. Badge "Kode Kerusakan" tidak muncul di kartu logbook.
//   2. Banner kuning tidak muncul walau ada >= 2 logbook dengan machine_id +
//      failure_code_id sama (flag dari backend belum tersedia).
// ============================================================================

const MACHINE_A = 10
const MECH_01 = 1

const log = (id, task_date, extra = {}) => ({
  id,
  machine_id: MACHINE_A,
  failure_code_id: MECH_01,
  task_date,
  failure_code: { id: MECH_01, code: 'MECH-01', name: 'Bearing aus' },
  status: 'PENDING',
  ...extra
})

describe('formatFailureCodeLabel', () => {
  it('menggabungkan kode & nama: "MECH-01 - Bearing aus"', () => {
    expect(formatFailureCodeLabel(log(1, '2026-03-01'))).toBe(
      'MECH-01 - Bearing aus'
    )
  })

  it('hanya kode bila nama tidak tersedia', () => {
    expect(
      formatFailureCodeLabel({ failure_code: { code: 'MECH-01', name: null } })
    ).toBe('MECH-01')
    expect(formatFailureCodeLabel({ failure_code: { code: 'MECH-01', name: '-' } })).toBe(
      'MECH-01'
    )
  })

  it('mendukung field datar (failure_code string + failure_name)', () => {
    expect(
      formatFailureCodeLabel({ failure_code: 'ELEC-02', failure_name: 'Motor trip' })
    ).toBe('ELEC-02 - Motor trip')
  })

  it('fallback ke #id bila hanya failure_code_id tersedia', () => {
    expect(formatFailureCodeLabel({ failure_code_id: 7 })).toBe('#7')
  })

  it('string kosong bila logbook tidak punya kode kerusakan', () => {
    expect(formatFailureCodeLabel({})).toBe('')
    expect(formatFailureCodeLabel(null)).toBe('')
  })
})

describe('buildRepeatFailureMap', () => {
  it('2 logbook mesin & kode sama => kedua log ditandai, count 2', () => {
    const map = buildRepeatFailureMap([
      log(1, '2026-03-01'),
      log(2, '2026-03-02')
    ])
    expect(map.size).toBe(2)
    expect(map.get(1).occurrence_count).toBe(2)
    expect(map.get(2).occurrence_count).toBe(2)
    expect(map.get(1).failure_code).toBe('MECH-01')
    expect(map.get(1).failure_code_name).toBe('Bearing aus')
    expect(map.get(1).window_days).toBe(REPEAT_FAILURE_WINDOW_DAYS)
  })

  it('mesin berbeda tidak dianggap repeat', () => {
    const map = buildRepeatFailureMap([
      log(1, '2026-03-01'),
      log(2, '2026-03-02', { machine_id: 99 })
    ])
    expect(map.size).toBe(0)
  })

  it('kode kerusakan berbeda tidak dianggap repeat', () => {
    const map = buildRepeatFailureMap([
      log(1, '2026-03-01'),
      log(2, '2026-03-02', { failure_code_id: 2 })
    ])
    expect(map.size).toBe(0)
  })

  it('di luar window 30 hari tidak dianggap repeat', () => {
    const map = buildRepeatFailureMap([
      log(1, '2026-02-27'),
      log(2, '2026-03-31')
    ])
    expect(map.size).toBe(0)
  })

  it('menerima failure_code_id dari objek failure_code.id', () => {
    const map = buildRepeatFailureMap([
      { id: 1, machine_id: 10, task_date: '2026-03-01', failure_code: { id: 1, code: 'MECH-01' } },
      { id: 2, machine_id: 10, task_date: '2026-03-02', failure_code: { id: 1, code: 'MECH-01' } }
    ])
    expect(map.size).toBe(2)
  })

  it('input kosong mengembalikan Map kosong', () => {
    expect(buildRepeatFailureMap([]).size).toBe(0)
    expect(buildRepeatFailureMap(null).size).toBe(0)
  })
})

describe('resolveRepeatFailure', () => {
  it('memprioritaskan detail backend (repeat_failure)', () => {
    const backendDetail = {
      occurrence_count: 4,
      window_days: 30,
      machine_id: MACHINE_A,
      failure_code_id: MECH_01,
      failure_code: 'MECH-01',
      failure_code_name: 'Bearing aus'
    }
    const result = resolveRepeatFailure(
      log(1, '2026-03-01', { is_repeat_failure: true, repeat_failure: backendDetail }),
      []
    )
    expect(result).toEqual(backendDetail)
  })

  it('flag is_repeat_failure tanpa detail tetap menghasilkan info lengkap', () => {
    const result = resolveRepeatFailure(
      log(1, '2026-03-01', { is_repeat_failure: true, repeat_failure_count: 3 }),
      []
    )
    expect(result.occurrence_count).toBe(3)
    expect(result.failure_code).toBe('MECH-01')
    expect(result.machine_id).toBe(MACHINE_A)
  })

  it('fallback: dihitung dari logbook saudara di kartu teknisi', () => {
    const logs = [log(1, '2026-03-01'), log(2, '2026-03-02'), log(3, '2026-03-03')]
    const result = resolveRepeatFailure(logs[0], logs)
    expect(result).not.toBeNull()
    expect(result.occurrence_count).toBe(3)
  })

  it('fallback: logbook tanpa pasangan => null', () => {
    expect(resolveRepeatFailure(log(1, '2026-03-01'), [log(1, '2026-03-01')])).toBeNull()
  })

  it('fallback: pasangan di mesin lain tidak memicu banner', () => {
    const logs = [log(1, '2026-03-01'), log(2, '2026-03-02', { machine_id: 99 })]
    expect(resolveRepeatFailure(logs[0], logs)).toBeNull()
  })
})
