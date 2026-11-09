import test from 'node:test'
import assert from 'node:assert/strict'
import { getWIBDateString, getWIBLastNDays } from '../src/utils/date.js'

// ============================================================================
// BUG-013: Dashboard Overview Supervisor menampilkan 0 pada Total Log,
//          Log Harian, User Aktif, dan Chart 7 Hari, sementara "Log Terbaru"
//          tetap berisi data.
//
// Akar masalah:
//  1. Filter bulan (`yearMonth`) ikut diterapkan ke SEMUA agregasi. Bila nilai
//     filter kosong / tidak valid, query menjadi `task_date startsWith 'undefined'`
//     sehingga seluruh angka menjadi 0.
//  2. Kata kunci `search` ikut masuk ke where agregasi statistik.
//  3. Acuan tanggal harus WIB (UTC+7), bukan `toISOString()` (UTC).
//
// Pengujian ini mengunci kontrak normalisasi filter bulan ala controller.
// ============================================================================

/**
 * Replika logika sanitasi `yearMonth` di `overviewController.getDashboardOverview`.
 * Nilai non-ISO wajib jatuh ke bulan berjalan WIB, BUKAN menghasilkan filter sampah.
 */
function normalizeTargetYearMonth(raw, { year, month } = {}, now = new Date()) {
  let target = raw
  if (!target && year && month) {
    target = `${year}-${String(month).padStart(2, '0')}`
  }
  if (typeof target !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(target.trim())) {
    return getWIBDateString(now).slice(0, 7)
  }
  return target.trim()
}

test('BUG-013: yearMonth kosong jatuh ke bulan berjalan WIB (bukan filter sampah)', () => {
  const now = new Date('2026-11-09T07:23:00.000Z') // 14:23 WIB
  assert.equal(normalizeTargetYearMonth('', {}, now), '2026-11')
  assert.equal(normalizeTargetYearMonth(undefined, {}, now), '2026-11')
})

test('BUG-013: yearMonth "undefined"/"null" sebagai string tidak menghasilkan 0 baris', () => {
  const now = new Date('2026-11-09T07:23:00.000Z')
  // Nilai sampah yang dulu membuat `task_date startsWith 'undefined'` -> 0 baris
  assert.equal(normalizeTargetYearMonth('undefined', {}, now), '2026-11')
  assert.equal(normalizeTargetYearMonth('null', {}, now), '2026-11')
  assert.equal(normalizeTargetYearMonth('2026-13', {}, now), '2026-11') // bulan 13 invalid
  assert.equal(normalizeTargetYearMonth('2026-1', {}, now), '2026-11')  // bukan 2 digit
})

test('BUG-013: yearMonth valid dipertahankan apa adanya', () => {
  const now = new Date('2026-11-09T07:23:00.000Z')
  assert.equal(normalizeTargetYearMonth('2026-11', {}, now), '2026-11')
  assert.equal(normalizeTargetYearMonth(' 2026-10 ', {}, now), '2026-10')
  assert.equal(normalizeTargetYearMonth('2025-01', {}, now), '2025-01')
})

test('BUG-013: format alternatif month + year tetap didukung', () => {
  const now = new Date('2026-11-09T07:23:00.000Z')
  assert.equal(normalizeTargetYearMonth(undefined, { year: '2026', month: '11' }, now), '2026-11')
  assert.equal(normalizeTargetYearMonth(undefined, { year: '2026', month: '3' }, now), '2026-03')
})

test('BUG-013: acuan "hari ini" server memakai WIB, bukan UTC (meleset 1 hari)', () => {
  // 9 Nov 2026 00:30 WIB == 8 Nov 2026 17:30 UTC
  // toISOString() akan memberi '2026-11-08' (KEMARIN) -> Log Harian & Chart jadi 0.
  const justAfterMidnightWIB = new Date('2026-11-08T17:30:00.000Z')
  assert.equal(justAfterMidnightWIB.toISOString().slice(0, 10), '2026-11-08')
  assert.equal(getWIBDateString(justAfterMidnightWIB), '2026-11-09')

  // Chart 7 hari harus berakhir tepat di tanggal WIB hari ini
  const last7 = getWIBLastNDays(7, justAfterMidnightWIB)
  assert.equal(last7.length, 7)
  assert.equal(last7[6].date, '2026-11-09')
  assert.equal(last7[0].date, '2026-11-03')
})
