import prisma from '../config/prisma.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { getWIBDateString } from '../utils/date.js'

// F3.4 "Buku Pintar Mesin" — rekam medis mesin (timeline, top failure code, top sparepart).
// Hanya log yang sudah diajukan/disetujui yang dianggap sah sebagai riwayat (DRAFT & REJECTED tidak dihitung).
const ELIGIBLE_LOG_STATUSES = ['PENDING', 'APPROVED']

// Opsi rentang periode yang diizinkan (hari)
const PERIOD_OPTIONS = [30, 90, 180, 365]
const DEFAULT_PERIOD = 180

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

// Jumlah baris teratas untuk agregat failure code & sparepart
const TOP_LIMIT = 5

// Peran yang dibatasi ke plant-nya sendiri
const PLANT_SCOPED_ROLES = ['Teknisi', 'Supervisor']

// Sub-status "tidak normal" yang membuat mesin ditandai (is_flagged) pada kartu status
const FLAGGED_END_STATUSES = ['WAITING_SPAREPART', 'TEMPORARY_FIX', 'MONITORING_NEEDED']

/**
 * GET /api/v1/machines/:id/history
 * Rekam medis satu mesin: profil ringkas, status terkini, statistik periode,
 * timeline logbook (paginated), top failure code, dan top sparepart.
 *
 * Query params:
 *  - period=30|90|180|365   (default 180)
 *  - page=<>=1              (default 1)
 *  - page_size=<1..100>     (default 20)
 */
export async function getMachineHistory(req, res, next) {
  try {
    // ---- Validasi parameter path ----
    const machineId = Number(req.params.id)
    if (!Number.isInteger(machineId) || machineId <= 0) {
      return errorResponse(res, {
        message: 'ID mesin tidak valid.',
        statusCode: 400
      })
    }

    // ---- Validasi & normalisasi query params ----
    const periodNum = PERIOD_OPTIONS.includes(Number(req.query.period))
      ? Number(req.query.period)
      : DEFAULT_PERIOD

    const pageNum = Math.max(1, Number(req.query.page) || 1)
    const pageSizeNum = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(req.query.page_size) || DEFAULT_PAGE_SIZE)
    )
    const skip = (pageNum - 1) * pageSizeNum

    // ---- Ambil mesin + plant + sub-mesin ----
    const machine = await prisma.machine.findUnique({
      where: { id: BigInt(machineId) },
      include: {
        plant: { select: { id: true, name: true } },
        subMachines: { select: { id: true, name: true } }
      }
    })

    if (!machine) {
      return errorResponse(res, {
        message: 'Mesin tidak ditemukan',
        statusCode: 404
      })
    }

    // ---- RBAC: Teknisi & Supervisor terbatas pada plant sendiri ----
    if (PLANT_SCOPED_ROLES.includes(req.user?.role)) {
      const userPlantId = req.user.plant_id ? Number(req.user.plant_id) : null
      const machinePlantId = machine.plant_id ? Number(machine.plant_id) : null
      if (userPlantId === null || machinePlantId === null || machinePlantId !== userPlantId) {
        return errorResponse(res, {
          message: 'Anda tidak memiliki akses ke mesin ini',
          statusCode: 403
        })
      }
    }

    // ---- Rentang periode (WIB, format YYYY-MM-DD pada kolom task_date) ----
    const todayStr = getWIBDateString()
    const [ty, tm, td] = todayStr.split('-').map(Number)
    const startDate = new Date(Date.UTC(ty, tm - 1, td - periodNum))
    const startDateStr = startDate.toISOString().slice(0, 10)

    const where = {
      machine_id: machine.id,
      task_date: { gte: startDateStr },
      status: { in: ELIGIBLE_LOG_STATUSES }
    }

    // ---- Query paralel: total, halaman timeline, seluruh log periode (untuk statistik) ----
    const [total, pagedLogs, logs] = await Promise.all([
      prisma.logbook.count({ where }),
      prisma.logbook.findMany({
        where,
        skip,
        take: pageSizeNum,
        orderBy: [
          { task_date: 'desc' },
          { start_time: 'desc' },
          { id: 'desc' }
        ],
        include: {
          user: { select: { id: true, nik: true, full_name: true } },
          shift: { select: { id: true, name: true } },
          subMachine: { select: { id: true, name: true } },
          failureCode: { select: { code: true, name: true, category: true } },
          sparepartUsages: {
            include: { sparepart: { select: { part_code: true, part_name: true, unit: true } } }
          }
        }
      }),
      // Data agregat/statistik: kolom minimal agar tetap ringan pada volume 10k+ log
      prisma.logbook.findMany({
        where,
        orderBy: [
          { task_date: 'desc' },
          { start_time: 'desc' },
          { id: 'desc' }
        ],
        select: {
          id: true,
          task_date: true,
          start_time: true,
          activity_category: true,
          machine_end_status: true,
          duration_minutes: true,
          downtime_minutes: true,
          failure_code_id: true,
          failureCode: { select: { code: true, name: true, category: true } },
          sparepartUsages: {
            select: {
              sparepart_id: true,
              qty_used: true,
              sparepart: { select: { part_code: true, part_name: true, unit: true } }
            }
          }
        }
      })
    ])

    // ---- Statistik periode ----
    const stats = {
      total_logs: 0,
      total_downtime_minutes: 0,
      total_repair_minutes: 0,
      breakdown_count: 0,
      preventive_count: 0
    }

    for (const log of logs) {
      stats.total_logs += 1
      stats.total_downtime_minutes += Number(log.downtime_minutes) || 0
      stats.total_repair_minutes += Number(log.duration_minutes) || 0
      if (log.activity_category === 'MACHINE_TROUBLE') stats.breakdown_count += 1
      if (log.activity_category === 'PREVENTIVE_PM') stats.preventive_count += 1
    }

    // ---- Status terkini: log terbaru (PENDING/APPROVED) dalam periode ----
    const latestLog = logs[0] || null
    const currentStatus = {
      machine_end_status: latestLog ? latestLog.machine_end_status : 'NORMAL_RESOLVED',
      last_log_date: latestLog ? latestLog.task_date : null,
      is_flagged: latestLog ? FLAGGED_END_STATUSES.includes(latestLog.machine_end_status) : false
    }

    return successResponse(res, {
      message: 'Riwayat mesin berhasil diambil.',
      data: {
        machine: {
          id: Number(machine.id),
          name: machine.name,
          criticality: machine.criticality,
          plant_id: machine.plant_id ? Number(machine.plant_id) : null,
          plant_name: machine.plant?.name || null,
          sub_machine_count: (machine.subMachines || []).length
        },
        current_status: currentStatus,
        stats,
        timeline: pagedLogs.map(formatTimelineItem),
        top_failure_codes: buildTopFailureCodes(logs),
        top_spareparts: buildTopSpareparts(logs)
      },
      meta: {
        page: pageNum,
        page_size: pageSizeNum,
        total,
        total_pages: Math.ceil(total / pageSizeNum),
        period_days: periodNum,
        period_start: startDateStr,
        period_end: todayStr,
        machine_id: Number(machine.id)
      }
    })
  } catch (err) {
    next(err)
  }
}

