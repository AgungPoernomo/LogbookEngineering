import prisma from '../config/prisma.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { logActivity } from '../services/auditService.js'
import { sendNotification, sendBulkNotifications } from '../services/mailerService.js'

export async function processApproval(req, res, next) {
  try {
    const { id } = req.params
    const { status, notes } = req.body

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return errorResponse(res, {
        message: "Status approval harus berupa 'APPROVED' atau 'REJECTED'.",
        statusCode: 400
      })
    }

    // Catatan wajib jika ditolak (README line 154)
    if (status === 'REJECTED' && (!notes || !notes.trim())) {
      return errorResponse(res, {
        message: 'Catatan perbaikan / alasan penolakan wajib diisi saat menolak logbook.',
        statusCode: 400
      })
    }

    const logbook = await prisma.logbook.findUnique({
      where: { id: BigInt(id) },
      include: {
        user: true,
        machine: true,
        plant: true
      }
    })

    if (!logbook) {
      return errorResponse(res, {
        message: 'Logbook tidak ditemukan.',
        statusCode: 404
      })
    }

    if (logbook.status !== 'PENDING') {
      return errorResponse(res, {
        message: `Logbook berstatus [${logbook.status}] tidak dapat diproses approval. Hanya logbook 'PENDING' yang dapat ditinjau.`,
        statusCode: 400
      })
    }

    // Eksekusi transaksi: update status logbook & insert logbook_approvals
    const [updatedLogbook, approvalRecord] = await prisma.$transaction([
      prisma.logbook.update({
        where: { id: BigInt(id) },
        data: { status }
      }),
      prisma.logbookApproval.create({
        data: {
          logbook_id: BigInt(id),
          supervisor_id: BigInt(req.user.id),
          status,
          notes: notes?.trim() || '-',
          reviewed_at: new Date()
        }
      })
    ])

    const actionText = status === 'APPROVED' ? 'disetujui' : 'ditolak'
    const auditActivity = status === 'APPROVED' ? 'APPROVE_LOGBOOK' : 'REJECT_LOGBOOK'

    // Catat ke audit trail
    await logActivity(
      req.user.id,
      auditActivity,
      `Supervisor ${req.user.full_name} (${req.user.nik}) ${actionText} logbook #${id} milik ${logbook.user.full_name}. Catatan: ${notes || '-'}`
    )

    // Kirim notifikasi ke teknisi, supervisor, dan admin (Fan-Out 1 Query createMany)
    const notifications = []

    // 1. Notifikasi ke teknisi yang bersangkutan
    notifications.push({
      userId: logbook.user_id,
      logbookId: logbook.id,
      type: status === 'APPROVED' ? 'LOGBOOK_APPROVED' : 'LOGBOOK_REJECTED',
      recipientEmail: logbook.user.email,
      subject: `[Logbook ${status}] Logbook ${logbook.machine.name} pada ${logbook.task_date}`,
      message: status === 'APPROVED'
        ? `Selamat! Logbook Anda untuk mesin ${logbook.machine.name} pada tanggal ${logbook.task_date} telah DISETUJUI oleh Supervisor ${req.user.full_name}.`
        : `Perhatian: Logbook Anda untuk mesin ${logbook.machine.name} pada tanggal ${logbook.task_date} DITOLAK oleh Supervisor ${req.user.full_name}. Catatan revisi: "${notes}". Silakan lakukan perbaikan.`,
      channel: 'INAPP'
    })

    // 2. Notifikasi konfirmasi ke Supervisor yang mereview
    notifications.push({
      userId: req.user.id,
      logbookId: logbook.id,
      type: status === 'APPROVED' ? 'LOGBOOK_APPROVED' : 'LOGBOOK_REJECTED',
      recipientEmail: req.user.email,
      subject: `[Approval Selesai] Logbook #${logbook.id} Berhasil ${status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}`,
      message: `Anda telah ${actionText} logbook #${logbook.id} milik Teknisi ${logbook.user.full_name} (${logbook.machine.name}). Catatan: ${notes || '-'}`,
      channel: 'INAPP'
    })

    // 3. Notifikasi ke Administrator Sistem
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, is_active: true }
    })
    for (const admin of admins) {
      notifications.push({
        userId: admin.id,
        logbookId: logbook.id,
        type: status === 'APPROVED' ? 'LOGBOOK_APPROVED' : 'LOGBOOK_REJECTED',
        recipientEmail: admin.email,
        subject: `[Sistem Approval] Logbook #${logbook.id} ${actionText}`,
        message: `Supervisor ${req.user.full_name} telah ${actionText} logbook #${logbook.id} milik Teknisi ${logbook.user.full_name} (${logbook.machine.name}). Status: ${status}.`,
        channel: 'INAPP'
      })
    }

    await sendBulkNotifications(notifications)

    return successResponse(res, {
      message: `Logbook berhasil ${actionText}.`,
      data: {
        logbook_id: Number(updatedLogbook.id),
        status: updatedLogbook.status,
        approval_id: Number(approvalRecord.id),
        notes: approvalRecord.notes,
        reviewed_at: approvalRecord.reviewed_at
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function getApprovalHistory(req, res, next) {
  try {
    const { id } = req.params
    const approvals = await prisma.logbookApproval.findMany({
      where: { logbook_id: BigInt(id) },
      orderBy: { reviewed_at: 'desc' },
      include: {
        supervisor: {
          select: {
            id: true,
            nik: true,
            full_name: true,
            email: true
          }
        }
      }
    })

    const formatted = approvals.map(a => ({
      id: Number(a.id),
      logbook_id: Number(a.logbook_id),
      supervisor_id: Number(a.supervisor_id),
      supervisor_name: a.supervisor?.full_name,
      supervisor_nik: a.supervisor?.nik,
      status: a.status,
      notes: a.notes,
      reviewed_at: a.reviewed_at
    }))

    return successResponse(res, {
      message: 'Riwayat approval berhasil diambil.',
      data: formatted
    })
  } catch (err) {
    next(err)
  }
}
