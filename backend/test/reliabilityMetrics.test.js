import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateMTTR,
  calculateMTBF,
  calculateAvailability,
  calculateReliabilitySummary,
  isFailureLog,
  isBreakdownLog,
  FAILURE_MAINTENANCE_TYPES,
  BREAKDOWN_MAINTENANCE_TYPES
} from '../src/utils/reliabilityMetrics.js'

// ============================================================================
// Helper pembuat data uji (meniru bentuk baris tabel `logbooks`)
// ============================================================================

/**
 * Membuat satu baris logbook uji.
 * @param {object} overrides
 */
function makeLog(overrides = {}) {
  return {
    id: 1,
    machine_id: 1,
    task_date: '2026-11-01',
    start_time: '08:00',
    end_time: '08:30',
    duration_minutes: 30,
    maintenance_type: 'BREAKDOWN',
    is_downtime: true,
    downtime_minutes: 30,
    ...overrides
  }
}

/**
 * Skenario normal: 3 kerusakan pada mesin yang sama.
 *
 * | # | task_date  | start | tipe      | durasi perbaikan |
 * |---|------------|-------|-----------|------------------|
 * | 1 | 2026-11-01 | 08:00 | BREAKDOWN | 30 menit         |
 * | 2 | 2026-11-02 | 08:00 | BREAKDOWN | 60 menit         |
 * | 3 | 2026-11-04 | 08:00 | BREAKDOWN | 90 menit         |
 *
 * Hitungan manual:
 *  - MTTR  = (30 + 60 + 90) / 3           = 60 menit
 *  - Gap   = 1 hari (1440 menit) & 2 hari (2880 menit)
 *  - MTBF  = (1440 + 2880) / 2            = 2160 menit (= 36 jam)
 *  - Avail = 2160 / (2160 + 60) * 100     = 97.297297297... %
 */
function buildNormalScenario() {
  return [
    makeLog({ id: 1, task_date: '2026-11-01', start_time: '08:00', end_time: '08:30', duration_minutes: 30 }),
    makeLog({ id: 2, task_date: '2026-11-02', start_time: '08:00', end_time: '09:00', duration_minutes: 60 }),
    makeLog({ id: 3, task_date: '2026-11-04', start_time: '08:00', end_time: '09:30', duration_minutes: 90 })
  ]
}

// ============================================================================
// A. MTTR — Mean Time To Repair
// ============================================================================
describe('F4.3 - calculateMTTR', () => {
  it('data normal (3 kerusakan) => rata-rata durasi perbaikan 60 menit', () => {
    assert.equal(calculateMTTR(buildNormalScenario()), 60)
  })

  it('menggabungkan BREAKDOWN dan CORRECTIVE sebagai kejadian kerusakan', () => {
    const logs = [
      makeLog({ id: 1, maintenance_type: 'BREAKDOWN', duration_minutes: 40 }),
      makeLog({ id: 2, maintenance_type: 'CORRECTIVE', duration_minutes: 20 })
    ]
    // (40 + 20) / 2 = 30
    assert.equal(calculateMTTR(logs), 30)
  })

  it('mengabaikan PREVENTIVE, INSPECTION, AUTONOMOUS_TPM, dan log tanpa tipe', () => {
    const logs = [
      makeLog({ id: 1, maintenance_type: 'BREAKDOWN', duration_minutes: 50 }),
      makeLog({ id: 2, maintenance_type: 'PREVENTIVE', duration_minutes: 300 }),
      makeLog({ id: 3, maintenance_type: 'INSPECTION', duration_minutes: 120 }),
      makeLog({ id: 4, maintenance_type: 'AUTONOMOUS_TPM', duration_minutes: 90 }),
      makeLog({ id: 5, maintenance_type: null, duration_minutes: 200 })
    ]
    // Hanya log id=1 yang dihitung → 50 / 1 = 50
    assert.equal(calculateMTTR(logs), 50)
  })

  it('mesin tanpa kerusakan => null (tidak crash, tidak NaN)', () => {
    const logs = [
      makeLog({ maintenance_type: 'PREVENTIVE', duration_minutes: 240 }),
      makeLog({ maintenance_type: 'INSPECTION', duration_minutes: 60 })
    ]
    assert.equal(calculateMTTR(logs), null)
    assert.equal(calculateMTTR([]), null)
  })

  it('input tidak valid (null / undefined / bukan array) => null', () => {
    assert.equal(calculateMTTR(null), null)
    assert.equal(calculateMTTR(undefined), null)
    assert.equal(calculateMTTR('bukan array'), null)
    assert.equal(calculateMTTR({}), null)
  })

  it('duration_minutes kosong dihitung dari start_time & end_time (termasuk lintas tengah malam)', () => {
    const logs = [
      // durasi eksplisit tersedia
      makeLog({ id: 1, duration_minutes: 100 }),
      // duration_minutes null → fallback selisih jam: 09:00 → 10:00 = 60 menit
      makeLog({ id: 2, start_time: '09:00', end_time: '10:00', duration_minutes: null }),
      // shift malam: 23:00 → 01:00 = 120 menit
      makeLog({ id: 3, start_time: '23:00', end_time: '01:00', duration_minutes: null })
    ]
    // (100 + 60 + 120) / 3 = 93.333...
    assert.ok(Math.abs(calculateMTTR(logs) - 280 / 3) < 1e-9)
  })
})

