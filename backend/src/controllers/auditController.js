import prisma from '../config/prisma.js'
import { successResponse } from '../utils/response.js'

export async function getAuditLogs(req, res, next) {
  try {
    const { user_id, activity, page = 1, limit = 25 } = req.query
    const where = {}

    if (user_id) where.user_id = BigInt(user_id)
    if (activity) where.activity = { contains: activity }

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(100, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    const [total, activities] = await Promise.all([
      prisma.userActivity.count({ where }),
      prisma.userActivity.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              nik: true,
              full_name: true,
              email: true,
              role: { select: { name: true } }
            }
          }
        }
      })
    ])

    const formatted = activities.map(a => ({
      id: Number(a.id),
      user_id: Number(a.user_id),
      user_name: a.user?.full_name || 'System',
      user_nik: a.user?.nik || '-',
      user_role: a.user?.role?.name || '-',
      activity: a.activity,
      detail: a.detail,
      created_at: a.created_at
    }))

    return successResponse(res, {
      message: 'Catatan audit aktivitas pengguna berhasil diambil.',
      data: formatted,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    })
  } catch (err) {
    next(err)
  }
}
