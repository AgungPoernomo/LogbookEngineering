<template>
  <div class="w-full">
    <!-- Legend ringkas (HTML, agar konsisten dengan tipografi UI proyek) -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pb-2">
      <span class="inline-flex items-center gap-1.5 text-[11px] text-ink-2">
        <span class="w-2.5 h-2.5 rounded-xs" :style="{ backgroundColor: palette.vital }" />
        Vital Few (≤ {{ props.thresholdPercent }}% kumulatif)
      </span>
      <span class="inline-flex items-center gap-1.5 text-[11px] text-ink-3">
        <span class="w-2.5 h-2.5 rounded-xs" :style="{ backgroundColor: palette.other }" />
        Sisanya (useful many)
      </span>
      <span class="inline-flex items-center gap-1.5 text-[11px] text-ink-2">
        <span class="w-4 h-0.5 rounded-full" :style="{ backgroundColor: palette.cumulative }" />
        % Kumulatif (sumbu kanan)
      </span>
    </div>

    <!-- Area grafik: tinggi mengikuti jumlah bar agar tidak stretched -->
    <div
      class="relative w-full"
      :style="{ height: `${canvasHeight}px` }"
      role="img"
      :aria-label="ariaSummary"
    >
      <Chart type="bar" :data="chartData" :options="chartOptions" :plugins="chartPlugins" />
    </div>

    <!-- Hidden Accessible Data Table: angka pasti selalu tersedia untuk pembaca layar -->
    <div class="sr-only">
      <table>
        <caption>{{ props.caption }}</caption>
        <thead>
          <tr>
            <th scope="col">Peringkat</th>
            <th scope="col">Nama</th>
            <th scope="col">{{ metricLabel }}</th>
            <th scope="col">Kontribusi</th>
            <th scope="col">Kumulatif</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in normalizedItems" :key="`sr-${idx}`">
            <td>{{ idx + 1 }}</td>
            <td>{{ row.fullName }}</td>
            <td>{{ row.value }}</td>
            <td>{{ formatPercent(row.percent) }}</td>
            <td>{{ formatPercent(row.cumulativePercent) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Chart } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip
} from 'chart.js'

/**
 * Registrasi Chart.js dilakukan LOKAL di komponen ini (bukan global di main.js)
 * agar hanya halaman Pareto yang memuat controller-nya.
 * `LineController` + `LineElement` wajib karena dataset kumulatif di-mix
 * ke dalam chart bertipe `bar` (sumbu Y kanan).
 */
ChartJS.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip
)

/**
 * Palet khusus grafik. Nilai mengikuti token `theme.extend.colors` pada
 * tailwind.config.js (danger / ink / ink-3 / line / surface) — Chart.js
 * membutuhkan nilai warna literal, bukan kelas utilitas Tailwind.
 */
const palette = {
  vital: '#EF4444', // token `danger`
  other: '#9CA3AF', // token `ink.3`
  cumulative: '#111827', // token `ink`
  cutoff: '#EF4444', // titik yang menembus ambang 80%
  line: '#E6E9F0', // token `line`
  ink2: '#6B7280', // token `ink.2`
  ink3: '#9CA3AF', // token `ink.3`
  surface: '#FFFFFF' // token `surface`
}

const props = defineProps({
  /**
   * Baris Pareto yang SUDAH diurutkan backend (rank 1..n).
   * Kontrak tiap item (lihat normalizeParetoRows pada service):
   * { name, percent, cumulative_percent, is_vital_few, ... }
   */
  items: {
    type: Array,
    default: () => []
  },
  /**
   * Sumber nilai bar (sumbu Y kiri).
   * `machine` -> downtime_hours (total jam henti)
   * `failure` -> count (frekuensi kejadian)
   */
  metric: {
    type: String,
    default: 'machine',
    validator: (v) => ['machine', 'failure'].includes(v)
  },
  /** Ambang Hukum Pareto (sinkron dengan PARETO_THRESHOLD_PERCENT). */
  thresholdPercent: {
    type: Number,
    default: 80
  },
  /** Jumlah baris yang digambar; sisanya tetap tersedia di tabel detail. */
  maxBars: {
    type: Number,
    default: 12
  },
  /** Tampilkan garis bantu putus-putus pada ambang 80%. */
  showThresholdLine: {
    type: Boolean,
    default: true
  },
  /** Tampilkan awalan kode (mis. "MECH-BRG") di label sumbu X. */
  showCodePrefix: {
    type: Boolean,
    default: false
  },
  /** Label nilai pada tooltip, sumbu Y kiri, dan aria. */
  valueLabel: {
    type: String,
    default: ''
  },
  /** Judul tabel aksesibilitas (sr-only). */
  caption: {
    type: String,
    default: 'Diagram Pareto'
  }
})

