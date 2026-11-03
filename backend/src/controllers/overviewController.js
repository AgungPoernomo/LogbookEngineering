import prisma from '../config/prisma.js'
import { successResponse } from '../utils/response.js'
import { getWIBDateString, getWIBLastNDays } from '../utils/date.js'

const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
]

function formatDateTimeIndo(dateStr, timeStr = '08:00') {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-').map(Number)
  const monthName = MONTH_SHORT_ID[month - 1] || 'Jan'
  return `${day} ${monthName} ${year}  ${timeStr || '08:00'}`
}

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('')
}

function calculateDelta(current, previous) {
  if (!previous || previous === 0) {
    if (current > 0) return { text: '+100%', isUp: true, value: 100 }
    return { text: '0%', isUp: true, value: 0 }
  }
  const diff = ((current - previous) / previous) * 100
  const rounded = Math.round(diff)
  if (rounded > 0) {
    return { text: `+${rounded}%`, isUp: true, value: rounded }
  } else if (rounded < 0) {
    return { text: `${rounded}%`, isUp: false, value: rounded }
  }
  return { text: '0%', isUp: true, value: 0 }
}

const plantColors = {
  1: { hex: '#2563EB', name: 'primary', bg: 'bg-primary', text: 'text-primary' },
  2: { hex: '#EAB308', name: 'warning', bg: 'bg-warning', text: 'text-warning' },
  3: { hex: '#22A55B', name: 'success', bg: 'bg-success', text: 'text-success' },
  4: { hex: '#F97316', name: 'orange', bg: 'bg-orange', text: 'text-orange' },
  30001: { hex: '#8B5CF6', name: 'purple', bg: 'bg-purple-500', text: 'text-purple-600' }
}
const defaultPlantColor = { hex: '#64748B', name: 'slate', bg: 'bg-slate-500', text: 'text-slate-600' }

/**
 * Controller Endpoint Agregasi Database untuk Dashboard Overview
 * Menggantikan transfer seluruh logbook mentah (10.000+ baris) ke browser
 */
