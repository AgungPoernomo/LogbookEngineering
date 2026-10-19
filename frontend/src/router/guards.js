import { useAuthStore } from '../stores/auth'

export function setupRouterGuards(router) {
  router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()

    // Initialize state if not loaded
    if (!authStore.user && !authStore.token) {
      authStore.initialize()
    }

    const isPublic = to.meta.public === true

    // 1. Not authenticated trying to access private page
    if (!authStore.isAuthenticated && !isPublic) {
      return next({ path: '/login', query: { redirect: to.fullPath } })
    }

    // 2. Already authenticated trying to access login
    if (authStore.isAuthenticated && to.path === '/login') {
      return next({ path: '/dashboard' })
    }

    // 3. Role-based authorization
    if (to.meta.roles && to.meta.roles.length > 0) {
      if (!to.meta.roles.includes(authStore.role)) {
        return next({ path: '/403' })
      }
    }

    next()
  })
}
