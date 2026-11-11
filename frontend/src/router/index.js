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
    // Fase 4.4 — Pareto Bad Actor & Skill Matrix.
    // Analitik KEANDALAN ASET + pemetaan keahlian (bukan leaderboard / penilaian kinerja).
    path: '/supervisor/reliability',
    name: 'supervisor-reliability',
    component: () => import('../views/supervisor/ReliabilityAnalyticsView.vue'),
    meta: { roles: [ROLES.SUPERVISOR, ROLES.ADMIN], title: 'Analitik Keandalan' }
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
    // FASE 5.3 — Cetak batch label QR per Line (grid kartu QR + @media print).
    // Generator QR disiapkan sekarang walau stiker QR fisik menyusul (Fase 3.2).
    path: '/admin/machines/qr-print',
    name: 'admin-machines-qr-print',
    component: () => import('../views/admin/MachineQRPrintView.vue'),
    meta: { roles: [ROLES.ADMIN], title: 'Cetak QR Code Mesin' }
  },
  {
    // FASE 5.2 — Master Sparepart (katalog MACHINE_PART & CONSUMABLE_WORKSHOP).
    path: '/admin/spareparts',
    name: 'admin-spareparts',
    component: () => import('../views/admin/MasterSparepartView.vue'),
    meta: { roles: [ROLES.ADMIN], title: 'Master Sparepart' }
  },
  {
    // FASE 5 — Master Failure Code (taksonomi kerusakan ISO 14224).
    // CRUD Admin: tambah/edit kode, toggle aktif/nonaktif (soft delete).
    path: '/admin/failure-codes',
    name: 'admin-failure-codes',
    component: () => import('../views/admin/MasterFailureCodeView.vue'),
    meta: { roles: [ROLES.ADMIN], title: 'Master Failure Code' }
  },
  {
    // FASE 5.1 — Radar Aset Belum Terdaftar (promote `unmapped_asset_note` → master mesin).
    path: '/admin/unmapped-assets',
    name: 'admin-unmapped-assets',
    component: () => import('../views/admin/UnmappedAssetsView.vue'),
    meta: { roles: [ROLES.ADMIN], title: 'Radar Aset Belum Terdaftar' }
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
  {
    // F3.4 "Buku Pintar Mesin" — rekam medis detail per mesin (timeline, statistik, top failure & part).
    // `requiresAuth: true` eksplisit; `roles` membuat guard RBAC bawaan hanya mengizinkan user terautentikasi
    // (endpoint backend sendiri membatasi Teknisi/Supervisor ke plant-nya).
    path: '/mesin/:id',
    name: 'machine-history',
    component: () => import('../views/shared/MachineHistoryView.vue'),
    meta: {
      requiresAuth: true,
      roles: [ROLES.TEKNISI, ROLES.SUPERVISOR, ROLES.ADMIN],
      title: 'Buku Pintar Mesin'
    }
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
