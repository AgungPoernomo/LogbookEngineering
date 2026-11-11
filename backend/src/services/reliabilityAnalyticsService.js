/**
 * Service Analitik Keandalan (Fase 4.4) — Pareto Bad Actor & Skill Matrix.
 *
 * Modul ini MURNI (pure function): TIDAK mengakses database / I/O.
 * Controller (`reliabilityAnalyticsController.js`) bertugas menyiapkan agregasi
 * SQL (`prisma.groupBy`) lalu menyerahkan baris hasil agregasi ke fungsi di sini
 * untuk dihitung persentase kumulatif & penyusunan Skill Matrix.
 *
 * ATURAN P1 (WAJIB): output modul ini BUKAN alat penilaian kinerja.
 *  - Pareto = prioritas perbaikan ASET (mesin / mode kegagalan mana yang paling
 *    menyumbang downtime), bukan ranking orang.
 *  - Skill Matrix HANYA memetakan "siapa yang paling tahu mesin X" berdasarkan
 *    histori penanganan. Tidak ada skor, ranking, atau leaderboard teknisi.
 */

// Ambang Hukum Pareto (80/20): item yang masuk sampai kumulatif <= 80% adalah "vital few".
export const PARETO_THRESHOLD_PERCENT = 80

// Batas jumlah baris Pareto yang dikembalikan (sisanya terlalu kecil untuk jadi prioritas).
export const PARETO_DEFAULT_LIMIT = 15
export const PARETO_MAX_LIMIT = 100

const MINUTES_PER_HOUR = 60
const PERCENT_DECIMALS = 1

/**
 * Membulatkan angka ke sejumlah desimal; null/undefined/non-finite -> null.
 *
 * @param {number|null|undefined} value
 * @param {number} [decimals=1]
 * @returns {number|null}
 */
export function roundTo(value, decimals = PERCENT_DECIMALS) {
  if (value === null || value === undefined) return null
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  const factor = 10 ** decimals
  return Math.round(num * factor) / factor
}

/**
 * Normalisasi hasil agregasi menjadi angka aman (null/non-finite -> 0).
 *
 * @param {unknown} value
 * @returns {number}
 */
export function toNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

/**
 * Mengubah menit menjadi jam (1 desimal). Contoh: 150 -> 2.5
 *
 * @param {number} minutes
 * @returns {number}
 */
export function minutesToHours(minutes) {
  return roundTo(toNumber(minutes) / MINUTES_PER_HOUR) ?? 0
}

/**
 * Membangun baris Pareto (Hukum 80/20) dari daftar item yang SUDAH terurut
 * (terbesar -> terkecil) hasil agregasi database.
 *
 * Untuk setiap item dihitung:
 *  - `percent`            : kontribusi terhadap total (0-100)
 *  - `cumulative_percent` : persentase kumulatif (monoton naik, maksimal 100)
 *  - `is_vital_few`       : true bila item ini masuk kelompok <= 80% kumulatif
 *  - `is_bad_actor`       : alias eksplisit (bad actor = penyumbang utama gangguan)
 *
 * Aturan `is_vital_few`: item pertama yang MELAMPAUI ambang tetap dihitung vital
 * (karena dialah yang menembus batas 80%), item sesudahnya tidak.
 *
 * @param {Array<{ value: number, [key: string]: any }>} rows - baris terurut dari DB
 * @returns {Array<object>}
 */
export function buildParetoRows(rows) {
  const list = Array.isArray(rows) ? rows : []
  // Abaikan item bernilai 0/negatif: tidak menyumbang apa pun ke total.
  const meaningful = list.filter((row) => row && toNumber(row.value) > 0)

  const total = meaningful.reduce((sum, row) => sum + toNumber(row.value), 0)
  if (total <= 0) return []

  let cumulative = 0
  let thresholdReached = false

  return meaningful.map((row, index) => {
    const value = toNumber(row.value)
    const percent = (value / total) * 100
    cumulative += percent

    // Item pertama yang menembus ambang ikut dianggap vital (penutup 80%).
    const isVitalFew = !thresholdReached
    if (cumulative >= PARETO_THRESHOLD_PERCENT) thresholdReached = true

    return {
      ...row,
      rank: index + 1,
      value,
      total_value: total,
      percent: roundTo(percent),
      cumulative_percent: roundTo(Math.min(cumulative, 100)),
      is_vital_few: isVitalFew,
      // Alias semantik sesuai spesifikasi Fase 4.4 (bukan penilaian orang).
      is_bad_actor: isVitalFew
    }
  })
}