function formatTimelineItem(log) {
  return {
    id: Number(log.id),
    task_date: log.task_date,
    start_time: log.start_time,
    end_time: log.end_time,
    duration_minutes: log.duration_minutes,
    user_name: log.user?.full_name || null,
    user_nik: log.user?.nik || null,
    shift_name: log.shift?.name || null,
    sub_machine_name: log.subMachine?.name || null,
    activity_category: log.activity_category,
    quick_action_tag: log.quick_action_tag || null,
    machine_end_status: log.machine_end_status,
    maintenance_type: log.maintenance_type || null,
    activity_description: log.activity_description,
    downtime_minutes: log.downtime_minutes || 0,
    is_downtime: !!log.is_downtime,
    status: log.status,
    failure_code: log.failureCode
      ? { code: log.failureCode.code, name: log.failureCode.name }
      : null,
    spareparts: (log.sparepartUsages || []).map(s => ({
      part_code: s.sparepart?.part_code || null,
      part_name: s.sparepart?.part_name || null,
      qty_used: Number(s.qty_used),
      unit: s.sparepart?.unit || null
    }))
  }
}

/**
 * Top failure code pada periode: diurutkan berdasarkan frekuensi lalu downtime.
 * Kejadian tanpa kode kerusakan tetap dihitung pada statistik, hanya tidak masuk ranking.
 */
function buildTopFailureCodes(logs) {
  const map = new Map()

  for (const log of logs) {
    if (!log.failureCode) continue
    const key = log.failureCode.code
    if (!map.has(key)) {
      map.set(key, {
        code: log.failureCode.code,
        name: log.failureCode.name,
        category: log.failureCode.category,
        count: 0,
        total_downtime_minutes: 0
      })
    }
    const entry = map.get(key)
    entry.count += 1
    entry.total_downtime_minutes += Number(log.downtime_minutes) || 0
  }

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || b.total_downtime_minutes - a.total_downtime_minutes)
    .slice(0, TOP_LIMIT)
}

/**
 * Top sparepart pada periode: total qty terpakai & jumlah logbook yang memakainya.
 */
function buildTopSpareparts(logs) {
  const map = new Map()

  for (const log of logs) {
    for (const usage of log.sparepartUsages || []) {
      const key = usage.sparepart?.part_code || `ID-${Number(usage.sparepart_id)}`
      if (!map.has(key)) {
        map.set(key, {
          part_code: usage.sparepart?.part_code || null,
          part_name: usage.sparepart?.part_name || null,
          unit: usage.sparepart?.unit || null,
          total_qty: 0,
          usage_count: 0
        })
      }
      const entry = map.get(key)
      entry.total_qty += Number(usage.qty_used) || 0
      entry.usage_count += 1
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.total_qty - a.total_qty || b.usage_count - a.usage_count)
    .slice(0, TOP_LIMIT)
}
