import { describe, it, expect } from 'vitest'
import { validateLogbookTimeRange } from './timeValidation'

describe('validateLogbookTimeRange (F1.1 - BUG-003 & BUG-004)', () => {
  const dayShift = { start_time: '06:00', end_time: '14:00' }
  const nightShift = { start_time: '22:00', end_time: '06:00' }

  it('menolak 08:00 -> 07:00 pada shift siang (bukan shift malam)', () => {
    expect(validateLogbookTimeRange('08:00', '07:00', dayShift)).not.toBe('')
  })

  it('menerima 22:00 -> 06:00 pada shift malam', () => {
    expect(validateLogbookTimeRange('22:00', '06:00', nightShift)).toBe('')
  })

  it('menerima rentang normal 08:00 -> 10:30', () => {
    expect(validateLogbookTimeRange('08:00', '10:30', dayShift)).toBe('')
  })

  it('menolak waktu selesai sama dengan waktu mulai (durasi 0)', () => {
    expect(validateLogbookTimeRange('08:00', '08:00', dayShift)).toMatch(/sama dengan waktu mulai/i)
  })

  it('menolak bila waktu kosong', () => {
    expect(validateLogbookTimeRange('', '10:00', dayShift)).not.toBe('')
  })
})
