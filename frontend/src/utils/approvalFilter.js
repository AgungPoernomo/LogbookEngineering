import { LOG_STATUS } from '../constants/logStatus'

/**
 * Filter tab halaman Approval (Per Teknisi).
 *
 * Aturan: rincian logbook pada kartu teknisi HARUS mengikuti tab status aktif,
 * agar SPV tidak melihat logbook APPROVED/REJECTED saat sedang meninjau PENDING.
 *
 * - PENDING  : hanya logbook PENDING (status lain di luar APPROVED/REJECTED
 *              seperti DRAFT/CANCELLED tetap ikut agar data tidak hilang diam-diam)
 * - APPROVED : hanya APPROVED
 * - REJECTED : hanya REJECTED
 * - "ALL"    : seluruh logbook
 */
export function matchesTechnicianTab(log, filterStatus) {
  if (filterStatus === 'ALL') return true
  if (filterStatus === LOG_STATUS.PENDING) {
    return (
      log.status !== LOG_STATUS.APPROVED && log.status !== LOG_STATUS.REJECTED
    )
  }
  return log.status === filterStatus
}

/**
 * Bulk action (Setujui / Tolak semua log milik teknisi) hanya relevan pada
 * tab PENDING dan ALL — tab APPROVED/REJECTED bersifat riwayat.
 */
export function canBulkReview(filterStatus) {
  return filterStatus === LOG_STATUS.PENDING || filterStatus === 'ALL'
}

/**
 * Logbook yang boleh dikirim ke bulk action:
 * hanya status PENDING yang lolos filter tab aktif.
 */
export function getReviewableLogs(techLogs = [], filterStatus) {
  if (!canBulkReview(filterStatus)) return []
  return techLogs.filter(
    (log) =>
      log.status === LOG_STATUS.PENDING &&
      matchesTechnicianTab(log, filterStatus)
  )
}

/**
 * Kunci unik teknisi untuk grouping (dipakai juga sebagai render key).
 */
export function technicianKey(tech) {
  return tech.user_id || tech.user_nik || tech.user_name || 'unknown'
}

/**
 * Menyusun ulang kartu teknisi sesuai tab aktif:
 * - logbook di rincian difilter (tech.logs)
 * - metrik ringkas mengikuti logbook yang tampil
 * - kartu tanpa logbook pada tab aktif dibuang (tidak ada kartu kosong)
 */
export function buildTechnicianCards(technicians = [], filterStatus) {
  const showBulkAction = canBulkReview(filterStatus)

  return technicians
    .map((tech) => {
      const visibleLogs = tech.logs.filter((log) =>
        matchesTechnicianTab(log, filterStatus)
      )
      const reviewableLogs = getReviewableLogs(visibleLogs, filterStatus)

      return {
        ...tech,
        logs: visibleLogs,
        visibleLogCount: visibleLogs.length,
        visibleDurationMinutes: visibleLogs.reduce(
          (sum, log) => sum + (log.duration_minutes || 0),
          0
        ),
        visibleMachines: [
          ...new Set(visibleLogs.map((log) => log.machine_name).filter(Boolean))
        ],
        reviewableLogs: showBulkAction ? reviewableLogs : [],
        reviewableCount: showBulkAction ? reviewableLogs.length : 0
      }
    })
    .filter((tech) => tech.logs.length > 0)
}

/**
 * Jumlah teknisi yang muncul pada badge tab = jumlah kartu yang dirender,
 * sehingga angka badge tidak pernah lebih besar dari kartu yang tampil.
 */
export function countTechniciansForTab(technicians = [], filterStatus) {
  if (filterStatus === 'ALL') {
    return new Set(technicians.map(technicianKey)).size
  }
  return new Set(
    technicians
      .filter((t) => t.logs.some((log) => matchesTechnicianTab(log, filterStatus)))
      .map(technicianKey)
  ).size
}
