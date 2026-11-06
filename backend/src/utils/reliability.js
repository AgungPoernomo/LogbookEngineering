/**
 * Utilitas Reliability v6 (Bagian 4.1 - 4.3).
 *
 * Modul ini menampung logika MURNI (tanpa akses DB) untuk:
 *  - Menurunkan `maintenance_type` dari kategori + kondisi (Bagian 4.2).
 *  - Memvalidasi field per `activity_category` (Bagian 4.3).
 *
 * Dipisahkan dari controller agar mudah diuji tanpa koneksi database.
 */

export const ACTIVITY_CATEGORIES = [
  'MACHINE_TROUBLE',
  'PREVENTIVE_PM',
  'KERETA_TRAY_REPAIR',
  'FABRICATION_PROJECT',
  'SUPPORT_NON_MACHINE'
]

export const MACHINE_END_STATUSES = [
  'NORMAL_RESOLVED',
  'MONITORING_NEEDED',
  'TEMPORARY_FIX',
  'WAITING_SPAREPART'
]

export const MAINTENANCE_TYPES = [
  'PREVENTIVE',
  'CORRECTIVE',
  'BREAKDOWN',
  'AUTONOMOUS_TPM',
  'INSPECTION'
]

// Chip khusus kategori PREVENTIVE_PM yang berarti "inspeksi" (Bagian 4.2).
const INSPECTION_CHIP = 'cek rutin'

// Kategori yang mewajibkan mesin & sub-mesin (boleh dikosongkan bila ada unmapped_asset_note).
const MACHINE_REQUIRED_CATEGORIES = ['MACHINE_TROUBLE', 'PREVENTIVE_PM']

/**
 * Menurunkan `maintenance_type` (Bagian 4.2). Tidak dipilih teknisi.
 *
 * @param {object} input
 * @param {string} input.activity_category
 * @param {boolean} [input.is_downtime]
 * @param {string} [input.quick_action_tag]
 * @returns {('PREVENTIVE'|'CORRECTIVE'|'BREAKDOWN'|'INSPECTION'|null)}
 */
export function deriveMaintenanceType({ activity_category, is_downtime = false, quick_action_tag = '' } = {}) {
  switch (activity_category) {
    case 'MACHINE_TROUBLE':
      return is_downtime ? 'BREAKDOWN' : 'CORRECTIVE'
    case 'PREVENTIVE_PM':
      return String(quick_action_tag || '').trim().toLowerCase().includes(INSPECTION_CHIP)
        ? 'INSPECTION'
        : 'PREVENTIVE'
    case 'KERETA_TRAY_REPAIR':
    case 'FABRICATION_PROJECT':
    case 'SUPPORT_NON_MACHINE':
      return null
    default:
      return null
  }
}

/**
 * Menormalkan `machine_end_status`.
 * PREVENTIVE_PM selalu dipaksa NORMAL_RESOLVED (Bagian 4.3).
 *
 * @param {string} activityCategory
 * @param {string} [rawStatus]
 * @returns {string}
 */
export function normalizeMachineEndStatus(activityCategory, rawStatus) {
  if (activityCategory === 'PREVENTIVE_PM') return 'NORMAL_RESOLVED'
  if (rawStatus && MACHINE_END_STATUSES.includes(rawStatus)) return rawStatus
  return 'NORMAL_RESOLVED'
}

function isFilled(value) {
  return value !== undefined && value !== null && value !== '' && value !== '-'
}

/**
 * Mengumpulkan input sparepart dari dua sumber:
 *  - `sparepart_items`: array { sparepart_id, qty_used } (v6)
 *  - `sparepart`: string legacy (catatan / part belum terdaftar)
 */
export function resolveSparepartInput({ sparepart_items, sparepart } = {}) {
  const items = Array.isArray(sparepart_items)
    ? sparepart_items.filter(
        (item) =>
          item &&
          isFilled(item.sparepart_id) &&
          Number.isFinite(Number(item.qty_used)) &&
          Number(item.qty_used) > 0
      )
    : []
  const legacy = isFilled(sparepart) && String(sparepart).trim() !== '-'
  return { items, legacy, has: items.length > 0 || legacy }
}

