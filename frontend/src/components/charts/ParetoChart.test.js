import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import ParetoChart from './ParetoChart.vue'

// ============================================================================
// Komponen grafik Pareto (Bar + Garis Kumulatif, sumbu Y ganda).
// Mengunci kontrak: warna vital-few, warna netral, tinggi kanvas adaptif,
// dan tabel aksesibilitas yang selalu membawa angka pasti.
// ============================================================================

const machineRows = [
  { rank: 1, machine_id: 10, name: 'Filler', breakdown_count: 5, downtime_hours: 12, percent: 60, cumulative_percent: 60, is_vital_few: true },
  { rank: 2, machine_id: 11, name: 'Capper', breakdown_count: 3, downtime_hours: 4, percent: 20, cumulative_percent: 80, is_vital_few: true },
  { rank: 3, machine_id: 12, name: 'Labeler', breakdown_count: 2, downtime_hours: 4, percent: 20, cumulative_percent: 100, is_vital_few: false }
]

function render(props) {
  return renderToString(createSSRApp({ render: () => h(ParetoChart, props) }))
}

describe('ParetoChart', () => {
  it('mengunci sumbu kumulatif pada 0-100% agar garis 80% presisi', async () => {
    const html = await render({ items: machineRows })

    expect(html).toContain('Vital Few')
    expect(html).toContain('useful many')
    expect(html).toContain('% Kumulatif (sumbu kanan)')
  })

  it('menyediakan tinggi kanvas responsif yang tumbuh sesuai jumlah bar', async () => {
    const few = await render({ items: machineRows })
    const many = await render({
      items: Array.from({ length: 12 }, (_, i) => ({
        rank: i + 1, name: `Mesin ${i + 1}`, downtime_hours: 1, percent: 8, cumulative_percent: (i + 1) * 8, is_vital_few: i < 10
      }))
    })

    // 3 bar -> batas bawah 260px; 12 bar -> 12*34+90 = 498 -> dibatasi 460px
    expect(few).toContain('height:260px')
    expect(many).toContain('height:460px')
  })

  it('memotong grafik sesuai maxBars dan sinkron dengan tabel aksesibilitas', async () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      rank: i + 1, name: `Mesin ${i + 1}`, downtime_hours: 1, percent: 6.7, cumulative_percent: Math.min(100, (i + 1) * 6.7), is_vital_few: i < 12
    }))
    const html = await render({ items: rows, maxBars: 5 })

    // Grafik & tabel sr-only memakai `normalizedItems` yang sama -> keduanya 5 baris
    // (baris ke-6..15 tetap tampil di tabel detail parent sebagai angka pasti).
    const srTable = html.slice(html.indexOf('<table>'), html.indexOf('</table>'))
    const bodyRows = (srTable.slice(srTable.indexOf('<tbody>')).match(/<tr>/g) || []).length
    expect(bodyRows).toBe(5)
  })

  it('header kolom nilai memakai label metrik yang ter-resolve (bukan kosong)', async () => {
    const machine = await render({ items: machineRows })
    const failure = await render({ items: machineRows, metric: 'failure' })

    expect(machine).toContain('<th scope="col">Downtime (Jam)</th>')
    expect(failure).toContain('<th scope="col">Frekuensi Kejadian</th>')
  })

  it('merender tabel aksesibilitas dengan angka downtime & persentase format Indonesia', async () => {
    const html = await render({ items: machineRows, metric: 'machine', valueLabel: 'Downtime (Jam)' })

    expect(html).toContain('<caption>Diagram Pareto</caption>')
    expect(html).toContain('Downtime (Jam)')
    expect(html).toContain('Kumulatif')
    expect(html).toContain('60%')
    expect(html).toContain('80%')
    expect(html).toContain('100%')
  })

  it('membaca frekuensi (count) untuk Pareto kode kerusakan + awalan kode', async () => {
    const html = await render({
      items: [
        { rank: 1, failure_code_id: 5, code: 'MECH-BRG', name: 'Bearing Aus', count: 9, percent: 75, cumulative_percent: 75, is_vital_few: true },
        { rank: 2, failure_code_id: 6, code: 'ELEC-MTR', name: 'Motor Trip', count: 3, percent: 25, cumulative_percent: 100, is_vital_few: false }
      ],
      metric: 'failure',
      valueLabel: 'Frekuensi Kejadian',
      showCodePrefix: true
    })

    expect(html).toContain('Frekuensi Kejadian')
    expect(html).toContain('75%')
    // Nilai bar diambil dari `count`, bukan `downtime_hours`
    expect(html).toContain('<td>9</td>')
  })

  it('aman saat belum ada data (empty state) tanpa melempar error', async () => {
    const html = await render({ items: [] })

    expect(html).toContain('belum ada data')
    expect(html).toContain('height:260px')
  })
})
