/**
 * Fase 4.1a — Repeat Failure (banner kuning) di halaman /approval (SPV).
 *
 * Backend `GET /api/v1/logbooks` sudah mengirim `is_repeat_failure`,
 * `repeat_failure_count`, dan detail `repeat_failure`. Modul ini dipakai sebagai
 * sumber tunggal untuk UI + sebagai fallback bila flag dari backend belum siap
 * (mis. respons API lain tanpa flag), dengan aturan yang identik:
 *
 *   - Kunci pola = pasangan `machine_id` + `failure_code_id`
 *   - Repeat failure bila jumlah kejadian >= 2 dalam window hari mundur dari
 *     `task_date` logbook yang diperiksa (inklusif)
 */

export const REPEAT_FAILURE_WINDOW_DAYS = 30
export const REPEAT_FAILURE_MIN_OCCURRENCES = 2

const toDateStr = (value) => {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  }
  return String(value).slice(0, 10)
}

const shiftDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return toDateStr(d)
}

const pairKey = (machineId, failureCodeId) => `${machineId}:${failureCodeId}`

/**
 * Label kode kerusakan untuk badge kartu, mis. "MECH-01 - Bearing aus".
 * Mendukung dua bentuk data: objek relasi `failure_code` (API /logbooks)
 * maupun field datar `failure_code` + `failure_name`.
 *
 * @returns {string} Label siap tampil, string kosong bila tidak ada kode.
 */
export function formatFailureCodeLabel(log = {}) {
  if (!log) return ''

  let code = null
  let name = null

  if (log.failure_code && typeof log.failure_code === 'object') {
    code = log.failure_code.code || null
    name = log.failure_code.name || null
  } else {
    code = log.failure_code || null
    name = log.failure_name || log.failure_code_name || null
  }

  if (!code && log.failure_code_id) code = `#${log.failure_code_id}`
  if (!code) return ''

  return name && name !== '-' ? `${code} - ${name}` : String(code)
}

/**
 * Menyusun peta `logId -> info repeat failure` dari kumpulan logbook.
 * Logbook tanpa `machine_id` / `failure_code_id` tidak pernah dianggap repeat.
 *
 * @param {Array<Object>} logs
 * @param {Object} [options]
 * @param {number} [options.windowDays=REPEAT_FAILURE_WINDOW_DAYS]
 * @param {number} [options.minOccurrences=REPEAT_FAILURE_MIN_OCCURRENCES]
 * @returns {Map<number, {occurrence_count:number, window_days:number, machine_id:number, failure_code_id:number, failure_code:string, failure_code_name:string}>}
 */
export function buildRepeatFailureMap(logs = [], options = {}) {
  const {
    windowDays = REPEAT_FAILURE_WINDOW_DAYS,
    minOccurrences = REPEAT_FAILURE_MIN_OCCURRENCES
  } = options

  const repeatInfoByLogId = new Map()

  const normalized = (logs || [])
    .filter((log) => log && log.id !== undefined && log.id !== null)
    .map((log) => {
      const failureCodeId = log.failure_code_id ?? log.failure_code?.id ?? null

      return {
        id: log.id,
        log,
        machine_id:
          log.machine_id !== null && log.machine_id !== undefined
            ? String(log.machine_id)
            : null,
        failure_code_id:
          failureCodeId !== null && failureCodeId !== undefined
            ? String(failureCodeId)
            : null,
        task_date: toDateStr(log.task_date)
      }
    })

  const keyed = normalized.filter(
    (l) => l.machine_id && l.failure_code_id && l.task_date
  )
  if (keyed.length === 0) return repeatInfoByLogId

  // Kelompokkan per pasangan mesin + kode kerusakan, lalu urutkan kronologis
  const clusters = new Map()
  for (const item of keyed) {
    const k = pairKey(item.machine_id, item.failure_code_id)
    if (!clusters.has(k)) clusters.set(k, [])
    clusters.get(k).push(item)
  }

  for (const cluster of clusters.values()) {
    const sorted = [...cluster].sort((a, b) =>
      a.task_date < b.task_date ? -1 : a.task_date > b.task_date ? 1 : 0
    )

    // Ukuran pola = jumlah kejadian terbanyak dalam satu window (mis. 4 log => 4x)
    const patternOccurrences = sorted.reduce((maxCount, log) => {
      const windowStart = shiftDays(log.task_date, -windowDays)
      const windowCount = sorted.filter(
        (candidate) =>
          candidate.task_date >= windowStart &&
          candidate.task_date <= log.task_date
      ).length
      return Math.max(maxCount, windowCount)
    }, 0)

    if (patternOccurrences < minOccurrences) continue

    // Seluruh kejadian dalam pola ditandai (termasuk yang paling lama)
    for (const member of sorted) {
      const label = formatFailureCodeLabel(member.log)
      const [code, ...rest] = label.split(' - ')

      repeatInfoByLogId.set(Number(member.id), {
        occurrence_count: patternOccurrences,
        window_days: windowDays,
        machine_id: Number(member.machine_id),
        failure_code_id: Number(member.failure_code_id),
        failure_code: code || `#${member.failure_code_id}`,
        failure_code_name: rest.length ? rest.join(' - ') : '-'
      })
    }
  }

  return repeatInfoByLogId
}

/**
 * Detail repeat failure untuk satu logbook.
 * Prioritas: flag backend (`repeat_failure` / `is_repeat_failure`), lalu dihitung
 * ulang dari `siblingLogs` (default di UI: seluruh logbook pada kartu teknisi).
 *
 * @returns {null|{occurrence_count:number, window_days:number, machine_id:number|null, failure_code_id:number|null, failure_code:string, failure_code_name:string}}
 */
export function resolveRepeatFailure(log, siblingLogs = []) {
  if (!log) return null

  if (log.repeat_failure && typeof log.repeat_failure === 'object') {
    return log.repeat_failure
  }

  const failureCodeObj =
    log.failure_code && typeof log.failure_code === 'object'
      ? log.failure_code
      : null

  // Backend menandai repeat, tetapi detail tidak dikirim
  if (log.is_repeat_failure) {
    return {
      occurrence_count:
        Number(log.repeat_failure_count) || REPEAT_FAILURE_MIN_OCCURRENCES,
      window_days: REPEAT_FAILURE_WINDOW_DAYS,
      machine_id: log.machine_id ?? null,
      failure_code_id: log.failure_code_id ?? failureCodeObj?.id ?? null,
      failure_code: failureCodeObj?.code || log.failure_code || '-',
      failure_code_name: failureCodeObj?.name || log.failure_name || '-'
    }
  }

  // Fallback: hitung dari logbook saudara (mis. seluruh log pada kartu teknisi)
  const candidates =
    Array.isArray(siblingLogs) && siblingLogs.length > 0 ? siblingLogs : [log]
  if (candidates.length < REPEAT_FAILURE_MIN_OCCURRENCES) return null

  return buildRepeatFailureMap(candidates).get(Number(log.id)) || null
}
