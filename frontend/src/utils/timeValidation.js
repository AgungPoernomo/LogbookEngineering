/**
 * Validasi rentang waktu logbook di sisi klien (F1.1 - BUG-003 & BUG-004).
 * Mencerminkan aturan backend (backend/src/utils/timeValidation.js).
 *
 * @param {string} startTime 'HH:mm'
 * @param {string} endTime 'HH:mm'
 * @param {{start_time?: string, end_time?: string}|null} shift shift terpilih
 * @returns {string} pesan error, atau '' bila valid
 */
export function validateLogbookTimeRange(startTime, endTime, shift = null) {
  if (!startTime || !endTime) return 'Waktu mulai dan waktu selesai wajib diisi.'

  // BUG-004: durasi 0 menit
  if (startTime === endTime) {
    return 'Waktu selesai tidak boleh sama dengan waktu mulai (durasi 0 menit).'
  }

  const toMinutes = (time) => {
    const [hour, minute] = time.split(':').map(Number)
    return hour * 60 + minute
  }

  const startMinutes = toMinutes(startTime)
  const endMinutes = toMinutes(endTime)

  // BUG-003: lintas tengah malam hanya sah bila shift memang melintasi tengah malam
  if (endMinutes < startMinutes) {
    const shiftCrossesMidnight = !!(shift && shift.start_time && shift.end_time) &&
      toMinutes(shift.end_time) <= toMinutes(shift.start_time)

    if (!shiftCrossesMidnight) {
      return 'Jam selesai lebih awal dari jam mulai. Rentang lintas tengah malam hanya untuk Shift Malam.'
    }
  }

  return ''
}
