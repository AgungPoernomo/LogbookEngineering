import { createRouter, createWebHistory } from 'vue-router'
import { setupRouterGuards } from './guards'
import { ROLES } from '../constants/roles'

// Views
import LoginView from '../views/auth/LoginView.vue'
import DashboardDispatcher from '../views/shared/DashboardDispatcher.vue'
import InputLogbookView from '../views/teknisi/InputLogbookView.vue'
import RiwayatLogbookView from '../views/teknisi/RiwayatLogbookView.vue'
import ApprovalListView from '../views/supervisor/ApprovalListView.vue'
import TeknisiActivityView from '../views/supervisor/TeknisiActivityView.vue'
import LaporanTimView from '../views/supervisor/LaporanTimView.vue'
import UserManagementView from '../views/admin/UserManagementView.vue'
import MasterDataView from '../views/admin/MasterDataView.vue'
import MasterPlantView from '../views/admin/MasterPlantView.vue'
import MasterMachineView from '../views/admin/MasterMachineView.vue'
import MasterGroupView from '../views/admin/MasterGroupView.vue'
import AuditTrailView from '../views/admin/AuditTrailView.vue'
import ProfileView from '../views/shared/ProfileView.vue'
import ForbiddenView from '../views/shared/ForbiddenView.vue'
import NotFoundView from '../views/shared/NotFoundView.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true, title: 'Masuk' }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardDispatcher,
    meta: { roles: [ROLES.TEKNISI, ROLES.SUPERVISOR, ROLES.ADMIN], title: 'Dashboard' }
  },
  {
    path: '/logbook/input',
    name: 'logbook-input',
    component: InputLogbookView,
    meta: { roles: [ROLES.TEKNISI], title: 'Input Logbook Harian' }
  },
  {
    path: '/logbook/riwayat',
    name: 'logbook-riwayat',
    component: RiwayatLogbookView,
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
    component: ApprovalListView,
    meta: { roles: [ROLES.SUPERVISOR], title: 'Approval Logbook' }
  },
  {
    path: '/supervisor/teknisi',
    name: 'supervisor-teknisi',
    component: TeknisiActivityView,
    meta: { roles: [ROLES.SUPERVISOR, ROLES.ADMIN], title: 'Aktivitas Teknisi Tim' }
  },
  {
    path: '/laporan',
    name: 'laporan',
    component: LaporanTimView,
    meta: { roles: [ROLES.SUPERVISOR], title: 'Ekspor Laporan Tim' }
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: UserManagementView,
    meta: { roles: [ROLES.ADMIN], title: 'Manajemen Pengguna' }
  },
  {
    path: '/admin/plants',
    name: 'admin-plants',
    component: MasterPlantView,
    meta: { roles: [ROLES.ADMIN], title: 'Master Plant Satoria' }
  },
  {
    path: '/admin/machines',
    name: 'admin-machines',
    component: MasterMachineView,
    meta: { roles: [ROLES.ADMIN], title: 'Master Mesin & Sub-Mesin' }
  },
  {
    path: '/admin/groups',
    name: 'admin-groups',
    component: MasterGroupView,
    meta: { roles: [ROLES.ADMIN], title: 'Master Group & Shift' }
  },
  {
    path: '/admin/master',
    redirect: '/admin/plants'
  },
  {
    path: '/admin/audit',
    name: 'admin-audit',
    component: AuditTrailView,
    meta: { roles: [ROLES.ADMIN], title: 'Audit Trail Aktivitas' }
  },
  {
    path: '/profil',
    name: 'profil',
    component: ProfileView,
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
    component: ForbiddenView,
    meta: { public: true, title: 'Akses Ditolak' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
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
