import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PARETO_THRESHOLD_PERCENT,
  roundTo,
  toNumber,
  minutesToHours,
  buildParetoRows,
  pickTopOneByKey,
  resolveConfidence,
  buildSkillMatrix,
  buildParetoSummary
} from '../src/services/reliabilityAnalyticsService.js'

// ============================================================================
// FASE 4.4 — Pareto Bad Actor & Skill Matrix.
// Pengujian MURNI (tanpa database): mengunci kontrak perhitungan persentase
// kumulatif, penandaan vital few (80/20), dan penyusunan Skill Matrix yang
// netral (bukan leaderboard teknis).
// ============================================================================

describe('Fase 4.4 - buildParetoRows', () => {
  it('menghitung percent & cumulative_percent secara monoton', () => {
    const rows = buildParetoRows([
      { value: 50, name: 'A' },
      { value: 30, name: 'B' },
      { value: 20, name: 'C' }
    ])

    assert.equal(rows.length, 3)
    assert.deepEqual(rows.map(r => r.percent), [50, 30, 20])
    assert.deepEqual(rows.map(r => r.cumulative_percent), [50, 80, 100])
    assert.deepEqual(rows.map(r => r.rank), [1, 2, 3])
  })

  it('menandai vital few sampai kumulatif 80% (item penembus ambang ikut vital)', () => {
    // 60 + 30 = 90 → B menembus 80%, jadi B tetap vital; C tidak.
    const rows = buildParetoRows([
      { value: 60 },
      { value: 30 },
      { value: 10 }
    ])

    assert.deepEqual(rows.map(r => r.is_vital_few), [true, true, false])
    assert.deepEqual(rows.map(r => r.is_bad_actor), [true, true, false])
    assert.equal(PARETO_THRESHOLD_PERCENT, 80)
  })

  it('item yang tepat 80% tetap vital, item sesudahnya tidak', () => {
    const rows = buildParetoRows([{ value: 80 }, { value: 20 }])
    assert.deepEqual(rows.map(r => r.is_vital_few), [true, false])
  })

  it('mengabaikan baris bernilai 0 / negatif / tidak valid', () => {
    const rows = buildParetoRows([
      { value: 40, name: 'A' },
      { value: 0, name: 'ZERO' },
      { value: -5, name: 'NEG' },
      { value: null, name: 'NULL' },
      { value: 60, name: 'B' }
    ])

    assert.equal(rows.length, 2)
    assert.deepEqual(rows.map(r => r.name), ['A', 'B'])
    assert.equal(rows[0].total_value, 100)
  })

  it('input kosong / bukan array → daftar kosong (tidak melempar error)', () => {
    assert.deepEqual(buildParetoRows([]), [])
    assert.deepEqual(buildParetoRows(null), [])
    assert.deepEqual(buildParetoRows(undefined), [])
    assert.deepEqual(buildParetoRows([{ value: 0 }]), [])
  })

  it('cumulative_percent tidak pernah melebihi 100', () => {
    const rows = buildParetoRows([{ value: 33 }, { value: 33 }, { value: 34 }])
    assert.equal(rows[rows.length - 1].cumulative_percent, 100)
    for (const row of rows) {
      assert.ok(row.cumulative_percent <= 100)
    }
  })

  it('membulatkan persentase ke 1 desimal', () => {
    const rows = buildParetoRows([{ value: 1 }, { value: 2 }])
    assert.equal(rows[0].percent, 33.3)
    assert.equal(rows[1].percent, 66.7)
    assert.equal(rows[1].cumulative_percent, 100)
  })
})

describe('Fase 4.4 - pickTopOneByKey', () => {
  it('memilih count terbesar per teknisi', () => {
    const winners = pickTopOneByKey([
      { key: 1, id: 10, count: 3 },
      { key: 1, id: 11, count: 7 },
      { key: 2, id: 10, count: 2 }
    ])

    assert.equal(winners.get(1).id, 11)
    assert.equal(winners.get(2).id, 10)
  })

  it('seri count dipecah dengan id lebih kecil (deterministik)', () => {
    const winners = pickTopOneByKey([
      { key: 1, id: 20, count: 5 },
      { key: 1, id: 12, count: 5 }
    ])
    assert.equal(winners.get(1).id, 12)
  })

  it('mengabaikan count 0 dan input tidak valid', () => {
    const winners = pickTopOneByKey([
      { key: 1, id: 10, count: 0 },
      { key: NaN, id: 11, count: 4 }
    ])
    assert.equal(winners.size, 0)
    assert.equal(pickTopOneByKey(null).size, 0)
  })
})

describe('Fase 4.4 - resolveConfidence (kualitas sampel, bukan skor)', () => {
  it('memetakan jumlah penanganan ke tingkat keyakinan data', () => {
    assert.equal(resolveConfidence(0), 'LOW')
    assert.equal(resolveConfidence(1), 'LOW')
    assert.equal(resolveConfidence(2), 'MEDIUM')
    assert.equal(resolveConfidence(4), 'MEDIUM')
    assert.equal(resolveConfidence(5), 'HIGH')
  })
})

