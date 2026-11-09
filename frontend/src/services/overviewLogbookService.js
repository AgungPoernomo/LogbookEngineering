import api from './api'
import { logbookService } from './logbookService'
import { masterService } from './masterService'
import { userService } from './userService'
import { ROLES } from '../constants/roles'
import { toLocalDateString, addDays, parseLocalDate, getWIBYearMonth } from '../utils/dateKeys'

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

    const query = { ...filters }

    // Supervisor → batasi ke plant-nya
    if (currentUser.role === 'Supervisor' && currentUser.plant_id) {
      query.plant_id = currentUser.plant_id
    }

    // 2. Tarik data agregasi langsung dari endpoint backend terpusat
    // Tanpa fallback lokal untuk mencegah payload bloat dan race condition pada jaringan lemah
    const res = await api.get('/overview/dashboard', query)
    if (!res || !res.kpi || !res.plants) {
      throw new Error('Data overview dari server tidak lengkap atau format tidak sesuai.')
    }

    return res
  },

  /**
   * Mengambil data spesifik Line / Plant untuk user Teknisi
   * Termasuk PlantCard data, daftar mesin Line & status servis terakhir, serta seluruh log aktivitas di Line
   * @param {Object} currentUser User teknisi yang sedang login
   */
  async getTechnicianLineOverview(currentUser) {
    if (!currentUser) return null
    const plantId = Number(currentUser.plant_id || 1)

        const [allLogs, masterData] = await Promise.all([
      logbookService.getLogbooks({ plant_id: plantId }),
      masterService.getAllMaster()
    ])

    // FIX BUG "Teknisi di Line Ini" (0 User):
    // Sebelumnya daftar user di Plant tidak pernah diambil dari backend
    // (hanya diisi user yang sedang login), sehingga card "Teknisi di Line Ini"
    // selalu kosong / 0 User. Sekarang daftar user Plant diambil dari GET /users
    // (endpoint read-only yang kini juga diizinkan untuk role Teknisi,
    // dan otomatis di-scope ke plant & akun aktif oleh backend).
    let allUsers = currentUser ? [currentUser] : []
    try {
      const plantUsersFromApi = await userService.getUsers({
        plant_id: plantId,
        is_active: 'true',
        limit: 'all'
      })
      if (Array.isArray(plantUsersFromApi) && plantUsersFromApi.length > 0) {
        allUsers = plantUsersFromApi
      }
    } catch (err) {
      console.warn('Gagal mengambil daftar teknisi Plant, fallback ke user aktif yang sedang login:', err)
    }

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

    // Filter tipe-aman (plant.id bisa number/string) & enrich field initials untuk card
    const plantUsers = allUsers
      .filter(u => Number(u.plant_id) === Number(plant.id) && (u.is_active === undefined || u.is_active !== false))
      .map(u => ({
        ...u,
        id: Number(u.id),
        full_name: u.full_name || u.name || 'Teknisi',
        initials: u.initials || getInitials(u.full_name || u.name)
      }))
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
