import prisma from '../config/prisma.js'
import { successResponse } from '../utils/response.js'
import { getWIBYearMonth } from '../utils/date.js'
import {
  PARETO_DEFAULT_LIMIT,
  PARETO_MAX_LIMIT,
  minutesToHours,
  buildParetoRows,
  buildSkillMatrix,
  buildParetoSummary,
  toNumber
} from '../services/reliabilityAnalyticsService.js'

/**
 * FASE 4.4 — Pareto Bad Actor & Skill Matrix (Supervisor / Admin).
 *
 * Prinsip desain:
 *  1. SELURUH agregasi dilakukan di database (`prisma.groupBy`), bukan dengan
 *     menarik seluruh baris logbook ke memori Node.js.
 *  2. Mesin "bad actor" = penyumbang downtime terbesar, bukan mesin yang
 *     teknisinya paling sering login (P1: bukan alat penilaian orang).
 *  3. Skill Matrix hanya memetakan keahlian (siapa paling tahu mesin X), tanpa
 *     skor / ranking. Daftar diurut abjad nama.
 *
 * Sumber data: logbook berstatus PENDING & APPROVED (DRAFT/REJECTED tidak
 * dihitung agar draf yang belum sah tidak mencemari statistik — konsisten dengan
 * Buku Pintar Mesin F3.4).
 */

// Status logbook yang dianggap sah sebagai riwayat keandalan.
const ELIGIBLE_LOG_STATUSES = ['PENDING', 'APPROVED']

// Kategori aktivitas yang merepresentasikan "kerusakan/trouble mesin" —
// dasar Pareto mesin agar PM rutin tidak dianggap sebagai gangguan.
const FAILURE_ACTIVITY_CATEGORIES = ['MACHINE_TROUBLE']

// Batas atas baris Skill Matrix (supervisor satu plant biasanya < 50 teknisi).
const SKILL_MATRIX_MAX_ROWS = 200

/**
 * Memvalidasi & menormalkan filter `year_month` (format YYYY-MM).
 * Nilai kosong / tidak valid jatuh ke bulan berjalan WIB (bukan filter sampah).
 *
 * @param {unknown} raw
 * @returns {string} 'YYYY-MM'
 */
function normalizeYearMonth(raw) {
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed)) return trimmed
  }
  return getWIBYearMonth()
}

/**
 * Rentang leksikografis kolom `task_date` (VARCHAR 'YYYY-MM-DD') untuk satu bulan.
 * Memakai pola `gte/bte` yang sudah dipakai `overviewController` agar baris
 * legacy bertanggal rusak (mis. 'pengamatan') otomatis tersaring.
 *
 * @param {string} yearMonth
 * @returns {{ gte: string, lte: string }}
 */
function taskDateRange(yearMonth) {
  return { gte: `${yearMonth}-00`, lte: `${yearMonth}-99` }
}

/**
 * Menentukan scope plant:
 *  - Supervisor : SELALU dikunci ke plant pada JWT (tidak bisa melihat plant lain).
 *  - Admin      : boleh memilih `plant_id` lewat query; tanpa query = semua plant.
 *
 * @param {{ role?: string, plant_id?: number|string|null }} user
 * @param {unknown} requestedPlantId
 * @returns {{ where: object, plantId: number|null, isScoped: boolean }}
 */
function resolvePlantScope(user, requestedPlantId) {
  const isSupervisor = String(user?.role || '').toLowerCase() === 'supervisor'
  const userPlantId = user?.plant_id !== null && user?.plant_id !== undefined
    ? Number(user.plant_id)
    : null

  if (isSupervisor) {
    return {
      where: Number.isFinite(userPlantId) && userPlantId > 0
        ? { plant_id: BigInt(userPlantId) }
        : {},
      plantId: Number.isFinite(userPlantId) && userPlantId > 0 ? userPlantId : null,
      isScoped: true
    }
  }

  const requested = Number(requestedPlantId)
  if (Number.isFinite(requested) && requested > 0) {
    return { where: { plant_id: BigInt(requested) }, plantId: requested, isScoped: false }
  }

  return { where: {}, plantId: null, isScoped: false }
}