describe('Fase 4.4 - helper angka', () => {
  it('roundTo membulatkan & aman terhadap nilai tidak valid', () => {
    assert.equal(roundTo(12.345), 12.3)
    assert.equal(roundTo(12.36), 12.4)
    assert.equal(roundTo(null), null)
    assert.equal(roundTo('abc'), null)
    assert.equal(roundTo(150, 0), 150)
  })

  it('toNumber menormalkan nilai agregasi Prisma (null → 0)', () => {
    assert.equal(toNumber(null), 0)
    assert.equal(toNumber(undefined), 0)
    assert.equal(toNumber('120'), 120)
    assert.equal(toNumber(NaN), 0)
  })

  it('minutesToHours mengubah menit ke jam (1 desimal)', () => {
    assert.equal(minutesToHours(150), 2.5)
    assert.equal(minutesToHours(0), 0)
    assert.equal(minutesToHours(null), 0)
    assert.equal(minutesToHours(95), 1.6)
  })
})

describe('Fase 4.4 - buildSkillMatrix', () => {
  const userMap = new Map([
    [1, { full_name: 'Budi Santoso', nik: 'NIK001', email: 'budi@satoria.co.id', plant_name: 'Plant 1', group_name: 'Line A' }],
    [2, { full_name: 'Andi Wijaya', nik: 'NIK002', email: 'andi@satoria.co.id', plant_name: 'Plant 1', group_name: 'Line A' }]
  ])
  const machineNameMap = new Map([[10, 'Filler Capper'], [11, 'Shrink Tunnel']])
  const failureCodeMap = new Map([
    [5, { code: 'MECH-BRG', name: 'Bearing Aus', category: 'MECHANICAL' }],
    [6, { code: 'ELEC-VFD', name: 'VFD Trip', category: 'ELECTRICAL' }]
  ])

  it('mengambil Top-1 mesin & Top-1 failure code per teknisi', () => {
    const matrix = buildSkillMatrix({
      topMachineRows: [
        { key: 1, id: 10, count: 4 },
        { key: 1, id: 11, count: 9 },
        { key: 2, id: 10, count: 6 }
      ],
      topFailureRows: [
        { key: 1, id: 5, count: 8 },
        { key: 1, id: 6, count: 2 },
        { key: 2, id: 6, count: 3 }
      ],
      machineNameMap,
      failureCodeMap,
      userMap
    })

    const budi = matrix.find(r => r.user_id === 1)
    assert.equal(budi.machine_name, 'Shrink Tunnel')
    assert.equal(budi.machine_handled_count, 9)
    assert.equal(budi.failure_code, 'MECH-BRG')
    assert.equal(budi.failure_name, 'Bearing Aus')
    assert.equal(budi.total_handled, 17)
    assert.equal(budi.machine_share_percent, 52.9)
    assert.equal(budi.confidence, 'HIGH')
  })

  it('menyertakan email sebagai kontak kerja (bukan penilaian) & null bila tidak ada', () => {
    const matrix = buildSkillMatrix({
      topMachineRows: [{ key: 1, id: 10, count: 3 }],
      // Andi hanya punya histori kode kerusakan (tanpa mesin) agar tetap masuk matriks.
      topFailureRows: [{ key: 2, id: 5, count: 2 }],
      machineNameMap,
      failureCodeMap,
      userMap: new Map([
        [1, { full_name: 'Budi Santoso', nik: 'NIK001', email: 'budi@satoria.co.id' }],
        // User legacy yang belum punya email -> tetap muncul dengan email null.
        [2, { full_name: 'Andi Wijaya', nik: 'NIK002' }]
      ])
    })

    const budi = matrix.find(r => r.user_id === 1)
    const andi = matrix.find(r => r.user_id === 2)

    assert.equal(budi.email, 'budi@satoria.co.id')
    assert.equal(andi.email, null)
    // Email hanya tambahan field; kontrak nama field existing tetap utuh.
    assert.equal(budi.full_name, 'Budi Santoso')
    assert.equal(budi.machine_name, 'Filler Capper')
  })

  it('diurutkan abjad nama, BUKAN berdasarkan jumlah penanganan (aturan P1)', () => {
    const matrix = buildSkillMatrix({
      // Budi punya jumlah jauh lebih besar, namun tetap di belakang Andi (abjad A < B).
      topMachineRows: [
        { key: 1, id: 10, count: 50 },
        { key: 2, id: 11, count: 1 }
      ],
      topFailureRows: [],
      machineNameMap,
      failureCodeMap,
      userMap
    })

    assert.deepEqual(matrix.map(r => r.full_name), ['Andi Wijaya', 'Budi Santoso'])
  })

  it('tidak menghasilkan field skor/ranking kinerja apa pun', () => {
    const matrix = buildSkillMatrix({
      topMachineRows: [{ key: 1, id: 10, count: 3 }],
      topFailureRows: [{ key: 1, id: 5, count: 2 }],
      machineNameMap,
      failureCodeMap,
      userMap
    })

    const forbidden = ['score', 'rank', 'rangking', 'points', 'leaderboard', 'performance']
    for (const row of matrix) {
      for (const key of forbidden) {
        assert.equal(key in row, false, `Skill Matrix tidak boleh memuat field "${key}"`)
      }
    }
  })

  it('teknisi yang hanya punya kode kerusakan tetap muncul (mesin null)', () => {
    const matrix = buildSkillMatrix({
      topMachineRows: [{ key: 1, id: 10, count: 2 }],
      topFailureRows: [{ key: 2, id: 6, count: 3 }],
      machineNameMap,
      failureCodeMap,
      userMap
    })

    const andi = matrix.find(r => r.user_id === 2)
    assert.equal(andi.machine_id, null)
    assert.equal(andi.machine_name, null)
    assert.equal(andi.failure_code, 'ELEC-VFD')
  })

  it('mengabaikan teknisi yang tidak ada di userMap', () => {
    const matrix = buildSkillMatrix({
      topMachineRows: [{ key: 999, id: 10, count: 5 }],
      topFailureRows: [],
      machineNameMap,
      failureCodeMap,
      userMap
    })
    assert.deepEqual(matrix, [])
  })

  it('aman untuk input kosong', () => {
    assert.deepEqual(buildSkillMatrix(), [])
    assert.deepEqual(buildSkillMatrix({}), [])
  })
})

