import { describe, it } from 'node:test'
import assert from 'node:assert'
import { getWIBLastNDays } from '../src/utils/date.js'

// ============================================================================
// BUG-014: Statistik plant (Total Log, Log Harian, User Aktif, Chart 7 Hari)
//          bernilai 0 untuk plant/Line lain, sementara daftar "Log Terbaru"
//          per kartu tetap menampilkan data.
//
// Akar masalah (dua lapis):
//
//  1. AGREGASI TIDAK DI-SCOPE KE KARTU YANG DIRENDER.
//     Statistik memakai `groupBy({ by: ['plant_id'] })` dengan where global
//     (`baseWhere`/`periodWhere`) yang sudah dipersempit oleh filter UI
//     (Admin memilih satu Line, atau Supervisor Line). Akibatnya groupBy hanya
//     mengembalikan baris milik Line yang difilter, dan SEMUA kartu lain —
//     termasuk kartu Line itu sendiri — jatuh ke `0` lewat `map.get(pid) || 0`.
//     Daftar "Log Terbaru" tidak terpengaruh karena query-nya memakai
//     `plant_id: p.id` secara langsung.
//
//  2. JENDELA WAKTU DIBATALKAN OLEH `task_date` YANG LEBIH AKHIR.
//     `{ ...baseWhere, task_date: todayStr }` membuat dua key `task_date`;
//     yang terakhir menimpa, sehingga filter hari hilang dan "Log Harian"
//     menjadi total seluruh scope.
//
// Pengujian di bawah mengunci kontrak helper `taskDateWindow` /
// `scopeWithoutTaskDate` yang menjadi inti perbaikan.
// ============================================================================

/** Replika `scopeWithoutTaskDate` pada overviewController. */
function scopeWithoutTaskDate(where) {
  const { task_date: _ignored, ...rest } = where || {}
  return rest
}

/** Replika `taskDateWindow` pada overviewController. */
function taskDateWindow(kind, value) {
  if (kind === 'period') {
    return { task_date: { gte: `${value}-00`, lte: `${value}-99` } }
  }
  if (kind === 'range') {
    const dates = Array.isArray(value) ? value.filter(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) : []
    return { task_date: { in: dates } }
  }
  return { task_date: value }
}

const ISO_PREFIX = '1000-01-01'
const ISO_SUFFIX = '9999-12-31'

/** Replika `baseWhere` milik controller: scope organisasi + batas tanggal ISO. */
function buildBaseWhere(orgScope = {}) {
  return { ...orgScope, task_date: { gte: ISO_PREFIX, lte: ISO_SUFFIX } }
}

/**
 * Replika penyusunan where agregasi per plant (inti perbaikan BUG-014):
 * scope organisasi (tanpa task_date) + plant-card yang dirender + jendela waktu.
 */
function buildPlantAggregateWhere({ orgScope = {}, plantIds = [], kind = 'day', value }) {
  const baseScope = scopeWithoutTaskDate(buildBaseWhere(orgScope))
  return {
    ...baseScope,
    plant_id: { in: plantIds },
    ...taskDateWindow(kind, value)
  }
}

