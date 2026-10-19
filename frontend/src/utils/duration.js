/**
 * Calculate duration in minutes between start time and end time (HH:mm).
 * Handles cross-midnight shifts (e.g. 23:00 to 07:00 = 8 hours = 480 minutes).
 * 
 * @param {string} startTime - HH:mm
 * @param {string} endTime - HH:mm
 * @returns {number} duration in minutes
 */
export function calculateDurationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return 0

  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return 0
  }

  const startTotal = startH * 60 + startM
  let endTotal = endH * 60 + endM

  // If end time is earlier than start time, it crosses midnight into the next day
  if (endTotal < startTotal) {
    endTotal += 24 * 60 // Add 1440 minutes
  }

  return endTotal - startTotal
}

/**
 * Format minutes into human-readable string (e.g. "2 jam 30 menit" or "45 menit")
 * 
 * @param {number} minutes 
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0 menit'

  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60

  if (hours > 0 && remainingMins > 0) {
    return `${hours} jam ${remainingMins} menit`
  }
  if (hours > 0) {
    return `${hours} jam`
  }
  return `${remainingMins} menit`
}
