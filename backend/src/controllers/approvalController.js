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

/**
 * Logika Approval Per User (Teknisi):
 * Supervisor menyetujui seluruh logbook pending milik seorang teknisi sekaligus dalam 1 transaksi.
 */
export async function processTechnicianApproval(req, res, next) {
  try {
    const { userId } = req.params
    const { status, notes } = req.body

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return errorResponse(res, {
        message: "Status approval harus berupa 'APPROVED' atau 'REJECTED'.",
        statusCode: 400
      })
    }

    if (status === 'REJECTED' && (!notes || !notes.trim())) {
      return errorResponse(res, {
        message: 'Catatan perbaikan / alasan penolakan wajib diisi saat menolak logbook.',
        statusCode: 400
      })
    }

    const technician = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: {
        plant: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } }
      }
    })

    if (!technician) {
      return errorResponse(res, {
        message: 'Teknisi tidak ditemukan.',
        statusCode: 404
      })
    }

    const pendingLogbooks = await prisma.logbook.findMany({
      where: {
        user_id: BigInt(userId),
        status: 'PENDING'
      },
      include: {
        machine: true,
        plant: true
      }
    })

    if (pendingLogbooks.length === 0) {
      return errorResponse(res, {
        message: `Tidak ada logbook berstatus PENDING untuk Teknisi ${technician.full_name}.`,
        statusCode: 400
      })
    }

    const logbookIds = pendingLogbooks.map(l => l.id)
    const actionText = status === 'APPROVED' ? 'disetujui' : 'ditolak'
    const approvalNotes = notes?.trim() || (status === 'APPROVED' ? 'Disetujui per teknisi sesuai SOP pemeliharaan.' : '-')

    // Transaksi database: update seluruh status logbook & buat catatan approval
    await prisma.$transaction(async (tx) => {
      await tx.logbook.updateMany({
        where: { id: { in: logbookIds } },
        data: { status }
      })

      const approvalRecords = logbookIds.map(logbookId => ({
        logbook_id: logbookId,
        supervisor_id: BigInt(req.user.id),
        status,
        notes: approvalNotes,
        reviewed_at: new Date()
      }))

      await tx.logbookApproval.createMany({
        data: approvalRecords
      })
    })

    // Audit trail
    await logActivity(
      req.user.id,
      status === 'APPROVED' ? 'APPROVE_LOGBOOK_PER_TEKNISI' : 'REJECT_LOGBOOK_PER_TEKNISI',
      `Supervisor ${req.user.full_name} (${req.user.nik}) ${actionText} seluruh logbook (${pendingLogbooks.length} entri) milik Teknisi ${technician.full_name} (${technician.nik}). Catatan: ${approvalNotes}`
    )

    // Notifikasi fan-out
    const notifications = []
    notifications.push({
      userId: technician.id,
      logbookId: pendingLogbooks[0].id,
      type: status === 'APPROVED' ? 'LOGBOOK_APPROVED' : 'LOGBOOK_REJECTED',
      recipientEmail: technician.email,
      subject: `[Approval Per Teknisi] ${pendingLogbooks.length} Logbook Anda Telah ${status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}`,
      message: status === 'APPROVED'
        ? `Selamat! Seluruh logbook Anda (${pendingLogbooks.length} entri) telah DISETUJUI oleh Supervisor ${req.user.full_name} dan otomatis tersimpan ke database.`
        : `Perhatian: Logbook yang Anda ajukan (${pendingLogbooks.length} entri) DITOLAK oleh Supervisor ${req.user.full_name}. Catatan revisi: "${notes}". Silakan lakukan perbaikan.`,
      channel: 'INAPP'
    })

    notifications.push({
      userId: req.user.id,
      logbookId: pendingLogbooks[0].id,
      type: status === 'APPROVED' ? 'LOGBOOK_APPROVED' : 'LOGBOOK_REJECTED',
      recipientEmail: req.user.email,
      subject: `[Approval Selesai] Seluruh Logbook Teknisi ${technician.full_name} Berhasil ${status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}`,
      message: `Anda telah ${actionText} seluruh logbook (${pendingLogbooks.length} entri) milik Teknisi ${technician.full_name}. Catatan: ${approvalNotes}`,
      channel: 'INAPP'
    })

    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, is_active: true }
    })
    for (const admin of admins) {
      notifications.push({
        userId: admin.id,
        logbookId: pendingLogbooks[0].id,
        type: status === 'APPROVED' ? 'LOGBOOK_APPROVED' : 'LOGBOOK_REJECTED',
        recipientEmail: admin.email,
        subject: `[Sistem Approval] ${pendingLogbooks.length} Logbook Teknisi ${technician.full_name} ${actionText}`,
        message: `Supervisor ${req.user.full_name} telah ${actionText} ${pendingLogbooks.length} logbook milik Teknisi ${technician.full_name}.`,
        channel: 'INAPP'
      })
    }

    await sendBulkNotifications(notifications)

    return successResponse(res, {
      message: `Seluruh logbook (${pendingLogbooks.length} entri) milik Teknisi ${technician.full_name} berhasil ${actionText} dan otomatis tersimpan ke database.`,
      data: {
        technician_id: Number(technician.id),
        technician_name: technician.full_name,
        processed_count: pendingLogbooks.length,
        status,
        notes: approvalNotes
      }
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Mendapatkan daftar teknisi yang memiliki logbook PENDING untuk diapprove
 */
export async function getPendingApprovalsByTechnician(req, res, next) {
  try {
    const pendingLogbooks = await prisma.logbook.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            nik: true,
            full_name: true,
            email: true,
            photo_url: true,
            plant: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } }
          }
        },
        plant: { select: { id: true, name: true } },
        shift: { select: { id: true, name: true } },
        machine: { select: { id: true, name: true } },
        subMachine: { select: { id: true, name: true } }
      },
      orderBy: [{ task_date: 'desc' }, { created_at: 'desc' }]
    })

    const technicianMap = new Map()

    for (const log of pendingLogbooks) {
      const uId = Number(log.user_id)
      if (!technicianMap.has(uId)) {
        technicianMap.set(uId, {
          user_id: uId,
          user_nik: log.user.nik,
          user_name: log.user.full_name,
          user_email: log.user.email,
          user_photo_url: log.user.photo_url,
          plant_id: log.user.plant?.id || log.plant?.id,
          plant_name: log.user.plant?.name || log.plant?.name,
          work_group_name: log.user.group?.name || '-',
          pending_count: 0,
          total_duration_minutes: 0,
          machines: new Set(),
          shifts: new Set(),
          dates: new Set(),
          logbooks: []
        })
      }

      const group = technicianMap.get(uId)
      group.pending_count += 1
      group.total_duration_minutes += (log.duration_minutes || 0)
      if (log.machine?.name) group.machines.add(log.machine.name)
      if (log.shift?.name) group.shifts.add(log.shift.name)
      if (log.task_date) group.dates.add(log.task_date)

      group.logbooks.push({
        id: Number(log.id),
        task_date: log.task_date,
        shift_name: log.shift?.name || '-',
        machine_name: log.machine?.name || '-',
        sub_machine_name: log.subMachine?.name || '-',
        start_time: log.start_time,
        end_time: log.end_time,
        duration_minutes: log.duration_minutes,
        activity_description: log.activity_description,
        sparepart: log.sparepart,
        status: log.status,
        created_at: log.created_at
      })
    }

    const result = Array.from(technicianMap.values()).map(tech => ({
      ...tech,
      machines: Array.from(tech.machines),
      shifts: Array.from(tech.shifts),
      dates: Array.from(tech.dates).sort().reverse()
    }))

    return successResponse(res, {
      message: 'Daftar approval per teknisi berhasil diambil.',
      data: result,
      meta: {
        total_technicians: result.length,
        total_pending_logs: pendingLogbooks.length
      }
    })
  } catch (err) {
    next(err)
  }
}
