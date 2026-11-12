/**
 * Validasi rentang waktu logbook (v6 - BUG-003 & BUG-004).
 *
 * Aturan:
 *  - Format wajib HH:mm (24 jam).
 *  - Waktu selesai TIDAK BOLEH sama dengan waktu mulai (durasi 0 menit) -> BUG-004.
 *  - Rentang lintas tengah malam (end < start, mis. 08:00 -> 07:00) HANYA valid
 *    bila logbook memakai Shift Malam (shift.end_time <= shift.start_time) -> BUG-003.
 *
 * @param {string} startTime 'HH:mm'
 * @param {string} endTime 'HH:mm'
 * @param {{start_time?: string, end_time?: string}|null} shift data shift terkait
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateLogbookTime(startTime, endTime, shift = null) {
  const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

  if (!startTime || !endTime) {
    return { valid: false, message: 'Waktu mulai dan waktu selesai wajib diisi.' }
  }

  if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
    return { valid: false, message: 'Format waktu harus HH:mm 24 jam (contoh 08:00).' }
  }

  if (startTime === endTime) {
    return {
      valid: false,
      message: 'Waktu selesai tidak boleh sama dengan waktu mulai (durasi 0 menit).'
    }
  }

  const toMinutes = (time) => {
    const [hour, minute] = time.split(':').map(Number)
    return hour * 60 + minute
  }

  const startMinutes = toMinutes(startTime)
  const endMinutes = toMinutes(endTime)

  // end < start => rentang melintasi tengah malam
  if (endMinutes < startMinutes) {
    const shiftCrossesMidnight = !!(shift && shift.start_time && shift.end_time) &&
      toMinutes(shift.end_time) <= toMinutes(shift.start_time)

    if (!shiftCrossesMidnight) {
      return {
        valid: false,
        message: 'Jam selesai lebih awal dari jam mulai. Rentang lintas tengah malam hanya untuk Shift Malam.'
      }
    }
  }

  return { valid: true }
}

/**
 * Validasi panjang uraian aktivitas (v6 - BUG-012): maksimal 1000 karakter.
 * @param {string} description
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateActivityDescription(description) {
  if (!description || !String(description).trim()) {
    return { valid: false, message: 'Uraian aktivitas pekerjaan wajib diisi.' }
  }
  if (String(description).length > 1000) {
    return { valid: false, message: 'Uraian aktivitas maksimal 1000 karakter.' }
  }
  return { valid: true }
}
