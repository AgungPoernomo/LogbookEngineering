import { describe, it, expect } from 'vitest'
import {
  toMinutes,
  pxToMinutes,
  minutesToPx,
  readPxPerHour,
  FALLBACK_PX_PER_HOUR,
  splitLogbookToSegments,
  layoutDaySegments,
  computeDaySummary
} from './calendarLayout'
import { getWeekStart, formatDateRange } from './dateKeys'
import { LOG_STATUS } from '../constants/logStatus'

describe('calendarLayout & date utilities (Section 7.5)', () => {
  // Kasus 1: Logbook 08:00-10:30 pada 2026-10-14 -> 1 segmen pada 2026-10-14, 480-630
  it('Kasus 1: Logbook 08:00-10:30 menghasilkan 1 segmen 480-630', () => {
    const lb = {
      id: 1,
      task_date: '2026-10-14',
      start_time: '08:00',
      end_time: '10:30'
    }
    const segments = splitLogbookToSegments(lb)
    expect(segments).toHaveLength(1)
    expect(segments[0].day).toBe('2026-10-14')
    expect(segments[0].startMin).toBe(480)
    expect(segments[0].endMin).toBe(630)
    expect(segments[0].isContinuation).toBe(false)
  })

  // Kasus 2: Logbook 22:00-06:00 pada 2026-10-14 -> 2 segmen: 2026-10-14 1320-1440 (continues), 2026-10-15 0-360 (isContinuation)
  it('Kasus 2: Logbook 22:00-06:00 menghasilkan 2 segmen melewati tengah malam', () => {
    const lb = {
      id: 2,
      task_date: '2026-10-14',
      start_time: '22:00',
      end_time: '06:00'
    }
    const segments = splitLogbookToSegments(lb)
    expect(segments).toHaveLength(2)

    expect(segments[0].day).toBe('2026-10-14')
    expect(segments[0].startMin).toBe(1320)
    expect(segments[0].endMin).toBe(1440)
    expect(segments[0].continues).toBe(true)
    expect(segments[0].isContinuation).toBe(false)

    expect(segments[1].day).toBe('2026-10-15')
    expect(segments[1].startMin).toBe(0)
    expect(segments[1].endMin).toBe(360)
    expect(segments[1].isContinuation).toBe(true)
  })

  // Kasus 3: Logbook 22:00-06:00 pada hari terakhir rentang tampil -> Segmen kedua jatuh di luar rentang, tidak dirender; segmen pertama tetap tampil
  it('Kasus 3: Segmen kedua di luar rentang tanggal ditampilkan filter dengan benar', () => {
    const rangeDays = ['2026-10-12', '2026-10-13', '2026-10-14'] // rentang sampai 2026-10-14
    const lb = {
      id: 3,
      task_date: '2026-10-14',
      start_time: '22:00',
      end_time: '06:00'
    }
    const segments = splitLogbookToSegments(lb)
    const visibleSegments = segments.filter(seg => rangeDays.includes(seg.day))
    expect(visibleSegments).toHaveLength(1)
    expect(visibleSegments[0].day).toBe('2026-10-14')
    expect(visibleSegments[0].startMin).toBe(1320)
  })

  // Kasus 4: A 08:00-10:00 dan B 09:00-11:00 -> Dua kolom, masing-masing lebar 50%
  it('Kasus 4: Dua logbook tumpang tindih dibagi ke 2 kolom (50% lebar masing-masing)', () => {
    const segA = { logbookId: 'A', startMin: 480, endMin: 600 } // 08:00 - 10:00
    const segB = { logbookId: 'B', startMin: 540, endMin: 660 } // 09:00 - 11:00
    const laidOut = layoutDaySegments([segA, segB])
    expect(laidOut).toHaveLength(2)
    expect(laidOut[0].totalColumns).toBe(2)
    expect(laidOut[0].widthPercent).toBe(50)
    expect(laidOut[1].totalColumns).toBe(2)
    expect(laidOut[1].widthPercent).toBe(50)
    expect(laidOut[0].columnIndex).not.toBe(laidOut[1].columnIndex)
  })

  // Kasus 5: A 08:00-10:00, B 09:00-11:00, C 10:30-11:30 -> A dan B dua kolom; C pada kolom 1 (setelah A selesai) dalam cluster yang sama
  it('Kasus 5: Tiga logbook dalam cluster tumpang tindih ditempatkan di kolom bebas pertama', () => {
    const segA = { logbookId: 'A', startMin: 480, endMin: 600 } // 08:00 - 10:00 (col 0)
    const segB = { logbookId: 'B', startMin: 540, endMin: 660 } // 09:00 - 11:00 (col 1)
    const segC = { logbookId: 'C', startMin: 630, endMin: 690 } // 10:30 - 11:30 (start 630 >= end 600 of A -> col 0)
    const laidOut = layoutDaySegments([segA, segB, segC])
    expect(laidOut).toHaveLength(3)
    const a = laidOut.find(s => s.logbookId === 'A')
    const b = laidOut.find(s => s.logbookId === 'B')
    const c = laidOut.find(s => s.logbookId === 'C')

    expect(a.totalColumns).toBe(2)
    expect(b.totalColumns).toBe(2)
    expect(c.totalColumns).toBe(2)
    expect(a.columnIndex).toBe(0)
    expect(b.columnIndex).toBe(1)
    expect(c.columnIndex).toBe(0)
  })

  // Kasus 5b: posisi blok pada grid compact 40px/jam
  it('Kasus 5b: topPx/heightPx mengikuti token 40px pada layoutDaySegments', () => {
    const seg = { logbookId: 'A', startMin: 480, endMin: 510 } // 08:00 - 08:30
    const [laidOut] = layoutDaySegments([seg], 40)
    expect(laidOut.topPx).toBe(320) // 8 jam * 40px
    expect(laidOut.heightPx).toBe(22) // 20px terangkat ke tinggi minimum 22px

    const longSeg = { logbookId: 'B', startMin: 480, endMin: 630 } // 08:00 - 10:30
    const [longLaidOut] = layoutDaySegments([longSeg], 40)
    expect(longLaidOut.topPx).toBe(320)
    expect(longLaidOut.heightPx).toBe(100) // 2.5 jam * 40px
  })

  // Kasus 6: pxToMinutes(0), (7), (8), (14), (1500) -> 0, 0, 15, 15, 1440
  it('Kasus 6: pxToMinutes melakukan snap 15 menit dengan tepat', () => {
    // Diuji pada skala grid 60px/jam (kebalikan persis: 1 menit = 1px)
    expect(pxToMinutes(0, 60)).toBe(0)
    expect(pxToMinutes(7, 60)).toBe(0)
    expect(pxToMinutes(8, 60)).toBe(15)
    expect(pxToMinutes(14, 60)).toBe(15)
    expect(pxToMinutes(1500, 60)).toBe(1440)

    // Grid compact aktif (token 40px/jam): 1 menit = 2/3 px
    expect(pxToMinutes(0)).toBe(0)
    expect(pxToMinutes(4)).toBe(0) // 4px = 6 menit -> 0
    expect(pxToMinutes(5)).toBe(15) // 5px = 7.5 menit -> 15
    expect(pxToMinutes(10)).toBe(15) // 10px = 15 menit
    expect(pxToMinutes(320)).toBe(480) // 320px = 8 jam (08:00)
    expect(pxToMinutes(1500)).toBe(1440)
  })

  // Kasus 6b: Konversi mengikuti token --planner-hour-h (fallback 40px), bukan hardcode 60px
  it('Kasus 6b: tinggi 1 jam default mengikuti token 40px (bukan 60px)', () => {
    expect(FALLBACK_PX_PER_HOUR).toBe(40)
    expect(readPxPerHour()).toBe(40)
    // 08:00 -> top 320px; durasi 30 menit -> height 20px
    expect(minutesToPx(480)).toBe(320)
    expect(minutesToPx(30)).toBe(20)
    // 24 jam penuh = 960px, sama dengan h-[calc(var(--planner-hour-h)*24)] di DayColumn
    expect(minutesToPx(1440)).toBe(960)
    // Kebalikan: 320px -> 480 menit (08:00)
    expect(pxToMinutes(320)).toBe(480)
  })

  // Kasus 6c: pxPerHour eksplisit tetap didukung (kompatibilitas & pengujian)
  it('Kasus 6c: pxToMinutes dan minutesToPx menerima pxPerHour eksplisit', () => {
    // Pada 60px/jam: 480px = 08:00, 7px snap ke 15 menit
    expect(pxToMinutes(480, 60)).toBe(480)
    expect(pxToMinutes(7, 60)).toBe(0)
    expect(pxToMinutes(8, 60)).toBe(15)
    expect(pxToMinutes(1500, 60)).toBe(1440)
    expect(minutesToPx(480, 60)).toBe(480)
  })

  // Kasus 7: Awal minggu (Senin) untuk 2026-10-17 (Sabtu) -> 2026-10-12
  it('Kasus 7: Awal minggu Senin untuk 2026-10-17 (Sabtu) adalah 2026-10-12', () => {
    expect(getWeekStart('2026-10-17', 1)).toBe('2026-10-12')
  })

  // Kasus 8: Judul rentang 12-18 Okt 2026; 28 Sep-4 Okt 2026; 28 Des 2026-3 Jan 2027
  it('Kasus 8: Format judul rentang sesuai aturan bulan dan tahun', () => {
    expect(formatDateRange('2026-10-12', '2026-10-18')).toBe('12 - 18 Oktober 2026')
    expect(formatDateRange('2026-09-28', '2026-10-04')).toBe('28 Sep - 4 Okt 2026')
    expect(formatDateRange('2026-12-28', '2027-01-03')).toBe('28 Des 2026 - 3 Jan 2027')
  })

  // Kasus 9: Ringkasan harian: 2 logbook (90 dan 60 menit), 1 Rejected, 1 Draft -> Chip A "2 logbook · 2j 30m", chip B "1 perlu revisi", chip C "1 draft"
  it('Kasus 9: computeDaySummary menghasilkan 3 chip ringkasan', () => {
    const dayLogs = [
      { id: 1, duration_minutes: 90, status: LOG_STATUS.REJECTED },
      { id: 2, duration_minutes: 60, status: LOG_STATUS.DRAFT }
    ]
    const summary = computeDaySummary('2026-10-14', dayLogs)
    expect(summary.chips).toHaveLength(3)

    const chipA = summary.chips.find(c => c.type === 'total')
    const chipB = summary.chips.find(c => c.type === 'rejected')
    const chipC = summary.chips.find(c => c.type === 'draft')

    expect(chipA.label).toBe('2 logbook · 2j 30m')
    expect(chipB.label).toBe('1 perlu revisi')
    expect(chipC.label).toBe('1 draft')
  })
})
