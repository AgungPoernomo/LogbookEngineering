import prisma from '../config/prisma.js'
import { successResponse } from '../utils/response.js'
import { getWIBDateString, getWIBLastNDays, getWIBYearMonth } from '../utils/date.js'

const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
]

// Batas bawah leksikografis untuk kolom `task_date` (VARCHAR 'YYYY-MM-DD').
// Dipakai untuk mengecualikan baris legacy yang task_date-nya bukan tanggal
// (mis. 'pengamatan', 'diskusi ta') agar tidak merusak urutan/agregasi.
const ISO_DATE_PREFIX = '1000-01-01'
const ISO_DATE_SUFFIX = '9999-12-31'

/**
 * Apakah nilai `task_date` berformat ISO 'YYYY-MM-DD'.
 * Dipakai sebagai penjaga: agregasi statistik hanya boleh menghitung baris valid.
 */
function isIsoTaskDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/**
 * Filter `task_date` untuk satu jendela waktu yang SUDAH FINAL.
 *
 * PENTING (BUG-014): jendela waktu WAJIB selalu ditetapkan di sini dan MENIMPA
 * `task_date` yang mungkin sudah ada pada `baseWhere`/`periodWhere`. Sebelumnya
 * `{ ...baseWhere, task_date: <hari ini> }` membuat `task_date` yang lebih akhir
 * (yaitu `gte/lte` atau `startsWith` bulan) membatalkan filter hari tersebut,
 * sehingga "Log Harian" pada kartu plant bisa berisi total seluruh scope.
 *
 * @param {'period'|'day'|'range'} kind
 * @param {string|string[]} value bulan 'YYYY-MM', tanggal 'YYYY-MM-DD', atau daftar tanggal
 * @returns {{ task_date: string | { startsWith: string } | { in: string[] } }}
 */
function taskDateWindow(kind, value) {
  if (kind === 'period') {
    // Buang tanggal rusak (mis. 'pengamatan') sekaligus saring bulan.
    return { task_date: { gte: `${value}-00`, lte: `${value}-99` } }
  }
  if (kind === 'range') {
    const dates = Array.isArray(value) ? value.filter(isIsoTaskDate) : []
    return { task_date: { in: dates } }
  }
  return { task_date: value }
}

/**
 * Batas jendela `baseWhere.task_date` sebagai object mentah (tanpa `task_date`)
 * agar aman di-spread sebelum jendela waktu khusus ditimpakan.
 */
