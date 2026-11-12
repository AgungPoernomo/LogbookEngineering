/**
 * Centralized API Client untuk Satoria Logbook Frontend
 * Terhubung langsung ke Backend REST API (Node.js/Express + TiDB Database)
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

function getAuthHeader() {
  try {
    const raw = localStorage.getItem('satoria_auth_user')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.token) {
        return { Authorization: `Bearer ${parsed.token}` }
      }
    }
  } catch (e) {
    console.error('Gagal membaca token auth:', e)
  }
  return {}
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

  // Timeout default 30 detik (cukup untuk request data normal & export)
  const controller = new AbortController()
  const timeoutMs = options.timeout || 30000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers
  }

  // Jika body FormData, hapus Content-Type agar browser mengatur boundary multipart
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  const config = {
    ...options,
    signal: options.signal || controller.signal,
    headers
  }

  try {
    const response = await fetch(url, config)

    // Tangani respons file/blob jika diminta
    if (options.responseType === 'blob') {
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }
      return await response.blob()
    }

    let json = {}
    try {
      json = await response.json()
    } catch (e) {
      json = {}
    }

    if (!response.ok) {
      // Auto-Logout 401: Token expired / invalid → force logout global (kecuali endpoint login itu sendiri)
      if (response.status === 401) {
        const isLoginEndpoint = endpoint.includes('/auth/login')
        if (!isLoginEndpoint) {
          localStorage.removeItem('satoria_auth_user')
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
            window.location.href = `/login?redirect=${returnUrl}`
          }
        }
      }

      const errMsg = json.message || `Permintaan gagal dengan status ${response.status}`
      const error = new Error(errMsg)
      error.status = response.status
      error.data = json
      error.response = { status: response.status, data: json }
      throw error
    }

    return (() => {
      const payload = json.data !== undefined ? json.data : json
      // F1.1: sertakan meta paginasi (non-enumerable) agar tidak merusak serialisasi array
      if (json.meta && payload && typeof payload === 'object') {
        try {
          Object.defineProperty(payload, '_meta', {
            value: json.meta,
            enumerable: false,
            configurable: true
          })
        } catch (e) {
          // payload mungkin frozen → abaikan
        }
      }
      return payload
    })()
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutError = new Error('Permintaan melebihi batas waktu. Periksa koneksi Anda.')
      timeoutError.status = 408
      timeoutError.response = { status: 408, data: { message: 'Permintaan melebihi batas waktu. Periksa koneksi Anda.' } }
      throw timeoutError
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  get(endpoint, params = {}, options = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val)
      }
    })
    const qs = query.toString() ? `?${query.toString()}` : ''
    return request(`${endpoint}${qs}`, { method: 'GET', ...options })
  },

  post(endpoint, body = {}, options = {}) {
    return request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options
    })
  },

  put(endpoint, body = {}, options = {}) {
    return request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options
    })
  },

  patch(endpoint, body = {}, options = {}) {
    return request(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options
    })
  },

  delete(endpoint, options = {}) {
    return request(endpoint, { method: 'DELETE', ...options })
  },

  getBlob(endpoint, params = {}, options = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val)
      }
    })
    const qs = query.toString() ? `?${query.toString()}` : ''
    return request(`${endpoint}${qs}`, { method: 'GET', responseType: 'blob', ...options })
  }
}

export default api
