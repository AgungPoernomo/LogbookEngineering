import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  getWIBDateString,
  getWIBTime,
  getWIBYearMonth,
  getWIBLastNDays,
  getDaysDifference
} from '../src/utils/date.js'
import { calculateDurationMinutes } from '../src/utils/duration.js'

describe('Pengujian Khusus Zona Waktu (WIB UTC+7 vs Vercel Server UTC) & Shift Lintas Tengah Malam', () => {

  it('1. Logbook yang dibuat pukul 01:00 WIB (18:00 UTC kemarin) harus tercatat di task_date tanggal baru', () => {
    // 20 Oktober 2026 18:00:00 UTC setara dengan 21 Oktober 2026 01:00:00 WIB
    const utcTime = new Date('2026-10-20T18:00:00.000Z')

    const dateInUTC = utcTime.toISOString().slice(0, 10)
    const dateInWIB = getWIBDateString(utcTime)
    const timeInWIB = getWIBTime(utcTime)

    // Di UTC masih tanggal 20
    assert.strictEqual(dateInUTC, '2026-10-20')
    // Namun di WIB sudah tanggal 21
    assert.strictEqual(dateInWIB, '2026-10-21')
    assert.strictEqual(timeInWIB, '01:00')
  })

  it('2. Menjelang tengah malam pukul 23:59 WIB tetap tercatat di tanggal hari berjalan', () => {
    // 20 Oktober 2026 16:59:00 UTC = 20 Oktober 2026 23:59:00 WIB
    const utcTime = new Date('2026-10-20T16:59:00.000Z')
    const dateInWIB = getWIBDateString(utcTime)
    const timeInWIB = getWIBTime(utcTime)

    assert.strictEqual(dateInWIB, '2026-10-20')
    assert.strictEqual(timeInWIB, '23:59')
  })

  it('3. Tepat setelah tengah malam pukul 00:05 WIB berganti ke tanggal berikutnya', () => {
    // 20 Oktober 2026 17:05:00 UTC = 21 Oktober 2026 00:05:00 WIB
    const utcTime = new Date('2026-10-20T17:05:00.000Z')
    const dateInWIB = getWIBDateString(utcTime)

    assert.strictEqual(dateInWIB, '2026-10-21')
  })

  it('4. Kalkulasi durasi shift malam melintasi tengah malam (overnight shift 23:00 - 07:00)', () => {
    // Shift 3 operasional farmasi: mulai 23:00 malam selesai 07:00 pagi
    const duration = calculateDurationMinutes('23:00', '07:00')
    assert.strictEqual(duration, 480) // 8 jam = 480 menit
  })

  it('5. Kalkulasi durasi shift panjang melintasi tengah malam (LongShift 19:00 - 07:00)', () => {
    const duration = calculateDurationMinutes('19:00', '07:00')
    assert.strictEqual(duration, 720) // 12 jam = 720 menit
  })

  it('6. Kalkulasi durasi shift siang normal (07:00 - 15:00)', () => {
    const duration = calculateDurationMinutes('07:00', '15:00')
    assert.strictEqual(duration, 480) // 8 jam = 480 menit
  })

  it('7. Window 7 hari terakhir pada jam 01:00 WIB harus menyertakan tanggal WIB hari ini', () => {
    const utcMidnightEarlyMorning = new Date('2026-10-20T18:00:00.000Z') // 21 Okt 01:00 WIB
    const last7Days = getWIBLastNDays(7, utcMidnightEarlyMorning)

    assert.strictEqual(last7Days.length, 7)
    // Elemen terakhir harus tanggal 21 Oktober
    assert.strictEqual(last7Days[6].date, '2026-10-21')
    // Elemen pertama harus 15 Oktober
    assert.strictEqual(last7Days[0].date, '2026-10-15')
  })

  it('8. Validasi batas rentang tanggal ekspor laporan (maksimal 93 hari)', () => {
    const validRange = getDaysDifference('2026-08-01', '2026-10-31')
    assert.ok(validRange <= 93, `Range ${validRange} hari harus valid`)

    const exceededRange = getDaysDifference('2026-01-01', '2026-06-30')
    assert.ok(exceededRange > 93, `Range ${exceededRange} hari harus terdeteksi melebihi 93 hari`)
  })
})
