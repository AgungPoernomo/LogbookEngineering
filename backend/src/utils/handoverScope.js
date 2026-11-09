/**
 * Fase 4.1b / BUG-001 — Resolusi scope Line untuk Papan Serah-Terima (`GET /api/v1/handover`).
 *
 * Aturan RBAC:
 *  - Admin      : boleh override lewat query `plant_id`. `ALL` atau kosong → lintas Line (semua).
 *  - Teknisi    : selalu `plant_id` dari JWT; query string DIABAIKAN.
 *  - Supervisor : selalu `plant_id` dari JWT → hanya Line miliknya; query string DIABAIKAN.
 *
 * Modul murni (tanpa Prisma/Express) agar mudah diuji tanpa database.
 *
 * @param {{ role?: string, plant_id?: number|string|null }} user - `req.user` hasil verifikasi JWT
 * @param {{ plant_id?: string }} [query] - `req.query`
 * @returns {{ plantId: string|number|null, isAdmin: boolean }}
 */
export function resolveHandoverPlantScope(user, query = {}) {
  const isAdmin = user?.role === 'Admin'
  let plantId = user?.plant_id || null

  if (isAdmin) {
    // Admin tanpa filter (atau 'ALL') → lintas Line; selain itu ikut query.
    plantId = !query?.plant_id || query.plant_id === 'ALL' ? null : query.plant_id
  }

  return { plantId, isAdmin }
}
