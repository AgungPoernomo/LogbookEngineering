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
    headers
  }

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
    const errMsg = json.message || `Permintaan gagal dengan status ${response.status}`
    const error = new Error(errMsg)
    error.status = response.status
    error.data = json
    throw error
  }

  return json.data !== undefined ? json.data : json
}

export const api = {
  get(endpoint, params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val)
      }
    })
    const qs = query.toString() ? `?${query.toString()}` : ''
    return request(`${endpoint}${qs}`, { method: 'GET' })
  },

  post(endpoint, body = {}) {
    return request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    })
  },

  put(endpoint, body = {}) {
    return request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    })
  },

  patch(endpoint, body = {}) {
    return request(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body)
    })
  },

  delete(endpoint) {
    return request(endpoint, { method: 'DELETE' })
  },

  getBlob(endpoint, params = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val)
      }
    })
    const qs = query.toString() ? `?${query.toString()}` : ''
    return request(`${endpoint}${qs}`, { method: 'GET', responseType: 'blob' })
  }
}

export default api
