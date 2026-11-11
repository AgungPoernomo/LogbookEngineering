import { addDays } from './dateKeys'
import { LOG_STATUS } from '../constants/logStatus'

/**
 * Fallback tinggi 1 jam (px) bila CSS variable `--planner-hour-h` tidak terbaca.
 * Nilai ini WAJIB sama dengan token di `assets/tokens.css`.
 */
export const FALLBACK_PX_PER_HOUR = 40
export const SNAP = 15

/**
 * Tinggi minimum blok logbook (px) agar tetap dapat diklik/dibaca.
 * Selaras dengan token `--planner-event-min-h: 22px`.
 */
export const MIN_EVENT_HEIGHT_PX = 22

/**
 * Baca tinggi 1 jam (px) dari CSS variable `--planner-hour-h` pada elemen yang diberikan
 * (default: <html>). Satu-satunya sumber kebenaran konversi menit <-> piksel.
 * @param {HTMLElement|null} el
 * @returns {number}
 */
export function readPxPerHour(el = null) {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return FALLBACK_PX_PER_HOUR
  }
  const target = el || document.documentElement
  if (!target) return FALLBACK_PX_PER_HOUR
  const raw = window.getComputedStyle(target).getPropertyValue('--planner-hour-h')
  const parsed = parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_PX_PER_HOUR
}

/**
 * Tinggi 1 jam (px) default. Dipertahankan sebagai konstanta agar impor lama tetap valid;
 * nilainya mengikuti token `--planner-hour-h` (40px), bukan lagi hardcode 60px.
 */
export const PX_PER_HOUR = FALLBACK_PX_PER_HOUR

/**
 * Convert 'HH:mm' string to minutes from 00:00
 * @param {string} hhmm
 * @returns {number}
 */
export const toMinutes = (hhmm) => {
  if (!hhmm) return 0
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Convert minutes from 00:00 to 'HH:mm'
 * @param {number} totalMinutes
 * @returns {string}
 */
export const minutesToHhmm = (totalMinutes) => {
  const norm = Math.max(0, Math.min(1440, Math.round(totalMinutes)))
  const h = Math.floor(norm / 60) % 24
  const m = norm % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Piksel per menit berdasarkan tinggi 1 jam.
 * @param {number} pxPerHour
 * @returns {number}
 */
const pxPerMinute = (pxPerHour) => pxPerHour / 60

/**
 * Snap Y pixel position to minutes in 15-minute intervals
 * @param {number} y - offset piksel dari atas kolom hari (00:00)
 * @param {number} [pxPerHour] - tinggi 1 jam; default `readPxPerHour()` (token --planner-hour-h)
 * @returns {number}
 */
export const pxToMinutes = (y, pxPerHour = readPxPerHour()) =>
  Math.min(
    1440,
    Math.max(0, Math.round(y / pxPerMinute(pxPerHour) / SNAP) * SNAP)
  )

/**
 * Convert minutes to pixel height/offset
 * @param {number} min - menit sejak 00:00
 * @param {number} [pxPerHour] - tinggi 1 jam; default `readPxPerHour()` (token --planner-hour-h)
 * @returns {number}
 */
export const minutesToPx = (min, pxPerHour = readPxPerHour()) =>
  min * pxPerMinute(pxPerHour)

/**
 * Split a logbook into 1 or 2 visual segments depending on midnight crossing
 * @param {object} lb
 * @returns {Array}
 */
export function splitLogbookToSegments(lb) {
  const start = toMinutes(lb.start_time)
  const end = toMinutes(lb.end_time)
  
  if (end > start) {
    return [
      {
        logbookId: lb.id,
        logbook: lb,
        day: lb.task_date,
        dateKey: lb.task_date,
        startMin: start,
        endMin: end,
        isContinuation: false,
        continues: false
      }
    ]
  }

  // Crosses midnight (end <= start)
  return [
    {
      logbookId: lb.id,
      logbook: lb,
      day: lb.task_date,
      dateKey: lb.task_date,
      startMin: start,
      endMin: 1440,
      isContinuation: false,
      continues: true
    },
    {
      logbookId: lb.id,
      logbook: lb,
      day: addDays(lb.task_date, 1),
      dateKey: addDays(lb.task_date, 1),
      startMin: 0,
      endMin: end,
      isContinuation: true,
      continues: false
    }
  ]
}

/**
 * Overlapping column layout algorithm for segments within one DayColumn (Section 7.3)
 * @param {Array} segments - segments belonging to one day
 * @param {number} [pxPerHour] - tinggi 1 jam; default `readPxPerHour()` (token --planner-hour-h)
 * @returns {Array} segments with visual layout coordinates (top, height, left, width, columnIndex, totalColumns)
 */
export function layoutDaySegments(segments, pxPerHour = readPxPerHour()) {
  if (!segments || segments.length === 0) return []

  // 1. Sort by startMin asc, then endMin desc
  const sorted = [...segments].sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin
    return b.endMin - a.endMin
  })

  // 2. Cluster overlapping segments (transitive overlap)
  const clusters = []
  let currentCluster = []
  let clusterMaxEnd = -1

  for (const seg of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(seg)
      clusterMaxEnd = seg.endMin
    } else if (seg.startMin < clusterMaxEnd) {
      currentCluster.push(seg)
      clusterMaxEnd = Math.max(clusterMaxEnd, seg.endMin)
    } else {
      clusters.push(currentCluster)
      currentCluster = [seg]
      clusterMaxEnd = seg.endMin
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster)
  }

  // 3. For each cluster, place each segment into the first available column
  const positionedSegments = []

  for (const cluster of clusters) {
    // Array of columns, each holding segments assigned to that column
    const columns = []

    for (const seg of cluster) {
      let placed = false
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const lastInCol = columns[colIdx][columns[colIdx].length - 1]
        if (seg.startMin >= lastInCol.endMin) {
          columns[colIdx].push(seg)
          seg.columnIndex = colIdx
          placed = true
          break
        }
      }
      if (!placed) {
        seg.columnIndex = columns.length
        columns.push([seg])
      }
    }

    const totalColumns = columns.length

    for (const seg of cluster) {
      seg.totalColumns = totalColumns
      seg.topPx = minutesToPx(seg.startMin, pxPerHour)
      seg.heightPx = Math.max(
        MIN_EVENT_HEIGHT_PX,
        minutesToPx(seg.endMin - seg.startMin, pxPerHour)
      )
      seg.leftPercent = (seg.columnIndex / totalColumns) * 100
      seg.widthPercent = 100 / totalColumns
      positionedSegments.push(seg)
    }
  }

  return positionedSegments
}