/**
 * Mengambil Top-1 per grup dari hasil `groupBy` Prisma.
 *
 * Prisma `groupBy` hanya mendukung urutan berdasarkan field group/agregasi,
 * sehingga pemilihan "Top 1 per teknisi" dilakukan di sini — tetap atas hasil
 * agregasi database (`count`), bukan atas seluruh baris logbook di memori.
 *
 * Pemenang seri (count sama) dipecah berdasarkan `id` lebih kecil (deterministik).
 *
 * @param {Array<{ key: number, id: number|null, count: number, [key: string]: any }>} rows
 * @returns {Map<number, object>} key -> baris pemenang
 */
export function pickTopOneByKey(rows) {
  const winners = new Map()
  const list = Array.isArray(rows) ? rows : []

  for (const row of list) {
    const key = Number(row?.key)
    if (!Number.isFinite(key)) continue
    const count = toNumber(row.count)
    if (count <= 0) continue

    const current = winners.get(key)
    if (!current) {
      winners.set(key, row)
      continue
    }

    const currentCount = toNumber(current.count)
    if (count > currentCount) {
      winners.set(key, row)
      continue
    }
    if (count === currentCount && toNumber(row.id) < toNumber(current.id)) {
      // Tie-break deterministik: id lebih kecil menang.
      winners.set(key, row)
    }
  }

  return winners
}

/**
 * Menentukan tingkat keyakinan data berdasarkan banyaknya penanganan.
 * Hanya penanda kualitas sampel — BUKAN skor kinerja (P1).
 *
 * @param {number} topCount - jumlah penanganan pada spesialisasi teratas
 * @returns {'HIGH'|'MEDIUM'|'LOW'}
 */
export function resolveConfidence(topCount) {
  const count = toNumber(topCount)
  if (count >= 5) return 'HIGH'
  if (count >= 2) return 'MEDIUM'
  return 'LOW'
}

/**
 * Menyusun Skill Matrix teknisi: untuk setiap teknisi ambil Top-1 mesin dan
 * Top-1 failure code dari histori penanganan (hasil agregasi database).
 *
 * Catatan P1: `confidence` hanya menandakan SEBERAPA BANYAK data pendukung
 * (jumlah penanganan), agar pembaca tidak menyimpulkan keahlian dari 1 kejadian.
 * Ini bukan skor kinerja dan tidak dipakai untuk mengurutkan siapa pun — daftar
 * diurutkan abjad nama agar netral.
 *
 * @param {object} params
 * @param {Array<{key:number,id:number|null,count:number}>} params.topMachineRows - groupBy (user_id, machine_id)
 * @param {Array<{key:number,id:number|null,count:number}>} params.topFailureRows - groupBy (user_id, failure_code_id)
 * @param {Map<number, string>} [params.machineNameMap]
 * @param {Map<number, {code:string,name:string,category:string}>} [params.failureCodeMap]
 * @param {Map<number, object>} [params.userMap] - id -> { full_name, nik, email, photo_url, plant_name, group_name }
 * @returns {Array<object>}
 */
export function buildSkillMatrix({
  topMachineRows = [],
  topFailureRows = [],
  machineNameMap = new Map(),
  failureCodeMap = new Map(),
  userMap = new Map()
} = {}) {
  const machineWinners = pickTopOneByKey(topMachineRows)
  const failureWinners = pickTopOneByKey(topFailureRows)

  // Gabungkan seluruh user_id yang punya histori agar teknisi yang hanya
  // menangani kode kerusakan (tanpa mesin tercatat) tetap muncul.
  const userIds = new Set([...machineWinners.keys(), ...failureWinners.keys()])

  const matrix = []

  for (const userId of userIds) {
    const user = userMap.get(userId)
    // Lewati user yang tidak ada / tidak relevan (userMap hanya berisi user aktif pada scope plant).
    if (!user) continue

    const machineWin = machineWinners.get(userId) || null
    const failureWin = failureWinners.get(userId) || null

    const machineId = machineWin ? toNumber(machineWin.id) : null
    const failureId = failureWin ? toNumber(failureWin.id) : null

    const machineCount = machineWin ? toNumber(machineWin.count) : 0
    const failureCount = failureWin ? toNumber(failureWin.count) : 0
    const totalHandled = machineCount + failureCount

    const failureMeta = failureId !== null ? failureCodeMap.get(failureId) : null

    matrix.push({
      user_id: userId,
      full_name: user.full_name || 'Teknisi',
      nik: user.nik || null,
      // Kontak kerja (P1: untuk menghubungi saat penugasan, bukan penilaian).
      email: user.email || null,
      photo_url: user.photo_url || null,
      plant_name: user.plant_name || null,
      group_name: user.group_name || null,
      total_handled: totalHandled,
      // Top-1 spesialisasi mesin
      machine_id: machineId,
      machine_name: machineId !== null ? (machineNameMap.get(machineId) || null) : null,
      machine_handled_count: machineCount,
      machine_share_percent: totalHandled > 0 ? roundTo((machineCount / totalHandled) * 100) : null,
      // Top-1 spesialisasi kode kerusakan
      failure_code_id: failureId,
      failure_code: failureMeta?.code || null,
      failure_name: failureMeta?.name || null,
      failure_category: failureMeta?.category || null,
      failure_handled_count: failureCount,
      failure_share_percent: totalHandled > 0 ? roundTo((failureCount / totalHandled) * 100) : null,
      confidence: resolveConfidence(Math.max(machineCount, failureCount))
    })
  }

  // Urut abjad nama teknisi -> netral, TIDAK mengurutkan berdasarkan jumlah (P1).
  matrix.sort((a, b) => String(a.full_name).localeCompare(String(b.full_name), 'id'))
  return matrix
}