// ----------------------------------------------------------------------------
// Normalisasi data
// ----------------------------------------------------------------------------

/** Nama baris yang aman dirender (string kosong bila null). */
function toName(row) {
  return String(row?.name ?? '').trim()
}

/**
 * Label kategori sumbu X.
 * Dengan `showCodePrefix`, label menjadi dua baris: "MECH-BRG" lalu nama.
 * Nama panjang di-truncate agar bar tetap terbaca saat item banyak.
 */
function toLabel(row) {
  const rawName = toName(row) || `#${row?.rank ?? ''}`
  const clipped = rawName.length > 18 ? `${rawName.slice(0, 17)}…` : rawName
  const code = props.showCodePrefix ? String(row?.code ?? '').trim() : ''
  return code ? `${code}\n${clipped}` : clipped
}

const normalizedItems = computed(() => {
  const limit = Math.max(1, Number(props.maxBars) || 12)
  const isFailure = props.metric === 'failure'

  return (props.items || []).slice(0, limit).map((row, idx) => {
    const rawValue = isFailure ? row?.count : row?.downtime_hours
    const value = Number.isFinite(Number(rawValue)) ? Number(rawValue) : 0
    const cumulativePercent = Number.isFinite(Number(row?.cumulative_percent))
      ? Number(row.cumulative_percent)
      : 0
    const percent = Number.isFinite(Number(row?.percent)) ? Number(row.percent) : 0
    const cumulative = Math.min(100, Math.max(0, cumulativePercent))

    return {
      index: idx,
      label: toLabel(row),
      fullName: toName(row) || '-',
      code: String(row?.code ?? '').trim(),
      value,
      percent,
      cumulativePercent: cumulative,
      // Pakai flag backend; bila absen, turunkan dari ambang 80%.
      isVitalFew: row?.is_vital_few !== undefined
        ? !!row.is_vital_few
        : cumulative <= props.thresholdPercent
    }
  })
})

/** Label panjang -> miringkan label sumbu X agar tidak bertumpuk. */
const hasLongLabels = computed(() =>
  normalizedItems.value.some((row) => !row.label.includes('\n') && row.label.length > 10)
)

/** Tinggi kanvas adaptif: ikut jumlah bar, dibatasi agar tetap responsif. */
const canvasHeight = computed(() => {
  const count = Math.max(normalizedItems.value.length, 4)
  return Math.min(460, Math.max(260, count * 34 + 90))
})

// ----------------------------------------------------------------------------
// Format angka (gaya Indonesia, konsisten dengan ReliabilityAnalyticsView)
// ----------------------------------------------------------------------------

/** 12 -> "12" | 2.5 -> "2,5" | null -> "-" */
function formatNumber(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  const rounded = Math.round(num * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',')
}

/** 86.5 -> "86,5%" */
function formatPercent(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return `${formatNumber(num)}%`
}

/** Satuan nilai bar untuk tooltip & aria. */
const metricSuffix = computed(() => (props.metric === 'failure' ? 'kali' : 'jam'))

/** Label sumbu Y kiri / dataset bar. */
const metricLabel = computed(() => {
  if (props.valueLabel) return props.valueLabel
  return props.metric === 'failure' ? 'Frekuensi Kejadian' : 'Downtime (Jam)'
})

// ----------------------------------------------------------------------------
// Dataset (BAR absolut + LINE kumulatif dalam satu chart)
// ----------------------------------------------------------------------------

