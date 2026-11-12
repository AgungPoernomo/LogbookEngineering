import api from './api'
import { getWIBYearMonth } from '../utils/dateKeys'

/**
 * Fase 4.4 — Klien endpoint GET /api/v1/supervisor/reliability-analytics
 * (Pareto Bad Actor & Skill Matrix).
 *
 * ATURAN P1: seluruh data di sini dipakai untuk memetakan KEANDALAN ASET dan
 * KEAIHLIAN (siapa paling tahu mesin X) — TIDAK untuk menilai kinerja teknisi.
 * Karena itu tidak ada helper skor/ranking di modul ini.
 */

// Batas baris Pareto di backend (PARETO_MAX_LIMIT).
export const PARETO_MAX_LIMIT = 100
export const PARETO_DEFAULT_LIMIT = 15
export const PARETO_THRESHOLD_PERCENT = 80

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

/**
 * Opsi filter `year_month` (12 bulan terakhir, terbaru di depan) untuk header.
 * Basis acuan: bulan berjalan WIB agar tidak bergeser di server UTC.
 *
 * @param {number} [count=12]
 * @param {Date} [now=new Date()]
 * @returns {Array<{ value: string, label: string }>}
 */
export function buildYearMonthOptions(count = 12, now = new Date()) {
  const currentYM = getWIBYearMonth(now)
  const [year, month] = currentYM.split('-').map(Number)
  const options = []

  for (let i = 0; i < count; i += 1) {
    // Mundur i bulan dari bulan berjalan (Date menangani pergantian tahun).
    const d = new Date(Date.UTC(year, month - 1 - i, 1))
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const value = `${y}-${m}`
    options.push({
      value,
      label: `${MONTH_NAMES_ID[d.getUTCMonth()]} ${y}`
    })
  }

  return options
}

/**
 * Label ramah untuk 'YYYY-MM'. Contoh: '2026-11' -> 'November 2026'
 *
 * @param {string} yearMonth
 * @returns {string}
 */
export function formatYearMonthLabel(yearMonth) {
  if (typeof yearMonth !== 'string') return '-'
  const [y, m] = yearMonth.split('-').map(Number)
  const name = MONTH_NAMES_ID[m - 1]
  return name ? `${name} ${y}` : yearMonth
}

/**
 * Normalisasi baris Pareto mesin dari backend agar aman dirender
 * (angka finite, boolean eksplisit) — tidak mengubah urutan.
 *
 * @param {Array<object>} rows
 * @returns {Array<object>}
 */
export function normalizeParetoRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => ({
    ...row,
    rank: Number(row?.rank) || 0,
    percent: Number.isFinite(Number(row?.percent)) ? Number(row.percent) : 0,
    cumulative_percent: Number.isFinite(Number(row?.cumulative_percent))
      ? Number(row.cumulative_percent)
      : 0,
    downtime_hours: Number.isFinite(Number(row?.downtime_hours)) ? Number(row.downtime_hours) : 0,
    downtime_minutes: Number.isFinite(Number(row?.downtime_minutes)) ? Number(row.downtime_minutes) : 0,
    is_vital_few: !!row?.is_vital_few
  }))
}

/**
 * Normalisasi payload mentah menjadi state siap-pakai view.
 *
 * @param {object} data - `data` dari respons API
 * @returns {object}
 */
export function normalizeAnalyticsPayload(data = {}) {
  const filters = data.filters || {}
  const summary = data.summary || {}
  const notes = data.notes || {}

  return {
    filters: {
      year_month: filters.year_month || getWIBYearMonth(),
      plant_id: filters.plant_id ?? null,
      plant_name: filters.plant_name || null,
      is_scoped_to_plant: !!filters.is_scoped_to_plant,
      limit: Number(filters.limit) || PARETO_DEFAULT_LIMIT,
      period_start: filters.period_start || null,
      period_end: filters.period_end || null,
      pareto_threshold_percent: Number(filters.pareto_threshold_percent) || PARETO_THRESHOLD_PERCENT
    },
    summary: {
      ...summary,
      total_downtime_hours: Number(summary.total_downtime_hours) || 0,
      total_downtime_minutes: Number(summary.total_downtime_minutes) || 0,
      total_breakdown: Number(summary.total_breakdown) || 0,
      total_machines_with_downtime: Number(summary.total_machines_with_downtime) || 0,
      total_failure_codes_used: Number(summary.total_failure_codes_used) || 0,
      total_failure_occurrences: Number(summary.total_failure_occurrences) || 0,
      vital_machine_count: Number(summary.vital_machine_count) || 0,
      vital_failure_count: Number(summary.vital_failure_count) || 0
    },
    machinePareto: normalizeParetoRows(data.machine_pareto),
    failurePareto: normalizeParetoRows(data.failure_pareto),
    skillMatrix: Array.isArray(data.skill_matrix) ? data.skill_matrix : [],
    notes: {
      pareto: notes.pareto || '',
      skill_matrix: notes.skill_matrix || 'Pemetaan keahlian berdasarkan histori penanganan. Bukan penilaian kinerja.',
      data_basis: notes.data_basis || ''
    }
  }
}

/**
 * GET /api/v1/supervisor/reliability-analytics
 *
 * @param {{ year_month?: string, plant_id?: number|string, limit?: number, signal?: AbortSignal }} params
 * @returns {Promise<ReturnType<typeof normalizeAnalyticsPayload>>}
 */
export async function getReliabilityAnalytics(params = {}) {
  const res = await api.get('/supervisor/reliability-analytics', {
    year_month: params.year_month || undefined,
    plant_id: params.plant_id || undefined,
    limit: params.limit || undefined
  }, {
    signal: params.signal
  })

  return normalizeAnalyticsPayload(res || {})
}

export const reliabilityAnalyticsService = {
  getReliabilityAnalytics,
  buildYearMonthOptions,
  formatYearMonthLabel,
  normalizeAnalyticsPayload,
  normalizeParetoRows,
  PARETO_MAX_LIMIT,
  PARETO_DEFAULT_LIMIT,
  PARETO_THRESHOLD_PERCENT
}

export default reliabilityAnalyticsService