/**
 * Validasi server per kategori (Bagian 4.3).
 *
 * @param {object} input
 * @returns {{ valid: boolean, message?: string, data?: object }}
 */
export function validateActivityCategory(input = {}) {
  const {
    activity_category,
    machine_id,
    sub_machine_id,
    quick_action_tag,
    unmapped_asset_note,
    unit_repaired_qty
  } = input

  if (!ACTIVITY_CATEGORIES.includes(activity_category)) {
    return { valid: false, message: 'Kategori aktivitas (activity_category) tidak valid atau wajib diisi.' }
  }

  const tag = quick_action_tag === undefined || quick_action_tag === null ? '' : String(quick_action_tag).trim()
  if (!tag) {
    return { valid: false, message: 'Tag aksi cepat (quick_action_tag) wajib diisi untuk semua kategori.' }
  }

  const hasUnmappedNote = !!(unmapped_asset_note && String(unmapped_asset_note).trim())
  const hasMachine = isFilled(machine_id)
  const hasSubMachine = isFilled(sub_machine_id)
  const { items: sparepartItems, legacy: legacySparepart, has: hasSparepart } = resolveSparepartInput(input)

  // MACHINE_TROUBLE & PREVENTIVE_PM: wajib mesin & sub-mesin (kecuali aset belum terdaftar).
  if (MACHINE_REQUIRED_CATEGORIES.includes(activity_category)) {
    if (!hasMachine && !hasUnmappedNote) {
      return {
        valid: false,
        message:
          'Mesin (machine_id) wajib dipilih untuk kategori ini, atau isi catatan aset belum terdaftar (unmapped_asset_note).'
      }
    }
    if (!hasSubMachine && !hasUnmappedNote) {
      return {
        valid: false,
        message:
          'Sub-mesin (sub_machine_id) wajib dipilih untuk kategori ini, atau isi catatan aset belum terdaftar (unmapped_asset_note).'
      }
    }
  }

  // SUPPORT_NON_MACHINE: dilarang mesin, sub-mesin, dan sparepart.
  if (activity_category === 'SUPPORT_NON_MACHINE') {
    if (hasMachine || hasSubMachine) {
      return { valid: false, message: 'Kategori tugas non-mesin tidak boleh menyertakan mesin atau sub-mesin.' }
    }
    if (hasSparepart) {
      return { valid: false, message: 'Kategori tugas non-mesin tidak boleh memakai sparepart.' }
    }
  }

  // KERETA_TRAY_REPAIR: wajib unit_repaired_qty >= 1.
  let normalizedQty = null
  if (activity_category === 'KERETA_TRAY_REPAIR') {
    const qty = Number(unit_repaired_qty)
    if (!Number.isFinite(qty) || qty < 1) {
      return {
        valid: false,
        message: 'Jumlah unit diperbaiki (unit_repaired_qty) wajib diisi minimal 1 untuk kategori Kereta & Tray.'
      }
    }
    normalizedQty = Math.floor(qty)
  } else if (isFilled(unit_repaired_qty)) {
    const qty = Number(unit_repaired_qty)
    normalizedQty = Number.isFinite(qty) && qty >= 1 ? Math.floor(qty) : null
  }

  return {
    valid: true,
    data: {
      activity_category,
      quick_action_tag: tag,
      machine_end_status: normalizeMachineEndStatus(activity_category, input.machine_end_status),
      maintenance_type: deriveMaintenanceType(input),
      unit_repaired_qty: normalizedQty,
      unmapped_asset_note: hasUnmappedNote ? String(unmapped_asset_note).trim() : null,
      sparepart_items: sparepartItems,
      legacy_sparepart: legacySparepart
    }
  }
}
