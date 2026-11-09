import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import PlantCard from '../components/dashboard/overview/PlantCard.vue'

describe('PlantCard - Bar Chart "Log 7 Hari Terakhir"', () => {
  it('merender 7 batang dengan height % proporsional terhadap max count', async () => {
    const plant = {
      id: 1,
      name: 'PLANT 1',
      fullName: 'Plant 1',
      code: 'PLANT-01',
      color: { hex: '#2563EB' },
      last7Days: [
        { date: '2026-11-03', dayLabel: 'Sen', count: 2 },
        { date: '2026-11-04', dayLabel: 'Sel', count: 3 },
        { date: '2026-11-05', dayLabel: 'Rab', count: 0 },
        { date: '2026-11-06', dayLabel: 'Kam', count: 4 },
        { date: '2026-11-07', dayLabel: 'Jum', count: 1 },
        { date: '2026-11-08', dayLabel: 'Sab', count: 5 },
        { date: '2026-11-09', dayLabel: 'Min', count: 0 }
      ],
      recentLogs: []
    }

    const html = await renderToString(createSSRApp({ render: () => h(PlantCard, { plant }) }))
    const bars = html.match(/<div[^>]*rounded-t[^>]*>/g) || []
    expect(bars).toHaveLength(7)

    // Bar dengan data: warna plant & height proporsional (2/5 = 40%, 4/5 = 80%, 5/5 = 100%, min 10%)
    expect(bars[0]).toContain('height:40%')
    expect(bars[3]).toContain('height:80%')
    expect(bars[5]).toContain('height:100%')
    expect(bars[4]).toContain('height:20%') // clamp minimum 10% -> 1/5 = 20%
    expect(bars[0]).toContain('background-color:#2563EB')

    // Hari tanpa log: tetap ada stub abu-abu yang terlihat (3px), bukan batang kosong
    expect(bars[2]).toContain('min-height:3px')
    expect(bars[2]).toContain('bg-line')
    expect(bars[2]).not.toContain('background-color:#2563EB')
  })

  it('tidak crash ketika last7Days kosong/tidak ada', async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(PlantCard, { plant: { id: 9, name: 'X', code: 'X', color: { hex: '#000' }, last7Days: [], recentLogs: [] } })
    }))
    expect(html).toContain('Log 7 Hari Terakhir')
  })
})
