import prisma from '../config/prisma.js'

/**
 * Mencatat rekam jejak aktivitas sensitif/operasional ke tabel user_activities
 * @param {number|string|BigInt} userId ID Pengguna yang melakukan aksi
 * @param {string} activity Ringkasan aksi (misal: 'INPUT_LOGBOOK', 'APPROVE_LOGBOOK', 'REJECT_LOGBOOK', 'USER_LOGIN')
 * @param {string} detail Deskripsi detail aksi
 */
export async function logActivity(userId, activity, detail) {
  try {
    if (!userId) return null
    return await prisma.userActivity.create({
      data: {
        user_id: BigInt(userId),
        activity,
        detail: typeof detail === 'object' ? JSON.stringify(detail) : String(detail),
        created_at: new Date()
      }
    })
  } catch (err) {
    console.error('[AUDIT LOG ERROR]:', err.message)
    return null
  }
}
