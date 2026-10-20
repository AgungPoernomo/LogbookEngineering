/**
 * Utility Penanggalan & Waktu khusus Zona Waktu WIB (Asia/Jakarta, UTC+7)
 * Memastikan kalkulasi tanggal di runtime Vercel Serverless (UTC) tetap 100% presisi untuk pengguna di Indonesia.
 */

/**
 * Mendapatkan tanggal string lokal WIB (UTC+7) dalam format YYYY-MM-DD
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} 'YYYY-MM-DD'
 */
export function getWIBDateString(date = new Date()) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d)
}

/**
 * Mendapatkan jam dan menit saat ini di zona waktu WIB (HH:mm)
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} 'HH:mm'
 */
export function getWIBTime(date = new Date()) {
  const d = new Date(date)
  if (isNaN(d.getTime())) return '08:00'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d)
}

/**
 * Mendapatkan Tahun dan Bulan (YYYY-MM) dalam zona waktu WIB
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} 'YYYY-MM'
 */
export function getWIBYearMonth(date = new Date()) {
  const dateStr = getWIBDateString(date)
  return dateStr.slice(0, 7)
}

/**
 * Mendapatkan array N hari terakhir mundur dari tanggal acuan WIB
 * @param {number} [days=7]
 * @param {Date|string} [baseDate=new Date()]
 * @returns {Array<{ date: string, dayLabel: string }>}
 */
export function getWIBLastNDays(days = 7, baseDate = new Date()) {
  const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const result = []

  const baseWibStr = getWIBDateString(baseDate)
  const [by, bm, bd] = baseWibStr.split('-').map(Number)

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(by, bm - 1, bd - i)
    const yStr = d.getFullYear()
    const mStr = String(d.getMonth() + 1).padStart(2, '0')
    const dStr = String(d.getDate()).padStart(2, '0')
    const dateFormatted = `${yStr}-${mStr}-${dStr}`
    result.push({
      date: dateFormatted,
      dayLabel: dayLabels[d.getDay()]
    })
  }

  return result
}

/**
 * Menghitung selisih hari antara dua tanggal string 'YYYY-MM-DD'
 * @param {string} startStr 
 * @param {string} endStr 
 * @returns {number}
 */
export function getDaysDifference(startStr, endStr) {
  const [sy, sm, sd] = startStr.split('-').map(Number)
  const [ey, em, ed] = endStr.split('-').map(Number)
  const startDate = new Date(sy, sm - 1, sd)
  const endDate = new Date(ey, em - 1, ed)
  const diffTime = endDate.getTime() - startDate.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}