/**
 * Format duration string compact for chip (e.g. "2j 30m" or "45m")
 * @param {number} totalMinutes
 * @returns {string}
 */
export function formatDurationCompact(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0m'
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h > 0 && m > 0) return `${h}j ${m}m`
  if (h > 0) return `${h}j`
  return `${m}m`
}

/**
 * Compute daily summary chips for DaySummaryRow (Section 5.5)
 * @param {string} dayDateStr
 * @param {Array} dayLogbooks - only logbooks that started on this day (task_date === dayDateStr)
 * @returns {object} { chips: Array }
 */
export function computeDaySummary(dayDateStr, dayLogbooks = []) {
  if (!dayLogbooks || dayLogbooks.length === 0) {
    return { chips: [], totalLogbooks: 0, totalDurationMinutes: 0 }
  }

  const totalLogbooks = dayLogbooks.length
  const totalDurationMinutes = dayLogbooks.reduce((acc, lb) => acc + (lb.duration_minutes || 0), 0)
  const durationFormatted = formatDurationCompact(totalDurationMinutes)

  const chips = []

  // Chip A: Total logbooks & duration (primary style)
  if (totalLogbooks > 0) {
    chips.push({
      id: `summary-count-${dayDateStr}`,
      type: 'total',
      label: `${totalLogbooks} logbook · ${durationFormatted}`,
      shortLabel: `${totalLogbooks} logbook`,
      fullTitle: `${totalLogbooks} logbook, total durasi ${durationFormatted}`
    })
  }

  // Chip B: Rejected / perlu revisi (status REJECTED)
  const rejectedLogs = dayLogbooks.filter(lb => lb.status === LOG_STATUS.REJECTED)
  if (rejectedLogs.length > 0) {
    chips.push({
      id: `summary-rejected-${dayDateStr}`,
      type: 'rejected',
      count: rejectedLogs.length,
      label: `${rejectedLogs.length} perlu revisi`,
      fullTitle: `${rejectedLogs.length} logbook perlu revisi dari Supervisor`,
      firstId: rejectedLogs[0].id
    })
  }

  // Chip C: Draft (status DRAFT)
  const draftLogs = dayLogbooks.filter(lb => lb.status === LOG_STATUS.DRAFT)
  if (draftLogs.length > 0) {
    chips.push({
      id: `summary-draft-${dayDateStr}`,
      type: 'draft',
      count: draftLogs.length,
      label: `${draftLogs.length} draft`,
      fullTitle: `${draftLogs.length} logbook tersimpan sebagai draft`,
      firstId: draftLogs[0].id
    })
  }

  return {
    chips: chips.slice(0, 3), // max 3 chips per day per 5.5
    totalLogbooks,
    totalDurationMinutes
  }
}