/**
 * Alias field hasil `groupBy` Prisma agar netral terhadap nama kolom model.
 */
function groupRows(rows, { keyField, idField, extra = {} } = {}) {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => ({
    key: Number(row[keyField]),
    id: row[idField] !== null && row[idField] !== undefined ? Number(row[idField]) : null,
    count: toNumber(row?._count?.id ?? row?.count),
    ...Object.fromEntries(
      Object.entries(extra).map(([target, source]) => [target, toNumber(row?._sum?.[source])])
    )
  }))
}

/**
 * GET /api/v1/supervisor/reliability-analytics
 *
 * Query params:
 *  - year_month=YYYY-MM   (default: bulan berjalan WIB)
 *  - plant_id=<id>        (Admin saja; Supervisor selalu terkunci ke plant JWT)
 *  - limit=<1..100>       (default 15) jumlah baris Pareto mesin & failure code
 *
 * Respons `data`:
 *  - filters      : { year_month, plant_id, plant_name, limit, period_start, period_end }
 *  - summary      : ringkasan konsentrasi 80/20 (total downtime, breakdown, dst)
 *  - machine_pareto : [{ rank, machine_id, name, breakdown_count, downtime_minutes,
 *                        downtime_hours, percent, cumulative_percent, is_vital_few }]
 *  - failure_pareto : [{ rank, failure_code_id, code, name, category, count,
 *                        downtime_minutes, downtime_hours, percent, cumulative_percent, is_vital_few }]
 *  - skill_matrix   : [{ user_id, full_name, machine_name, failure_code, failure_name,
 *                        confidence, ... }]
 *  - notes          : penjelasan P1 (bukan penilaian kinerja)
 */
