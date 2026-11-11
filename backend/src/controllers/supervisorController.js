import prisma from '../config/prisma.js'
import { successResponse } from '../utils/response.js'
import { getWIBDateString, getWIBYearMonth, getWIBLastNDays } from '../utils/date.js'

/**
 * Batas baris riwayat logbook per teknisi pada payload `team-overview`.
 * Data ini dipakai modal detail (kalender aktivitas + tabel riwayat), jadi perlu
 * cukup panjang (± 1 tahun) namun tetap dibatasi agar payload tidak membengkak
 * ketika Admin memantau seluruh plant sekaligus.
 */
const TECHNICIAN_LOG_LIMIT = 500

/**
 * Rentang leksikografis kolom `task_date` (VARCHAR 'YYYY-MM-DD') untuk mengamankan
 * baris legacy bertanggal rusak (mis. 'pengamatan') agar tidak ikut teragregasi.
 */
const TASK_DATE_MIN = '2000-01-01'
const TASK_DATE_MAX = '2100-12-31'

/**
 * Menentukan scope plant untuk overview aktivitas teknisi:
 *  - Supervisor : SELALU dikunci ke plant pada JWT (query string diabaikan).
 *  - Admin      : boleh memilih `plant_id` lewat query; kosong / `ALL` = seluruh plant.
 *
 * @param {{ role?: string, plant_id?: number|string|null }} user - `req.user` (JWT)
 * @param {unknown} requestedPlantId - `req.query.plant_id`
 * @returns {{ plantId: number|null, isAdmin: boolean }}
 */
export function resolveOverviewPlantScope(user, requestedPlantId) {
  const role = String(user?.role || '').toLowerCase()

  if (role === 'supervisor') {
    const plantId = Number(user?.plant_id)
    return { plantId: Number.isFinite(plantId) && plantId > 0 ? plantId : null, isAdmin: false }
  }

  // Admin (atau peran lain yang lolos RBAC route): opsional filter plant.
  const requested = String(requestedPlantId ?? '').trim()
  if (!requested || requested.toUpperCase() === 'ALL') {
    return { plantId: null, isAdmin: true }
  }

  const plantId = Number(requested)
  return { plantId: Number.isFinite(plantId) && plantId > 0 ? plantId : null, isAdmin: true }
}

/**
 * Menentukan apakah seorang teknisi termasuk "Tim Pimpinan Saya" (direct team).
 *
 * Bug yang diperbaiki: dulu plant dan group digabung dengan `||`, sehingga SELURUH
 * teknisi di plant yang sama dianggap tim langsung supervisor. Akibatnya tab
 * "Tim Pimpinan Saya" dan "Seluruh Teknisi Pabrik" menampilkan jumlah yang sama
 * (mis. 95 teknisi di plant, padahal hanya 29 yang berada di group supervisor).
 *
 * Aturan sekarang (AND):
 *  - Group : wajib sama bila supervisor punya `group_id` (kriteria utama).
 *  - Plant : bila supervisor punya `plant_id` (dan scope plant aktif), plant
 *            teknisi juga wajib sama -> pengecekan lebih ketat.
 *  - Bila supervisor TIDAK punya `group_id`, fallback ke kecocokan plant pada
 *    scope ($scope.plantId) agar perilaku tetap masuk akal (tidak semua orang).
 *
 * @param {{ group_id?: number|string|null, plant_id?: number|string|null }} user - `req.user`
 * @param {{ plant_id?: unknown, group_id?: unknown }} technician - baris user teknisi
 * @param {{ scopedPlantId?: number|null }} [scope] - hasil `resolveOverviewPlantScope`
 * @returns {boolean}
 */
