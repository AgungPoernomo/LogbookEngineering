import prisma from '../config/prisma.js'
import { successResponse, errorResponse } from '../utils/response.js'

export async function getNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: BigInt(req.user.id) },
      orderBy: { sent_at: 'desc' },
      take: 30
    })

    const formatted = notifications.map(n => ({
      id: Number(n.id),
      logbook_id: n.logbook_id ? Number(n.logbook_id) : null,
      type: n.type,
      channel: n.channel,
      subject: n.subject,
      message: n.message,
      sent_at: n.sent_at,
      read_at: n.read_at,
      is_read: Boolean(n.read_at)
    }))

    const unreadCount = formatted.filter(n => !n.is_read).length

    return successResponse(res, {
      message: 'Notifikasi berhasil diambil.',
      data: formatted,
      meta: { unread_count: unreadCount }
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
      data: { read_at: new Date() }
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
      data: { read_at: new Date() }
    })

    return successResponse(res, {
      message: `${updated.count} notifikasi ditandai sebagai telah dibaca.`
    })
  } catch (err) {
    next(err)
  }
}
