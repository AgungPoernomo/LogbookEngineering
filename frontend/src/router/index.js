import { createRouter, createWebHistory } from 'vue-router'
import { setupRouterGuards } from './guards'
import { ROLES } from '../constants/roles'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: { public: true, title: 'Masuk' }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/shared/DashboardDispatcher.vue'),
    meta: { roles: [ROLES.TEKNISI, ROLES.SUPERVISOR, ROLES.ADMIN], title: 'Dashboard' }
  },
  {
    path: '/logbook/input',
    name: 'logbook-input',
    component: () => import('../views/teknisi/InputLogbookView.vue'),
    meta: { roles: [ROLES.TEKNISI], title: 'Input Logbook Harian' }
  },
  {
    path: '/logbook/riwayat',
    name: 'logbook-riwayat',
    component: () => import('../views/teknisi/RiwayatLogbookView.vue'),
    meta: { roles: [ROLES.TEKNISI], title: 'Riwayat Logbook' }
  },
  {
    path: '/logbook/edit/:id',
    name: 'logbook-edit',
    component: () => import('../views/teknisi/EditLogbookView.vue'),
    meta: { roles: [ROLES.TEKNISI], title: 'Edit Logbook' }
  },
  {
    path: '/approval',
    name: 'approval',
    component: () => import('../views/supervisor/ApprovalListView.vue'),
    meta: { roles: [ROLES.SUPERVISOR], title: 'Approval Logbook' }
  },
  {
    path: '/supervisor/teknisi',
    name: 'supervisor-teknisi',
    component: () => import('../views/supervisor/TeknisiActivityView.vue'),
    meta: { roles: [ROLES.SUPERVISOR, ROLES.ADMIN], title: 'Aktivitas Teknisi Tim' }
  },
  {
    path: '/laporan',
    name: 'laporan',
    component: () => import('../views/supervisor/LaporanTimView.vue'),
    meta: { roles: [ROLES.SUPERVISOR], title: 'Ekspor Laporan Tim' }
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('../views/admin/UserManagementView.vue'),
    meta: { roles: [ROLES.ADMIN], title: 'Manajemen Pengguna' }
  },
  {
    path: '/admin/plants',
    name: 'admin-plants',
    component: () => import('../views/admin/MasterPlantView.vue'),
    meta: { roles: [ROLES.ADMIN], title: 'Master Plant Satoria' }
  },
  {
    path: '/admin/machines',
    name: 'admin-machines',
    component: () => import('../views/admin/MasterMachineView.vue'),
    meta: { roles: [ROLES.ADMIN], title: 'Master Mesin & Sub-Mesin' }
  },
  {
    path: '/admin/groups',
    name: 'admin-groups',
    component: () => import('../views/admin/MasterGroupView.vue'),
    meta: { roles: [ROLES.ADMIN], title: 'Master Group & Shift' }
  },
  {
    path: '/admin/master',
    redirect: '/admin/plants'
  },
  {
    path: '/admin/audit',
    name: 'admin-audit',
    component: () => import('../views/admin/AuditTrailView.vue'),
    meta: { roles: [ROLES.ADMIN], title: 'Audit Trail Aktivitas' }
  },
  {
    path: '/profil',
    name: 'profil',
    component: () => import('../views/shared/ProfileView.vue'),
    meta: { roles: [ROLES.TEKNISI, ROLES.SUPERVISOR, ROLES.ADMIN], title: 'Profil Akun' }
  },
  // Backward redirects for old routes
  {
    path: '/log/input',
    redirect: '/logbook/input'
  },
  {
    path: '/log/riwayat',
    redirect: '/logbook/riwayat'
  },
  {
    path: '/pengaturan',
    redirect: '/profil'
  },
  {
    path: '/teknisi',
    redirect: '/admin/users'
  },
  {
    path: '/validasi',
    redirect: '/admin/master'
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('../views/shared/ForbiddenView.vue'),
    meta: { public: true, title: 'Akses Ditolak' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/shared/NotFoundView.vue'),
    meta: { public: true, title: 'Halaman Tidak Ditemukan' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

setupRouterGuards(router)

router.afterEach((to) => {
  const baseTitle = 'Engineer Logbook Satoria'
  document.title = to.meta.title ? `${to.meta.title} • ${baseTitle}` : baseTitle
})

export default router
