import prisma from '../config/prisma.js'
import { successResponse, errorResponse } from '../utils/response.js'

export async function getNotifications(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query
    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
    const skip = (pageNum - 1) * limitNum

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where: { user_id: BigInt(req.user.id) } }),
      prisma.notification.count({ where: { user_id: BigInt(req.user.id), read_at: null } }),
      prisma.notification.findMany({
        where: { user_id: BigInt(req.user.id) },
        orderBy: { sent_at: 'desc' },
        skip,
        take: limitNum
      })
    ])

    const formatted = notifications.map(n => ({
      id: Number(n.id),
      logbook_id: n.logbook_id ? Number(n.logbook_id) : null,
      type: n.type,
      channel: n.channel,
      subject: n.subject,
      message: n.message,
      sent_at: n.sent_at,
      read_at: n.read_at,
      is_read: Boolean(n.read_at || n.is_read)
    }))

    return successResponse(res, {
      message: 'Notifikasi berhasil diambil.',
      data: formatted,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(total / limitNum),
        unread_count: unreadCount
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const count = await prisma.notification.count({
      where: {
        user_id: BigInt(req.user.id),
        read_at: null
      }
    })

    return successResponse(res, {
      message: 'Jumlah notifikasi belum dibaca berhasil diambil.',
      data: { unread_count: count }
    })
  } catch (err) {
    next(err)
  }
}

export async function markAsRead(req, res, next) {
  try {
    const { id } = req.params
    const updated = await prisma.notification.updateMany({
      where: {
        id: BigInt(id),
        user_id: BigInt(req.user.id)
      },
      data: {
        read_at: new Date(),
        is_read: true
      }
    })

    if (updated.count === 0) {
      return errorResponse(res, { message: 'Notifikasi tidak ditemukan.', statusCode: 404 })
    }

    return successResponse(res, { message: 'Notifikasi ditandai sebagai telah dibaca.' })
  } catch (err) {
    next(err)
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    const updated = await prisma.notification.updateMany({
      where: {
        user_id: BigInt(req.user.id),
        read_at: null
      },
      data: {
        read_at: new Date(),
        is_read: true
      }
    })

    return successResponse(res, {
      message: `${updated.count} notifikasi ditandai sebagai telah dibaca.`
    })
  } catch (err) {
    next(err)
  }
}