export function isDirectTeamMember(user, technician, scope = {}) {
  const toId = (value) => {
    if (value === null || value === undefined || value === '') return null
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  const supervisorGroupId = toId(user?.group_id)
  const supervisorPlantId = toId(user?.plant_id)
  const technicianGroupId = toId(technician?.group_id)
  const technicianPlantId = toId(technician?.plant_id)

  if (supervisorGroupId !== null) {
    if (technicianGroupId !== supervisorGroupId) return false
    // Pengecekan plant lebih ketat (hanya bila SPV memang punya plant).
    if (supervisorPlantId !== null && technicianPlantId !== supervisorPlantId) {
      return false
    }
    return true
  }

  // Fallback: SPV tanpa group → pakai plant pada scope overview.
  const scopedPlantId = toId(scope?.scopedPlantId) ?? supervisorPlantId
  if (scopedPlantId === null) return false
  return technicianPlantId === scopedPlantId
}

export async function getTeamOverview(req, res, next) {
  try {
    const scope = resolveOverviewPlantScope(req.user, req.query.plant_id ?? req.query.plantId)
    const scopedPlantId = scope.plantId
    const supervisorPlantId = req.user.plant_id ? Number(req.user.plant_id) : null
    const supervisorGroupId = req.user.group_id ? Number(req.user.group_id) : null

    // Tanggal lokal WIB presisi (mengatasi server Vercel UTC)
    const todayStr = getWIBDateString()
    const currentYearMonth = getWIBYearMonth()
    const last7DaysDates = getWIBLastNDays(7)
    const last7DaysStrings = last7DaysDates.map(d => d.date)

    // Agregasi logbook harus mengikuti teknisi yang terlihat (termasuk saat Admin
    // memfilter plant / tidak memfilter sama sekali). Tanpa scope ini, query
    // groupBy tanpa `where` akan menghitung seluruh logbook se-pabrik.
    const logScopeWhere = scopedPlantId ? { plant_id: BigInt(scopedPlantId) } : {}

    // 1. Ambil teknisi dan agregasi database (groupBy) secara paralel
    const [
      technicians,
      statusGroups,
      monthGroups,
      weekGroups,
      machineGroups,
      machines
    ] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: { name: 'Teknisi' },
          is_active: true,
          // BUG-002 (APR-08): Supervisor hanya melihat teknisi pada Line/Plant miliknya.
          // Admin: seluruh plant, kecuali memilih plant tertentu lewat query.
          ...(scopedPlantId ? { plant_id: BigInt(scopedPlantId) } : {})
        },
        include: { role: true, plant: true, group: true }
      }),
      prisma.logbook.groupBy({
        by: ['user_id', 'status'],
        where: logScopeWhere,
        _count: { id: true },
        _sum: { duration_minutes: true }
      }),
      prisma.logbook.groupBy({
        by: ['user_id'],
        where: { ...logScopeWhere, task_date: { startsWith: currentYearMonth } },
        _count: { id: true }
      }),
      prisma.logbook.groupBy({
        by: ['user_id', 'task_date'],
        where: { ...logScopeWhere, task_date: { in: last7DaysStrings } },
        _count: { id: true }
      }),
      prisma.logbook.groupBy({
        by: ['user_id', 'machine_id'],
        where: logScopeWhere,
        _count: { id: true }
      }),
      prisma.machine.findMany({
        select: { id: true, name: true }
      })
    ])

    const machineMap = new Map(machines.map(m => [Number(m.id), m.name]))

    // 2. Index hasil groupBy ke Map untuk lookup O(1)
    // Map user_id -> { totalLogs, totalDuration, statusCounts }
    const userStatusMap = new Map()
    for (const sg of statusGroups) {
      const uid = Number(sg.user_id)
      if (!userStatusMap.has(uid)) {
        userStatusMap.set(uid, {
          totalLogs: 0,
          totalDuration: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          draft: 0
        })
      }
      const uData = userStatusMap.get(uid)
      const count = sg._count.id
      const duration = sg._sum.duration_minutes || 0
      uData.totalLogs += count
      uData.totalDuration += duration
      const st = String(sg.status).toLowerCase()
      if (uData[st] !== undefined) {
        uData[st] += count
      }
    }

    // Map user_id -> monthLogs
    const userMonthMap = new Map()
    for (const mg of monthGroups) {
      userMonthMap.set(Number(mg.user_id), mg._count.id)
    }

    // Map user_id -> Map(task_date -> count)
    const userWeekMap = new Map()
    for (const wg of weekGroups) {
      const uid = Number(wg.user_id)
      if (!userWeekMap.has(uid)) {
        userWeekMap.set(uid, new Map())
      }
      userWeekMap.get(uid).set(wg.task_date, wg._count.id)
    }

    // Map user_id -> topMachineName
    const userTopMachineMap = new Map()
    const userMachineCounts = new Map()
    for (const mg of machineGroups) {
      const uid = Number(mg.user_id)
      const count = mg._count.id
      if (!userMachineCounts.has(uid) || count > userMachineCounts.get(uid)) {
        userMachineCounts.set(uid, count)
        userTopMachineMap.set(uid, machineMap.get(Number(mg.machine_id)) || 'Mesin')
      }
    }

    // 3. Susun overview teknisi
    const technicianOverview = technicians.map(tech => {
      const uid = Number(tech.id)
      // Direct team = group_id sama (utama) + plant_id sama (lebih ketat).
      // Lihat `isDirectTeamMember` untuk detail aturan & riwayat bug.
      const isDirectTeam = isDirectTeamMember(req.user, tech, { scopedPlantId })

      const statusData = userStatusMap.get(uid) || {
        totalLogs: 0,
        totalDuration: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        draft: 0
      }

      const totalLogs = statusData.totalLogs
      const monthLogs = userMonthMap.get(uid) || 0

      // Hitung baris 7 hari terakhir
      const techWeekData = userWeekMap.get(uid) || new Map()
      const last7Days = last7DaysDates.map(dayInfo => {
        const count = techWeekData.get(dayInfo.date) || 0
        return { ...dayInfo, count }
      })
      const weekLogs = last7Days.reduce((acc, d) => acc + d.count, 0)
      const todayLogs = techWeekData.get(todayStr) || 0
      const isActiveToday = todayLogs > 0

      const statusCounts = {
        approved: statusData.approved,
        pending: statusData.pending,
        rejected: statusData.rejected,
        draft: statusData.draft
      }

      const topMachine = userTopMachineMap.get(uid) || '-'

      // Kategori frekuensi
      let frequencyScore = 'Aktif Normal'
      let frequencyBadgeClass = 'bg-primary-soft text-primary border-primary/30'
      if (monthLogs >= 15 || totalLogs >= 30) {
        frequencyScore = 'Sangat Rajin'
        frequencyBadgeClass = 'bg-status-approved-bg text-status-approved-fg border-success/30'
      } else if (monthLogs < 3 && totalLogs < 10) {
        frequencyScore = 'Perlu Perhatian'
        frequencyBadgeClass = 'bg-status-rejected-bg text-status-rejected-fg border-danger/30'
      }

      return {
        id: uid,
        nik: tech.nik,
        full_name: tech.full_name,
        email: tech.email,
        photo_url: tech.photo_url || null,
        role: tech.role?.name,
        plant_id: tech.plant_id ? Number(tech.plant_id) : null,
        plant_name: tech.plant?.name || 'Line Umum',
        group_id: tech.group_id ? Number(tech.group_id) : null,
        group_name: tech.group?.name || 'Umum',
        isDirectTeam,
        isActiveToday,
        totalLogs,
        monthLogs,
        weekLogs,
        todayLogs,
        totalDurationMinutes: statusData.totalDuration,
        statusCounts,
        lastLog: null, // diisi pada langkah 3b
        logs: [],
        topMachine,
        frequencyScore,
        frequencyBadgeClass,
        last7Days
      }
    })

    // 3b. Riwayat logbook per teknisi (untuk modal kalender aktivitas & tabel riwayat).
    // SATU query untuk semua teknisi (bukan N+1), lalu dibatasi per teknisi di memori.
    const technicianIds = technicianOverview.map(t => BigInt(t.id))
    if (technicianIds.length > 0) {
      const logRows = await prisma.logbook.findMany({
        where: {
          ...logScopeWhere,
          user_id: { in: technicianIds },
          task_date: { gte: TASK_DATE_MIN, lte: TASK_DATE_MAX }
        },
        orderBy: [{ task_date: 'desc' }, { start_time: 'desc' }],
        include: {
          shift: { select: { name: true } },
          machine: { select: { name: true } },
          subMachine: { select: { name: true } }
        }
      })

      const logsByUser = new Map()

      for (const log of logRows) {
        const uid = Number(log.user_id)
        const rows = logsByUser.get(uid) || []
        if (rows.length >= TECHNICIAN_LOG_LIMIT) continue

        const serialized = {
          id: Number(log.id),
          task_date: log.task_date,
          start_time: log.start_time,
          end_time: log.end_time,
          duration_minutes: log.duration_minutes || 0,
          shift_name: log.shift?.name || '-',
          machine_name:
            log.machine?.name ||
            log.unmapped_asset_note ||
            'Aset belum terdaftar',
          sub_machine_name: log.subMachine?.name || null,
          activity_description: log.activity_description,
          sparepart: log.sparepart || '-',
          status: log.status
        }
        rows.push(serialized)
        logsByUser.set(uid, rows)
      }

      for (const tech of technicianOverview) {
        const rows = logsByUser.get(tech.id) || []
        tech.logs = rows
        // `rows` sudah terurut terbaru → entri pertama = aktivitas terakhir
        tech.lastLog = rows.length > 0
          ? { task_date: rows[0].task_date, start_time: rows[0].start_time }
          : null
      }
    }

    // 4. Hitung ringkasan tim keseluruhan
    // `totalTeam`   : hanya teknisi yang berada di bawah supervisi langsung (isDirectTeam)
    // `totalFactory`: seluruh teknisi pada plant/scope yang dipantau
    const totalTechnicians = technicianOverview.length
    const directTeamCount = technicianOverview.filter(t => t.isDirectTeam).length
    const activeTodayCount = technicianOverview.filter(t => t.isActiveToday).length
    const directTeamLogsMonth = technicianOverview.reduce(
      (acc, t) => acc + (t.isDirectTeam ? t.monthLogs : 0),
      0
    )
    const totalLogsMonth = technicianOverview.reduce((acc, t) => acc + t.monthLogs, 0)
    const avgLogsPerTech = totalTechnicians > 0
      ? Math.round((totalLogsMonth / totalTechnicians) * 10) / 10
      : 0
    const avgDailyLogsTeam = Math.round((totalLogsMonth / 30) * 10) / 10

    const selectedPlant = scopedPlantId
      ? await prisma.plant.findUnique({
          where: { id: BigInt(scopedPlantId) },
          select: { id: true, name: true }
        })
      : null

    return successResponse(res, {
      message: 'Overview aktivitas teknisi tim berhasil diambil.',
      data: {
        summary: {
          // Nama eksplisit sesuai kontrak UI (tab Tim Saya vs Seluruh Teknisi Pabrik).
          total_team: directTeamCount,
          total_factory: totalTechnicians,
          total_team_logs_month: directTeamLogsMonth,
          // Alias lama agar konsumen lain (jika ada) tetap kompatibel.
          total_technicians: totalTechnicians,
          direct_team_count: directTeamCount,
          active_today_count: activeTodayCount,
          total_logs_month: totalLogsMonth,
          avg_logs_per_technician: avgLogsPerTech,
          avg_daily_logs_team: avgDailyLogsTeam
        },
        // Konteks scope agar UI bisa menampilkan plant yang sedang dipantau.
        scope: {
          plant_id: scopedPlantId,
          plant_name: selectedPlant?.name || null,
          is_global: scopedPlantId === null,
          is_admin: scope.isAdmin,
          // Konteks team agar UI dapat menjelaskan kriteria "Tim Pimpinan Saya".
          supervisor_group_id: supervisorGroupId,
          supervisor_group_name: req.user?.group_name || null,
          supervisor_plant_id: supervisorPlantId
        },
        today: todayStr,
        current_year_month: currentYearMonth,
        technicians: technicianOverview
      }
    })
  } catch (err) {
    next(err)
  }
}
