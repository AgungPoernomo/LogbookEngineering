/**
 * Label ramah-baca untuk enum `activity_category` (jenis pekerjaan logbook).
 *
 * Sumber nilai: form Input Logbook (F3.1, 5 tombol besar) —
 * MACHINE_TROUBLE | PREVENTIVE_PM | KERETA_TRAY_REPAIR |
 * FABRICATION_PROJECT | SUPPORT_NON_MACHINE
 *
 * Dipakai di halaman Riwayat Teknisi dan Approval Supervisor agar SPV langsung
 * tahu apakah logbook ini "Perbaikan Mesin", "Rawat Rutin", dsb.
 */

/** Kategori default untuk data legacy (kolom activity_category null/kosong). */
export const DEFAULT_ACTIVITY_CATEGORY = 'MACHINE_TROUBLE'

/** Peta enum -> label pendek (muat di badge kecil). */
export const ACTIVITY_CATEGORY_LABELS = Object.freeze({
  MACHINE_TROUBLE: 'Perbaikan Mesin',
  PREVENTIVE_PM: 'Rawat Rutin',
  KERETA_TRAY_REPAIR: 'Kereta / Tray',
  FABRICATION_PROJECT: 'Fabrikasi',
  SUPPORT_NON_MACHINE: 'Non-Mesin'
})

/**
 * Normalisasi nilai kategori dari API (bisa null, string kosong, atau spasi).
 * @param {unknown} category
 * @returns {string} nilai enum yang dikenal, atau string kosong
 */
export function normalizeActivityCategory(category) {
  if (typeof category !== 'string') return ''
  const value = category.trim().toUpperCase()
  return Object.prototype.hasOwnProperty.call(ACTIVITY_CATEGORY_LABELS, value)
    ? value
    : ''
}

/**
 * Ubah enum `activity_category` menjadi label rapi.
 * Fallback (null / kosong / nilai tak dikenal) = "Perbaikan Mesin", karena
 * data legacy sebelum v6 memang tercatat sebagai MACHINE_TROUBLE.
 *
 * @param {unknown} category - enum dari API response
 * @returns {string} label siap tampil, mis. "Perbaikan Mesin"
 */
export function getActivityCategoryLabel(category) {
  const value = normalizeActivityCategory(category) || DEFAULT_ACTIVITY_CATEGORY
  return ACTIVITY_CATEGORY_LABELS[value]
}

export default getActivityCategoryLabel
