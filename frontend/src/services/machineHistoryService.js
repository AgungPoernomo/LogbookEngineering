import { useAuthStore } from '../stores/auth'

// F3.4 "Buku Pintar Mesin" — klien endpoint GET /api/v1/machines/:id/history
// Memakai fetch langsung (pola handoverService) agar meta paginasi (page, page_size,
// total, total_pages, period_*) bisa dibaca utuh oleh view untuk tombol Prev/Next.

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

// Rentang periode yang diizinkan backend (hari)
export const HISTORY_PERIOD_OPTIONS = [30, 90, 180, 365]
export const DEFAULT_HISTORY_PERIOD = 180
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

/**
 * Ambil token JWT dari Pinia auth store (fallback ke localStorage bila store belum siap).
 */
function resolveToken() {
  try {
    const authStore = useAuthStore()
    const token = authStore.token || authStore.user?.token || ''
    if (token) return token
  } catch (e) {
    // Pinia belum aktif (mis. dipanggil di luar setup) → pakai fallback
  }

  try {
    const raw = localStorage.getItem('satoria_auth_user')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.token) return parsed.token
    }
  } catch (e) {
    console.error('Gagal membaca token auth:', e)
  }

  return ''
}

function normalizeNumber(value, fallback) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

/**
 * Bangun query string yang hanya menyertakan nilai valid.
 */
function buildQuery(params = {}) {
  const query = new URLSearchParams()

  const period = HISTORY_PERIOD_OPTIONS.includes(Number(params.period))
    ? Number(params.period)
    : DEFAULT_HISTORY_PERIOD
  const page = Math.max(1, normalizeNumber(params.page, 1))
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, normalizeNumber(params.page_size ?? params.pageSize, DEFAULT_PAGE_SIZE))
  )

  query.append('period', String(period))
  query.append('page', String(page))
  query.append('page_size', String(pageSize))

  return query.toString()
}

/**
 * Normalisasi payload backend menjadi bentuk yang siap dipakai view.
 * Struktur respons: { data: { machine, current_status, stats, timeline,
 *                            top_failure_codes, top_spareparts }, meta: {...} }
 */
function normalizePayload(json = {}) {
  const data = json.data || {}

  const machine = data.machine || {}
  const currentStatus = data.current_status || {}
  const stats = data.stats || {}
  const meta = json.meta || {}

  return {
    machine: {
      id: machine.id ?? null,
      name: machine.name || '-',
      criticality: machine.criticality || 'B_ESSENTIAL',
      plant_id: machine.plant_id ?? null,
      plant_name: machine.plant_name || '-',
      sub_machine_count: machine.sub_machine_count ?? 0
    },
    currentStatus: {
      machine_end_status: currentStatus.machine_end_status || 'NORMAL_RESOLVED',
      last_log_date: currentStatus.last_log_date || null,
      is_flagged: !!currentStatus.is_flagged
    },
    stats: {
      total_logs: stats.total_logs ?? 0,
      total_downtime_minutes: stats.total_downtime_minutes ?? 0,
      total_repair_minutes: stats.total_repair_minutes ?? 0,
      breakdown_count: stats.breakdown_count ?? 0,
      preventive_count: stats.preventive_count ?? 0
    },
    timeline: Array.isArray(data.timeline) ? data.timeline : [],
    topFailureCodes: Array.isArray(data.top_failure_codes) ? data.top_failure_codes : [],
    topSpareparts: Array.isArray(data.top_spareparts) ? data.top_spareparts : [],
    meta: {
      page: meta.page ?? 1,
      page_size: meta.page_size ?? DEFAULT_PAGE_SIZE,
      total: meta.total ?? 0,
      total_pages: meta.total_pages ?? 0,
      period_days: meta.period_days ?? DEFAULT_HISTORY_PERIOD,
      period_start: meta.period_start || null,
      period_end: meta.period_end || null,
      machine_id: meta.machine_id ?? machine.id ?? null
    }
  }
}

/**
 * GET /api/v1/machines/:id/history
 *
 * @param {number|string} machineId - ID mesin
 * @param {{ period?: number, page?: number, page_size?: number, signal?: AbortSignal }} params
 * @returns {Promise<ReturnType<typeof normalizePayload>>}
 */
export async function getMachineHistory(machineId, params = {}) {
  const id = normalizeNumber(machineId, 0)
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('ID mesin tidak valid.')
    err.statusCode = 400
    throw err
  }

  const token = resolveToken()
  const qs = buildQuery(params)

  let res
  try {
    res = await fetch(`${API_BASE}/machines/${id}/history?${qs}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      signal: params.signal
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    const networkError = new Error('Gagal menghubungi server. Periksa koneksi Anda.')
    networkError.statusCode = 0
    throw networkError
  }

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(json.message || `Permintaan gagal dengan status ${res.status}`)
    err.statusCode = res.status
    err.details = json.errors
    throw err
  }

  return normalizePayload(json)
}

export const machineHistoryService = {
  getMachineHistory
}

export default machineHistoryService
