/**
 * Visibilitas dropdown "Kode Kerusakan" (Failure Code ISO 14224) pada form
 * Input Logbook teknisi.
 *
 * Aturan (revisi F3.1):
 *  - `MACHINE_TROUBLE` (Perbaikan Mesin) → SELALU tampil & wajib, karena
 *    dropdown ini sumber data deteksi "Repeat Failure" (Fase 4.1a).
 *  - `PREVENTIVE_PM` (Rawat Rutin) → hanya tampil bila chip aksi =
 *    "Cek Rutin", karena inspeksi bisa menemukan anomali yang perlu
 *    diklasifikasi. Chip rutin lain (Lubrikasi / Greasing, Cleaning Mesin /
 *    Area, Backwash / Kuras) tidak mengklasifikasi kerusakan → dropdown
 *    disembunyikan agar teknisi tidak bingung.
 *  - Kategori lainnya → tidak pernah tampil.
 *
 * Modul murni (tanpa Vue/Pinia) agar kondisional dropdown yang dipakai
 * `views/teknisi/InputLogbookView.vue` dapat diuji unit.
 */

/** Chip PREVENTIVE_PM yang menandakan inspeksi/anomali (sama dengan backend). */
export const INSPECTION_CHIP = 'Cek Rutin'

const INSPECTION_KEYWORD = 'cek rutin'

/**
 * Apakah chip aksi cepat berarti inspeksi ("Cek Rutin", case-insensitive).
 * Dibandingkan dengan `includes` seperti `deriveMaintenanceType` backend
 * (`backend/src/utils/reliability.js`), sehingga konsisten dengan penurunan
 * `maintenance_type = INSPECTION`.
 *
 * @param {unknown} quickActionTag nilai `quick_action_tag` terpilih
 * @returns {boolean}
 */
export function isInspectionChip(quickActionTag) {
  if (typeof quickActionTag !== 'string') return false
  return quickActionTag.trim().toLowerCase().includes(INSPECTION_KEYWORD)
}

/**
 * Kondisional dropdown Kode Kerusakan.
 *
 * @param {unknown} activityCategory enum `activity_category` terpilih
 * @param {unknown} quickActionTag chip aksi cepat terpilih ('' bila belum)
 * @returns {boolean} true bila dropdown ditampilkan
 */
export function isFailureCodeVisible(activityCategory, quickActionTag) {
  if (activityCategory === 'MACHINE_TROUBLE') return true
  if (activityCategory === 'PREVENTIVE_PM') return isInspectionChip(quickActionTag)
  return false
}

/**
 * Apakah Kode Kerusakan wajib diisi pada kondisi saat ini.
 * Backend tidak memaksa `failure_code_id`, tetapi UI mewajibkannya untuk
 * Perbaikan Mesin agar data repeat failure tidak kosong, dan untuk inspeksi
 * ("Cek Rutin") yang menemukan anomali.
 *
 * @param {unknown} activityCategory enum `activity_category` terpilih
 * @param {unknown} quickActionTag chip aksi cepat terpilih
 * @returns {boolean}
 */
export function isFailureCodeRequired(activityCategory, quickActionTag) {
  return isFailureCodeVisible(activityCategory, quickActionTag)
}
