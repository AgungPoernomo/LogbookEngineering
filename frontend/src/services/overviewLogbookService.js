import { logbookService } from './logbookService'
import { masterService } from './masterService'
import { userService } from './userService'
import { ROLES } from '../constants/roles'
import { toLocalDateString, addDays, parseLocalDate } from '../utils/dateKeys'

// Format helper: "13 Okt 2026 08:42"
const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
]

const DAY_SHORT_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export function formatDateTimeIndo(dateStr, timeStr = '08:00') {
  if (!dateStr) return '-'
  const d = parseLocalDate(dateStr)
  const day = d.getDate()
  const month = MONTH_SHORT_ID[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}  ${timeStr}`
}

export function getInitials(name) {
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

export const overviewLogbookService = {
  /**
   * Mengambil dan mengagregasi data Overview Log Book Tim Mechanical
   * @param {Object} currentUser User yang sedang login (harus Admin / Supervisor)
   * @param {Object} filters { yearMonth, departmentId, groupId, shiftId, search }
   */
  async getOverviewData(currentUser, filters = {}) {
    // 1. Kontrol Akses Keamanan (Section 6)
    if (!currentUser || (currentUser.role !== ROLES.ADMIN && currentUser.role !== ROLES.SUPERVISOR)) {
      throw new Error('Akses ditolak: Hanya role Admin dan Supervisor yang berhak mengakses Overview Logbook.')
    }

    // 2. Ambil data master dan seluruh logbook
    const [allLogs, masterData, allUsers] = await Promise.all([
      logbookService.getLogbooks({}),
      masterService.getAllMaster(),
      userService.getUsers().catch(() => [])
    ])

    const todayStr = toLocalDateString(new Date())
    const yesterdayStr = addDays(todayStr, -1)

    // Siapkan daftar plant (4 plant)
    const plants = (masterData.plants || []).slice(0, 4)
    const plantColors = {
      1: { hex: '#2563EB', name: 'primary', bg: 'bg-primary', text: 'text-primary' },
      2: { hex: '#EAB308', name: 'warning', bg: 'bg-warning', text: 'text-warning' },
      3: { hex: '#22A55B', name: 'success', bg: 'bg-success', text: 'text-success' },
      4: { hex: '#F97316', name: 'orange', bg: 'bg-orange', text: 'text-orange' }
    }

    // 3. Terapkan filter pada kumpulan log
    let filteredLogs = [...allLogs]

    // Filter Bulan & Tahun (mis. "2026-10")
    if (filters.yearMonth) {
      filteredLogs = filteredLogs.filter(l => l.task_date?.startsWith(filters.yearMonth))
    }

    // Filter Shift
    if (filters.shiftId && filters.shiftId !== 'ALL') {
      filteredLogs = filteredLogs.filter(l => l.shift_id === Number(filters.shiftId))
    }

    // Filter Group / Department
    if (filters.groupId && filters.groupId !== 'ALL') {
      // Cocokkan user group atau machine group
      const matchingUserIds = new Set(
        allUsers.filter(u => u.group_id === Number(filters.groupId)).map(u => u.id)
      )
      filteredLogs = filteredLogs.filter(l => matchingUserIds.has(l.user_id))
    }

    // Filter Pencarian (debounce diterapkan di UI)
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim()
      filteredLogs = filteredLogs.filter(l =>
        l.machine_name?.toLowerCase().includes(q) ||
        l.activity_description?.toLowerCase().includes(q) ||
        l.user_name?.toLowerCase().includes(q) ||
        l.plant_name?.toLowerCase().includes(q) ||
        l.sparepart?.toLowerCase().includes(q)
      )
    }

    // 4. Hitung metrik per Plant (C1 - C4)
    const plantCards = plants.map(plant => {
      const pLogs = filteredLogs.filter(l => l.plant_id === plant.id)

      // Total Log
      const totalLog = pLogs.length

      // Hari Ini
      const todayLogs = pLogs.filter(l => l.task_date === todayStr)
      const yesterdayLogs = pLogs.filter(l => l.task_date === yesterdayStr)
      const todayCount = todayLogs.length
      const yesterdayCount = yesterdayLogs.length
      const todayDelta = calculateDelta(todayCount, yesterdayCount)

      // User Aktif: user unik yang membuat log hari ini di plant ini
      const activeUserIdsToday = new Set(todayLogs.map(l => l.user_id))
      const activeUserIdsYesterday = new Set(yesterdayLogs.map(l => l.user_id))
      const activeUsersCount = activeUserIdsToday.size
      const yesterdayActiveUsersCount = activeUserIdsYesterday.size
      const activeUsersDelta = calculateDelta(activeUsersCount, yesterdayActiveUsersCount)

      // Total user terdaftar di plant ini
      const plantUsers = allUsers.filter(u => u.plant_id === plant.id && u.is_active)
      const totalUsersCount = Math.max(plantUsers.length, activeUsersCount)
      const activePercentage = totalUsersCount > 0
        ? Math.round((activeUsersCount / totalUsersCount) * 100)
        : 0

      // 7 Hari Terakhir (sampai hari ini)
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const dStr = addDays(todayStr, -i)
        const dObj = parseLocalDate(dStr)
        const dayLabel = DAY_SHORT_ID[dObj.getDay()]
        const count = pLogs.filter(l => l.task_date === dStr).length
        last7Days.push({
          date: dStr,
          dayLabel,
          count
        })
      }

      // 3 Log Terbaru Plant
      const recentLogs = [...pLogs]
        .sort((a, b) => (b.task_date + b.start_time).localeCompare(a.task_date + a.start_time))
        .slice(0, 3)
        .map(l => ({
          ...l,
          formatted_time: formatDateTimeIndo(l.task_date, l.start_time),
          user_initials: getInitials(l.user_name)
        }))

      // Daftar User Aktif Terbaru Plant (untuk panel kartu dan modal)
      const activeUsersList = Array.from(activeUserIdsToday).map(uid => {
        const user = allUsers.find(u => u.id === uid) || {}
        const lastLog = todayLogs.find(l => l.user_id === uid)
        return {
          id: uid,
          name: user.full_name || lastLog?.user_name || 'Teknisi',
          initials: getInitials(user.full_name || lastLog?.user_name),
          photo_url: user.photo_url || null,
          last_activity_time: lastLog ? `${lastLog.start_time} WIB` : 'Hari ini',
          activity_description: lastLog?.activity_description || '-'
        }
      })

      // Jika belum ada user aktif hari ini, tampilkan daftar user plant agar tidak kosong
      const displayUsers = activeUsersList.length > 0
        ? activeUsersList
        : plantUsers.slice(0, 4).map(u => ({
            id: u.id,
            name: u.full_name,
            initials: getInitials(u.full_name),
            photo_url: u.photo_url,
            last_activity_time: 'Belum aktif',
            activity_description: 'Standby'
          }))

      // Leaderboard Teknisi Teraktif (Siapa yang paling sering mengisi logbook pada plant ini)
      const userLogCounts = {}
      pLogs.forEach(l => {
        if (!l.user_id) return
        if (!userLogCounts[l.user_id]) {
          const user = allUsers.find(u => u.id === l.user_id) || {}
          userLogCounts[l.user_id] = {
            userId: l.user_id,
            name: user.full_name || l.user_name || 'Teknisi',
            initials: getInitials(user.full_name || l.user_name),
            photo_url: user.photo_url || null,
            count: 0
          }
        }
        userLogCounts[l.user_id].count++
      })

      let plantLeaderboard = Object.values(userLogCounts)
        .sort((a, b) => b.count - a.count)
        .map((item, idx) => ({
          rank: idx + 1,
          ...item,
          percentage: totalLog > 0 ? Math.round((item.count / totalLog) * 100) : 0
        }))
        .slice(0, 4)

      if (plantLeaderboard.length === 0) {
        plantLeaderboard = plantUsers.slice(0, 4).map((u, idx) => ({
          rank: idx + 1,
          userId: u.id,
          name: u.full_name,
          initials: getInitials(u.full_name),
          photo_url: u.photo_url || null,
          count: 0,
          percentage: 0
        }))
      }

      return {
        id: plant.id,
        name: `PLANT ${plant.id}`,
        fullName: plant.name,
        code: plant.code,
        status: 'OPERASIONAL',
        color: plantColors[plant.id] || plantColors[1],
        totalLog,
        totalLogDelta: todayDelta, // tren aktivitas
        todayLog: todayCount,
        todayDelta,
        activeUsersCount,
        activeUsersDelta,
        totalUsersCount,
        activePercentage,
        last7Days,
        recentLogs,
        leaderboard: plantLeaderboard,
        activeUsersList: displayUsers,
        totalActiveCount: activeUsersList.length
      }
    })

    // 5. Hitung KPI Global (Bagian A) - Penjumlahan konsisten seluruh Plant
    const totalLogGlobal = plantCards.reduce((acc, p) => acc + p.totalLog, 0)
    const todayLogGlobal = plantCards.reduce((acc, p) => acc + p.todayLog, 0)
    const yesterdayLogGlobal = filteredLogs.filter(l => l.task_date === yesterdayStr).length
    const todayLogDeltaGlobal = calculateDelta(todayLogGlobal, yesterdayLogGlobal)

    // User aktif unik global hari ini
    const activeUserIdsGlobalToday = new Set(
      filteredLogs.filter(l => l.task_date === todayStr).map(l => l.user_id)
    )
    const activeUserIdsGlobalYesterday = new Set(
      filteredLogs.filter(l => l.task_date === yesterdayStr).map(l => l.user_id)
    )
    const activeUsersGlobalCount = activeUserIdsGlobalToday.size
    const activeUsersDeltaGlobal = calculateDelta(
      activeUsersGlobalCount,
      activeUserIdsGlobalYesterday.size
    )

    const totalAllUsersCount = allUsers.filter(u => u.is_active).length

    // 6. Aktivitas Terbaru Seluruh Plant (Bagian D - 5 baris terbaru)
    const recentAllActivities = [...filteredLogs]
      .sort((a, b) => (b.task_date + b.start_time).localeCompare(a.task_date + a.start_time))
      .slice(0, 5)
      .map(l => ({
        ...l,
        formatted_time: formatDateTimeIndo(l.task_date, l.start_time),
        user_initials: getInitials(l.user_name),
        machine_and_activity: `${l.machine_name} / ${l.activity_description}`,
        plant_color: plantColors[l.plant_id] || plantColors[1]
      }))

    // 7. Data Distribusi Logbook per Line / Mesin (% Line Terbanyak)
    const lineCounts = {}
    filteredLogs.forEach(l => {
      const key = l.machine_name || (l.machine_id ? `Mesin-${l.machine_id}` : 'Line Umum')
      if (!lineCounts[key]) {
        const plant = plants.find(p => p.id === l.plant_id)
        lineCounts[key] = {
          machineId: l.machine_id,
          name: l.machine_name || 'Line Produksi',
          code: l.machine_code || `EQ-0${l.machine_id || 1}`,
          plantId: l.plant_id,
          plantName: plant ? plant.name : (l.plant_name || `Plant ${l.plant_id}`),
          color: plantColors[l.plant_id] || plantColors[1],
          count: 0
        }
      }
      lineCounts[key].count++
    })

    const totalLogsForLines = filteredLogs.length || 1
    const topLines = Object.values(lineCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item, idx) => ({
        rank: idx + 1,
        ...item,
        percentage: Math.round((item.count / totalLogsForLines) * 100)
      }))

    const topLinesSummary = {
      lines: topLines,
      totalLogs: filteredLogs.length,
      topLine: topLines[0] || null
    }

    // 8. Data User Aktif per Plant (Bagian E)
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

    return {
      kpi: {
        totalLog: totalLogGlobal,
        totalLogDelta: todayLogDeltaGlobal,
        todayLog: todayLogGlobal,
        todayLogDelta: todayLogDeltaGlobal,
        activeUsers: activeUsersGlobalCount,
        activeUsersDelta: activeUsersDeltaGlobal
      },
      plants: plantCards,
      recentActivities: recentAllActivities,
      topLinesSummary,
      userActiveSummary: {
        plants: userActivePerPlant,
        total: overallActiveUsersTotal
      }
    }
  },

  /**
   * Mengambil data spesifik Line / Plant untuk user Teknisi
   * Termasuk PlantCard data, daftar mesin Line & status servis terakhir, serta seluruh log aktivitas di Line
   * @param {Object} currentUser User teknisi yang sedang login
   */
  async getTechnicianLineOverview(currentUser) {
    if (!currentUser) return null
    const plantId = Number(currentUser.plant_id || 1)

    const [allLogs, masterData, allUsers] = await Promise.all([
      logbookService.getLogbooks({}),
      masterService.getAllMaster(),
      userService.getUsers().catch(() => [])
    ])

    const todayStr = toLocalDateString(new Date())
    const yesterdayStr = addDays(todayStr, -1)

    const plants = masterData.plants || []
    const plant = plants.find(p => p.id === plantId) || plants[0] || { id: 1, name: 'Plant 1', code: 'PLANT-01' }

    const plantColors = {
      1: { hex: '#2563EB', name: 'primary', bg: 'bg-primary', text: 'text-primary' },
      2: { hex: '#EAB308', name: 'warning', bg: 'bg-warning', text: 'text-warning' },
      3: { hex: '#22A55B', name: 'success', bg: 'bg-success', text: 'text-success' },
      4: { hex: '#F97316', name: 'orange', bg: 'bg-orange', text: 'text-orange' }
    }

    const pLogs = allLogs.filter(l => l.plant_id === plant.id)
    const totalLog = pLogs.length

    // Hari Ini vs Kemarin
    const todayLogs = pLogs.filter(l => l.task_date === todayStr)
    const yesterdayLogs = pLogs.filter(l => l.task_date === yesterdayStr)
    const todayCount = todayLogs.length
    const yesterdayCount = yesterdayLogs.length
    const todayDelta = calculateDelta(todayCount, yesterdayCount)

    // User Aktif
    const activeUserIdsToday = new Set(todayLogs.map(l => l.user_id))
    const activeUserIdsYesterday = new Set(yesterdayLogs.map(l => l.user_id))
    const activeUsersCount = activeUserIdsToday.size
    const yesterdayActiveUsersCount = activeUserIdsYesterday.size
    const activeUsersDelta = calculateDelta(activeUsersCount, yesterdayActiveUsersCount)

    const plantUsers = allUsers.filter(u => u.plant_id === plant.id && u.is_active)
    const totalUsersCount = Math.max(plantUsers.length, activeUsersCount)
    const activePercentage = totalUsersCount > 0
      ? Math.round((activeUsersCount / totalUsersCount) * 100)
      : 0

    // 7 Hari Terakhir
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const dStr = addDays(todayStr, -i)
      const dObj = parseLocalDate(dStr)
      const dayLabel = DAY_SHORT_ID[dObj.getDay()]
      const count = pLogs.filter(l => l.task_date === dStr).length
      last7Days.push({
        date: dStr,
        dayLabel,
        count
      })
    }

    // 3 Log Terbaru Plant
    const recentLogs = [...pLogs]
      .sort((a, b) => (b.task_date + b.start_time).localeCompare(a.task_date + a.start_time))
      .slice(0, 3)
      .map(l => ({
        ...l,
        formatted_time: formatDateTimeIndo(l.task_date, l.start_time),
        user_initials: getInitials(l.user_name)
      }))

    // Leaderboard Teknisi Teraktif
    const userLogCounts = {}
    pLogs.forEach(l => {
      if (!l.user_id) return
      if (!userLogCounts[l.user_id]) {
        const user = allUsers.find(u => u.id === l.user_id) || {}
        userLogCounts[l.user_id] = {
          userId: l.user_id,
          name: user.full_name || l.user_name || 'Teknisi',
          initials: getInitials(user.full_name || l.user_name),
          photo_url: user.photo_url || null,
          count: 0
        }
      }
      userLogCounts[l.user_id].count++
    })

    let plantLeaderboard = Object.values(userLogCounts)
      .sort((a, b) => b.count - a.count)
      .map((item, idx) => ({
        rank: idx + 1,
        ...item,
        percentage: totalLog > 0 ? Math.round((item.count / totalLog) * 100) : 0
      }))
      .slice(0, 4)

    if (plantLeaderboard.length === 0) {
      plantLeaderboard = plantUsers.slice(0, 4).map((u, idx) => ({
        rank: idx + 1,
        userId: u.id,
        name: u.full_name,
        initials: getInitials(u.full_name),
        photo_url: u.photo_url || null,
        count: 0,
        percentage: 0
      }))
    }

    const plantCard = {
      id: plant.id,
      name: `PLANT ${plant.id}`,
      fullName: plant.name,
      code: plant.code,
      status: 'OPERASIONAL',
      color: plantColors[plant.id] || plantColors[1],
      totalLog,
      totalLogDelta: todayDelta,
      todayLog: todayCount,
      todayDelta,
      activeUsersCount,
      activeUsersDelta,
      totalUsersCount,
      activePercentage,
      last7Days,
      recentLogs,
      leaderboard: plantLeaderboard
    }

    // Daftar Mesin & Status Terakhir di Line Ini
    const machinesInPlant = (masterData.machines || []).filter(m => m.plant_id === plant.id)
    const lineMachines = machinesInPlant.map(machine => {
      const machineLogs = pLogs.filter(l => l.machine_id === machine.id)
      const subMachines = (masterData.subMachines || []).filter(sm => sm.machine_id === machine.id)
      const sortedMLogs = [...machineLogs].sort((a, b) => (b.task_date + b.start_time).localeCompare(a.task_date + a.start_time))
      const lastLog = sortedMLogs[0] || null

      return {
        ...machine,
        subMachinesCount: subMachines.length,
        subMachines,
        totalLogs: machineLogs.length,
        lastLog: lastLog ? {
          id: lastLog.id,
          task_date: lastLog.task_date,
          user_name: lastLog.user_name,
          start_time: lastLog.start_time,
          end_time: lastLog.end_time,
          activity_description: lastLog.activity_description,
          status: lastLog.status
        } : null
      }
    })

    // Semua riwayat log di Line ini (termasuk teknisi lain)
    const allLineLogs = [...pLogs].sort((a, b) => (b.task_date + b.start_time).localeCompare(a.task_date + a.start_time))

    return {
      plantCard,
      lineMachines,
      allLineLogs,
      plantUsers
    }
  }
}
