/**
 * TODO H1 — "Scan QR → Buku Pintar Mesin → langsung catat logbook".
 *
 * Helper murni (tanpa Vue / Pinia / router) agar kontrak query pre-fill
 * halaman Input Logbook bisa diuji unit. Dipakai bersama oleh:
 *  - `views/shared/MachineHistoryView.vue` → menyusun URL tombol "Catat Logbook"
 *  - `views/teknisi/InputLogbookView.vue`  → menerapkan `?machine=&sub=&task_type=`
 *
 * Kontrak query (lihat README 11.5.13):
 *   /logbook/input?machine=<id>&sub=<id>&task_type=MACHINE_TROUBLE
 */

export const ROLES = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  TEKNISI: 'Teknisi'
}

/** Filter role halaman Input Logbook (lihat `frontend/src/router/index.js`). */
export const LOGBOOK_INPUT_ROLES = [ROLES.TEKNISI]

/** Kategori aktivitas valid (sama dengan `ActivityCategory` di form F3.1). */
export const ACTIVITY_CATEGORIES = [
  'MACHINE_TROUBLE',
  'PREVENTIVE_PM',
  'KERETA_TRAY_REPAIR',
  'FABRICATION_PROJECT',
  'SUPPORT_NON_MACHINE'
]

/** Kategori default bila datang dari Buku Pintar Mesin tanpa `task_type`. */
export const DEFAULT_QUICK_START_CATEGORY = 'MACHINE_TROUBLE'

/**
 * Hanya Teknisi yang boleh mengisi logbook. Supervisor/Admin tetap bisa
 * membuka Buku Pintar Mesin, tetapi tombol "Catat Logbook" disembunyikan agar
 * tidak berujung halaman 403.
 *
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
export function isTechnicianRole(role) {
  return LOGBOOK_INPUT_ROLES.includes(role)
}

/**
 * Normalisasi query param menjadi ID integer positif.
 * Menerima number atau string ("12"), menolak 0, negatif, desimal, dan teks.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
export function parseMachineId(value) {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) return parseMachineId(value[0])

  const num = Number(value)
  if (!Number.isInteger(num) || num <= 0) return null
  return num
}

/**
 * Petakan `?task_type=` dari Buku Pintar Mesin ke `activity_category` form.
 * Nilai tak dikenal (atau kosong) jatuh ke MACHINE_TROUBLE — mesin dibuka
 * dari riwayat kerusakan, jadi perbaikan mesin paling wajar.
 *
 * @param {unknown} taskType
 * @returns {string} salah satu `ACTIVITY_CATEGORIES`
 */
export function resolveQuickStartCategory(taskType) {
  const value = String(Array.isArray(taskType) ? taskType[0] : taskType || '')
    .trim()
    .toUpperCase()

  return ACTIVITY_CATEGORIES.includes(value) ? value : DEFAULT_QUICK_START_CATEGORY
}

/**
 * Tentukan mesin yang dipakai form dari query `?machine=` beserta alasan
 * penolakan, sehingga pemanggil bisa menampilkan pesan informatif (F3.3).
 *
 * Status hasil:
 *  - `empty`   → tanpa param `machine` (form tidak berubah)
 *  - `invalid` → param bukan ID valid
 *  - `applied` → mesin ada pada Line user → isi form
 *  - `denied`  → mesin ada di master tetapi Line-nya bukan Line user → abaikan
 *  - `unknown` → ID tidak ditemukan pada master mesin → abaikan
 *  - `pending` → master belum termuat (mesin tak dapat diverifikasi) → tunggu
 *
 * @param {unknown} rawMachineId nilai `route.query.machine`
 * @param {{ id: number, plant_id?: number|null, name?: string }[]} machines daftar mesin master
 * @param {number|null|undefined} userPlantId Line milik user login
 * @returns {{ status: 'empty'|'invalid'|'applied'|'denied'|'unknown'|'pending',
 *             machineId: number|null,
 *             machine: object|null,
 *             plantId: number|null,
 *             message: string }}
 */
