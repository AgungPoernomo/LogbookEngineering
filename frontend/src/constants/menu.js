import { ROLES } from './roles'

export const NAVIGATION_MENU = [
  // Shared Menu
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: 'LayoutGrid',
    section: 'Menu',
    roles: [ROLES.TEKNISI, ROLES.SUPERVISOR, ROLES.ADMIN]
  },

  // Teknisi Menu
  {
    name: 'Input Logbook',
    path: '/logbook/input',
    icon: 'SquarePen',
    section: 'Menu',
    roles: [ROLES.TEKNISI]
  },
  {
    name: 'Riwayat Logbook',
    path: '/logbook/riwayat',
    icon: 'ClipboardList',
    section: 'Menu',
    roles: [ROLES.TEKNISI],
    activeMatchPrefixes: ['/logbook/riwayat', '/logbook/edit']
  },

  // Supervisor Menu
  {
    name: 'Approval Logbook',
    path: '/approval',
    icon: 'ClipboardCheck',
    section: 'Menu',
    roles: [ROLES.SUPERVISOR],
    activeMatchPrefixes: ['/approval']
  },
  {
    // Monitoring aktivitas & frekuensi logbook teknisi.
    // Supervisor → teknisi plant-nya; Admin → seluruh plant (bisa difilter per plant).
    name: 'Aktivitas Teknisi',
    path: '/supervisor/teknisi',
    icon: 'Users',
    section: 'Menu',
    roles: [ROLES.SUPERVISOR, ROLES.ADMIN],
    activeMatchPrefixes: ['/supervisor/teknisi']
  },
  {
    // Fase 4.4 — Pareto Bad Actor & Skill Matrix (analitik keandalan aset).
    name: 'Analitik Keandalan',
    path: '/supervisor/reliability',
    icon: 'LineChart',
    section: 'Menu',
    roles: [ROLES.SUPERVISOR, ROLES.ADMIN],
    activeMatchPrefixes: ['/supervisor/reliability']
  },
  {
    name: 'Laporan Tim',
    path: '/laporan',
    icon: 'FileBarChart',
    section: 'Menu',
    roles: [ROLES.SUPERVISOR]
  },

  // Admin Menu
  // `mobilePrimary: true` = item yang menempati slot utama Bottom Navbar mobile Admin:
  // Dashboard → Pengguna → Audit → Lainnya (drawer) → Profil.
  // Item admin lain (termasuk seluruh Master) masuk ke drawer "Lainnya"
  // — lihat `getAdminMoreMenuItems()` pada utils/mobileNav.js.
  {
    name: 'Manajemen Akun',
    path: '/admin/users',
    icon: 'Users',
    section: 'Menu',
    roles: [ROLES.ADMIN],
    mobilePrimary: true
  },
  {
    name: 'Master Plant',
    path: '/admin/plants',
    icon: 'Building2',
    section: 'Menu',
    roles: [ROLES.ADMIN]
  },
  {
    name: 'Master Mesin',
    path: '/admin/machines',
    icon: 'Cpu',
    section: 'Menu',
    roles: [ROLES.ADMIN]
  },
  {
    name: 'Master Group',
    path: '/admin/groups',
    icon: 'Layers',
    section: 'Menu',
    roles: [ROLES.ADMIN]
  },
  {
    // FASE 5.2 — Katalog suku cadang mesin & bahan habis pakai (dropdown form teknisi).
    name: 'Master Sparepart',
    path: '/admin/spareparts',
    icon: 'Wrench',
    section: 'Menu',
    roles: [ROLES.ADMIN],
    activeMatchPrefixes: ['/admin/spareparts']
  },
  {
    // FASE 5 — Master Failure Code (taksonomi kerusakan ISO 14224).
    // Kode kerusakan yang muncul di dropdown form teknisi + acuan Pareto/repeat failure.
    name: 'Master Failure Code',
    path: '/admin/failure-codes',
    icon: 'ShieldAlert',
    section: 'Menu',
    roles: [ROLES.ADMIN],
    activeMatchPrefixes: ['/admin/failure-codes']
  },
  {
    // FASE 5.1 — Radar aset/mesin yang dilaporkan teknisi tapi belum ada di master data.
    name: 'Radar Aset',
    path: '/admin/unmapped-assets',
    icon: 'Radar',
    section: 'Menu',
    roles: [ROLES.ADMIN],
    activeMatchPrefixes: ['/admin/unmapped-assets']
  },
  {
    name: 'Audit Trail',
    path: '/admin/audit',
    icon: 'ScrollText',
    section: 'Menu',
    roles: [ROLES.ADMIN],
    mobilePrimary: true
  },

  // Akun Section
  {
    name: 'Profil',
    path: '/profil',
    icon: 'UserCircle',
    section: 'Akun',
    roles: [ROLES.TEKNISI, ROLES.SUPERVISOR, ROLES.ADMIN],
    // Slot ke-5 Bottom Navbar mobile Admin (dan juga item utama mobile Teknisi/Supervisor).
    mobilePrimary: true
  }
]