/** Bar merah untuk vital few, abu-abu netral untuk sisanya. */
const barColors = computed(() =>
  normalizedItems.value.map((row) => (row.isVitalFew ? palette.vital : palette.other))
)

/** Titik hitam selama kumulatif masih <= ambang, merah setelah menembus ambang. */
const pointColors = computed(() =>
  normalizedItems.value.map((row) =>
    row.cumulativePercent <= props.thresholdPercent ? palette.cumulative : palette.cutoff
  )
)

const chartData = computed(() => ({
  labels: normalizedItems.value.map((row) => row.label),
  datasets: [
    {
      type: 'bar',
      label: metricLabel.value,
      data: normalizedItems.value.map((row) => row.value),
      backgroundColor: barColors.value,
      hoverBackgroundColor: barColors.value,
      borderWidth: 0,
      borderRadius: 3,
      maxBarThickness: 34,
      categoryPercentage: 0.74,
      barPercentage: 0.88,
      // Sumbu Y KIRI = nilai absolut.
      yAxisID: 'y',
      order: 2
    },
    {
      // Dataset campuran: garis kumulatif memakai Sumbu Y KANAN (0-100%).
      type: 'line',
      label: '% Kumulatif',
      data: normalizedItems.value.map((row) => row.cumulativePercent),
      yAxisID: 'yPercent',
      borderColor: palette.cumulative,
      borderWidth: 2,
      tension: 0,
      fill: false,
      pointBackgroundColor: pointColors.value,
      pointBorderColor: palette.surface,
      pointBorderWidth: 1.5,
      pointRadius: 3.5,
      pointHoverRadius: 5,
      order: 1
    }
  ]
}))

// ----------------------------------------------------------------------------
// Plugin garis bantu ambang 80%
// ----------------------------------------------------------------------------

/**
 * Menggambar garis putus-putus horizontal tepat pada `thresholdPercent`
 * di skala kanan (persentase kumulatif), beserta label teksnya.
 * Inline plugin -> tidak terdaftar global.
 */
const thresholdLinePlugin = {
  id: 'paretoThresholdLine',
  afterDatasetsDraw(chart) {
    if (!props.showThresholdLine) return
    const { ctx, chartArea } = chart
    const scale = chart.scales?.yPercent
    if (!ctx || !chartArea || !scale) return

    // Interpolasi linear pada skala 0-100% -> posisi piksel presisi.
    const ratio = Math.min(1, Math.max(0, props.thresholdPercent / 100))
    const y = scale.top + (1 - ratio) * (scale.bottom - scale.top)

    ctx.save()

    // Garis putus-putus
    ctx.beginPath()
    ctx.setLineDash([5, 4])
    ctx.lineWidth = 1.25
    ctx.strokeStyle = palette.cutoff
    ctx.moveTo(chartArea.left, y)
    ctx.lineTo(chartArea.right, y)
    ctx.stroke()

    // Label kecil di ujung kanan area plot
    ctx.setLineDash([])
    ctx.font = '600 10px Inter, system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    const text = `${props.thresholdPercent}% — Vital Few`
    const textWidth = ctx.measureText(text).width
    ctx.fillStyle = palette.surface
    ctx.fillRect(chartArea.right - textWidth - 8, y - 13, textWidth + 8, 12)
    ctx.fillStyle = palette.cutoff
    ctx.fillText(text, chartArea.right - 4, y - 3)

    ctx.restore()
  }
}

const chartPlugins = computed(() => [thresholdLinePlugin])

