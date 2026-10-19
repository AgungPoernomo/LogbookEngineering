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
    name: 'Aktivitas Teknisi',
    path: '/supervisor/teknisi',
    icon: 'Users',
    section: 'Menu',
    roles: [ROLES.SUPERVISOR],
    activeMatchPrefixes: ['/supervisor/teknisi']
  },
  {
    name: 'Laporan Tim',
    path: '/laporan',
    icon: 'FileBarChart',
    section: 'Menu',
    roles: [ROLES.SUPERVISOR]
  },

  // Admin Menu
  {
    name: 'Manajemen Akun',
    path: '/admin/users',
    icon: 'Users',
    section: 'Menu',
    roles: [ROLES.ADMIN]
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
    name: 'Audit Trail',
    path: '/admin/audit',
    icon: 'ScrollText',
    section: 'Menu',
    roles: [ROLES.ADMIN]
  },

  // Akun Section
  {
    name: 'Profil',
    path: '/profil',
    icon: 'UserCircle',
    section: 'Akun',
    roles: [ROLES.TEKNISI, ROLES.SUPERVISOR, ROLES.ADMIN]
  }
]
