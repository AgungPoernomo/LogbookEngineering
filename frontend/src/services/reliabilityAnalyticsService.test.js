import { describe, it, expect } from 'vitest'
import {
  buildYearMonthOptions,
  formatYearMonthLabel,
  normalizeParetoRows,
  normalizeAnalyticsPayload
} from './reliabilityAnalyticsService'

// ============================================================================
// Fase 4.4 — Pareto Bad Actor & Skill Matrix (helper klien).
// Mengunci kontrak normalisasi payload agar UI tidak pernah menerima NaN/undefined
// saat data periode masih kosong.
// ============================================================================

describe('buildYearMonthOptions', () => {
  it('menghasilkan 12 bulan mundur dari bulan berjalan WIB', () => {
    const now = new Date('2026-11-09T07:23:00.000Z') // 14:23 WIB -> 2026-11
    const options = buildYearMonthOptions(12, now)

    expect(options).toHaveLength(12)
    expect(options[0].value).toBe('2026-11')
    expect(options[0].label).toBe('November 2026')
    expect(options[1].value).toBe('2026-10')
  })

  it('menangani pergantian tahun', () => {
    const now = new Date('2026-02-15T03:00:00.000Z')
    const options = buildYearMonthOptions(4, now)

    expect(options.map(o => o.value)).toEqual(['2026-02', '2026-01', '2025-12', '2025-11'])
  })

  it('memakai bulan berjalan WIB, bukan UTC (server berada di tanggal berbeda)', () => {
    // 31 Des 2026 20:00 UTC = 1 Jan 2027 03:00 WIB
    const now = new Date('2026-12-31T20:00:00.000Z')
    expect(buildYearMonthOptions(1, now)[0].value).toBe('2027-01')
  })
})

describe('formatYearMonthLabel', () => {
  it('memformat YYYY-MM menjadi nama bulan Indonesia', () => {
    expect(formatYearMonthLabel('2026-11')).toBe('November 2026')
    expect(formatYearMonthLabel('2026-01')).toBe('Januari 2026')
    expect(formatYearMonthLabel('2026-08')).toBe('Agustus 2026')
  })

  it('mengembalikan nilai asli bila format tidak dikenal', () => {
    expect(formatYearMonthLabel('bukan-bulan')).toBe('bukan-bulan')
    expect(formatYearMonthLabel(null)).toBe('-')
  })
})

describe('normalizeParetoRows', () => {
  it('memaksa angka finite & boolean eksplisit', () => {
    const rows = normalizeParetoRows([
      { rank: 1, name: 'Filler', percent: '60', cumulative_percent: 60, downtime_hours: null, is_vital_few: 1 }
    ])

    expect(rows[0].percent).toBe(60)
    expect(rows[0].cumulative_percent).toBe(60)
    expect(rows[0].downtime_hours).toBe(0)
    expect(rows[0].is_vital_few).toBe(true)
  })

  it('aman untuk input bukan array', () => {
    expect(normalizeParetoRows(null)).toEqual([])
    expect(normalizeParetoRows(undefined)).toEqual([])
  })
})

describe('normalizeAnalyticsPayload', () => {
  it('menyediakan struktur lengkap saat respons kosong', () => {
    const result = normalizeAnalyticsPayload()

    expect(result.machinePareto).toEqual([])
    expect(result.failurePareto).toEqual([])
    expect(result.skillMatrix).toEqual([])
    expect(result.summary.total_downtime_hours).toBe(0)
    expect(result.notes.skill_matrix).toContain('Bukan penilaian kinerja')
  })

  it('memetakan payload backend apa adanya', () => {
    const result = normalizeAnalyticsPayload({
      filters: { year_month: '2026-11', plant_name: 'Plant 1', is_scoped_to_plant: true },
      summary: { total_downtime_hours: 16.7, vital_machine_count: 2, total_machines_with_downtime: 4 },
      machine_pareto: [{ rank: 1, machine_id: 10, name: 'Filler', cumulative_percent: 60, is_vital_few: true }],
      failure_pareto: [{ rank: 1, failure_code_id: 5, code: 'MECH-BRG', name: 'Bearing Aus', count: 9 }],
      skill_matrix: [{ user_id: 1, full_name: 'Budi', confidence: 'HIGH' }],
      notes: { skill_matrix: 'Pemetaan keahlian.' }
    })

    expect(result.filters.year_month).toBe('2026-11')
    expect(result.filters.is_scoped_to_plant).toBe(true)
    expect(result.summary.total_downtime_hours).toBe(16.7)
    expect(result.machinePareto).toHaveLength(1)
    expect(result.failurePareto[0].code).toBe('MECH-BRG')
    expect(result.skillMatrix[0].full_name).toBe('Budi')
    expect(result.notes.skill_matrix).toBe('Pemetaan keahlian.')
  })
})
