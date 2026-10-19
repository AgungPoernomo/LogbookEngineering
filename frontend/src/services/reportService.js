import { logbookService } from './logbookService'
import { formatDuration } from '../utils/duration'

export const reportService = {
  async generateReportData(filters = {}) {
    const list = await logbookService.getLogbooks(filters)
    
    const totalLogbooks = list.length
    const totalMinutes = list.reduce((acc, l) => acc + (l.duration_minutes || 0), 0)
    const approvedCount = list.filter(l => l.status === 'APPROVED').length
    const pendingCount = list.filter(l => l.status === 'PENDING').length
    const rejectedCount = list.filter(l => l.status === 'REJECTED').length

    return {
      items: list,
      summary: {
        totalLogbooks,
        totalHours: (totalMinutes / 60).toFixed(1),
        approvedCount,
        pendingCount,
        rejectedCount
      }
    }
  },

  exportToCSV(items, filename = 'Laporan-Logbook-Satoria.csv') {
    if (!items || items.length === 0) return

    const headers = [
      'ID Logbook',
      'Tanggal',
      'NIK Teknisi',
      'Nama Teknisi',
      'Plant',
      'Shift',
      'Mesin',
      'Sub-Mesin',
      'Jam Mulai',
      'Jam Selesai',
      'Durasi (Menit)',
      'Suku Cadang',
      'Deskripsi Aktivitas',
      'Status Approval',
      'Supervisor Pemeriksa',
      'Catatan Approval'
    ]

    const rows = items.map(l => [
      `"${l.id}"`,
      `"${l.task_date}"`,
      `"${l.user_nik || '-'}"`,
      `"${l.user_name || '-'}"`,
      `"${l.plant_name || '-'}"`,
      `"${l.shift_name || '-'}"`,
      `"${l.machine_name || '-'}"`,
      `"${l.sub_machine_name || '-'}"`,
      `"${l.start_time || '-'}"`,
      `"${l.end_time || '-'}"`,
      `"${l.duration_minutes || 0}"`,
      `"${(l.sparepart || '-').replace(/"/g, '""')}"`,
      `"${(l.activity_description || '-').replace(/"/g, '""')}"`,
      `"${l.status || '-'}"`,
      `"${l.supervisor_name || '-'}"`,
      `"${(l.approval_notes || '-').replace(/"/g, '""')}"`
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