/**
 * Ringkasan eksekutif: berapa mesin / kode kerusakan yang membentuk 80% gangguan,
 * agar supervisor tahu seberapa terkonsentrasi masalahnya.
 *
 * @param {object} params
 * @param {Array<object>} [params.machineRows] - baris grup mesin (belum dihitung pareto)
 * @param {Array<object>} [params.failureRows] - baris grup failure code
 * @param {number} [params.totalDowntimeMinutes]
 * @param {number} [params.totalBreakdown]
 * @param {number} [params.totalMachineGroupCount] - jumlah grup mesin dari DB
 * @param {number} [params.totalFailureGroupCount]
 * @returns {object}
 */
export function buildParetoSummary({
  machineRows = [],
  failureRows = [],
  totalDowntimeMinutes = 0,
  totalBreakdown = 0,
  machineNames = new Map(),
  failureNames = new Map()
} = {}) {
  const machinePareto = buildParetoRows(machineRows)
  const failurePareto = buildParetoRows(failureRows)

  const vitalMachines = machinePareto.filter((row) => row.is_vital_few)
  const vitalFailures = failurePareto.filter((row) => row.is_vital_few)

  // Hanya entitas yang BENAR-BENAR menyumbang nilai > 0 yang dihitung sebagai basis
  // persentase. Tanpa ini, "0 dari 6 mesin" menyesatkan ketika 6 mesin punya log
  // tetapi downtime-nya nol (kasus umum saat downtime belum diisi teknisi).
  const machineGroupCount = machinePareto.length
  const failureGroupCount = failurePareto.length

  const topMachineRow = machinePareto[0] || null
  const topFailureRow = failurePareto[0] || null

  return {
    total_downtime_minutes: toNumber(totalDowntimeMinutes),
    total_downtime_hours: minutesToHours(totalDowntimeMinutes),
    total_breakdown: toNumber(totalBreakdown),
    // Jumlah mesin yang terlibat breakdown DAN menyumbang downtime > 0
    // (basis grafik Pareto mesin).
    total_machines_with_downtime: machineGroupCount,
    total_failure_codes_used: failureGroupCount,
    // Total frekuensi kemunculan seluruh kode kerusakan (denominator Pareto kode).
    total_failure_occurrences: failurePareto.reduce((sum, row) => sum + toNumber(row.value), 0),
    // Konsentrasi: "X dari Y mesin menyumbang 80% downtime"
    vital_machine_count: vitalMachines.length,
    vital_machine_percent: machineGroupCount > 0
      ? roundTo((vitalMachines.length / machineGroupCount) * 100)
      : null,
    vital_failure_count: vitalFailures.length,
    vital_failure_percent: failureGroupCount > 0
      ? roundTo((vitalFailures.length / failureGroupCount) * 100)
      : null,
    top_machine_name: topMachineRow
      ? (topMachineRow.name || machineNames.get(toNumber(topMachineRow.id)) || null)
      : null,
    top_failure_name: topFailureRow
      ? (topFailureRow.name || failureNames.get(toNumber(topFailureRow.id)) || null)
      : null
  }
}

export const reliabilityAnalyticsService = {
  PARETO_THRESHOLD_PERCENT,
  PARETO_DEFAULT_LIMIT,
  PARETO_MAX_LIMIT,
  roundTo,
  toNumber,
  minutesToHours,
  buildParetoRows,
  pickTopOneByKey,
  resolveConfidence,
  buildSkillMatrix,
  buildParetoSummary
}

export default reliabilityAnalyticsService