export async function getReliabilityAnalytics(req, res, next) {
  try {
    // ---- 1. Normalisasi filter ----
    const yearMonth = normalizeYearMonth(
      req.query.year_month ?? req.query.yearMonth ?? req.query.month
    )
    const scope = resolvePlantScope(req.user, req.query.plant_id ?? req.query.plantId)

    const requestedLimit = Number(req.query.limit)
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(PARETO_MAX_LIMIT, Math.floor(requestedLimit))
      : PARETO_DEFAULT_LIMIT

    // ---- 2. Where dasar: plant scope + bulan + status sah ----
    const baseWhere = {
      ...scope.where,
      task_date: taskDateRange(yearMonth),
      status: { in: ELIGIBLE_LOG_STATUSES }
    }

    // ---- 3. Agregasi paralel di database (tanpa N+1) ----
    const [
      machineGroups,
      failureCodeGroups,
      machineAggregate,
      failureAggregate,
      skillMachineGroups,
      skillFailureGroups
    ] = await Promise.all([
      // A. Pareto mesin: total downtime & jumlah breakdown per machine_id
      prisma.logbook.groupBy({
        by: ['machine_id'],
        where: {
          ...baseWhere,
          machine_id: { not: null },
          activity_category: { in: FAILURE_ACTIVITY_CATEGORIES }
        },
        _count: { id: true },
        _sum: { downtime_minutes: true }
      }),

      // B. Pareto failure code: jumlah kemunculan per failure_code_id
      prisma.logbook.groupBy({
        by: ['failure_code_id'],
        where: { ...baseWhere, failure_code_id: { not: null } },
        _count: { id: true },
        _sum: { downtime_minutes: true }
      }),

      // Total downtime & breakdown seluruh scope (untuk ringkasan)
      prisma.logbook.aggregate({
        where: baseWhere,
        _sum: { downtime_minutes: true },
        _count: { id: true }
      }),

      // Breakdown murni (maintenance_type = BREAKDOWN)
      prisma.logbook.count({
        where: { ...baseWhere, maintenance_type: 'BREAKDOWN' }
      }),

      // C1. Skill Matrix — pasangan (user, mesin) pada aktivitas perbaikan
      prisma.logbook.groupBy({
        by: ['user_id', 'machine_id'],
        where: {
          ...baseWhere,
          machine_id: { not: null },
          activity_category: { in: FAILURE_ACTIVITY_CATEGORIES }
        },
        _count: { id: true }
      }),

      // C2. Skill Matrix — pasangan (user, failure code)
      prisma.logbook.groupBy({
        by: ['user_id', 'failure_code_id'],
        where: {
          ...baseWhere,
          failure_code_id: { not: null },
          activity_category: { in: FAILURE_ACTIVITY_CATEGORIES }
        },
        _count: { id: true }
      })
    ])

    // ---- 4. Bentuk baris agregasi menjadi struktur netral ----
    const machineRows = groupRows(machineGroups, {
      keyField: 'machine_id',
      idField: 'machine_id',
      extra: { downtime_minutes: 'downtime_minutes' }
    })
    const failureRows = groupRows(failureCodeGroups, {
      keyField: 'failure_code_id',
      idField: 'failure_code_id',
      extra: { downtime_minutes: 'downtime_minutes' }
    })

    // ---- 5. Peta nama (batch, tanpa N+1) ----
    const machineIds = [
      ...new Set([
        ...machineRows.map((r) => r.id),
        ...skillMachineGroups.map((r) => Number(r.machine_id))
      ])
    ].filter((id) => Number.isFinite(id) && id > 0)

    const failureIds = [
      ...new Set([
        ...failureRows.map((r) => r.id),
        ...skillFailureGroups.map((r) => Number(r.failure_code_id))
      ])
    ].filter((id) => Number.isFinite(id) && id > 0)

    const skillUserIds = [
      ...new Set([
        ...skillMachineGroups.map((r) => Number(r.user_id)),
        ...skillFailureGroups.map((r) => Number(r.user_id))
      ])
    ].filter((id) => Number.isFinite(id) && id > 0)

    const [machines, failureCodes, users, plant] = await Promise.all([
      machineIds.length
        ? prisma.machine.findMany({
          where: { id: { in: machineIds.map((id) => BigInt(id)) } },
          select: { id: true, name: true, plant_id: true, criticality: true }
        })
        : Promise.resolve([]),
      failureIds.length
        ? prisma.failureCode.findMany({
          where: { id: { in: failureIds.map((id) => BigInt(id)) } },
          select: { id: true, code: true, name: true, category: true }
        })
        : Promise.resolve([]),
      skillUserIds.length
        ? prisma.user.findMany({
          where: { id: { in: skillUserIds.map((id) => BigInt(id)) } },
          select: {
            id: true,
            full_name: true,
            nik: true,
            photo_url: true,
            plant: { select: { name: true } },
            group: { select: { name: true } }
          }
        })
        : Promise.resolve([]),
      scope.plantId
        ? prisma.plant.findUnique({
          where: { id: BigInt(scope.plantId) },
          select: { id: true, name: true }
        })
        : Promise.resolve(null)
    ])

    const machineMap = new Map(
      machines.map((m) => [Number(m.id), {
        name: m.name,
        plant_id: m.plant_id ? Number(m.plant_id) : null,
        criticality: m.criticality || 'B_ESSENTIAL'
      }])
    )
    const machineNameMap = new Map(machines.map((m) => [Number(m.id), m.name]))
    const failureCodeMap = new Map(
      failureCodes.map((f) => [Number(f.id), { code: f.code, name: f.name, category: f.category }])
    )
    const userMap = new Map(
      users.map((u) => [Number(u.id), {
        full_name: u.full_name,
        nik: u.nik,
        photo_url: u.photo_url || null,
        plant_name: u.plant?.name || null,
        group_name: u.group?.name || null
      }])
    )

    // ---- 6. Pareto mesin: prioritas berdasarkan DOWNTIME (jam mesin berhenti) ----
    // Mesin dengan downtime sama dipecah berdasarkan jumlah breakdown, lalu id.
    const machineRanked = [...machineRows].sort((a, b) => (
      b.downtime_minutes - a.downtime_minutes ||
      b.count - a.count ||
      (a.id ?? 0) - (b.id ?? 0)
    ))
    const machinePareto = buildParetoRows(
      machineRanked.map((row) => ({ ...row, value: row.downtime_minutes }))
    )
      .slice(0, limit)
      .map((row) => ({
        rank: row.rank,
        machine_id: row.id,
        name: machineMap.get(row.id)?.name || `Mesin #${row.id}`,
        criticality: machineMap.get(row.id)?.criticality || 'B_ESSENTIAL',
        breakdown_count: toNumber(row.count),
        downtime_minutes: toNumber(row.downtime_minutes),
        downtime_hours: minutesToHours(row.downtime_minutes),
        percent: row.percent,
        cumulative_percent: row.cumulative_percent,
        is_vital_few: row.is_vital_few
      }))

    // ---- 7. Pareto failure code: prioritas berdasarkan FREKUENSI kemunculan ----
    const failureRanked = [...failureRows].sort((a, b) => (
      b.count - a.count ||
      b.downtime_minutes - a.downtime_minutes ||
      (a.id ?? 0) - (b.id ?? 0)
    ))
    const failurePareto = buildParetoRows(
      failureRanked.map((row) => ({ ...row, value: row.count }))
    )
      .slice(0, limit)
      .map((row) => {
        const meta = failureCodeMap.get(row.id) || {}
        return {
          rank: row.rank,
          failure_code_id: row.id,
          code: meta.code || null,
          name: meta.name || `Kode #${row.id}`,
          category: meta.category || null,
          count: toNumber(row.count),
          downtime_minutes: toNumber(row.downtime_minutes),
          downtime_hours: minutesToHours(row.downtime_minutes),
          percent: row.percent,
          cumulative_percent: row.cumulative_percent,
          is_vital_few: row.is_vital_few
        }
      })

    // ---- 8. Skill Matrix: Top-1 mesin & Top-1 failure code per teknisi ----
    const skillMatrix = buildSkillMatrix({
      topMachineRows: skillMachineGroups.map((row) => ({
        key: Number(row.user_id),
        id: Number(row.machine_id),
        count: toNumber(row._count?.id)
      })),
      topFailureRows: skillFailureGroups.map((row) => ({
        key: Number(row.user_id),
        id: Number(row.failure_code_id),
        count: toNumber(row._count?.id)
      })),
      machineNameMap,
      failureCodeMap,
      userMap
    }).slice(0, SKILL_MATRIX_MAX_ROWS)

    // ---- 9. Ringkasan konsentrasi 80/20 ----
    // Dihitung dari baris yang benar-benar menyumbang nilai > 0 (lihat
    // buildParetoSummary), agar "X dari Y" selalu konsisten dengan grafik.
    const summary = buildParetoSummary({
      machineRows: machineRanked.map((row) => ({ ...row, value: row.downtime_minutes })),
      failureRows: failureRanked.map((row) => ({ ...row, value: row.count })),
      totalDowntimeMinutes: toNumber(machineAggregate?._sum?.downtime_minutes),
      totalBreakdown: toNumber(failureAggregate),
      machineNames: machineNameMap,
      failureNames: new Map(
        [...failureCodeMap.entries()].map(([id, meta]) => [id, meta?.name || null])
      )
    })

    // ---- 10. Respons standar ----
    return successResponse(res, {
      message: 'Analitik keandalan (Pareto & Skill Matrix) berhasil diambil.',
      data: {
        filters: {
          year_month: yearMonth,
          plant_id: scope.plantId,
          plant_name: plant?.name || null,
          is_scoped_to_plant: scope.isScoped,
          limit,
          period_start: `${yearMonth}-01`,
          period_end: `${yearMonth}-31`,
          pareto_threshold_percent: 80
        },
        summary,
        machine_pareto: machinePareto,
        failure_pareto: failurePareto,
        skill_matrix: skillMatrix,
        notes: {
          // Pengingat aturan P1 agar tidak dipakai sebagai alat penilaian orang.
          pareto: 'Pareto menandai ASET (mesin/kode kerusakan) yang menyumbang 80% gangguan pada periode ini — bukan penilaian teknisi.',
          skill_matrix: 'Pemetaan keahlian berdasarkan histori penanganan. Bukan penilaian kinerja.',
          data_basis: 'Logbook berstatus PENDING & APPROVED dengan aktivitas MACHINE_TROUBLE.'
        }
      }
    })
  } catch (err) {
    next(err)
  }
}

export default { getReliabilityAnalytics }
