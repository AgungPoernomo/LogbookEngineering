import ExcelJS from 'exceljs'
import prisma from '../config/prisma.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { logActivity } from '../services/auditService.js'

export async function exportReport(req, res, next) {
  try {
    const {
      start_date,
      end_date,
      plant_id,
      machine_id,
      status,
      format = 'excel'
    } = req.query

    const where = {}

    if (plant_id) where.plant_id = BigInt(plant_id)
    if (machine_id) where.machine_id = BigInt(machine_id)
    if (status && status !== 'ALL') where.status = status

    if (start_date || end_date) {
      where.task_date = {}
      if (start_date) where.task_date.gte = start_date
      if (end_date) where.task_date.lte = end_date
    }

    const logbooks = await prisma.logbook.findMany({
      where,
      orderBy: [{ task_date: 'desc' }, { start_time: 'desc' }],
      include: {
        user: { select: { full_name: true, nik: true, group: { select: { name: true } } } },
        plant: { select: { name: true } },
        shift: { select: { name: true } },
        machine: { select: { name: true } },
        subMachine: { select: { name: true } },
        approvals: {
          take: 1,
          orderBy: { reviewed_at: 'desc' },
          include: { supervisor: { select: { full_name: true } } }
        }
      }
    })

    await logActivity(
      req.user.id,
      'EXPORT_REPORT',
      `Pengguna mengekspor laporan logbook (${logbooks.length} entri) dalam format ${format}`
    )

    if (format === 'json') {
      const data = logbooks.map(l => ({
        id: Number(l.id),
        tanggal: l.task_date,
        teknisi: l.user?.full_name,
        nik: l.user?.nik,
        grup: l.user?.group?.name || '-',
        plant: l.plant?.name,
        shift: l.shift?.name,
        mesin: l.machine?.name,
        sub_mesin: l.subMachine?.name || '-',
        suku_cadang: l.sparepart || '-',
        uraian_pekerjaan: l.activity_description,
        jam_mulai: l.start_time,
        jam_selesai: l.end_time,
        durasi_menit: l.duration_minutes,
        status: l.status,
        supervisor: l.approvals[0]?.supervisor?.full_name || '-',
        catatan_approval: l.approvals[0]?.notes || '-'
      }))
      return successResponse(res, { data, meta: { total: data.length } })
    }

    // Format Excel (.xlsx) menggunakan ExcelJS
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Satoria Engineering Pharma'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Rekap Logbook Engineering')

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Tanggal', key: 'tanggal', width: 14 },
      { header: 'Nama Teknisi', key: 'teknisi', width: 22 },
      { header: 'NIK', key: 'nik', width: 14 },
      { header: 'Grup / Dept', key: 'grup', width: 18 },
      { header: 'Plant', key: 'plant', width: 12 },
      { header: 'Shift', key: 'shift', width: 12 },
      { header: 'Mesin', key: 'mesin', width: 20 },
      { header: 'Bagian / Sub-Mesin', key: 'sub_mesin', width: 20 },
      { header: 'Suku Cadang', key: 'suku_cadang', width: 18 },
      { header: 'Jam Mulai', key: 'mulai', width: 12 },
      { header: 'Jam Selesai', key: 'selesai', width: 12 },
      { header: 'Durasi (Menit)', key: 'durasi', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Supervisor Reviewer', key: 'supervisor', width: 22 },
      { header: 'Catatan Persetujuan', key: 'notes', width: 30 },
      { header: 'Uraian Aktivitas Pekerjaan', key: 'deskripsi', width: 45 }
    ]

    // Style Header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }
    }
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

    logbooks.forEach((l, idx) => {
      worksheet.addRow({
        no: idx + 1,
        tanggal: l.task_date,
        teknisi: l.user?.full_name,
        nik: l.user?.nik,
        grup: l.user?.group?.name || '-',
        plant: l.plant?.name,
        shift: l.shift?.name,
        mesin: l.machine?.name,
        sub_mesin: l.subMachine?.name || '-',
        suku_cadang: l.sparepart || '-',
        mulai: l.start_time,
        selesai: l.end_time,
        durasi: l.duration_minutes,
        status: l.status,
        supervisor: l.approvals[0]?.supervisor?.full_name || '-',
        notes: l.approvals[0]?.notes || '-',
        deskripsi: l.activity_description
      })
    })

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Laporan-Logbook-Satoria-${Date.now()}.xlsx"`
    )

    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    next(err)
  }
}
