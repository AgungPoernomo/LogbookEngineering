import { useAuthStore } from '../stores/auth'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

async function apiFetch(path, options = {}) {
  // Ambil token langsung dari Pinia Store
  const authStore = useAuthStore()
  const token = authStore.token || authStore.user?.token || authStore.access_token || ''

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  })
  
  const json = await res.json().catch(() => ({}))
  
  if (!res.ok) {
    const err = new Error(json.message || `HTTP ${res.status}`)
    err.statusCode = res.status
    err.details = json.errors
    throw err
  }
  return json
}

export const handoverService = {
  async getBoard(opts = {}) {
    const params = new URLSearchParams()
    if (opts.status_filter) params.append('status_filter', opts.status_filter)
    if (opts.days) params.append('days', String(opts.days))
    if (opts.plant_id) params.append('plant_id', String(opts.plant_id))
    if (opts.limit) params.append('limit', String(opts.limit))
    const qs = params.toString()
    const json = await apiFetch(`/handover${qs ? `?${qs}` : ''}`)
    return json.data || []
  }
}