export async function getDashboardOverview(req, res, next) {
  try {
    const { yearMonth, month, year, plant_id, shift_id, group_id, search } = req.query

    // Target Bulan & Tahun
    let targetYM = yearMonth
    if (!targetYM && year && month) {
      targetYM = `${year}-${String(month).padStart(2, '0')}`
    }

    const whereClause = {}

    if (targetYM) {
      whereClause.task_date = { startsWith: targetYM }
    }

    if (req.user?.role === 'Supervisor' && req.user?.plant_id) {
      whereClause.plant_id = BigInt(req.user.plant_id)
    } else if (plant_id && plant_id !== 'ALL') {
      whereClause.plant_id = BigInt(plant_id)
    }

    if (shift_id && shift_id !== 'ALL') {
      whereClause.shift_id = BigInt(shift_id)
    }

    if (group_id && group_id !== 'ALL') {
      const groupUsers = await prisma.user.findMany({
        where: { group_id: BigInt(group_id) },
        select: { id: true }
      })
      whereClause.user_id = { in: groupUsers.map(u => u.id) }
    }

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { activity_description: { contains: q } },
        { sparepart: { contains: q } },
        { machine: { name: { contains: q } } },
        { user: { full_name: { contains: q } } }
      ]
    }

    // Tanggal acuan WIB
    const todayStr = getWIBDateString()
    const last2Days = getWIBLastNDays(2)
    const yesterdayStr = last2Days[0].date
    const last7Days = getWIBLastNDays(7)
    const last7DaysStrings = last7Days.map(d => d.date)

    // Agregasi Database Terpusat (Prisma Count & GroupBy)
    const [
      totalLogGlobal,
      todayLogGlobal,
      yesterdayLogGlobal,
      activeUsersTodayGroup,
      activeUsersYesterdayGroup,
      allPlants,
      allUsers,
      plantLogCounts,
      plantTodayCounts,
      plantYesterdayCounts,
      plantActiveUsersToday,
      plantActiveUsersYesterday,
      trend7DaysGroup,
      userLogCountsGroup,
      topMachinesGroup,
      allMachines,
      recent5Activities
    ] = await Promise.all([
      prisma.logbook.count({ where: whereClause }),
      prisma.logbook.count({ where: { ...whereClause, task_date: todayStr } }),
      prisma.logbook.count({ where: { ...whereClause, task_date: yesterdayStr } }),
      prisma.logbook.groupBy({ by: ['user_id'], where: { ...whereClause, task_date: todayStr } }),
      prisma.logbook.groupBy({ by: ['user_id'], where: { ...whereClause, task_date: yesterdayStr } }),
      prisma.plant.findMany({ where: { is_active: true }, orderBy: { id: 'asc' } }),
      prisma.user.findMany({
        where: { is_active: true },
        select: { id: true, full_name: true, plant_id: true, photo_url: true }
      }),
      prisma.logbook.groupBy({ by: ['plant_id'], where: whereClause, _count: { id: true } }),
      prisma.logbook.groupBy({ by: ['plant_id'], where: { ...whereClause, task_date: todayStr }, _count: { id: true } }),
      prisma.logbook.groupBy({ by: ['plant_id'], where: { ...whereClause, task_date: yesterdayStr }, _count: { id: true } }),
      prisma.logbook.groupBy({ by: ['plant_id', 'user_id'], where: { ...whereClause, task_date: todayStr } }),
      prisma.logbook.groupBy({ by: ['plant_id', 'user_id'], where: { ...whereClause, task_date: yesterdayStr } }),
      prisma.logbook.groupBy({
        by: ['plant_id', 'task_date'],
        where: { ...whereClause, task_date: { in: last7DaysStrings } },
        _count: { id: true }
      }),
      prisma.logbook.groupBy({ by: ['plant_id', 'user_id'], where: whereClause, _count: { id: true } }),
      prisma.logbook.groupBy({ by: ['machine_id', 'plant_id'], where: whereClause, _count: { id: true } }),
      prisma.machine.findMany({ select: { id: true, name: true, plant_id: true } }),
      prisma.logbook.findMany({
        where: whereClause,
        orderBy: [{ task_date: 'desc' }, { start_time: 'desc' }],
        take: 5,
        include: {
          user: { select: { full_name: true } },
          plant: { select: { name: true } },
          machine: { select: { name: true } }
        }
      })
    ])

    const machineMap = new Map(allMachines.map(m => [Number(m.id), m]))
    const userMap = new Map(allUsers.map(u => [Number(u.id), u]))
    const plantMap = new Map(allPlants.map(p => [Number(p.id), p]))

    // 4 Plant Utama
    const plants = allPlants.slice(0, 4)

    // Ambil 3 log terbaru untuk masing-masing plant secara paralel
    const recent3LogsPerPlant = await Promise.all(
      plants.map(p =>
        prisma.logbook.findMany({
          where: { ...whereClause, plant_id: p.id },
          orderBy: [{ task_date: 'desc' }, { start_time: 'desc' }],
          take: 3,
          include: {
            user: { select: { full_name: true } }
          }
        })
      )
    )

    // Map helpers untuk O(1) Lookup
    const plantLogMap = new Map(plantLogCounts.map(g => [Number(g.plant_id), g._count.id]))
    const plantTodayMap = new Map(plantTodayCounts.map(g => [Number(g.plant_id), g._count.id]))
    const plantYesterdayMap = new Map(plantYesterdayCounts.map(g => [Number(g.plant_id), g._count.id]))

    const plantActiveTodayMap = new Map()
    for (const item of plantActiveUsersToday) {
      const pid = Number(item.plant_id)
      if (!plantActiveTodayMap.has(pid)) plantActiveTodayMap.set(pid, new Set())
      plantActiveTodayMap.get(pid).add(Number(item.user_id))
    }

    const plantActiveYesterdayMap = new Map()
    for (const item of plantActiveUsersYesterday) {
      const pid = Number(item.plant_id)
      if (!plantActiveYesterdayMap.has(pid)) plantActiveYesterdayMap.set(pid, new Set())
      plantActiveYesterdayMap.get(pid).add(Number(item.user_id))
    }

    const trend7DaysMap = new Map()
    for (const item of trend7DaysGroup) {
      const key = `${item.plant_id}_${item.task_date}`
      trend7DaysMap.set(key, item._count.id)
    }

    // Bangun Plant Cards
    const plantCards = plants.map((plant, idx) => {
      const pid = Number(plant.id)
      const totalLog = plantLogMap.get(pid) || 0
      const todayCount = plantTodayMap.get(pid) || 0
      const yesterdayCount = plantYesterdayMap.get(pid) || 0
      const todayDelta = calculateDelta(todayCount, yesterdayCount)

      const activeUserIdsToday = plantActiveTodayMap.get(pid) || new Set()
      const activeUserIdsYesterday = plantActiveYesterdayMap.get(pid) || new Set()
      const activeUsersCount = activeUserIdsToday.size
      const activeUsersDelta = calculateDelta(activeUsersCount, activeUserIdsYesterday.size)

      const plantUsers = allUsers.filter(u => Number(u.plant_id) === pid)
      const totalUsersCount = Math.max(plantUsers.length, activeUsersCount)
      const activePercentage = totalUsersCount > 0
        ? Math.round((activeUsersCount / totalUsersCount) * 100)
        : 0

      // Tren 7 Hari
      const last7DaysData = last7Days.map(d => ({
        date: d.date,
        dayLabel: d.dayLabel,
        count: trend7DaysMap.get(`${pid}_${d.date}`) || 0
      }))

      // 3 Log Terbaru Plant
      const rawRecent = recent3LogsPerPlant[idx] || []
      const recentLogs = rawRecent.map(l => ({
        id: Number(l.id),
        task_date: l.task_date,
        start_time: l.start_time,
        end_time: l.end_time,
        activity_description: l.activity_description,
        user_name: l.user?.full_name || 'Teknisi',
        formatted_time: formatDateTimeIndo(l.task_date, l.start_time),
        user_initials: getInitials(l.user?.full_name)
      }))

      // Leaderboard Teknisi Teraktif per Plant
      const plantUserLogCounts = userLogCountsGroup
        .filter(g => Number(g.plant_id) === pid)
        .map(g => {
          const uid = Number(g.user_id)
          const user = userMap.get(uid)
          return {
            userId: uid,
            name: user?.full_name || 'Teknisi',
            initials: getInitials(user?.full_name),
            photo_url: user?.photo_url || null,
            count: g._count.id
          }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
        .map((item, i) => ({
          rank: i + 1,
          ...item,
          percentage: totalLog > 0 ? Math.round((item.count / totalLog) * 100) : 0
        }))

      // Tampilan daftar user aktif
      const displayUsers = Array.from(activeUserIdsToday).map(uid => {
        const u = userMap.get(uid)
        return {
          id: uid,
          name: u?.full_name || 'Teknisi',
          initials: getInitials(u?.full_name),
          photo_url: u?.photo_url || null,
          last_activity_time: 'Hari ini',
          activity_description: 'Aktivitas Tercatat'
        }
      })

      return {
        id: pid,
        name: `PLANT ${pid}`,
        fullName: plant.name,
        code: plant.code,
        status: 'OPERASIONAL',
        color: plantColors[pid] || plantColors[1],
        totalLog,
        totalLogDelta: todayDelta,
        todayLog: todayCount,
        todayDelta,
        activeUsersCount,
        activeUsersDelta,
        totalUsersCount,
        activePercentage,
        last7Days: last7DaysData,
        recentLogs,
        leaderboard: plantUserLogCounts,
        activeUsersList: displayUsers.length > 0 ? displayUsers : plantUsers.slice(0, 4).map(u => ({
          id: Number(u.id),
          name: u.full_name,
          initials: getInitials(u.full_name),
          photo_url: u.photo_url,
          last_activity_time: 'Belum aktif',
          activity_description: 'Standby'
        })),
        totalActiveCount: activeUsersCount
      }
    })

    // KPI Global
    const todayLogDeltaGlobal = calculateDelta(todayLogGlobal, yesterdayLogGlobal)
    const activeUsersGlobalCount = activeUsersTodayGroup.length
    const activeUsersDeltaGlobal = calculateDelta(activeUsersGlobalCount, activeUsersYesterdayGroup.length)
    const totalAllUsersCount = allUsers.length

    // 5 Aktivitas Terbaru Global
    const recentActivities = recent5Activities.map(l => ({
      id: Number(l.id),
      task_date: l.task_date,
      start_time: l.start_time,
      end_time: l.end_time,
      activity_description: l.activity_description,
      user_name: l.user?.full_name || 'Teknisi',
      formatted_time: formatDateTimeIndo(l.task_date, l.start_time),
      user_initials: getInitials(l.user?.full_name),
      machine_name: l.machine?.name || '-',
      plant_name: l.plant?.name || `Plant ${l.plant_id}`,
      machine_and_activity: `${l.machine?.name || '-'} / ${l.activity_description}`,
      plant_color: plantColors[Number(l.plant_id)] || plantColors[1],
      status: l.status
    }))

    // Section E: Distribusi Logbook per Line & Mesin
    const totalLogsForDistribution = totalLogGlobal || 1

    const topLines = allPlants.map(p => {
      const pid = Number(p.id)
      const count = plantLogMap.get(pid) || 0
      return {
        plantId: pid,
        name: p.name,
        code: p.name.toUpperCase().replace(/\s+/g, '-'),
        color: plantColors[pid] || defaultPlantColor,
        count
      }
    })
      .filter(item => item.count > 0 || [1, 2, 3, 4].includes(Number(item.plantId)))
      .sort((a, b) => b.count - a.count)
      .map((item, idx) => ({
        rank: idx + 1,
        ...item,
        percentage: Math.round((item.count / totalLogsForDistribution) * 100)
      }))

    const topMachines = topMachinesGroup
      .map(item => {
        const mid = Number(item.machine_id)
        const pid = Number(item.plant_id)
        const machine = machineMap.get(mid)
        const plant = plantMap.get(pid)
        return {
          machineId: mid,
          name: machine ? machine.name : `Mesin-${mid}`,
          plantId: pid,
          plantName: plant ? plant.name : `Line ${pid}`,
          color: plantColors[pid] || defaultPlantColor,
          count: item._count.id
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item, idx) => ({
        rank: idx + 1,
        ...item,
        percentage: Math.round((item.count / totalLogsForDistribution) * 100)
      }))

    const topLinesSummary = {
      lines: topLines,
      machines: topMachines,
      totalLogs: totalLogGlobal,
      topLine: topLines[0] || null,
      topMachine: topMachines[0] || null
    }

    // User Active Summary
    const userActivePerPlant = plantCards.map(p => ({
      plantId: p.id,
      name: p.name,
      fullName: p.fullName,
      color: p.color,
      active: p.activeUsersCount,
      total: p.totalUsersCount,
      percentage: p.activePercentage
    }))

    const overallActiveUsersTotal = {
      active: activeUsersGlobalCount,
      total: totalAllUsersCount,
      percentage: totalAllUsersCount > 0
        ? Math.round((activeUsersGlobalCount / totalAllUsersCount) * 100)
        : 0,
      delta: activeUsersDeltaGlobal
    }

    return successResponse(res, {
      message: 'Data overview dashboard berhasil diagregasi.',
      data: {
        kpi: {
          totalLog: totalLogGlobal,
          totalLogDelta: todayLogDeltaGlobal,
          todayLog: todayLogGlobal,
          todayLogDelta: todayLogDeltaGlobal,
          activeUsers: activeUsersGlobalCount,
          activeUsersDelta: activeUsersDeltaGlobal
        },
        plants: plantCards,
        recentActivities,
        topLinesSummary,
        userActiveSummary: {
          plants: userActivePerPlant,
          total: overallActiveUsersTotal
        }
      }
    })
  } catch (err) {
    next(err)
  }
}