export function resolveQueryMachine(rawMachineId, machines = [], userPlantId = null) {
  if (rawMachineId === null || rawMachineId === undefined || rawMachineId === '') {
    return { status: 'empty', machineId: null, machine: null, plantId: null, message: '' }
  }

  const machineId = parseMachineId(rawMachineId)
  if (!machineId) {
    return {
      status: 'invalid',
      machineId: null,
      machine: null,
      plantId: null,
      message: 'Parameter mesin pada tautan tidak valid, jadi tidak diisi otomatis.'
    }
  }

  const list = Array.isArray(machines) ? machines : []
  if (list.length === 0) {
    // Master belum termuat (mis. cache SWR kosong & jaringan lambat).
    return { status: 'pending', machineId, machine: null, plantId: null, message: '' }
  }

  const machine = list.find((m) => Number(m?.id) === machineId) || null
  if (!machine) {
    return {
      status: 'unknown',
      machineId: null,
      machine: null,
      plantId: null,
      message: `Mesin #${machineId} tidak ditemukan pada daftar mesin aktif, jadi tidak diisi otomatis.`
    }
  }

  const machinePlantId =
    machine.plant_id === null || machine.plant_id === undefined ? null : Number(machine.plant_id)
  const userLineId = Number(userPlantId)
  const hasMachineLine = Number.isInteger(machinePlantId)

  if (hasMachineLine && userLineId !== machinePlantId) {
    return {
      status: 'denied',
      machineId: null,
      machine,
      plantId: machinePlantId,
      message: `Mesin ${machine.name || `#${machineId}`} berada di Line lain. Form memakai mesin pada Line Anda.`
    }
  }

  return { status: 'applied', machineId, machine, plantId: machinePlantId, message: '' }
}

/**
 * Ambil `?sub=` hanya bila sub-mesin benar-benar milik mesin yang dipakai.
 *
 * @param {unknown} rawSubMachineId nilai `route.query.sub`
 * @param {number|null} machineId mesin yang akhirnya terpilih di form
 * @param {{ id: number, machine_id?: number|null }[]} subMachines daftar sub-mesin master
 * @returns {{ subMachineId: number|null, applied: boolean }}
 */
export function resolveQuerySubMachine(rawSubMachineId, machineId, subMachines = []) {
  const subMachineId = parseMachineId(rawSubMachineId)
  const selectedMachineId = parseMachineId(machineId)

  if (!subMachineId || !selectedMachineId) {
    return { subMachineId: null, applied: false }
  }

  const list = Array.isArray(subMachines) ? subMachines : []
  const match = list.find(
    (sub) => Number(sub?.id) === subMachineId && Number(sub?.machine_id) === selectedMachineId
  )

  return match
    ? { subMachineId, applied: true }
    : { subMachineId: null, applied: false }
}

/**
 * Auto-select sub-mesin saat teknisi memilih mesin dari dropdown.
 *
 * Mesin yang hanya punya SATU bagian (mis. "Autoclave 1" → hanya "Door Seal")
 * tidak perlu dipilih ulang secara manual: begitu mesin dipilih, sub-mesin
 * langsung terisi sehingga teknisi tidak bisa lupa mengisinya (sub-mesin wajib
 * untuk kategori MACHINE_TROUBLE & PREVENTIVE_PM).
 *
 * > 1 sub-mesin → tetap `null` (teknisi wajib memilih bagian yang rusak).
 * 0 sub-mesin   → `null` (mesin utama tanpa bagian spesifik).
 *
 * @param {number|null|undefined} machineId mesin yang baru dipilih
 * @param {{ id: number, machine_id?: number|null }[]} subMachines daftar sub-mesin master
 * @returns {number|null} ID sub-mesin tunggal tersebut, atau `null`
 */
export function resolveAutoSubMachineId(machineId, subMachines = []) {
  const selectedMachineId = parseMachineId(machineId)
  if (!selectedMachineId) return null

  const list = Array.isArray(subMachines) ? subMachines : []
  const candidates = list.filter(
    (sub) => Number(sub?.machine_id) === selectedMachineId && parseMachineId(sub?.id)
  )

  return candidates.length === 1 ? parseMachineId(candidates[0].id) : null
}

/**
 * Bangun objek `location` untuk `router.push()` menuju form logbook yang
 * sudah terisi mesin dari Buku Pintar Mesin.
 *
 * @param {number|string} machineId
 * @param {{ task_type?: string, sub?: number|string|null }} [options]
 * @returns {{ path: string, query: Record<string, string> }}
 */
export function buildMachineQuickStartRoute(machineId, options = {}) {
  const id = parseMachineId(machineId)
  if (!id) {
    throw new Error('ID mesin tidak valid untuk membuka form logbook.')
  }

  const query = {
    machine: String(id),
    task_type: resolveQuickStartCategory(options.task_type)
  }

  const subId = parseMachineId(options.sub)
  if (subId) query.sub = String(subId)

  return { path: '/logbook/input', query }
}