// ----------------------------------------------------------------------------
// Opsi chart
// ----------------------------------------------------------------------------

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  // Hover per kategori: tooltip menampilkan nilai bar DAN kumulatif sekaligus.
  interaction: { mode: 'index', intersect: false },
  layout: { padding: { top: 10, right: 4, bottom: 0, left: 0 } },
  // Legend bawaan Chart.js dimatikan; legend ringkas dirender sebagai HTML.
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: palette.cumulative,
      titleFont: { family: 'Inter, system-ui, sans-serif', size: 11, weight: '600' },
      bodyFont: { family: 'Inter, system-ui, sans-serif', size: 11 },
      padding: 10,
      cornerRadius: 6,
      boxWidth: 8,
      boxHeight: 8,
      callbacks: {
        title: (items) => {
          const row = normalizedItems.value[items[0]?.dataIndex ?? 0]
          if (!row) return ''
          return row.code ? `${row.code} — ${row.fullName}` : row.fullName
        },
        label: (ctx) => {
          const row = normalizedItems.value[ctx.dataIndex]
          if (!row) return ''
          if (ctx.datasetIndex === 1) {
            return `Kumulatif: ${formatPercent(row.cumulativePercent)}`
          }
          return `${metricLabel.value}: ${formatNumber(row.value)} ${metricSuffix.value}`
            + ` (${formatPercent(row.percent)})`
        },
        labelColor: (ctx) => ({
          borderColor: 'transparent',
          backgroundColor: ctx.datasetIndex === 1
            ? palette.cumulative
            : (normalizedItems.value[ctx.dataIndex]?.isVitalFew ? palette.vital : palette.other)
        })
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      border: { color: palette.line },
      ticks: {
        autoSkip: false,
        maxRotation: hasLongLabels.value ? 45 : 0,
        minRotation: hasLongLabels.value ? 45 : 0,
        color: palette.ink2,
        font: { family: 'Inter, system-ui, sans-serif', size: 10, weight: '500' },
        callback(value) {
          // Label multi-baris (kode + nama) dipecah agar dirender 2 baris.
          const label = String(this.getLabelForValue(value) ?? '')
          return label.includes('\n') ? label.split('\n') : label
        }
      }
    },
    // Sumbu Y KIRI — nilai absolut (jam downtime / frekuensi kejadian).
    y: {
      position: 'left',
      beginAtZero: true,
      grid: { color: palette.line, drawTicks: false, drawOnChartArea: true },
      border: { display: false },
      ticks: {
        color: palette.ink3,
        font: { family: 'Inter, system-ui, sans-serif', size: 10 },
        padding: 6,
        maxTicksLimit: 6,
        callback: (value) => formatNumber(value)
      },
      title: {
        display: true,
        text: metricLabel.value,
        color: palette.ink3,
        font: { family: 'Inter, system-ui, sans-serif', size: 10, weight: '600' },
        padding: { bottom: 4 }
      }
    },
    // Sumbu Y KANAN — persentase kumulatif, dikunci 0-100%.
    yPercent: {
      position: 'right',
      beginAtZero: true,
      min: 0,
      max: 100,
      grid: { display: false, drawTicks: false },
      border: { display: false },
      ticks: {
        color: palette.ink3,
        font: { family: 'Inter, system-ui, sans-serif', size: 10 },
        stepSize: 20,
        padding: 6,
        callback: (value) => `${value}%`
      },
      title: {
        display: true,
        text: '% Kumulatif',
        color: palette.ink3,
        font: { family: 'Inter, system-ui, sans-serif', size: 10, weight: '600' },
        padding: { bottom: 4 }
      }
    }
  }
}))

// ----------------------------------------------------------------------------
// Ringkasan aksesibilitas (dibaca screen reader, pola sama dengan AreaChart)
// ----------------------------------------------------------------------------

const ariaSummary = computed(() => {
  const rows = normalizedItems.value
  if (rows.length === 0) return `${props.caption}: belum ada data pada periode ini.`

  const vitalCount = rows.filter((row) => row.cumulativePercent <= props.thresholdPercent).length
  const top = rows[0]
  const last = rows[rows.length - 1]

  return `${props.caption}. Diagram Pareto berisi ${rows.length} item diurutkan dari `
    + `${metricLabel.value} terbesar. ${vitalCount} item pertama menyumbang hingga `
    + `${props.thresholdPercent}% kumulatif. Penyumbang terbesar ${top.fullName} dengan `
    + `${formatNumber(top.value)} ${metricSuffix.value}. Kumulatif terakhir `
    + `${formatPercent(last.cumulativePercent)}.`
})
</script>
