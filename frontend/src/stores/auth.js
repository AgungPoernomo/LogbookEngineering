import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '../services/authService'
import { ROLES } from '../constants/roles'
import { useMasterStore } from './master'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const role = computed(() => user.value?.role || null)
  const isTeknisi = computed(() => role.value === ROLES.TEKNISI)
  const isSupervisor = computed(() => role.value === ROLES.SUPERVISOR)
  const isAdmin = computed(() => role.value === ROLES.ADMIN)

  function initialize() {
    const data = authService.getCurrentUser()
    if (data) {
      user.value = data.user
      token.value = data.token
    }
  }

  async function login(identifier, password) {
    loading.value = true
    error.value = null
    try {
      const data = await authService.login(identifier, password)
      user.value = data.user
      token.value = data.token
      return data
    } catch (err) {
      error.value = err.message || 'Login gagal'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await authService.logout()
    user.value = null
    token.value = null
    // F1.2: bersihkan cache master (localStorage) saat logout
    try {
      useMasterStore().clearCache()
    } catch (e) {
      // pinia belum aktif → abaikan
    }
  }

    async function quickLoginAs(targetRole) {
    const dummyEmails = {
      [ROLES.TEKNISI]: 'teknisi@satoria.co.id',
      [ROLES.SUPERVISOR]: 'spv@satoria.co.id',
      [ROLES.ADMIN]: 'admin@satoria.co.id'
    }
    const email = dummyEmails[targetRole]
    if (email) {
      return await login(email, 'password123')
    }
  }

  function updateUserAvatar(photoUrl) {
    if (user.value) {
      user.value = {
        ...user.value,
        photo_url: photoUrl
      }
    }
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    role,
    isTeknisi,
    isSupervisor,
    isAdmin,
    initialize,
    login,
    logout,
    quickLoginAs,
    updateUserAvatar
  }
})
