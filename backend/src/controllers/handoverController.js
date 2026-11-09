import prisma from '../config/prisma.js'
import { successResponse } from '../utils/response.js'
import { resolveHandoverPlantScope } from '../utils/handoverScope.js'

// Status akhir mesin yang dianggap "menggantung" untuk serah-terima shift
const HANDOVER_STATUSES = ['WAITING_SPAREPART', 'TEMPORARY_FIX']
// Batas usia log (hari) supaya tidak menampilkan hal-hal kuno yang sudah pasti selesai
const DEFAULT_LOOKBACK_DAYS = 30
// Hanya log yang sudah diajukan/di-approve yang relevan untuk handover
const ELIGIBLE_LOG_STATUSES = ['PENDING', 'APPROVED']

const CRITICALITY_ORDER = { A_CRITICAL: 0, B_ESSENTIAL: 1, C_GENERAL: 2 }

/**
 * GET /api/v1/handover
 * Menampilkan mesin dengan status akhir WAITING_SPAREPART / TEMPORARY_FIX
 * dari log TERBARU per mesin (mengabaikan log lama yang sudah di-resolve).
 *
 * Query params:
 *  - status_filter=WAITING_SPAREPART,TEMPORARY_FIX  (opsional, comma separated)
 *  - plant_id=<id|ALL>                              (HANYA Admin; Supervisor dikunci ke Line-nya)
 *  - days=<1..90>                                   (default 30)
 *  - limit=<1..100>                                 (default 50)
 *
 * RBAC (F3.3 & BUG-001): Teknisi & Supervisor selalu ter-scope ke `plant_id` di JWT
 * (tidak bisa di-override lewat query string). Admin bebas filter / lintas Line.
 */
export async function getHandoverBoard(req, res, next) {
  try {
    // F4.1b: Supervisor TIDAK boleh lintas Line. Scope dikunci ke plant_id JWT miliknya
    // (spesifikasi F3.3: "RBAC: teknisi/SPV Line sendiri; admin semua").
    // Hanya Admin yang boleh meng-override plant_id lewat query, termasuk 'ALL'.
    const { plantId, isAdmin } = resolveHandoverPlantScope(req.user, req.query)

    // Teknisi & Supervisor wajib punya plant; kalau tidak ada, kembalikan kosong (bukan error)
    if (!isAdmin && !plantId) {
      return successResponse(res, {
        message: 'Akun Anda belum ditugaskan ke plant mana pun.',
        data: [],
        meta: { total: 0, lookback_days: DEFAULT_LOOKBACK_DAYS, statuses: HANDOVER_STATUSES }
      })
    }

    // ---- Parsing filter ----
    const daysNum = Math.min(90, Math.max(1, Number(req.query.days) || DEFAULT_LOOKBACK_DAYS))
    const limitNum = Math.min(100, Math.max(1, Number(req.query.limit) || 50))

    const lookbackDate = new Date()
    lookbackDate.setDate(lookbackDate.getDate() - daysNum)
    const lookbackDateStr = lookbackDate.toISOString().slice(0, 10)

    const rawStatuses = req.query.status_filter
      ? String(req.query.status_filter).split(',').map(s => s.trim()).filter(Boolean)
      : HANDOVER_STATUSES
    const validStatuses = rawStatuses.filter(s => HANDOVER_STATUSES.includes(s))
    const finalStatuses = validStatuses.length > 0 ? validStatuses : HANDOVER_STATUSES

    // ---- Query ----
    const where = {
      status: { in: ELIGIBLE_LOG_STATUSES },
      machine_id: { not: null },
      task_date: { gte: lookbackDateStr }
    }
    if (plantId) where.plant_id = BigInt(plantId)

    const allRecentLogs = await prisma.logbook.findMany({
      where,
      orderBy: [
        { task_date: 'desc' },
        { start_time: 'desc' },
        { created_at: 'desc' }
      ],
      include: {
        user: { select: { id: true, nik: true, full_name: true, photo_url: true } },
        machine: { select: { id: true, name: true, criticality: true } },
        subMachine: { select: { id: true, name: true } },
        shift: { select: { id: true, name: true, start_time: true, end_time: true } },
        plant: { select: { id: true, name: true } },
        failureCode: { select: { id: true, code: true, name: true, category: true } },
        sparepartUsages: {
          include: { sparepart: { select: { part_code: true, part_name: true, unit: true } } }
        }
      }
    })

    // ---- Deduplikasi: log TERBARU per machine_id ----
    const latestByMachine = new Map()
    for (const log of allRecentLogs) {
      const key = String(log.machine_id)
      if (!latestByMachine.has(key)) latestByMachine.set(key, log)
    }

    // ---- Filter status akhir + sort (criticality, lalu tanggal terbaru) ----
    const handoverItems = Array.from(latestByMachine.values())
      .filter(log => finalStatuses.includes(log.machine_end_status))
      .sort((a, b) => {
        const ca = CRITICALITY_ORDER[a.machine?.criticality] ?? 99
        const cb = CRITICALITY_ORDER[b.machine?.criticality] ?? 99
        if (ca !== cb) return ca - cb
        if (a.task_date !== b.task_date) return a.task_date < b.task_date ? 1 : -1
        return (a.start_time < b.start_time) ? 1 : -1
      })
      .slice(0, limitNum)
      .map(formatHandoverItem)

    return successResponse(res, {
      message: 'Papan serah-terima berhasil diambil.',
      data: handoverItems,
      meta: {
        total: handoverItems.length,
        lookback_days: daysNum,
        statuses: finalStatuses,
        plant_id: plantId ? Number(plantId) : null,
        generated_at: new Date().toISOString()
      }
    })
  } catch (err) {
    next(err)
  }
}

