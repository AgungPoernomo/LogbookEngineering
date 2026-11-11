import { ROLES } from '../constants/roles'
import { NAVIGATION_MENU } from '../constants/menu'

/**
 * Path yang menempati slot utama Bottom Navbar mobile Admin:
 * Dashboard → Pengguna → Audit → Lainnya (drawer) → Profil.
 *
 * Dikecualikan dari drawer "Lainnya" agar tidak terjadi duplikasi navigasi.
 */
export const ADMIN_MOBILE_PRIMARY_PATHS = [
  '/dashboard',
  '/admin/users',
  '/admin/audit',
  '/profil'
]

/**
 * Daftar menu yang ditampilkan pada drawer "Lainnya" mobile Admin.
 * Urutan mengikuti NAVIGATION_MENU (sama seperti Sidebar desktop):
 * Aktivitas Teknisi, Analitik Keandalan, lalu seluruh Master (Plant, Mesin,
 * Group, Sparepart, Failure Code), dan Radar Aset.
 */
const ADMIN_MORE_MENU_PATHS = [
  '/supervisor/teknisi',
  '/supervisor/reliability',
  '/admin/plants',
  '/admin/machines',
  '/admin/groups',
  '/admin/spareparts',
  '/admin/failure-codes',
  '/admin/unmapped-assets'
]

/**
 * Item menu Admin yang ditampilkan pada drawer "Lainnya" Bottom Navbar mobile.
 *
 * Hanya memuat `ADMIN_MORE_MENU_PATHS` dan selalu mengecualikan
 * `ADMIN_MOBILE_PRIMARY_PATHS` (Dashboard, Pengguna, Audit, Profil) yang sudah
 * punya slot utama sendiri.
 *
 * @param {Array} menu Sumber menu (default NAVIGATION_MENU).
 * @returns {Array<{ name: string, path: string, icon: string, section: string, activePrefixes?: string[] }>}
 */
export function getAdminMoreMenuItems(menu = NAVIGATION_MENU) {
  return menu
    .filter(item => {
      if (!item.roles?.includes(ROLES.ADMIN)) return false
      if (ADMIN_MOBILE_PRIMARY_PATHS.includes(item.path)) return false
      return ADMIN_MORE_MENU_PATHS.includes(item.path)
    })
    .map(item => ({
      name: item.name,
      path: item.path,
      icon: item.icon,
      section: item.section,
      activePrefixes: item.activeMatchPrefixes
    }))
}

/**
 * Kelompokkan item drawer "Lainnya" per section (mis. "Menu" lalu "Akun").
 * Section kosong tidak dikembalikan, sehingga drawer tanpa item "Akun"
 * hanya menampilkan satu section.
 *
 * @param {Array} items Hasil `getAdminMoreMenuItems()`.
 * @returns {Array<{ title: string, items: Array }>}
 */
export function groupBySection(items) {
  const sections = []
  const menuItems = items.filter(item => item.section !== 'Akun')
  const accountItems = items.filter(item => item.section === 'Akun')

  if (menuItems.length) sections.push({ title: 'Menu', items: menuItems })
  if (accountItems.length) sections.push({ title: 'Akun', items: accountItems })
  return sections
}
