/**
 * Utility Kalkulasi Durasi Logbook dengan penanganan shift lintas tengah malam
 * @param {string} startTime 'HH:mm'
 * @param {string} endTime 'HH:mm'
 * @returns {number} Durasi dalam menit
 */
export function calculateDurationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 0
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)

  if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
    return 0
  }

  const startTotal = startHour * 60 + startMinute
  const endTotal = endHour * 60 + endMinute

  let diff = endTotal - startTotal
  // Jika endTotal < startTotal, berarti melintasi tengah malam (overnight shift, e.g. 23:00 - 07:00)
  if (diff < 0) {
    diff += 24 * 60
  }

  return Math.max(0, diff)
}