// ============================================================================
// B. MTBF — Mean Time Between Failures
// ============================================================================
describe('F4.3 - calculateMTBF', () => {
  it('data normal (3 BREAKDOWN) => gap 1 hari & 2 hari, MTBF = 2160 menit', () => {
    // (1440 + 2880) / 2 = 2160
    assert.equal(calculateMTBF(buildNormalScenario()), 2160)
  })

  it('urutan input acak tetap menghasilkan MTBF yang sama (diurutkan kronologis)', () => {
    const logs = buildNormalScenario()
    const shuffled = [logs[2], logs[0], logs[1]]
    assert.equal(calculateMTBF(shuffled), 2160)
  })

  it('mengurutkan berdasarkan jam bila task_date sama', () => {
    const logs = [
      makeLog({ id: 3, task_date: '2026-11-01', start_time: '18:00' }),
      makeLog({ id: 1, task_date: '2026-11-01', start_time: '08:00' }),
      makeLog({ id: 2, task_date: '2026-11-01', start_time: '12:00' })
    ]
    // Gap: 08:00→12:00 = 240 menit, 12:00→18:00 = 360 menit → rata-rata 300 menit
    assert.equal(calculateMTBF(logs), 300)
  })

  it('memperhitungkan gap lintas tengah malam antar tanggal (WIB)', () => {
    const logs = [
      makeLog({ id: 1, task_date: '2026-11-01', start_time: '23:00' }),
      makeLog({ id: 2, task_date: '2026-11-02', start_time: '01:00' })
    ]
    // 23:00 (1 Nov) → 01:00 (2 Nov) = 120 menit
    assert.equal(calculateMTBF(logs), 120)
  })

  it('hanya BREAKDOWN yang menjadi titik kegagalan (CORRECTIVE diabaikan)', () => {
    const logs = [
      makeLog({ id: 1, task_date: '2026-11-01', maintenance_type: 'BREAKDOWN' }),
      // CORRECTIVE di tengah hari tidak menjadi titik MTBF
      makeLog({ id: 2, task_date: '2026-11-02', maintenance_type: 'CORRECTIVE' }),
      makeLog({ id: 3, task_date: '2026-11-03', maintenance_type: 'BREAKDOWN' })
    ]
    // Gap hanya antara id=1 dan id=3 → 2 hari = 2880 menit
    assert.equal(calculateMTBF(logs), 2880)
  })

  it('mesin hanya rusak 1 kali => null (MTBF tidak dapat dihitung)', () => {
    assert.equal(calculateMTBF([makeLog({ id: 1 })]), null)
  })

  it('mesin tanpa kerusakan / array kosong => null', () => {
    assert.equal(calculateMTBF([]), null)
    assert.equal(calculateMTBF([makeLog({ maintenance_type: 'PREVENTIVE' })]), null)
  })

  it('input tidak valid / hanya 1 BREAKDOWN valid => null, bukan Infinity/NaN', () => {
    assert.equal(calculateMTBF(null), null)

    const result = calculateMTBF([
      makeLog({ id: 1, maintenance_type: 'BREAKDOWN' }),
      makeLog({ id: 2, maintenance_type: 'CORRECTIVE' })
    ])
    assert.equal(result, null)
    assert.notEqual(result, Infinity)
    assert.equal(Number.isNaN(result), false)
  })

  it('log dengan task_date tidak valid diabaikan sehingga tidak merusak gap', () => {
    const logs = [
      makeLog({ id: 1, task_date: '2026-11-01' }),
      makeLog({ id: 2, task_date: 'TANGGAL-RUSAK' }),
      makeLog({ id: 3, task_date: '2026-11-03' })
    ]
    // Gap valid: 1 Nov → 3 Nov = 2880 menit
    assert.equal(calculateMTBF(logs), 2880)
  })

  it('dua log pada tanggal & jam identik tidak menghasilkan MTBF negatif/nol', () => {
    const logs = [
      makeLog({ id: 1, task_date: '2026-11-01', start_time: '08:00' }),
      makeLog({ id: 2, task_date: '2026-11-01', start_time: '08:00' })
    ]
    assert.equal(calculateMTBF(logs), null)
  })
})

