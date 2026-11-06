import prisma from '../config/prisma.js'
import { calculateDurationMinutes } from '../utils/duration.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { logActivity } from '../services/auditService.js'
import { sendNotification, sendBulkNotifications } from '../services/mailerService.js'
import { validateLogbookTime, validateActivityDescription } from '../utils/timeValidation.js'
import {
  validateActivityCategory,
  deriveMaintenanceType,
  normalizeMachineEndStatus,
  resolveSparepartInput
} from '../utils/reliability.js'

export async function getLogbooks(req, res, next) {
  try {
    const {
      status,
      plant_id,
      machine_id,
      shift_id,
      task_date,
      start_date,
      end_date,
      user_id,
      search,
      page = 1,
      limit = 20
    } = req.query

    const where = {}

        // RBAC filter:
    // - Teknisi: hanya melihat data dirinya sendiri (otomatis terisolasi per plant akun)
    // - Supervisor: otomatis terisolasi ke plant miliknya jika req.user.plant_id ada
    // - Admin: bebas filter plant / user
    if (req.user.role === 'Teknisi') {
      where.user_id = BigInt(req.user.id)
      if (plant_id) {
        where.plant_id = BigInt(plant_id)
      } else if (req.user.plant_id) {
        where.plant_id = BigInt(req.user.plant_id)
      }
    } else if (req.user.role === 'Supervisor' && req.user.plant_id) {
      where.plant_id = BigInt(req.user.plant_id)
      if (user_id) {
        where.user_id = BigInt(user_id)
      }
    } else {
      if (user_id) {
        where.user_id = BigInt(user_id)
      }
      if (plant_id && plant_id !== 'ALL') {
        where.plant_id = BigInt(plant_id)
      }
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (machine_id) {
      where.machine_id = BigInt(machine_id)
    }

    if (shift_id) {
      where.shift_id = BigInt(shift_id)
    }

    if (task_date) {
      where.task_date = task_date
    } else if (start_date || end_date) {
      where.task_date = {}
      if (start_date) where.task_date.gte = start_date
      if (end_date) where.task_date.lte = end_date
    }

    if (search) {
      where.OR = [
        { activity_description: { contains: search } },
        { sparepart: { contains: search } },
        { user: { full_name: { contains: search } } }
      ]
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = String(limit).toLowerCase() === 'all'
      ? 1000
      : Math.min(1000, Math.max(1, Number(limit) || 20))
    const skip = (pageNum - 1) * limitNum

    const [total, logbooks] = await Promise.all([
      prisma.logbook.count({ where }),
      prisma.logbook.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { task_date: 'desc' },
          { start_time: 'desc' }
        ],
        include: {
          user: {
            select: {
              id: true,
              nik: true,
              full_name: true,
              email: true,
              photo_url: true,
              group: { select: { name: true } }
            }
          },
          plant: { select: { id: true, name: true } },
          shift: { select: { id: true, name: true, start_time: true, end_time: true } },
          machine: { select: { id: true, name: true } },
          subMachine: { select: { id: true, name: true } },
          failureCode: { select: { id: true, code: true, name: true, category: true } },
          sparepartUsages: { include: { sparepart: true } },
          approvals: {
            take: 1,
            orderBy: { reviewed_at: 'desc' },
            include: {
              supervisor: { select: { full_name: true, nik: true } }
            }
          }
        }
      })
    ])

    const formattedLogbooks = logbooks.map(l => ({
      id: Number(l.id),
      user_id: Number(l.user_id),
      user_name: l.user?.full_name,
      user_nik: l.user?.nik,
      user_group: l.user?.group?.name || '-',
      plant_id: Number(l.plant_id),
      plant_name: l.plant?.name,
      shift_id: Number(l.shift_id),
      shift_name: l.shift?.name,
      machine_id: l.machine_id ? Number(l.machine_id) : null,
      machine_name: l.machine?.name,
      sub_machine_id: l.sub_machine_id ? Number(l.sub_machine_id) : null,
      sub_machine_name: l.subMachine?.name || '-',
      task_date: l.task_date,
      start_time: l.start_time,
      end_time: l.end_time,
      duration_minutes: l.duration_minutes,
      sparepart: l.sparepart || '-',
      activity_description: l.activity_description,
      status: l.status,
      // ---- v6 Reliability fields (Bagian 4.1) ----
      activity_category: l.activity_category,
      quick_action_tag: l.quick_action_tag,
      machine_end_status: l.machine_end_status,
      maintenance_type: l.maintenance_type,
      is_downtime: l.is_downtime,
      downtime_minutes: l.downtime_minutes,
      unit_repaired_qty: l.unit_repaired_qty,
      has_sparepart: l.has_sparepart,
      unmapped_asset_note: l.unmapped_asset_note,
      failure_code_id: l.failure_code_id ? Number(l.failure_code_id) : null,
      failure_code: l.failureCode
        ? { id: Number(l.failureCode.id), code: l.failureCode.code, name: l.failureCode.name }
        : null,
      spareparts: (l.sparepartUsages || []).map(s => ({
        id: Number(s.id),
        sparepart_id: Number(s.sparepart_id),
        part_code: s.sparepart?.part_code,
        part_name: s.sparepart?.part_name,
        qty_used: Number(s.qty_used),
        unit: s.sparepart?.unit
      })),
      created_at: l.created_at,
      latest_approval: l.approvals[0] ? {
        id: Number(l.approvals[0].id),
        status: l.approvals[0].status,
        notes: l.approvals[0].notes,
        supervisor_name: l.approvals[0].supervisor?.full_name,
        reviewed_at: l.approvals[0].reviewed_at
      } : null
    }))

    return successResponse(res, {
      message: 'Daftar logbook berhasil diambil.',
      data: formattedLogbooks,
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

export async function createLogbook(req, res, next) {
  try {
    const {
      plant_id,
      shift_id,
      machine_id,
      sub_machine_id,
      task_date,
      sparepart,
      activity_description,
      start_time,
      end_time,
      status = 'PENDING',
      // ---- v6 Reliability fields (Bagian 4.1) ----
      activity_category,
      quick_action_tag,
      machine_end_status,
      failure_code_id,
      root_cause_notes,
      is_downtime,
      downtime_minutes,
      unit_repaired_qty,
      has_sparepart,
      unmapped_asset_note,
      sparepart_items
    } = req.body

    // Payload v6 terdeteksi bila mengirim field baru. Payload lama tetap diterima memakai default.
    const isV6Payload =
      activity_category !== undefined || quick_action_tag !== undefined || Array.isArray(sparepart_items)

    if (!task_date || !start_time || !end_time || !activity_description) {
      return errorResponse(res, {
        message: 'Tanggal tugas, jam mulai, jam selesai, dan uraian pekerjaan wajib diisi.',
        statusCode: 400
      })
    }

    // Validasi kategori & field baru sesuai tabel 4.3.
    const finalCategory = activity_category || 'MACHINE_TROUBLE'
    let categoryValidation = { valid: true, data: {} }
    if (isV6Payload) {
      categoryValidation = validateActivityCategory({
        activity_category: finalCategory,
        machine_id,
        sub_machine_id,
        quick_action_tag,
        unmapped_asset_note,
        unit_repaired_qty,
        is_downtime: !!is_downtime,
        machine_end_status,
        sparepart,
        sparepart_items
      })
      if (!categoryValidation.valid) {
        return errorResponse(res, { message: categoryValidation.message, statusCode: 400 })
      }
    } else if (!machine_id) {
      // Kompatibilitas mundur: payload lama tetap mewajibkan mesin.
      return errorResponse(res, { message: 'Mesin wajib diisi.', statusCode: 400 })
    }

    // BUG-012: uraian aktivitas maksimal 1000 karakter
    const descriptionCheck = validateActivityDescription(activity_description)
    if (!descriptionCheck.valid) {
      return errorResponse(res, { message: descriptionCheck.message, statusCode: 400 })
    }

    // BUG-003 & BUG-004: validasi urutan waktu & durasi 0 menit
    const relatedShift = await prisma.shift.findUnique({
      where: { id: BigInt(shift_id || 1) }
    })
    const timeCheck = validateLogbookTime(start_time, end_time, relatedShift)
    if (!timeCheck.valid) {
      return errorResponse(res, { message: timeCheck.message, statusCode: 400 })
    }

    const duration_minutes = calculateDurationMinutes(start_time, end_time)
    const logStatus = status === 'DRAFT' ? 'DRAFT' : 'PENDING'

    // Gunakan plant_id dari profil user jika tidak dikirim dari form
    const finalPlantId = plant_id || req.user.plant_id
    if (!finalPlantId) {
      return errorResponse(res, {
        message: 'Plant ID tidak valid. Pastikan profil Anda telah ditugaskan ke sebuah plant.',
        statusCode: 400
      })
    }

    // KERETA_TRAY_REPAIR: mesin otomatis = "KERETA" pada plant terkait (Bagian 4.3).
    let finalMachineId = machine_id ? BigInt(machine_id) : null
    if (finalCategory === 'KERETA_TRAY_REPAIR' && !finalMachineId) {
      const keretaMachine = await prisma.machine.findFirst({
        where: { name: 'KERETA', plant_id: BigInt(finalPlantId) }
      })
      if (keretaMachine) finalMachineId = keretaMachine.id
    }

    // Turunkan maintenance_type (Bagian 4.2) & normalisasi status akhir mesin.
    const finalMaintenanceType = isV6Payload
      ? categoryValidation.data.maintenance_type
      : deriveMaintenanceType({ activity_category: finalCategory, is_downtime: !!is_downtime })
    const finalEndStatus = isV6Payload
      ? categoryValidation.data.machine_end_status
      : normalizeMachineEndStatus(finalCategory, machine_end_status)
    const finalUnitQty = isV6Payload
      ? categoryValidation.data.unit_repaired_qty
      : Number(unit_repaired_qty) >= 1
        ? Math.floor(Number(unit_repaired_qty))
        : null
    const finalSparepartItems = isV6Payload
      ? categoryValidation.data.sparepart_items
      : resolveSparepartInput({ sparepart_items, sparepart }).items
    const finalQuickTag = isV6Payload ? categoryValidation.data.quick_action_tag : quick_action_tag || null
    const finalUnmappedNote = isV6Payload
      ? categoryValidation.data.unmapped_asset_note
      : unmapped_asset_note || null

    // Simpan Logbook + LogbookSparepart dalam SATU transaksi.
    const newLogbook = await prisma.$transaction(async (tx) => {
      const created = await tx.logbook.create({
        data: {
          user_id: BigInt(req.user.id),
          plant_id: BigInt(finalPlantId),
          shift_id: BigInt(shift_id || 1),
          machine_id: finalMachineId,
          sub_machine_id: sub_machine_id ? BigInt(sub_machine_id) : null,
          task_date,
          sparepart: finalCategory === 'SUPPORT_NON_MACHINE' ? null : sparepart || '-',
          activity_description,
          start_time,
          end_time,
          duration_minutes,
          status: logStatus,
          activity_category: finalCategory,
          quick_action_tag: finalQuickTag,
          machine_end_status: finalEndStatus,
          maintenance_type: finalMaintenanceType,
          failure_code_id: failure_code_id ? BigInt(failure_code_id) : null,
          root_cause_notes: root_cause_notes || null,
          is_downtime: !!is_downtime,
          downtime_minutes: Number(downtime_minutes) > 0 ? Number(downtime_minutes) : 0,
          unit_repaired_qty: finalUnitQty,
          has_sparepart: finalSparepartItems.length > 0 || !!has_sparepart,
          unmapped_asset_note: finalUnmappedNote
        }
      })

      if (finalSparepartItems.length > 0) {
        await tx.logbookSparepart.createMany({
          data: finalSparepartItems.map(item => ({
            logbook_id: created.id,
            sparepart_id: BigInt(item.sparepart_id),
            qty_used: Number(item.qty_used)
          }))
        })
      }

      return tx.logbook.findUnique({
        where: { id: created.id },
        include: {
          machine: true,
          plant: true,
          failureCode: true,
          sparepartUsages: { include: { sparepart: true } }
        }
      })
    })

    // Catat audit trail
    await logActivity(
      req.user.id,
      logStatus === 'DRAFT' ? 'SAVE_DRAFT_LOGBOOK' : 'SUBMIT_LOGBOOK',
      `Logbook #${newLogbook.id} (${newLogbook.machine?.name || 'Aset belum terdaftar'}) dibuat dengan status ${logStatus}`
    )

    // Jika disubmit PENDING, kirim notifikasi ke Teknisi, Supervisor, dan Admin (Fan-Out 1 Query createMany)
    if (logStatus === 'PENDING') {
      const notifications = []

      // 1. Notifikasi konfirmasi ke Teknisi
      notifications.push({
        userId: req.user.id,
        logbookId: newLogbook.id,
        type: 'LOGBOOK_SUBMITTED',
        recipientEmail: req.user.email,
        subject: `[Logbook Diajukan] Logbook #${newLogbook.id} (${newLogbook.machine?.name || 'Aset belum terdaftar'})`,
        message: `Logbook Anda untuk mesin ${newLogbook.machine?.name || 'Aset belum terdaftar'} pada ${task_date} berhasil diajukan dan sedang menunggu persetujuan Supervisor.`,
        channel: 'INAPP'
      })

      // 2. Notifikasi ke Supervisor plant terkait (atau semua supervisor aktif jika supervisor per-plant tidak ditemukan)
      let supervisors = await prisma.user.findMany({
        where: {
          role: { name: 'Supervisor' },
          plant_id: BigInt(finalPlantId),
          is_active: true
        }
      })
      if (supervisors.length === 0) {
        supervisors = await prisma.user.findMany({
          where: { role: { name: 'Supervisor' }, is_active: true }
        })
      }

      for (const spv of supervisors) {
        notifications.push({
          userId: spv.id,
          logbookId: newLogbook.id,
          type: 'LOGBOOK_PENDING_APPROVAL',
          recipientEmail: spv.email,
          subject: `[Menunggu Approval] Pengajuan oleh ${req.user.full_name}`,
          message: `Teknisi ${req.user.full_name} telah mengajukan logbook baru untuk mesin ${newLogbook.machine?.name || 'Aset belum terdaftar'} pada ${task_date}. Silakan tinjau di modul Approval.`,
          channel: 'INAPP'
        })
      }

      // 3. Notifikasi ke Administrator Sistem
      const admins = await prisma.user.findMany({
        where: { role: { name: 'Admin' }, is_active: true }
      })
      for (const admin of admins) {
        notifications.push({
          userId: admin.id,
          logbookId: newLogbook.id,
          type: 'LOGBOOK_SUBMITTED',
          recipientEmail: admin.email,
          subject: `[Sistem] Pengajuan Logbook #${newLogbook.id} oleh ${req.user.full_name}`,
          message: `Teknisi ${req.user.full_name} telah mengajukan logbook #${newLogbook.id} (${newLogbook.machine?.name || 'Aset belum terdaftar'}, ${newLogbook.plant?.name || 'Plant'}). Status: Menunggu Approval.`,
          channel: 'INAPP'
        })
      }

      // Eksekusi insert batch dalam satu query database
      await sendBulkNotifications(notifications)
    }

    return successResponse(res, {
      message: logStatus === 'DRAFT' ? 'Draft logbook berhasil disimpan.' : 'Logbook berhasil diajukan untuk approval.',
      data: {
        ...newLogbook,
        id: Number(newLogbook.id),
        user_id: Number(newLogbook.user_id),
        plant_id: Number(newLogbook.plant_id),
        machine_id: newLogbook.machine_id ? Number(newLogbook.machine_id) : null,
        sub_machine_id: newLogbook.sub_machine_id ? Number(newLogbook.sub_machine_id) : null,
        shift_id: Number(newLogbook.shift_id),
        failure_code_id: newLogbook.failure_code_id ? Number(newLogbook.failure_code_id) : null,
        spareparts: (newLogbook.sparepartUsages || []).map(s => ({
          id: Number(s.id),
          sparepart_id: Number(s.sparepart_id),
          part_name: s.sparepart?.part_name,
          qty_used: Number(s.qty_used),
          unit: s.sparepart?.unit
        }))
      },
      statusCode: 201
    })
  } catch (err) {
    next(err)
  }
}

export async function getLogbookById(req, res, next) {
  try {
    const { id } = req.params
    const logbook = await prisma.logbook.findUnique({
      where: { id: BigInt(id) },
      include: {
        user: { select: { id: true, nik: true, full_name: true, email: true, photo_url: true } },
        plant: true,
        shift: true,
        machine: true,
        subMachine: true,
        failureCode: true,
        sparepartUsages: { include: { sparepart: true } },
        approvals: {
          orderBy: { reviewed_at: 'desc' },
          include: {
            supervisor: { select: { id: true, full_name: true, nik: true, email: true } }
          }
        }
      }
    })

    if (!logbook) {
      return errorResponse(res, {
        message: 'Logbook tidak ditemukan.',
        statusCode: 404
      })
    }

    // RBAC: Teknisi hanya boleh melihat logbook miliknya sendiri
    if (req.user.role === 'Teknisi' && Number(logbook.user_id) !== req.user.id) {
      return errorResponse(res, {
        message: 'Akses ditolak. Anda tidak berhak melihat logbook ini.',
        statusCode: 403
      })
    }

    return successResponse(res, {
      message: 'Detail logbook berhasil diambil.',
      data: {
        ...logbook,
        id: Number(logbook.id),
        user_id: Number(logbook.user_id),
        plant_id: Number(logbook.plant_id),
        shift_id: Number(logbook.shift_id),
        machine_id: logbook.machine_id ? Number(logbook.machine_id) : null,
        sub_machine_id: logbook.sub_machine_id ? Number(logbook.sub_machine_id) : null,
        failure_code_id: logbook.failure_code_id ? Number(logbook.failure_code_id) : null
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function updateLogbook(req, res, next) {
  try {
    const { id } = req.params
    const logbook = await prisma.logbook.findUnique({
      where: { id: BigInt(id) }
    })

    if (!logbook) {
      return errorResponse(res, {
        message: 'Logbook tidak ditemukan.',
        statusCode: 404
      })
    }

    // Periksa kepemilikan
    if (req.user.role === 'Teknisi' && Number(logbook.user_id) !== req.user.id) {
      return errorResponse(res, {
        message: 'Akses ditolak. Anda bukan pemilik logbook ini.',
        statusCode: 403
      })
    }

    // Hanya status DRAFT atau REJECTED yang boleh diedit per README lines 401 & 971
    if (logbook.status !== 'DRAFT' && logbook.status !== 'REJECTED') {
      return errorResponse(res, {
        message: `Logbook dengan status [${logbook.status}] tidak dapat diedit kembali.`,
        statusCode: 400
      })
    }

    const {
      plant_id,
      shift_id,
      machine_id,
      sub_machine_id,
      task_date,
      sparepart,
      activity_description,
      start_time,
      end_time,
      status,
      // ---- v6 Reliability fields (Bagian 4.1) ----
      activity_category,
      quick_action_tag,
      machine_end_status,
      failure_code_id,
      root_cause_notes,
      is_downtime,
      downtime_minutes,
      unit_repaired_qty,
      has_sparepart,
      unmapped_asset_note,
      sparepart_items
    } = req.body

    // BUG-003, BUG-004 & BUG-012: validasi urutan waktu, durasi 0, dan panjang uraian
    const effectiveStart = start_time || logbook.start_time
    const effectiveEnd = end_time || logbook.end_time
    const effectiveShiftId = shift_id || logbook.shift_id
    const relatedShift = await prisma.shift.findUnique({ where: { id: BigInt(effectiveShiftId) } })
    const timeCheck = validateLogbookTime(effectiveStart, effectiveEnd, relatedShift)
    if (!timeCheck.valid) {
      return errorResponse(res, { message: timeCheck.message, statusCode: 400 })
    }
    if (activity_description !== undefined) {
      const descCheck = validateActivityDescription(activity_description)
      if (!descCheck.valid) {
        return errorResponse(res, { message: descCheck.message, statusCode: 400 })
      }
    }

    // Validasi field baru (Bagian 4.3) bila ada perubahan pada field v6.
    const v6Keys = [
      'activity_category',
      'quick_action_tag',
      'machine_end_status',
      'failure_code_id',
      'root_cause_notes',
      'is_downtime',
      'downtime_minutes',
      'unit_repaired_qty',
      'has_sparepart',
      'unmapped_asset_note',
      'sparepart_items'
    ]
    const isV6Update = v6Keys.some(k => req.body[k] !== undefined)

    const effectiveCategory = activity_category || logbook.activity_category || 'MACHINE_TROUBLE'
    const effectiveIsDowntime = is_downtime !== undefined ? !!is_downtime : !!logbook.is_downtime
    const effectiveQuickTag = quick_action_tag !== undefined ? quick_action_tag : logbook.quick_action_tag
    const effectiveMachineId = machine_id !== undefined ? machine_id : logbook.machine_id
    const effectiveSubMachineId = sub_machine_id !== undefined ? sub_machine_id : logbook.sub_machine_id
    const effectiveUnitQty = unit_repaired_qty !== undefined ? unit_repaired_qty : logbook.unit_repaired_qty
    const effectiveUnmapped = unmapped_asset_note !== undefined ? unmapped_asset_note : logbook.unmapped_asset_note

    let categoryValidation = { valid: true, data: {} }
    if (isV6Update) {
      categoryValidation = validateActivityCategory({
        activity_category: effectiveCategory,
        machine_id: effectiveMachineId,
        sub_machine_id: effectiveSubMachineId,
        quick_action_tag: effectiveQuickTag,
        unmapped_asset_note: effectiveUnmapped,
        unit_repaired_qty: effectiveUnitQty,
        is_downtime: effectiveIsDowntime,
        machine_end_status: machine_end_status !== undefined ? machine_end_status : logbook.machine_end_status,
        sparepart: sparepart !== undefined ? sparepart : logbook.sparepart,
        sparepart_items
      })
      if (!categoryValidation.valid) {
        return errorResponse(res, { message: categoryValidation.message, statusCode: 400 })
      }
    }

    const updateData = {}
    if (task_date) updateData.task_date = task_date
    if (start_time) updateData.start_time = start_time
    if (end_time) updateData.end_time = end_time
    if (sparepart !== undefined) updateData.sparepart = sparepart
    if (activity_description) updateData.activity_description = activity_description
    if (plant_id) updateData.plant_id = BigInt(plant_id)
    if (shift_id) updateData.shift_id = BigInt(shift_id)
    if (machine_id !== undefined) updateData.machine_id = machine_id ? BigInt(machine_id) : null
    if (sub_machine_id !== undefined) {
      updateData.sub_machine_id = sub_machine_id ? BigInt(sub_machine_id) : null
    }

    // ---- v6 Reliability fields (Bagian 4.1) ----
    updateData.activity_category = effectiveCategory
    updateData.maintenance_type = isV6Update
      ? categoryValidation.data.maintenance_type
      : deriveMaintenanceType({
          activity_category: effectiveCategory,
          is_downtime: effectiveIsDowntime,
          quick_action_tag: effectiveQuickTag
        })
    updateData.machine_end_status = isV6Update
      ? categoryValidation.data.machine_end_status
      : normalizeMachineEndStatus(effectiveCategory, machine_end_status || logbook.machine_end_status)
    if (quick_action_tag !== undefined) updateData.quick_action_tag = quick_action_tag
    if (failure_code_id !== undefined) {
      updateData.failure_code_id = failure_code_id ? BigInt(failure_code_id) : null
    }
    if (root_cause_notes !== undefined) updateData.root_cause_notes = root_cause_notes
    if (is_downtime !== undefined) updateData.is_downtime = !!is_downtime
    if (downtime_minutes !== undefined) {
      updateData.downtime_minutes = Number(downtime_minutes) > 0 ? Number(downtime_minutes) : 0
    }
    if (unit_repaired_qty !== undefined) {
      updateData.unit_repaired_qty = Number(unit_repaired_qty) >= 1 ? Math.floor(Number(unit_repaired_qty)) : null
    }
    if (unmapped_asset_note !== undefined) updateData.unmapped_asset_note = unmapped_asset_note

    const itemsProvided = Array.isArray(sparepart_items)
    const resolvedItems = itemsProvided ? resolveSparepartInput({ sparepart_items }).items : []
    if (itemsProvided) updateData.has_sparepart = resolvedItems.length > 0
    else if (has_sparepart !== undefined) updateData.has_sparepart = !!has_sparepart

    // Hitung ulang durasi jika start_time / end_time berubah
    const newStart = start_time || logbook.start_time
    const newEnd = end_time || logbook.end_time
    updateData.duration_minutes = calculateDurationMinutes(newStart, newEnd)

    if (status) {
      updateData.status = status === 'DRAFT' ? 'DRAFT' : 'PENDING'
    }

    // Update Logbook + ganti LogbookSparepart dalam SATU transaksi.
    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.logbook.update({
        where: { id: BigInt(id) },
        data: updateData
      })

      if (itemsProvided) {
        await tx.logbookSparepart.deleteMany({ where: { logbook_id: BigInt(id) } })
        if (resolvedItems.length > 0) {
          await tx.logbookSparepart.createMany({
            data: resolvedItems.map(item => ({
              logbook_id: BigInt(id),
              sparepart_id: BigInt(item.sparepart_id),
              qty_used: Number(item.qty_used)
            }))
          })
        }
      }

      return rec
    })

    await logActivity(
      req.user.id,
      'UPDATE_LOGBOOK',
      `Logbook #${id} berhasil diperbarui dengan status ${updated.status}`
    )

    // Jika diperbarui ke status PENDING, kirim notifikasi ke Teknisi, Supervisor, dan Admin
    if (updated.status === 'PENDING') {
      const fullUpdated = await prisma.logbook.findUnique({
        where: { id: BigInt(id) },
        include: { machine: true, plant: true, user: true }
      })

      if (fullUpdated) {
        const notifications = []

        // 1. Notifikasi Teknisi
        notifications.push({
          userId: req.user.id,
          logbookId: fullUpdated.id,
          type: 'LOGBOOK_SUBMITTED',
          recipientEmail: req.user.email,
          subject: `[Logbook Diperbarui] Logbook #${fullUpdated.id} (${fullUpdated.machine?.name || 'Mesin'})`,
          message: `Logbook #${fullUpdated.id} berhasil diperbarui dan diajukan ulang untuk persetujuan Supervisor.`,
          channel: 'INAPP'
        })

        // 2. Notifikasi Supervisor
        let supervisors = await prisma.user.findMany({
          where: {
            role: { name: 'Supervisor' },
            plant_id: fullUpdated.plant_id,
            is_active: true
          }
        })
        if (supervisors.length === 0) {
          supervisors = await prisma.user.findMany({
            where: { role: { name: 'Supervisor' }, is_active: true }
          })
        }
        for (const spv of supervisors) {
          notifications.push({
            userId: spv.id,
            logbookId: fullUpdated.id,
            type: 'LOGBOOK_PENDING_APPROVAL',
            recipientEmail: spv.email,
            subject: `[Pengajuan Ulang] Logbook #${fullUpdated.id} oleh ${fullUpdated.user?.full_name}`,
            message: `Teknisi ${fullUpdated.user?.full_name} telah memperbarui logbook #${fullUpdated.id} (${fullUpdated.machine?.name || 'Mesin'}). Silakan tinjau kembali di modul Approval.`,
            channel: 'INAPP'
          })
        }

        // 3. Notifikasi Admin
        const admins = await prisma.user.findMany({
          where: { role: { name: 'Admin' }, is_active: true }
        })
        for (const admin of admins) {
          notifications.push({
            userId: admin.id,
            logbookId: fullUpdated.id,
            type: 'LOGBOOK_SUBMITTED',
            recipientEmail: admin.email,
            subject: `[Sistem] Logbook #${fullUpdated.id} Diperbarui oleh ${fullUpdated.user?.full_name}`,
            message: `Teknisi ${fullUpdated.user?.full_name} telah mengajukan ulang logbook #${fullUpdated.id} (${fullUpdated.machine?.name || 'Mesin'}) ke status PENDING.`,
            channel: 'INAPP'
          })
        }

        // Eksekusi insert massal notifikasi
        await sendBulkNotifications(notifications)
      }
    }

    return successResponse(res, {
      message: 'Logbook berhasil diperbarui.',
      data: {
        ...updated,
        id: Number(updated.id),
        user_id: Number(updated.user_id),
        plant_id: Number(updated.plant_id),
        shift_id: Number(updated.shift_id),
        machine_id: updated.machine_id ? Number(updated.machine_id) : null,
        sub_machine_id: updated.sub_machine_id ? Number(updated.sub_machine_id) : null,
        failure_code_id: updated.failure_code_id ? Number(updated.failure_code_id) : null
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function deleteLogbook(req, res, next) {
  try {
    const { id } = req.params
    const logbook = await prisma.logbook.findUnique({
      where: { id: BigInt(id) }
    })

    if (!logbook) {
      return errorResponse(res, {
        message: 'Logbook tidak ditemukan.',
        statusCode: 404
      })
    }

    if (req.user.role === 'Teknisi' && Number(logbook.user_id) !== req.user.id) {
      return errorResponse(res, {
        message: 'Akses ditolak. Anda bukan pemilik logbook ini.',
        statusCode: 403
      })
    }

    if (logbook.status !== 'DRAFT') {
      return errorResponse(res, {
        message: 'Hanya logbook berstatus Draft yang dapat dihapus.',
        statusCode: 400
      })
    }

    await prisma.logbook.delete({
      where: { id: BigInt(id) }
    })

    await logActivity(req.user.id, 'DELETE_LOGBOOK', `Draft logbook #${id} dihapus`)

    return successResponse(res, {
      message: 'Draft logbook berhasil dihapus.'
    })
  } catch (err) {
    next(err)
  }
}

export async function submitAllDrafts(req, res, next) {
  try {
    const result = await prisma.logbook.updateMany({
      where: {
        user_id: BigInt(req.user.id),
        status: 'DRAFT'
      },
      data: {
        status: 'PENDING'
      }
    })

    await logActivity(
      req.user.id,
      'BULK_SUBMIT_DRAFTS',
      `${result.count} draft logbook diajukan serentak untuk approval`
    )

    // Kirim notifikasi jika ada draft yang diajukan (Fan-Out 1 Query createMany)
    if (result.count > 0) {
      const notifications = []

      // 1. Notifikasi Teknisi (konfirmasi)
      notifications.push({
        userId: req.user.id,
        type: 'DRAFTS_SUBMITTED',
        recipientEmail: req.user.email,
        subject: `[Draft Terkirim] ${result.count} Logbook Berhasil Diajukan`,
        message: `Sebanyak ${result.count} draft logbook Anda telah berhasil diajukan serentak dan sedang menunggu persetujuan Supervisor.`,
        channel: 'INAPP'
      })

      // 2. Notifikasi Supervisor
      let supervisors = []
      if (req.user.plant_id) {
        supervisors = await prisma.user.findMany({
          where: {
            role: { name: 'Supervisor' },
            plant_id: BigInt(req.user.plant_id),
            is_active: true
          }
        })
      }
      if (supervisors.length === 0) {
        supervisors = await prisma.user.findMany({
          where: { role: { name: 'Supervisor' }, is_active: true }
        })
      }
      for (const spv of supervisors) {
        notifications.push({
          userId: spv.id,
          type: 'BULK_DRAFTS_SUBMITTED',
          recipientEmail: spv.email,
          subject: `[Menunggu Approval] ${result.count} Logbook dari ${req.user.full_name}`,
          message: `Teknisi ${req.user.full_name} telah mengajukan ${result.count} draft logbook secara serentak untuk ditinjau.`,
          channel: 'INAPP'
        })
      }

      // 3. Notifikasi Admin
      const admins = await prisma.user.findMany({
        where: { role: { name: 'Admin' }, is_active: true }
      })
      for (const admin of admins) {
        notifications.push({
          userId: admin.id,
          type: 'BULK_DRAFTS_SUBMITTED',
          recipientEmail: admin.email,
          subject: `[Sistem] ${result.count} Draft Diajukan oleh ${req.user.full_name}`,
          message: `Teknisi ${req.user.full_name} telah mengajukan serentak ${result.count} draft logbook ke status PENDING.`,
          channel: 'INAPP'
        })
      }

      await sendBulkNotifications(notifications)
    }

    return successResponse(res, {
      message: `${result.count} draft logbook berhasil diajukan untuk approval.`,
      data: { submitted_count: result.count }
    })
  } catch (err) {
    next(err)
  }
}
