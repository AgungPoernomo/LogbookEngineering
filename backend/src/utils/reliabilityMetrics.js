/**
 * Utilitas Perhitungan KPI Keandalan (Fase 4.3).
 *
 * Modul ini MURNI (pure function): tidak melakukan akses database / I/O sama sekali.
 * Pemanggil (controller/endpoint KPI) bertugas mengambil data logbook lalu
 * meneruskannya sebagai array ke fungsi-fungsi di bawah ini.
 *
 * Metrik yang dihitung (acuan AGENT_SPEC v6, Bagian F4.3):
 *  - MTTR        : Mean Time To Repair (menit)
 *  - MTBF        : Mean Time Between Failures (menit)
 *  - Availability: MTBF / (MTBF + MTTR) * 100 (%)
 *
 * Konvensi data:
 *  - Semua perhitungan berbasis WIB (UTC+7). `task_date` sudah berupa string
 *    'YYYY-MM-DD' hasil konversi WIB, sehingga tidak perlu konversi zona waktu lagi.
 *  - Kejadian rusak     : maintenance_type ∈ { BREAKDOWN, CORRECTIVE } (untuk MTTR).
 *  - Kejadian breakdown : maintenance_type = BREAKDOWN (untuk MTBF & Availability).
 */

import { calculateDurationMinutes } from './duration.js'

// Tipe maintenance yang dianggap sebagai "kerusakan / perbaikan tak terencana" (MTTR).
export const FAILURE_MAINTENANCE_TYPES = ['BREAKDOWN', 'CORRECTIVE']

// Tipe maintenance yang dianggap sebagai "kegagalan fungsi" (titik waktu untuk MTBF).
export const BREAKDOWN_MAINTENANCE_TYPES = ['BREAKDOWN']

const MINUTES_PER_DAY = 24 * 60
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Mendapatkan nilai maintenance_type yang dinormalkan (huruf besar, tanpa spasi).
 * Mengembalikan string kosong bila tidak ada.
 *
 * @param {object} logbook
 * @returns {string}
 */
function getMaintenanceType(logbook) {
  const raw = logbook?.maintenance_type
  if (raw === undefined || raw === null) return ''
  return String(raw).trim().toUpperCase()
}

/**
 * Apakah logbook merupakan kejadian kerusakan (BREAKDOWN / CORRECTIVE)?
 * Digunakan sebagai basis dataset MTTR.
 *
 * @param {object} logbook
 * @returns {boolean}
 */
export function isFailureLog(logbook) {
  return FAILURE_MAINTENANCE_TYPES.includes(getMaintenanceType(logbook))
}

/**
 * Apakah logbook merupakan kejadian breakdown murni (BREAKDOWN)?
 * Digunakan sebagai basis dataset MTBF & Availability.
 *
 * @param {object} logbook
 * @returns {boolean}
 */
export function isBreakdownLog(logbook) {
  return BREAKDOWN_MAINTENANCE_TYPES.includes(getMaintenanceType(logbook))
}

/**
 * Normalisasi input menjadi array logbook yang aman diiterasi.
 * Menerima null/undefined/non-array tanpa melempar error.
 *
 * @param {Array<object>|null|undefined} logbooks
 * @returns {Array<object>}
 */
function toLogbookArray(logbooks) {
  if (!Array.isArray(logbooks)) return []
  return logbooks.filter((item) => item && typeof item === 'object')
}

/**
 * Mengubah 'HH:mm' (atau 'HH:mm:ss') menjadi jumlah menit sejak 00:00 WIB.
 * Mengembalikan null bila format tidak valid.
 *
 * @param {string} timeStr
 * @returns {number|null}
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null
  const parts = String(timeStr).split(':')
  if (parts.length < 2) return null

  const hour = Number(parts[0])
  const minute = Number(parts[1])
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null

  return hour * 60 + minute
}

/**
 * Mengubah 'YYYY-MM-DD' menjadi indeks hari (epoch day) agar bisa dibandingkan/dikurangkan.
 * Mengembalikan null bila format tidak valid.
 *
 * @param {string} dateStr
 * @returns {number|null}
 */
function parseDateToEpochDay(dateStr) {
  if (!dateStr) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim())
  if (!match) return null

  const [, y, m, d] = match
  return Math.floor(Date.UTC(Number(y), Number(m) - 1, Number(d)) / MS_PER_DAY)
}

/**
 * Menghitung posisi kronologis dalam satuan MENIT (WIB) dari `task_date` + `start_time`.
 * Basisnya deterministik: tidak bergantung pada zona waktu runtime server
 * (aman untuk Vercel Serverless yang berjalan di UTC).
 *
 * Mengembalikan null bila `task_date` tidak valid → log diabaikan pada perhitungan gap.
 * Bila `start_time` tidak valid, dipakai 00:00 agar log tetap ikut terurut.
 *
 * @param {object} logbook
 * @returns {number|null}
 */
function getChronologicalMinutes(logbook) {
  const dayIndex = parseDateToEpochDay(logbook?.task_date)
  if (dayIndex === null) return null

  const minuteOfDay = parseTimeToMinutes(logbook?.start_time) ?? 0
  return dayIndex * MINUTES_PER_DAY + minuteOfDay
}

