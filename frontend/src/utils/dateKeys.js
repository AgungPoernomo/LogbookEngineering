/**
 * Date key utilities using local date components (never toISOString to avoid WIB UTC-offset day shifts).
 */

/**
 * Format Date object to 'YYYY-MM-DD' in local time
 * @param {Date|string} d
 * @returns {string}
 */
export function toLocalDateString(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return d
  }
  const date = typeof d === 'string' ? new Date(d) : d
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse 'YYYY-MM-DD' into local Date object
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date()
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

/**
 * Add N days to date string 'YYYY-MM-DD'
 * @param {string|Date} date
 * @param {number} n
 * @returns {string}
 */
export function addDays(date, n) {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date)
  d.setDate(d.getDate() + n)
  return toLocalDateString(d)
}

/**
 * Get week start date (Monday = 1) for a given date
 * @param {string|Date} date
 * @param {number} weekStartDay - 1 for Monday (default)
 * @returns {string} 'YYYY-MM-DD'
 */
export function getWeekStart(date, weekStartDay = 1) {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date)
  const currentDay = d.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Calculate distance from weekStartDay
  // e.g. currentDay = 6 (Sat), weekStartDay = 1 (Mon):
  // diff = (6 - 1 + 7) % 7 = 5 days ago
  const diff = (currentDay - weekStartDay + 7) % 7
  d.setDate(d.getDate() - diff)
  return toLocalDateString(d)
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
]

const DAY_NAMES_ID = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
]

/**
 * Format range of dates for Calendar Toolbar
 * e.g.:
 * - Single day: "Sabtu, 17 Oktober 2026"
 * - Same month: "12 - 18 Oktober 2026"
 * - Different month: "28 Sep - 4 Okt 2026"
 * - Different year: "28 Des 2026 - 3 Jan 2027"
 * @param {string} startDateStr
 * @param {string} endDateStr
 * @returns {string}
 */
export function formatDateRange(startDateStr, endDateStr) {
  if (!startDateStr) return ''
  const start = parseLocalDate(startDateStr)
  
  if (!endDateStr || startDateStr === endDateStr) {
    const dayName = DAY_NAMES_ID[start.getDay()]
    const d = start.getDate()
    const m = MONTH_NAMES_ID[start.getMonth()]
    const y = start.getFullYear()
    return `${dayName}, ${d} ${m} ${y}`
  }

  const end = parseLocalDate(endDateStr)
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()
  const startMonth = start.getMonth()
  const endMonth = end.getMonth()
  const startDate = start.getDate()
  const endDate = end.getDate()

  if (startYear !== endYear) {
    return `${startDate} ${MONTH_SHORT_ID[startMonth]} ${startYear} - ${endDate} ${MONTH_SHORT_ID[endMonth]} ${endYear}`
  }

  if (startMonth !== endMonth) {
    return `${startDate} ${MONTH_SHORT_ID[startMonth]} - ${endDate} ${MONTH_SHORT_ID[endMonth]} ${endYear}`
  }

  return `${startDate} - ${endDate} ${MONTH_NAMES_ID[endMonth]} ${endYear}`
}
