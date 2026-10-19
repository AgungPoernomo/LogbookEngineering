import prisma from '../config/prisma.js'
import { successResponse } from '../utils/response.js'

export async function getTeamOverview(req, res, next) {
  try {
    const supervisorId = req.user.id
    const supervisorPlantId = req.user.plant_id
    const supervisorGroupId = req.user.group_id

    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const dStr = String(today.getDate()).padStart(2, '0')
    const todayStr = `${y}-${m}-${dStr}`
    const currentYearMonth = `${y}-${m}`

    // 7 hari terakhir
    const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    const last7DaysDates = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      last7DaysDates.push({ date: dateStr, dayLabel: dayLabels[d.getDay()] })
    }

    // Ambil seluruh user Teknisi yang aktif
    const technicians = await prisma.user.findMany({
      where: {
        role: { name: 'Teknisi' },
        is_active: true
      },
      include: {
        role: true,
        plant: true,
        group: true,
        logbooks: {
          orderBy: [{ task_date: 'desc' }, { start_time: 'desc' }],
          include: {
            machine: true,
            subMachine: true,
            shift: true
          }
        }
      }
    })

    const technicianOverview = technicians.map(tech => {
      const isDirectTeam = (
        (supervisorPlantId && tech.plant_id && Number(tech.plant_id) === supervisorPlantId) ||
        (supervisorGroupId && tech.group_id && Number(tech.group_id) === supervisorGroupId)
      )

      const userLogs = tech.logbooks
      const totalLogs = userLogs.length
      const monthLogs = userLogs.filter(l => l.task_date.startsWith(currentYearMonth)).length

      const last7Days = last7DaysDates.map(dayInfo => {
        const count = userLogs.filter(l => l.task_date === dayInfo.date).length
        return { ...dayInfo, count }
      })
      const weekLogs = last7Days.reduce((acc, d) => acc + d.count, 0)
      const todayLogs = userLogs.filter(l => l.task_date === todayStr).length
      const isActiveToday = todayLogs > 0

      const totalDurationMinutes = userLogs.reduce((acc, l) => acc + l.duration_minutes, 0)

      const statusCounts = {
        approved: userLogs.filter(l => l.status === 'APPROVED').length,
        pending: userLogs.filter(l => l.status === 'PENDING').length,
        rejected: userLogs.filter(l => l.status === 'REJECTED').length,
        draft: userLogs.filter(l => l.status === 'DRAFT').length
      }

      // Hitung mesin paling sering ditangani
      const machineCounts = {}
      userLogs.forEach(l => {
        const mName = l.machine?.name
        if (mName) machineCounts[mName] = (machineCounts[mName] || 0) + 1
      })
      let topMachine = '-'
      let maxCount = 0
      for (const [mName, count] of Object.entries(machineCounts)) {
        if (count > maxCount) {
          maxCount = count
          topMachine = mName
        }
      }

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

      const lastLog = userLogs[0] ? {
        task_date: userLogs[0].task_date,
        start_time: userLogs[0].start_time,
        machine_name: userLogs[0].machine?.name
      } : null

      return {
        id: Number(tech.id),
        nik: tech.nik,
        full_name: tech.full_name,
        email: tech.email,
        photo_url: tech.photo_url,
        plant_id: tech.plant_id ? Number(tech.plant_id) : null,
        plant_name: tech.plant?.name || '-',
        group_id: tech.group_id ? Number(tech.group_id) : null,
        group_name: tech.group?.name || '-',
        isDirectTeam,
        totalLogs,
        monthLogs,
        weekLogs,
        todayLogs,
        isActiveToday,
        last7Days,
        totalDurationMinutes,
        statusCounts,
        topMachine,
        frequencyScore,
        frequencyBadgeClass,
        lastLog,
        logs: userLogs.map(l => ({
          id: Number(l.id),
          task_date: l.task_date,
          start_time: l.start_time,
          end_time: l.end_time,
          duration_minutes: l.duration_minutes,
          machine_name: l.machine?.name,
          sub_machine_name: l.subMachine?.name || '-',
          shift_name: l.shift?.name || '-',
          activity_description: l.activity_description,
          sparepart: l.sparepart,
          status: l.status
        }))
      }
    })

    return successResponse(res, {
      message: 'Ringkasan aktivitas teknisi tim berhasil diambil.',
      data: {
        technicians: technicianOverview,
        total_technicians: technicianOverview.length,
        direct_team_count: technicianOverview.filter(t => t.isDirectTeam).length,
        active_today_count: technicianOverview.filter(t => t.isActiveToday).length
      }
    })
  } catch (err) {
    next(err)
  }
}
