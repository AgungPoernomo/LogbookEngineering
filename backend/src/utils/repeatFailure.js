/**
 * Fase 4.1a — Deteksi Repeat Failure (kerusakan berulang pada mesin yang sama
 * dengan kode kerusakan yang sama).
 *
 * Dipakai oleh:
 *   - `GET /api/v1/logbooks`            → dipakai halaman /approval (SPV)
 *   - `GET /api/v1/approvals/technicians` → antrean approval per teknisi
 *
 * Aturan (sama untuk kedua endpoint agar UI konsisten):
 *   - Kunci pola = pasangan `machine_id` + `failure_code_id`
 *   - Dianggap repeat failure bila jumlah kejadian >= 2 dalam window hari
 *     yang dihitung mundur dari `task_date` logbook yang diperiksa (inklusif).
 *   - Logbook tanpa `machine_id` atau `failure_code_id` tidak pernah dianggap
 *     repeat failure (tidak ada pola yang bisa dibandingkan).
 */

export const REPEAT_FAILURE_WINDOW_DAYS = 30;
export const REPEAT_FAILURE_MIN_OCCURRENCES = 2;

const toDateStr = (d) => d.toISOString().slice(0, 10);

const shiftDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
};

const pairKey = (machineId, failureCodeId) => `${machineId}:${failureCodeId}`;

/**
 * Menyusun peta `logId -> info repeat failure` dari sekumpulan logbook kandidat.
 *
 * @param {Array<{id:any, machine_id:any, failure_code_id:any, task_date:string}>} logs
 *        Logbook yang akan diperiksa (hasil query list, biasanya sudah ter-scope plant).
 * @param {Object} [options]
 * @param {number} [options.windowDays=REPEAT_FAILURE_WINDOW_DAYS]
 * @param {number} [options.minOccurrences=REPEAT_FAILURE_MIN_OCCURRENCES]
 * @param {Map<any, {code?:string, name?:string}>} [options.failureCodeById]
 *        Opsional, untuk melengkapi `failure_code` / `failure_code_name`.
 * @returns {Map<number, {occurrence_count:number, window_days:number, machine_id:number, failure_code_id:number, failure_code:string, failure_code_name:string}>}
 */
export function buildRepeatFailureMap(logs = [], options = {}) {
  const {
    windowDays = REPEAT_FAILURE_WINDOW_DAYS,
    minOccurrences = REPEAT_FAILURE_MIN_OCCURRENCES,
    failureCodeById = new Map(),
  } = options;

  const repeatInfoByLogId = new Map();

  const normalized = (logs || [])
    .filter((l) => l && l.id !== undefined && l.id !== null)
    .map((l) => ({
      id: l.id,
      machine_id: l.machine_id !== null && l.machine_id !== undefined ? String(l.machine_id) : null,
      failure_code_id:
        l.failure_code_id !== null && l.failure_code_id !== undefined
          ? String(l.failure_code_id)
          : null,
      task_date: typeof l.task_date === 'string' ? l.task_date.slice(0, 10) : null,
    }));

  const keyedLogs = normalized.filter((l) => l.machine_id && l.failure_code_id && l.task_date);
  if (keyedLogs.length === 0) return repeatInfoByLogId;

  // Kelompokkan kandidat berdasarkan pasangan mesin + kode kerusakan
  const clusters = new Map();
  for (const l of keyedLogs) {
    const k = pairKey(l.machine_id, l.failure_code_id);
    if (!clusters.has(k)) clusters.set(k, []);
    clusters.get(k).push(l);
  }

  for (const cluster of clusters.values()) {
    // Urutkan kronologis agar logbook lama ikut terhitung sebagai bagian pola
    const sorted = [...cluster].sort((a, b) =>
      a.task_date < b.task_date ? -1 : a.task_date > b.task_date ? 1 : 0,
    );

    // Hitung kejadian maksimum dalam window hari yang mencakup tiap logbook.
    // Jumlah terbanyak = ukuran pola (mis. 4 logbook => "4x").
    const patternOccurrences = sorted.reduce((maxCount, log) => {
      const windowStart = shiftDays(log.task_date, -windowDays);
      const windowCount = sorted.filter(
        (candidate) =>
          candidate.task_date >= windowStart &&
          candidate.task_date <= log.task_date,
      ).length;
      return Math.max(maxCount, windowCount);
    }, 0);

    if (patternOccurrences < minOccurrences) continue;

    // Seluruh logbook dalam pola ditandai dengan jumlah kejadian yang sama
    for (const member of sorted) {
      const failureCodeId = Number(member.failure_code_id);
      const failureCode = Number.isFinite(failureCodeId)
        ? failureCodeById.get(failureCodeId)
        : null;

      repeatInfoByLogId.set(Number(member.id), {
        occurrence_count: patternOccurrences,
        window_days: windowDays,
        machine_id: Number(member.machine_id),
        failure_code_id: failureCodeId,
        failure_code: failureCode?.code || `#${member.failure_code_id}`,
        failure_code_name: failureCode?.name || "-",
      });
    }
  }

  return repeatInfoByLogId;
}