/**
 * Mengambil durasi perbaikan (menit) dari satu logbook.
 * - Prioritas: `duration_minutes` (kolom hasil hitung backend).
 * - Fallback : selisih `start_time` → `end_time` bila durasi kosong/null
 *              (memakai helper `calculateDurationMinutes` yang sudah menangani shift lintas tengah malam).
 * - Nilai negatif dianggap 0.
 *
 * @param {object} logbook
 * @returns {number}
 */
function getRepairMinutes(logbook) {
  const rawDuration = logbook?.duration_minutes
  const hasExplicitDuration =
    rawDuration !== undefined && rawDuration !== null && rawDuration !== '' && Number.isFinite(Number(rawDuration))

  if (hasExplicitDuration) return Math.max(0, Number(rawDuration))

  // Fallback: hitung dari jam mulai & selesai (aman untuk shift lintas tengah malam).
  return calculateDurationMinutes(logbook?.start_time, logbook?.end_time)
}

/**
 * A. MTTR (Mean Time To Repair) — dalam MENIT.
 *
 * Rumus:
 *   MTTR = Σ duration_minutes (log rusak) / jumlah kejadian rusak
 *
 * - Dataset  : maintenance_type ∈ { BREAKDOWN, CORRECTIVE }.
 * - Edge case: 0 kejadian rusak → null (pembagian dengan nol dihindari).
 *
 * @param {Array<object>} logbooks
 * @returns {number|null} rata-rata menit perbaikan, atau null bila tidak ada data kerusakan
 */
export function calculateMTTR(logbooks) {
  const failures = toLogbookArray(logbooks).filter(isFailureLog)

  // Guard pembagian dengan nol: tidak ada kerusakan → MTTR tidak terdefinisi.
  if (failures.length === 0) return null

  const totalRepairMinutes = failures.reduce((sum, log) => sum + getRepairMinutes(log), 0)
  return totalRepairMinutes / failures.length
}

/**
 * B. MTBF (Mean Time Between Failures) — dalam MENIT.
 *
 * Rumus:
 *   gap ke-i = waktu kerusakan ke-(i+1) − waktu kerusakan ke-i
 *   MTBF     = Σ gap / jumlah gap        (jumlah gap = jumlah kerusakan − 1)
 *
 * - Dataset  : maintenance_type = BREAKDOWN, diurutkan kronologis (task_date lalu start_time).
 * - Edge case: kerusakan ≤ 1 kali → tidak ada gap → null (bukan Infinity/NaN).
 * - Log dengan task_date tidak valid diabaikan karena tidak bisa diposisikan di garis waktu.
 *
 * Catatan: perhitungan memakai gaya "waktu antar kejadian" (event-to-event) sesuai
 * definisi Fase 4.3, sehingga menghasilkan angka menit yang bisa langsung dipakai
 * untuk Availability.
 *
 * @param {Array<object>} logbooks
 * @returns {number|null} rata-rata selang antar kegagalan (menit), atau null bila tak terhitung
 */
export function calculateMTBF(logbooks) {
  const breakdowns = toLogbookArray(logbooks)
    .filter(isBreakdownLog)
    .map((log) => ({ log, at: getChronologicalMinutes(log) }))
    .filter((entry) => entry.at !== null)

  // Butuh minimal 2 kerusakan untuk membentuk 1 gap.
  if (breakdowns.length < 2) return null

  // Urutkan kronologis berdasarkan task_date + start_time.
  breakdowns.sort((a, b) => a.at - b.at)

  let totalGapMinutes = 0
  let gapCount = 0

  for (let i = 1; i < breakdowns.length; i++) {
    const gap = breakdowns[i].at - breakdowns[i - 1].at
    // Gap 0 (duplikat di tanggal & jam sama) tidak menambah informasi → dilewati.
    if (gap <= 0) continue
    totalGapMinutes += gap
    gapCount += 1
  }

  // Semua gap tidak valid → MTBF tidak terdefinisi.
  if (gapCount === 0) return null

  return totalGapMinutes / gapCount
}

/**
 * C. Availability (Technical Availability) — dalam PERSEN (mis. 98.5).
 *
 * Rumus:
 *   Availability = (MTBF / (MTBF + MTTR)) * 100
 *
 * - Edge case: MTBF atau MTTR null → null.
 * - Edge case: (MTBF + MTTR) = 0 → null (pembagian dengan nol).
 *
 * @param {Array<object>} logbooks
 * @returns {number|null} persentase ketersediaan, atau null bila tidak dapat dihitung
 */
export function calculateAvailability(logbooks) {
  const mtbf = calculateMTBF(logbooks)
  const mttr = calculateMTTR(logbooks)

  // Ketersediaan hanya bermakna bila kedua komponen tersedia.
  if (mtbf === null || mttr === null) return null

  const denominator = mtbf + mttr
  if (denominator <= 0) return null

  return (mtbf / denominator) * 100
}

/**
 * Ringkasan ketiga KPI sekaligus, agar pemanggil (endpoint KPI) cukup menghitung sekali.
 *
 * @param {Array<object>} logbooks
 * @returns {{ mttr_minutes: number|null, mtbf_minutes: number|null, availability_percent: number|null }}
 */
export function calculateReliabilitySummary(logbooks) {
  return {
    mttr_minutes: calculateMTTR(logbooks),
    mtbf_minutes: calculateMTBF(logbooks),
    availability_percent: calculateAvailability(logbooks)
  }
}