function formatHandoverItem(log) {
  return {
    id: Number(log.id),
    machine_id: log.machine_id ? Number(log.machine_id) : null,
    machine_name: log.machine?.name || null,
    machine_criticality: log.machine?.criticality || null,
    sub_machine_id: log.sub_machine_id ? Number(log.sub_machine_id) : null,
    sub_machine_name: log.subMachine?.name || null,

    user_id: Number(log.user_id),
    user_name: log.user?.full_name || null,
    user_nik: log.user?.nik || null,
    user_photo: log.user?.photo_url || null,

    plant_id: Number(log.plant_id),
    plant_name: log.plant?.name || null,

    shift_id: Number(log.shift_id),
    shift_name: log.shift?.name || null,
    shift_start: log.shift?.start_time || null,
    shift_end: log.shift?.end_time || null,

    task_date: log.task_date,
    start_time: log.start_time,
    end_time: log.end_time,
    duration_minutes: log.duration_minutes,

    activity_category: log.activity_category,
    activity_description: log.activity_description,
    quick_action_tag: log.quick_action_tag || null,
    machine_end_status: log.machine_end_status,
    maintenance_type: log.maintenance_type || null,
    root_cause_notes: log.root_cause_notes || null,
    is_downtime: !!log.is_downtime,
    downtime_minutes: log.downtime_minutes || 0,

    sparepart: log.sparepart || null,
    has_sparepart: !!log.has_sparepart,
    failure_code: log.failureCode
      ? {
          id: Number(log.failureCode.id),
          code: log.failureCode.code,
          name: log.failureCode.name,
          category: log.failureCode.category
        }
      : null,
    spareparts: (log.sparepartUsages || []).map(s => ({
      id: Number(s.id),
      sparepart_id: Number(s.sparepart_id),
      part_code: s.sparepart?.part_code || null,
      part_name: s.sparepart?.part_name || null,
      qty_used: Number(s.qty_used),
      unit: s.sparepart?.unit || null
    })),

    status: log.status,
    created_at: log.created_at
  }
}