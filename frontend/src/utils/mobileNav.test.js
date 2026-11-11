import { describe, it, expect } from 'vitest'
import {
  getAdminMoreMenuItems,
  groupBySection,
  ADMIN_MOBILE_PRIMARY_PATHS
} from './mobileNav'
import { NAVIGATION_MENU } from '../constants/menu'
import { ROLES } from '../constants/roles'

// ============================================================================
// Bottom Navbar mobile Admin — drawer "Lainnya".
// Mengunci kontrak: 5 slot utama (Dashboard, Pengguna, Audit, Lainnya, Profil)
// dengan drawer "Lainnya" yang HANYA memuat menu di luar slot utama:
// Analitik Keandalan + seluruh Master + Radar Aset.
// ============================================================================

const ADMIN_BOTTOM_SLOT_PATHS = [
  '/dashboard',
  '/admin/users',
  '/admin/audit',
  '/profil'
]

const EXPECTED_MORE_PATHS = [
  '/supervisor/reliability', // Analitik Keandalan
  '/admin/plants', // Master Plant
  '/admin/machines', // Master Mesin
  '/admin/groups', // Master Group
  '/admin/spareparts', // Master Sparepart
  '/admin/unmapped-assets' // Radar Aset
]

describe('ADMIN_MOBILE_PRIMARY_PATHS', () => {
  it('memuat tepat 4 menu yang punya slot utama di Bottom Navbar', () => {
    expect(ADMIN_MOBILE_PRIMARY_PATHS).toEqual(ADMIN_BOTTOM_SLOT_PATHS)
  })
})

describe('getAdminMoreMenuItems', () => {
  it('mengecualikan item yang sudah menempati slot utama Bottom Navbar', () => {
    const paths = getAdminMoreMenuItems().map(item => item.path)

    ADMIN_BOTTOM_SLOT_PATHS.forEach(path => {
      expect(paths).not.toContain(path)
    })
  })

  it('tidak lagi memuat Dashboard, Profil, Pengguna, dan Audit di drawer', () => {
    const names = getAdminMoreMenuItems().map(item => item.name)
    const paths = getAdminMoreMenuItems().map(item => item.path)

    expect(names).not.toContain('Dashboard')
    expect(names).not.toContain('Profil')
    expect(paths).not.toContain('/dashboard')
    expect(paths).not.toContain('/profil')
    expect(paths).not.toContain('/admin/users')
    expect(paths).not.toContain('/admin/audit')
  })

  it('hanya memuat menu yang tersisa di luar slot utama', () => {
    const paths = getAdminMoreMenuItems().map(item => item.path)

    expect(paths).toEqual(EXPECTED_MORE_PATHS)
  })

  it('memuat seluruh Master (Plant, Mesin, Group, Sparepart)', () => {
    const names = getAdminMoreMenuItems().map(item => item.name)

    expect(names).toEqual(
      expect.arrayContaining([
        'Master Plant',
        'Master Mesin',
        'Master Group',
        'Master Sparepart'
      ])
    )
  })

  it('hanya mengembalikan menu yang boleh diakses Admin', () => {
    const items = getAdminMoreMenuItems()

    items.forEach(item => {
      const source = NAVIGATION_MENU.find(menu => menu.path === item.path)
      expect(source.roles).toContain(ROLES.ADMIN)
    })
  })

  it('menjaga atribut activeMatchPrefixes agar highlight konsisten dengan sidebar', () => {
    const sparepart = getAdminMoreMenuItems().find(
      item => item.path === '/admin/spareparts'
    )

    expect(sparepart).toMatchObject({
      name: 'Master Sparepart',
      icon: 'Wrench',
      activePrefixes: ['/admin/spareparts']
    })
  })

  it('tidak dipengaruhi menu milik role lain', () => {
    const items = getAdminMoreMenuItems()

    items.forEach(item => {
      expect(['Menu', 'Akun']).toContain(item.section)
    })
  })

  it('tidak terpengaruh flag mobilePrimary pada constants/menu.js', () => {
    // Master Plant tidak lagi `mobilePrimary`, sementara Profil sekarang
    // `mobilePrimary` — keduanya tetap mengikuti allow-list drawer.
    const plantSource = NAVIGATION_MENU.find(item => item.path === '/admin/plants')
    const profileSource = NAVIGATION_MENU.find(item => item.path === '/profil')

    expect(plantSource.mobilePrimary).toBeUndefined()
    expect(profileSource.mobilePrimary).toBe(true)

    const paths = getAdminMoreMenuItems().map(item => item.path)
    expect(paths).toContain('/admin/plants')
    expect(paths).not.toContain('/profil')
  })
})

describe('groupBySection', () => {
  it('menampilkan satu section "Menu" karena drawer tidak lagi memuat Profil', () => {
    const sections = groupBySection(getAdminMoreMenuItems())

    expect(sections.map(section => section.title)).toEqual(['Menu'])
    expect(sections[0].items.map(item => item.path)).toEqual(EXPECTED_MORE_PATHS)
  })

  it('tidak menampilkan section kosong', () => {
    const sections = groupBySection([])

    expect(sections).toHaveLength(0)
  })

  it('tetap bisa mengelompokkan section "Akun" bila diberikan', () => {
    const sections = groupBySection([
      { name: 'Profil', path: '/profil', icon: 'UserCircle', section: 'Akun' }
    ])

    expect(sections).toHaveLength(1)
    expect(sections[0].title).toBe('Akun')
  })
})
