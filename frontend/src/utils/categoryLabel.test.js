import { describe, it, expect } from 'vitest'
import {
  ACTIVITY_CATEGORY_LABELS,
  DEFAULT_ACTIVITY_CATEGORY,
  getActivityCategoryLabel,
  normalizeActivityCategory
} from './categoryLabel'

// ============================================================================
// Badge "Jenis Pekerjaan" di halaman Riwayat (Teknisi) & Approval (Supervisor).
// Enum activity_category harus selalu punya label ramah-baca, dan data legacy
// (null / kosong) fallback ke "Perbaikan Mesin".
// ============================================================================

describe('getActivityCategoryLabel', () => {
  it('memetakan seluruh enum v6 ke label yang benar', () => {
    expect(getActivityCategoryLabel('MACHINE_TROUBLE')).toBe('Perbaikan Mesin')
    expect(getActivityCategoryLabel('PREVENTIVE_PM')).toBe('Rawat Rutin')
    expect(getActivityCategoryLabel('KERETA_TRAY_REPAIR')).toBe('Kereta / Tray')
    expect(getActivityCategoryLabel('FABRICATION_PROJECT')).toBe('Fabrikasi')
    expect(getActivityCategoryLabel('SUPPORT_NON_MACHINE')).toBe('Non-Mesin')
  })

  it('memetakan tepat 5 kategori (tidak ada label hilang)', () => {
    expect(Object.keys(ACTIVITY_CATEGORY_LABELS)).toHaveLength(5)
  })

  it('fallback ke "Perbaikan Mesin" untuk data legacy (null / kosong)', () => {
    expect(getActivityCategoryLabel(null)).toBe('Perbaikan Mesin')
    expect(getActivityCategoryLabel(undefined)).toBe('Perbaikan Mesin')
    expect(getActivityCategoryLabel('')).toBe('Perbaikan Mesin')
    expect(getActivityCategoryLabel('   ')).toBe('Perbaikan Mesin')
    expect(DEFAULT_ACTIVITY_CATEGORY).toBe('MACHINE_TROUBLE')
  })

  it('fallback untuk nilai tak dikenal & tipe selain string', () => {
    expect(getActivityCategoryLabel('UNKNOWN_CATEGORY')).toBe(
      'Perbaikan Mesin'
    )
    expect(getActivityCategoryLabel(123)).toBe('Perbaikan Mesin')
    expect(getActivityCategoryLabel({})).toBe('Perbaikan Mesin')
  })

  it('toleran terhadap spasi & huruf kecil dari API', () => {
    expect(getActivityCategoryLabel(' preventive_pm ')).toBe('Rawat Rutin')
    expect(getActivityCategoryLabel('Kereta_Tray_Repair')).toBe(
      'Kereta / Tray'
    )
  })
})

describe('normalizeActivityCategory', () => {
  it('mengembalikan enum yang dikenal (uppercase, trim)', () => {
    expect(normalizeActivityCategory('PREVENTIVE_PM')).toBe('PREVENTIVE_PM')
    expect(normalizeActivityCategory(' fabrication_project ')).toBe(
      'FABRICATION_PROJECT'
    )
  })

  it('mengembalikan string kosong untuk nilai tidak valid', () => {
    expect(normalizeActivityCategory(null)).toBe('')
    expect(normalizeActivityCategory(undefined)).toBe('')
    expect(normalizeActivityCategory('')).toBe('')
    expect(normalizeActivityCategory('BUKAN_KATEGORI')).toBe('')
    expect(normalizeActivityCategory(42)).toBe('')
  })
})
