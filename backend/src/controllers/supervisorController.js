import prisma from '../config/prisma.js'
import { successResponse } from '../utils/response.js'
import { getWIBDateString, getWIBYearMonth, getWIBLastNDays } from '../utils/date.js'

export async function getTeamOverview(req, res, next) {
  try {
    const supervisorPlantId = req.user.plant_id ? Number(req.user.plant_id) : null
    const supervisorGroupId = req.user.group_id ? Number(req.user.group_id) : null

    // Tanggal lokal WIB presisi (mengatasi server Vercel UTC)
    const todayStr = getWIBDateString()
    const currentYearMonth = getWIBYearMonth()
    const last7DaysDates = getWIBLastNDays(7)
    const last7DaysStrings = last7DaysDates.map(d => d.date)

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
        where: { role: { name: 'Teknisi' }, is_active: true },
        include: { role: true, plant: true, group: true }
      }),
      prisma.logbook.groupBy({
        by: ['user_id', 'status'],
        _count: { id: true },
        _sum: { duration_minutes: true }
      }),
      prisma.logbook.groupBy({
        by: ['user_id'],
        where: { task_date: { startsWith: currentYearMonth } },
        _count: { id: true }
      }),
      prisma.logbook.groupBy({
        by: ['user_id', 'task_date'],
        where: { task_date: { in: last7DaysStrings } },
        _count: { id: true }
      }),
      prisma.logbook.groupBy({
        by: ['user_id', 'machine_id'],
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
      const isDirectTeam = Boolean(
        (supervisorPlantId && tech.plant_id && Number(tech.plant_id) === supervisorPlantId) ||
        (supervisorGroupId && tech.group_id && Number(tech.group_id) === supervisorGroupId)
      )

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
        is_direct_team: isDirectTeam,
        total_logs: totalLogs,
        month_logs: monthLogs,
        week_logs: weekLogs,
        today_logs: todayLogs,
        is_active_today: isActiveToday,
        total_duration_minutes: statusData.totalDuration,
        status_counts: statusCounts,
        top_machine: topMachine,
        frequency_score: frequencyScore,
        frequency_badge_class: frequencyBadgeClass,
        last_7_days: last7Days
      }
    })

    // 4. Hitung ringkasan tim keseluruhan
    const directTeamCount = technicianOverview.filter(t => t.is_direct_team).length
    const activeTodayCount = technicianOverview.filter(t => t.is_active_today).length
    const totalLogsMonth = technicianOverview.reduce((acc, t) => acc + t.month_logs, 0)
    const avgLogsPerTech = technicians.length > 0
      ? Math.round((totalLogsMonth / technicians.length) * 10) / 10
      : 0
    const avgDailyLogsTeam = Math.round((totalLogsMonth / 30) * 10) / 10

    return successResponse(res, {
      message: 'Overview aktivitas teknisi tim berhasil diambil.',
      data: {
        summary: {
          total_technicians: technicians.length,
          direct_team_count: directTeamCount,
          active_today_count: activeTodayCount,
          total_logs_month: totalLogsMonth,
          avg_logs_per_technician: avgLogsPerTech,
          avg_daily_logs_team: avgDailyLogsTeam
        },
        technicians: technicianOverview
      }
    })
  } catch (err) {
    next(err)
  }
}
