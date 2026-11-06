import prisma from '../config/prisma.js'
import { successResponse } from '../utils/response.js'

export async function getAuditLogs(req, res, next) {
  try {
    const {
      user_id,
      activity,
      search,
      start_date,
      end_date,
      page = 1,
      limit = 25,
      sort_by = 'created_at',
      sort_dir = 'desc'
    } = req.query
    const where = {}

    if (user_id) where.user_id = BigInt(user_id)
    // BUG-013 (AUD-02): filter jenis aktivitas
    if (activity && activity !== 'ALL') where.activity = { contains: activity }
    if (search) {
      where.OR = [
        { activity: { contains: search } },
        { detail: { contains: search } }
      ]
    }
    // BUG-013 (AUD-02): filter rentang tanggal
    if (start_date || end_date) {
      where.created_at = {}
      if (start_date) where.created_at.gte = new Date(`${start_date}T00:00:00.000`)
      if (end_date) where.created_at.lte = new Date(`${end_date}T23:59:59.999`)
    }

    // BUG-013 (AUD-02): pengurutan
    const SORTABLE = { id: 'id', created_at: 'created_at', activity: 'activity', user: 'user_id' }
    const orderField = SORTABLE[sort_by] || 'created_at'
    const orderDir = String(sort_dir).toLowerCase() === 'asc' ? 'asc' : 'desc'

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(100, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    const [total, activities] = await Promise.all([
      prisma.userActivity.count({ where }),
      prisma.userActivity.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [orderField]: orderDir },
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