function scopeWithoutTaskDate(where) {
  const { task_date: _ignored, ...rest } = where || {}
  return rest
}

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

    // Target Bulan & Tahun (acuan WIB, bukan UTC)
    // Default = bulan berjalan WIB, sehingga "Total Log" tidak pernah
    // diam-diam berubah menjadi all-time saat filter dikosongkan.
    let targetYM = yearMonth
    if (!targetYM && year && month) {
      targetYM = `${year}-${String(month).padStart(2, '0')}`
    }

    // BUG FIX #1 — Sanitasi input filter bulan.
    // <input type="month"> mengirim '' saat dikosongkan, dan klien bisa
    // mengirim 'undefined'/'null' sebagai string. Tanpa validasi, targetYM
    // menjadi string sampah → `task_date startsWith 'undefined'` → 0 baris.
    if (typeof targetYM !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(targetYM.trim())) {
      targetYM = getWIBYearMonth()
    } else {
      targetYM = targetYM.trim()
    }

    // `baseWhere`  = scope organisasi (Supervisor/Plant/Shift/Group/Search) TANPA filter bulan.
    //                Dipakai untuk: Log Harian, User Aktif, Chart 7 Hari, Log Terbaru.
    // `periodWhere` = baseWhere + filter bulan.
    //                Dipakai HANYA untuk: "Total Log" (kartu periode).
    const baseWhere = {}
    const periodWhere = {}

    if (req.user?.role === 'Supervisor' && req.user?.plant_id) {
      baseWhere.plant_id = BigInt(req.user.plant_id)
    } else if (plant_id && plant_id !== 'ALL') {
      baseWhere.plant_id = BigInt(plant_id)
    }

    if (shift_id && shift_id !== 'ALL') {
      baseWhere.shift_id = BigInt(shift_id)
    }

    if (group_id && group_id !== 'ALL') {
      const groupUsers = await prisma.user.findMany({
        where: { group_id: BigInt(group_id) },
        select: { id: true }
      })
      baseWhere.user_id = { in: groupUsers.map(u => u.id) }
    }

    // BUG FIX #2 — Pencarian hanya menyaring daftar Log Terbaru.
    // Dulu `search` ikut masuk ke where agregasi, sehingga mengetik
    // apa pun di kolom pencarian membuat SELURUH kartu statistik & chart
    // menjadi 0 (termasuk saat debounce 300ms masih berjalan).
    const searchWhere = {}
    if (search && search.trim()) {
      const q = search.trim()
      searchWhere.OR = [
        { activity_description: { contains: q } },
        { sparepart: { contains: q } },
        { machine: { name: { contains: q } } },
        { user: { full_name: { contains: q } } }
      ]
    }

    Object.assign(periodWhere, baseWhere)

    // BUG FIX #3 — Hanya hitung baris dengan task_date berformat ISO 'YYYY-MM-DD'.
    // Ditemukan 3 baris legacy berisi 'pengamatan' / 'diskusi ta' (created_at 2025)
    // yang merusak GROUP BY & urutan `orderBy task_date desc` (muncul paling atas
    // dan menggeser log asli dari daftar "Log Terbaru").
    baseWhere.task_date = { gte: ISO_DATE_PREFIX, lte: ISO_DATE_SUFFIX }

    if (targetYM) {
      periodWhere.task_date = { startsWith: targetYM }
    }

    // Tanggal acuan WIB (Asia/Jakarta / UTC+7) — JANGAN pakai toISOString() yang UTC.
    const todayStr = getWIBDateString()
    const last2Days = getWIBLastNDays(2)
    const yesterdayStr = last2Days[0].date
    const last7Days = getWIBLastNDays(7)
    const last7DaysStrings = last7Days.map(d => d.date)

    // Scope organisasi TANPA pembatas tanggal. Setiap agregasi WAJIB menimpakan
    // jendela waktunya sendiri lewat `taskDateWindow()`.
    const baseScope = scopeWithoutTaskDate(baseWhere)

    /**
     * Muat seluruh agregasi statistik untuk plant-card yang SEDANG DITAMPILKAN.
     *
     * BUG-014: sebelumnya agregasi memakai `baseWhere`/`periodWhere` global tanpa
     * menyertakan plant dari kartu yang dirender. Akibatnya, saat scope dipersempit
     * (Admin memilih satu Line, atau Supervisor Line), `groupBy` hanya mengembalikan
     * baris milik Line yang dipilih, sehingga SEMUA kartu lain — termasuk kartu Line
     * yang sedang difilter — mendapat `0` untuk Total Log, Log Harian, User Aktif,
     * dan Chart 7 Hari. Daftar "Log Terbaru"-nya tetap berisi data karena query-nya
     * memakai `plant_id: p.id` secara langsung.
     *
     * Karena kartu memang selalu dirender per plant, setiap agregasi kini di-scope
     * ke `plant_id: { in: plantIds }` sehingga tidak ada baris yang hilang.
     */
    async function loadPlantAggregates(plantIds) {
      const plantScope = { plant_id: { in: plantIds } }
      const periodScope = { ...baseScope, ...plantScope, ...taskDateWindow('period', targetYM) }
      const todayScope = { ...baseScope, ...plantScope, ...taskDateWindow('day', todayStr) }
      const yesterdayScope = { ...baseScope, ...plantScope, ...taskDateWindow('day', yesterdayStr) }
      const last7Scope = { ...baseScope, ...plantScope, ...taskDateWindow('range', last7DaysStrings) }

      const [logCounts, todayCounts, yesterdayCounts, activeUsersToday, activeUsersYesterday, trend7, logUserCountsPeriod, topMachines] =
        await Promise.all([
          prisma.logbook.groupBy({ by: ['plant_id'], where: periodScope, _count: { id: true } }),
          prisma.logbook.groupBy({ by: ['plant_id'], where: todayScope, _count: { id: true } }),
          prisma.logbook.groupBy({ by: ['plant_id'], where: yesterdayScope, _count: { id: true } }),
          prisma.logbook.groupBy({ by: ['plant_id', 'user_id'], where: todayScope }),
          prisma.logbook.groupBy({ by: ['plant_id', 'user_id'], where: yesterdayScope }),
          prisma.logbook.groupBy({ by: ['plant_id', 'task_date'], where: last7Scope, _count: { id: true } }),
          prisma.logbook.groupBy({ by: ['plant_id', 'user_id'], where: periodScope, _count: { id: true } }),
          prisma.logbook.groupBy({ by: ['machine_id', 'plant_id'], where: periodScope, _count: { id: true } })
        ])

      return {
        logCounts,
        todayCounts,
        yesterdayCounts,
        activeUsersToday,
        activeUsersYesterday,
        trend7,
        logUserCountsPeriod,
        topMachines
      }
    }

    // FASE A — Agregasi global (KPI) + master data. Agregasi per plant BELUM
    // dijalankan karena daftar plant-card yang dirender belum diketahui.
    const [
      totalLogGlobal,
      todayLogGlobal,
      yesterdayLogGlobal,
      activeUsersTodayGroup,
      activeUsersYesterdayGroup,
      allPlants,
      allUsers,
      cardScopePeriod,
      cardScopeLatest,
      allMachines,
      recent5Activities
    ] = await Promise.all([
      // Total Log = kartu periode → mengikuti filter bulan (periodWhere)
      prisma.logbook.count({ where: periodWhere }),
      // Log Harian, User Aktif, Chart 7 Hari → TIDAK boleh terikat filter bulan.
      // `taskDateWindow` WAJIB ditimpakan agar `task_date` milik baseWhere tidak
      // membatalkan filter hari (lihat catatan BUG-014 pada taskDateWindow).
      prisma.logbook.count({ where: { ...baseScope, ...taskDateWindow('day', todayStr) } }),
      prisma.logbook.count({ where: { ...baseScope, ...taskDateWindow('day', yesterdayStr) } }),
      prisma.logbook.groupBy({ by: ['user_id'], where: { ...baseScope, ...taskDateWindow('day', todayStr) } }),
      prisma.logbook.groupBy({ by: ['user_id'], where: { ...baseScope, ...taskDateWindow('day', yesterdayStr) } }),
      prisma.plant.findMany({ orderBy: { id: 'asc' } }),
      prisma.user.findMany({
        where: { is_active: true },
        select: { id: true, full_name: true, plant_id: true, photo_url: true }
      }),
      // Ringan: hanya dipakai untuk menentukan plant mana saja yang punya log.
      prisma.logbook.groupBy({ by: ['plant_id'], where: periodWhere, _count: { id: true } }),
      // Daftar "Log Terbaru" per kartu tidak terikat filter bulan, jadi plant yang
      // hanya punya log di luar periode tetap harus mendapat kartu.
      prisma.logbook.findMany({
        where: baseWhere,
        orderBy: [{ task_date: 'desc' }, { start_time: 'desc' }],
        take: 60,
        select: { plant_id: true }
      }),
      prisma.machine.findMany({ select: { id: true, name: true, plant_id: true } }),
      // Log Terbaru = aktivitas paling akhir dari seluruh scope (tanpa filter bulan),
      // supaya selalu ada isi seperti yang terlihat di UI.
      prisma.logbook.findMany({
        where: { ...baseWhere, ...searchWhere },
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

    const collectPlantIds = (rows) => new Set(
      (rows || []).filter(r => r?.plant_id != null).map(r => Number(r.plant_id))
    )

    // FASE B — Tentukan plant-card yang dirender.
    // Kartu WAJIB mencakup plant tempat data logbook berada (bukan hanya id 1-4):
    // plant lain (mis. 30001 'General') harus mendapat kartu yang terisi, bukan 0.
    const plantIdsWithLogs = collectPlantIds(cardScopePeriod)
    const plantIdsWithRecentLogs = collectPlantIds(cardScopeLatest)
    let plants = allPlants.filter(p => [1, 2, 3, 4].includes(Number(p.id)))
    // Tambahkan plant yang punya log pada scope ini (belum tercakup di 4 kartu utama)
    allPlants.forEach(p => {
      const pid = Number(p.id)
      if (!plants.some(pl => Number(pl.id) === pid) && (plantIdsWithLogs.has(pid) || plantIdsWithRecentLogs.has(pid) || Number(req.user?.plant_id) === pid)) {
        plants.push(p)
      }
    })
    // Supervisor: prioritaskan plant-nya sendiri di urutan pertama
    if (req.user?.role === 'Supervisor' && req.user?.plant_id) {
      const supPlant = plants.find(p => Number(p.id) === Number(req.user.plant_id))
      if (supPlant) {
        plants = [supPlant, ...plants.filter(p => p !== supPlant)]
      }
    }

    // FASE C — Agregasi statistik untuk plant-card yang dirender (BUG-014).
    // Di-scope ke `plants.map(p => p.id)`, sehingga setiap kartu memperoleh angka
    // miliknya sendiri, bukan hanya milik plant yang sedang difilter.
    const {
      logCounts: plantLogCounts,
      todayCounts: plantTodayCounts,
      yesterdayCounts: plantYesterdayCounts,
      activeUsersToday: plantActiveUsersToday,
      activeUsersYesterday: plantActiveUsersYesterday,
      trend7: trend7DaysGroup,
      logUserCountsPeriod: userLogCountsGroup,
      topMachines: topMachinesGroup
    } = await loadPlantAggregates(plants.map(p => p.id))

    // Ambil 3 log terbaru untuk masing-masing plant secara paralel
    // (`baseWhere` tanpa filter bulan → daftar "Log Terbaru" per kartu selalu terisi)
    const recent3LogsPerPlant = await Promise.all(
      plants.map(p =>
        prisma.logbook.findMany({
          where: { ...baseWhere, ...searchWhere, plant_id: p.id },
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
        code: String(plant.name).toUpperCase().replace(/\s+/g, '-'),
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

