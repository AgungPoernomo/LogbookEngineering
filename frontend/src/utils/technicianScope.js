/**
 * Sinkronisasi tab "Tim Pimpinan Saya" vs "Seluruh Teknisi Pabrik" pada halaman
 * Aktivitas Teknisi (/supervisor/teknisi).
 *
 * Bug yang dikunci: dulu backend menandai `isDirectTeam` dengan
 * `plant SAMA || group SAMA`, sehingga seluruh teknisi satu plant ikut terhitung
 * tim langsung (95 teknisi di kedua tab). Frontend sekarang WAJIB mempercayai
 * flag `isDirectTeam` dari API sebagai satu-satunya sumber kebenaran:
 *  - 'my_team' : hanya teknisi dengan `isDirectTeam === true`
 *  - 'all'     : seluruh teknisi yang dikirim API (tanpa filter)
 */

export const SCOPE_MY_TEAM = 'my_team'
export const SCOPE_ALL = 'all'

/**
 * @param {Array<object>} technicians - daftar teknisi (sudah dinormalisasi)
 * @param {'my_team'|'all'} scope
 * @returns {Array<object>} referensi array asli (tidak dimutasi)
 */
export function filterTechniciansByScope(technicians = [], scope = SCOPE_MY_TEAM) {
  const list = Array.isArray(technicians) ? technicians : []
  if (scope === SCOPE_MY_TEAM) {
    return list.filter((tech) => tech?.isDirectTeam === true)
  }
  return list
}

/**
 * Jumlah teknisi pada tab. `my_team` = jumlah isDirectTeam, `all` = total dari API.
 *
 * @param {Array<object>} technicians
 * @param {'my_team'|'all'} scope
 * @returns {number}
 */
export function countTechniciansByScope(technicians = [], scope = SCOPE_MY_TEAM) {
  return filterTechniciansByScope(technicians, scope).length
}
