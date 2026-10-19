import api from './api'

const AUTH_STORAGE_KEY = 'satoria_auth_user'

export const authService = {
  async login(identifier, password) {
    const data = await api.post('/auth/login', {
      identifier: identifier.trim(),
      password
    })

    // data format dari backend: { token, user: { id, nik, email, full_name, role, ... } }
    const authData = {
      token: data.token,
      user: {
        ...data.user,
        role: data.user.role || (data.user.role_name ? data.user.role_name : 'Teknisi')
      }
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
    return authData
  },

  getCurrentUser() {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
  },

  async logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return true
  },

  async updateProfile(id, payload) {
    const updated = await api.put('/auth/profile', payload)
    const current = this.getCurrentUser()
    if (current && current.user) {
      current.user = {
        ...current.user,
        ...updated
      }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(current))
    }
    return updated
  },

  async changePassword(oldPassword, newPassword) {
    const res = await api.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword
    })
    return res
  },

  async getMe() {
    const me = await api.get('/auth/me')
    const current = this.getCurrentUser()
    if (current && me) {
      current.user = {
        ...current.user,
        ...me,
        role: me.role || (me.role_name ? me.role_name : current.user.role)
      }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(current))
    }
    return me
  },

  async uploadAvatar(file) {
    const formData = new FormData()
    formData.append('avatar', file)

    const data = await api.post('/auth/avatar', formData)
    const current = this.getCurrentUser()
    if (current && current.user && data?.photo_url) {
      current.user.photo_url = data.photo_url
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(current))
    }
    return data
  },

  async deleteAvatar() {
    const res = await api.delete('/auth/avatar')
    const current = this.getCurrentUser()
    if (current && current.user) {
      current.user.photo_url = null
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(current))
    }
    return res
  }
}

export default authService