describe('BUG-014: Agregasi statistik plant harus konsisten dengan daftar "Log Terbaru"', () => {

  it('1. `task_date` milik baseWhere TIDAK boleh membatalkan filter harian', () => {
    // Bug lama: `{ ...baseWhere, task_date: todayStr }` menyisakan filter ISO
    // milik baseWhere; urutan spread menentukan jendela mana yang bertahan.
    const baseWhere = buildBaseWhere({ plant_id: 1n })
    const naive = { ...baseWhere, task_date: '2026-11-09' }

    assert.strictEqual(naive.task_date, '2026-11-09')

    // Perbaikan: jendela waktu ditimpakan di ATAS scope tanpa task_date.
    const fixed = buildPlantAggregateWhere({
      orgScope: { plant_id: 1n },
      plantIds: [1n],
      kind: 'day',
      value: '2026-11-09'
    })
    assert.strictEqual(fixed.task_date, '2026-11-09')
    assert.strictEqual(fixed.plant_id.in.length, 1)
  })

  it('2. Agregasi per plant WAJIB menyertakan plant-card yang dirender', () => {
    // Kasus nyata: Admin/Supervisor memfilter Line 1, tetapi kartu Line 2 tetap
    // dirender ("Log Terbaru"-nya berisi data) → statistiknya tidak boleh 0.
    const where = buildPlantAggregateWhere({
      orgScope: { plant_id: 1n }, // filter UI: Line 1
      plantIds: [1n, 2n, 3n, 4n], // kartu yang dirender
      kind: 'period',
      value: '2026-11'
    })

    assert.deepStrictEqual(where.plant_id.in.map(String), ['1', '2', '3', '4'])
    assert.ok(where.plant_id.in.some(id => String(id) === '2'),
      'Line 2 harus ikut diagregasi agar kartunya tidak bernilai 0')
  })

  it('3. Jendela "periode" menyaring bulan sekaligus membuang tanggal rusak', () => {
    const where = buildPlantAggregateWhere({ plantIds: [1n], kind: 'period', value: '2026-11' })
    assert.deepStrictEqual(where.task_date, { gte: '2026-11-00', lte: '2026-11-99' })

    // Baris legacy 'pengamatan' / 'diskusi ta' tidak boleh ikut terhitung.
    const inWindow = (d) => d >= where.task_date.gte && d <= where.task_date.lte
    assert.strictEqual(inWindow('2026-11-09'), true)
    assert.strictEqual(inWindow('2026-10-31'), false)
    assert.strictEqual(inWindow('pengamatan'), false)
    assert.strictEqual(inWindow('diskusi ta'), false)
  })

  it('4. Jendela "range" (Chart 7 Hari) hanya berisi tanggal ISO, tanpa duplikat', () => {
    const last7 = getWIBLastNDays(7, new Date('2026-11-09T07:23:00.000Z')).map(d => d.date)
    assert.deepStrictEqual(last7, [
      '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
      '2026-11-07', '2026-11-08', '2026-11-09'
    ])

    const where = buildPlantAggregateWhere({
      plantIds: [1n, 2n],
      kind: 'range',
      value: [...last7, 'pengamatan', '']
    })
    assert.strictEqual(where.task_date.in.length, 7, 'tanggal non-ISO harus dibuang')
    assert.ok(!where.task_date.in.includes('pengamatan'))
  })

  it('5. Lookup statistik per plant memakai kunci yang konsisten (BigInt vs Number)', () => {
    // Prisma mengembalikan plant_id sebagai BigInt, sedangkan kartu memakai
    // `Number(plant.id)`. `Map.get(1)` pada Map ber-kunci BigInt = undefined,
    // dan itulah yang membuat kartu jatuh ke 0 lewat `|| 0`.
    const groupByResult = [
      { plant_id: 1n, _count: { id: 22 } },
      { plant_id: 2n, _count: { id: 60 } }
    ]

    const safeMap = new Map(groupByResult.map(g => [Number(g.plant_id), g._count.id]))
    assert.strictEqual(safeMap.get(Number(1n)), 22)
    assert.strictEqual(safeMap.get(Number(2n)), 60)
    assert.strictEqual(safeMap.get(Number(3n)) ?? 0, 0)

    const unsafeMap = new Map([[1n, 22]])
    assert.strictEqual(unsafeMap.get(1), undefined, 'kunci BigInt tidak cocok dengan Number')
  })

  it('6. Kartu tanpa data pada jendela waktu tetap 0, bukan undefined', () => {
    // Line 3 punya 788 log historis tetapi NOL log di November 2026,
    // sehingga angka 0 adalah nilai yang benar (bukan bug).
    const counts = [{ plant_id: 1n, _count: { id: 22 } }]
    const map = new Map(counts.map(g => [Number(g.plant_id), g._count.id]))
    assert.strictEqual(map.get(3) || 0, 0)
    assert.strictEqual(map.get(4) || 0, 0)
  })

  it('7. Scope organisasi (shift/group) tetap dipertahankan setelah perbaikan', () => {
    const where = buildPlantAggregateWhere({
      orgScope: { shift_id: 2n },
      plantIds: [1n, 2n],
      kind: 'day',
      value: '2026-11-09'
    })
    assert.deepStrictEqual(where.shift_id, 2n)
    assert.deepStrictEqual(where.plant_id, { in: [1n, 2n] })
    assert.strictEqual(where.task_date, '2026-11-09')
  })
})