// ============================================================================
// C. Availability
// ============================================================================
describe('F4.3 - calculateAvailability', () => {
  it('data normal => (2160 / (2160 + 60)) * 100 ≈ 97.2973 %', () => {
    const availability = calculateAvailability(buildNormalScenario())
    assert.ok(Math.abs(availability - (2160 / 2220) * 100) < 1e-9)
    assert.ok(availability > 97 && availability < 98)
  })

  it('mesin tanpa kerusakan => null (tidak crash)', () => {
    assert.equal(calculateAvailability([]), null)
    assert.equal(calculateAvailability([makeLog({ maintenance_type: 'PREVENTIVE' })]), null)
  })

  it('hanya 1 kerusakan => MTBF null sehingga Availability null', () => {
    assert.equal(calculateAvailability([makeLog({ id: 1 })]), null)
  })

  it('denominator nol => null (pembagian dengan nol dihindari)', () => {
    // Dua BREAKDOWN identik (tanggal & jam sama) → MTBF null, durasi 0 menit → MTTR 0.
    const logs = [
      makeLog({ id: 1, task_date: '2026-11-01', start_time: '08:00', end_time: '08:00', duration_minutes: 0 }),
      makeLog({ id: 2, task_date: '2026-11-01', start_time: '08:00', end_time: '08:00', duration_minutes: 0 })
    ]
    assert.equal(calculateMTTR(logs), 0)
    assert.equal(calculateMTBF(logs), null)
    assert.equal(calculateAvailability(logs), null)
  })

  it('selalu menghasilkan persentase 0..100', () => {
    const scenarios = [
      buildNormalScenario(),
      [
        // MTTR sangat besar dibanding MTBF (perbaikan 10 jam, gap 4 jam)
        makeLog({ id: 1, task_date: '2026-11-01', start_time: '08:00', duration_minutes: 600 }),
        makeLog({ id: 2, task_date: '2026-11-01', start_time: '12:00', duration_minutes: 600 })
      ]
    ]

    for (const logs of scenarios) {
      const availability = calculateAvailability(logs)
      assert.notEqual(availability, null)
      assert.ok(availability >= 0 && availability <= 100, `availability ${availability} harus 0..100`)
    }
  })
})

// ============================================================================
// D. Helper klasifikasi & ringkasan
// ============================================================================
describe('F4.3 - helper klasifikasi & ringkasan', () => {
  it('konstanta dataset sesuai spesifikasi', () => {
    assert.deepEqual(FAILURE_MAINTENANCE_TYPES, ['BREAKDOWN', 'CORRECTIVE'])
    assert.deepEqual(BREAKDOWN_MAINTENANCE_TYPES, ['BREAKDOWN'])
  })

  it('isFailureLog: BREAKDOWN/CORRECTIVE true; PREVENTIVE/INSPECTION/null false', () => {
    assert.equal(isFailureLog(makeLog({ maintenance_type: 'BREAKDOWN' })), true)
    assert.equal(isFailureLog(makeLog({ maintenance_type: 'CORRECTIVE' })), true)
    assert.equal(isFailureLog(makeLog({ maintenance_type: 'PREVENTIVE' })), false)
    assert.equal(isFailureLog(makeLog({ maintenance_type: 'INSPECTION' })), false)
    assert.equal(isFailureLog(makeLog({ maintenance_type: null })), false)
    assert.equal(isFailureLog(null), false)
  })

  it('isBreakdownLog: hanya BREAKDOWN yang true', () => {
    assert.equal(isBreakdownLog(makeLog({ maintenance_type: 'BREAKDOWN' })), true)
    assert.equal(isBreakdownLog(makeLog({ maintenance_type: 'CORRECTIVE' })), false)
    assert.equal(isBreakdownLog(undefined), false)
  })

  it('calculateReliabilitySummary konsisten dengan fungsi tunggal', () => {
    const summary = calculateReliabilitySummary(buildNormalScenario())
    assert.equal(summary.mttr_minutes, 60)
    assert.equal(summary.mtbf_minutes, 2160)
    assert.ok(Math.abs(summary.availability_percent - (2160 / 2220) * 100) < 1e-9)
  })

  it('calculateReliabilitySummary pada data kosong => semua null', () => {
    assert.deepEqual(calculateReliabilitySummary([]), {
      mttr_minutes: null,
      mtbf_minutes: null,
      availability_percent: null
    })
  })
})