describe('Fase 4.4 - buildParetoSummary', () => {
  it('menghitung konsentrasi "X dari Y menyumbang 80%"', () => {
    const summary = buildParetoSummary({
      machineRows: [
        { value: 600, name: 'Filler' },
        { value: 200, name: 'Capper' },
        { value: 100, name: 'Conveyor' },
        { value: 100, name: 'Labeler' }
      ],
      failureRows: [
        { value: 9, name: 'Bearing Aus' },
        { value: 1, name: 'VFD Trip' }
      ],
      totalDowntimeMinutes: 1000,
      totalBreakdown: 12
    })

    // 600 (60%) + 200 (20%) = 80% -> 2 mesin vital dari 4 mesin
    assert.equal(summary.vital_machine_count, 2)
    assert.equal(summary.vital_machine_percent, 50)
    assert.equal(summary.total_machines_with_downtime, 4)
    assert.equal(summary.total_downtime_hours, 16.7)
    assert.equal(summary.total_breakdown, 12)
    assert.equal(summary.top_machine_name, 'Filler')

    // 9 dari 10 = 90% -> 1 kode kerusakan vital dari 2
    assert.equal(summary.vital_failure_count, 1)
    assert.equal(summary.vital_failure_percent, 50)
    assert.equal(summary.total_failure_codes_used, 2)
    assert.equal(summary.total_failure_occurrences, 10)
    assert.equal(summary.top_failure_name, 'Bearing Aus')
  })

  it('BUG: top_*_name terisi walau baris hanya membawa id (pakai peta nama)', () => {
    // Baris agregasi controller hanya punya { id, value } — tanpa `name`.
    const summary = buildParetoSummary({
      machineRows: [{ id: 10, value: 50 }, { id: 11, value: 10 }],
      failureRows: [{ id: 5, value: 3 }],
      machineNames: new Map([[10, 'Filler Capper'], [11, 'Shrink Tunnel']]),
      failureNames: new Map([[5, 'Bearing Aus']])
    })

    assert.equal(summary.top_machine_name, 'Filler Capper')
    assert.equal(summary.top_failure_name, 'Bearing Aus')
  })

  it('BUG: mesin yang log-nya ada tetapi downtime 0 tidak dihitung sebagai basis', () => {
    // Kasus nyata: 6 mesin punya log breakdown, namun seluruh downtime = 0.
    // Ringkasan TIDAK boleh melaporkan "0 dari 6 mesin" (menyesatkan).
    const summary = buildParetoSummary({
      machineRows: [
        { id: 1, value: 0 },
        { id: 2, value: 0 },
        { id: 3, value: 0 },
        { id: 4, value: 0 },
        { id: 5, value: 0 },
        { id: 6, value: 0 }
      ],
      failureRows: [],
      totalDowntimeMinutes: 0,
      totalBreakdown: 6
    })

    assert.equal(summary.total_machines_with_downtime, 0)
    assert.equal(summary.vital_machine_count, 0)
    assert.equal(summary.vital_machine_percent, null)
    assert.equal(summary.top_machine_name, null)
    // Breakdown tetap dilaporkan apa adanya.
    assert.equal(summary.total_breakdown, 6)
  })

  it('tanpa data -> angka nol & persentase null (bukan NaN)', () => {
    const summary = buildParetoSummary()
    assert.equal(summary.total_downtime_minutes, 0)
    assert.equal(summary.vital_machine_count, 0)
    assert.equal(summary.vital_machine_percent, null)
    assert.equal(summary.top_machine_name, null)
  })
})
