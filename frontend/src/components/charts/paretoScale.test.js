import { describe, it, expect } from 'vitest'
import { Chart as ChartJS, BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, BasicPlatform } from 'chart.js'

// Verifikasi matematika skala Pareto secara headless (BasicPlatform, tanpa browser):
// sumbu kanan harus dikunci 0-100% agar garis kumulatif 80% jatuh TEPAT pada
// posisi piksel garis bantu 80% yang digambar plugin.
describe('ParetoChart — matematika sumbu (headless)', () => {
  function buildChart() {
    const canvas = { width: 800, height: 400, style: {}, getContext: () => ctx, addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ width: 800, height: 400, left: 0, top: 0 }) }
    var ctx = new Proxy({}, {
      get(t, k) {
        if (k in t) return t[k]
        if (k === 'canvas') return canvas
        if (k === 'measureText') return (s) => ({ width: String(s).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 })
        return () => {}
      },
      set(t, k, v) { t[k] = v; return true }
    })

    ChartJS.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip)

    return new ChartJS(canvas, {
      type: 'bar',
      data: {
        labels: ['Filler', 'Capper', 'Labeler'],
        datasets: [
          { type: 'bar', data: [12, 4, 4], yAxisID: 'y' },
          { type: 'line', data: [60, 80, 100], yAxisID: 'yPercent' }
        ]
      },
      options: {
        responsive: false,
        animation: false,
        devicePixelRatio: 1,
        scales: {
          x: { display: true, ticks: { display: false } },
          y: { position: 'left', beginAtZero: true, ticks: { display: false } },
          yPercent: { position: 'right', beginAtZero: true, min: 0, max: 100, ticks: { display: false } }
        }
      },
      platform: BasicPlatform
    })
  }

  it('sumbu kanan terkunci 0-100% dan sumbu kiri berskala absolut', () => {
    const chart = buildChart()

    expect(chart.scales.yPercent.min).toBe(0)
    expect(chart.scales.yPercent.max).toBe(100)
    expect(chart.scales.yPercent.position).toBe('right')
    expect(chart.scales.y.position).toBe('left')

    // Sumbu kiri mengikuti nilai absolut (max bar 12 jam), bukan persentase.
    expect(chart.scales.y.max).toBeGreaterThanOrEqual(12)
    expect(chart.scales.y.max).toBeLessThanOrEqual(15)
  })

  it('titik kumulatif 80% sejajar persis dengan rumus garis bantu 80% pada plugin', () => {
    const chart = buildChart()
    const scale = chart.scales.yPercent

    // Rumus di plugin: y = top + (1 - threshold/100) * (bottom - top)
    const threshold = 80
    const lineY = scale.top + (1 - threshold / 100) * (scale.bottom - scale.top)
    const pointY = scale.getPixelForValue(80)

    expect(Math.abs(lineY - pointY)).toBeLessThan(0.5)
  })

  it('urutan sumbu terbalik secara benar (100% di atas, 0 jam di bawah)', () => {
    const chart = buildChart()

    expect(chart.scales.yPercent.getPixelForValue(100)).toBeLessThan(chart.scales.yPercent.getPixelForValue(0))
    expect(chart.scales.y.getPixelForValue(0)).toBeGreaterThan(chart.scales.y.getPixelForValue(12))
  })
})
