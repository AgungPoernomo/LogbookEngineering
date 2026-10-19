<template>
  <div
    class="relative w-full select-none"
    role="img"
    :aria-label="ariaSummary"
    @mouseleave="resetToInitial"
  >
    <!-- Chart Container: Y-Axis Column (HTML) + Plot Area (SVG & HTML Overlay) -->
    <div class="flex gap-2">
      <!-- Y Axis Labels (Crisp HTML Text - Zero SVG Font Stretch) -->
      <div class="relative w-7 shrink-0 h-[160px]" aria-hidden="true">
        <div
          v-for="(tick, idx) in yTicks"
          :key="`y-tick-${idx}`"
          class="absolute right-0 text-[11px] font-medium text-ink-3 font-sans leading-none -translate-y-1/2 transition-all"
          :style="{ top: `${tick.percentY}%` }"
        >
          {{ tick.label }}
        </div>
      </div>

      <!-- Main Plot Area -->
      <div class="relative flex-1 h-[160px]">
        <!-- Vertical Highlight Column on Selected Month -->
        <div
          v-if="selectedPoint"
          class="absolute w-6 sm:w-8 -translate-x-1/2 rounded-xs pointer-events-none transition-all duration-150"
          :style="{
            left: `${selectedPoint.percentX}%`,
            top: '5%',
            bottom: '7%',
            background: 'linear-gradient(to bottom, rgba(37, 99, 235, 0.18), rgba(37, 99, 235, 0.01))'
          }"
        />

        <!-- SVG Graphics: Gridlines, Area Fill & Stroke Line -->
        <svg
          ref="svgRef"
          class="w-full h-full overflow-visible"
          viewBox="0 0 1000 160"
          preserveAspectRatio="none"
        >
          <defs>
            <!-- Area fill gradient (primary 0.22 to transparent) per 11.5.4 -->
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#2563EB" stop-opacity="0.22" />
              <stop offset="100%" stop-color="#2563EB" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          <!-- Horizontal Dashed Grid Lines per 11.5.4 -->
          <g class="grid-lines-y">
            <line
              v-for="(yVal, idx) in yTicks"
              :key="`y-grid-${idx}`"
              x1="0"
              :y1="yVal.y"
              x2="1000"
              :y2="yVal.y"
              stroke="#E6E9F0"
              stroke-dasharray="4,4"
              stroke-width="1"
              vector-effect="non-scaling-stroke"
            />
          </g>

          <!-- Vertical Dashed Grid Lines per 11.5.4 -->
          <g class="grid-lines-x">
            <line
              v-for="(point, idx) in points"
              :key="`x-grid-${idx}`"
              :x1="point.x"
              y1="12"
              :x2="point.x"
              y2="148"
              stroke="#E6E9F0"
              stroke-dasharray="4,4"
              stroke-width="1"
              vector-effect="non-scaling-stroke"
            />
          </g>

          <!-- Area Path -->
          <path
            :d="areaPathD"
            fill="url(#areaGradient)"
            class="transition-all duration-300 pointer-events-none"
          />

          <!-- Linear Line Path (Stroke 2px primary, no smooth curve) per 11.5.4 -->
          <path
            :d="linePathD"
            fill="none"
            stroke="#2563EB"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="transition-all duration-300 pointer-events-none"
          />
        </svg>

        <!-- Highlight Dot: Perfect HTML Circle (No SVG Aspect Ratio Distortion) -->
        <div
          v-if="selectedPoint"
          class="absolute w-3 h-3 rounded-full bg-surface border-[2.5px] border-primary shadow-xs -translate-x-1/2 -translate-y-1/2 transition-all duration-150 pointer-events-none z-10"
          :style="{
            left: `${selectedPoint.percentX}%`,
            top: `${selectedPoint.percentY}%`
          }"
        />

        <!-- Interactive Hover Catchers per Month -->
        <div
          v-for="(point, idx) in points"
          :key="`catcher-${idx}`"
          class="absolute top-0 bottom-0 cursor-pointer -translate-x-1/2 z-10"
          :style="{
            left: `${point.percentX}%`,
            width: `${colWidthPercent}%`
          }"
          @mouseenter="selectedIndex = idx"
          @click="selectedIndex = idx"
        />

        <!-- Custom Tooltip per 11.5.4: White box, radius 8, shadow-tooltip, blue indicator square -->
        <div
          v-if="selectedPoint"
          class="absolute z-20 pointer-events-none transition-all duration-150"
          :style="tooltipStyle"
        >
          <div class="relative bg-surface rounded-md shadow-tooltip border border-line px-3 py-1.5 text-center min-w-[90px]">
            <!-- Blue indicator square at top of tooltip per 11.5.4 -->
            <div class="w-3.5 h-1.5 bg-primary rounded-xs mx-auto -mt-2 mb-1 shadow-xs" />
            <div class="text-[13px] font-semibold text-primary leading-tight font-sans">
              {{ selectedPoint.value }}
            </div>
            <div class="text-[11px] font-normal text-ink-3 leading-tight font-sans">
              Total logbook
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- X Axis Labels (Crisp HTML Text - Zero SVG Font Stretch) -->
    <div class="flex items-center pl-9 pt-2">
      <div class="relative w-full h-5">
        <button
          v-for="(point, idx) in points"
          :key="`x-label-${idx}`"
          type="button"
          :class="[
            'absolute -translate-x-1/2 text-[11px] transition-colors font-sans py-0.5 px-1 rounded hover:text-primary focus:outline-none',
            idx === selectedIndex ? 'text-primary font-semibold' : 'text-ink-3 font-normal'
          ]"
          :style="{ left: `${point.percentX}%` }"
          @click="selectedIndex = idx"
          @mouseenter="selectedIndex = idx"
        >
          {{ point.label }}
        </button>
      </div>
    </div>

    <!-- Hidden Accessible Data Table per 11.9 butir 6 -->
    <div class="sr-only">
      <table>
        <caption>Data Tren Aktivitas Logbook per Bulan</caption>
        <thead>
          <tr>
            <th scope="col">Bulan</th>
            <th scope="col">Total Logbook</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(val, idx) in values" :key="idx">
            <td>{{ months[idx] }}</td>
            <td>{{ val }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => [12, 19, 15, 24, 28, 22, 35, 42, 38, 30, 26, 34]
  },
  initialMonth: {
    type: Number,
    default: () => new Date().getMonth()
  }
})

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const selectedIndex = ref(props.initialMonth >= 0 && props.initialMonth < 12 ? props.initialMonth : 0)

function resetToInitial() {
  selectedIndex.value = props.initialMonth >= 0 && props.initialMonth < 12 ? props.initialMonth : 0
}

const values = computed(() => {
  const arr = [...(props.data || [])]
  while (arr.length < 12) arr.push(0)
  return arr.slice(0, 12)
})

const maxVal = computed(() => {
  const highest = Math.max(...values.value, 1)
  if (highest <= 10) return 10
  if (highest <= 25) return 25
  if (highest <= 50) return 50
  if (highest <= 100) return 100
  return Math.ceil(highest / 20) * 20
})

const yTicks = computed(() => {
  const count = 5
  const step = maxVal.value / (count - 1)
  const ticks = []
  const topY = 12
  const bottomY = 148
  const totalH = 160
  for (let i = 0; i < count; i++) {
    const val = Math.round(maxVal.value - i * step)
    const y = topY + ((bottomY - topY) / (count - 1)) * i
    const percentY = (y / totalH) * 100
    ticks.push({ label: val, y, percentY })
  }
  return ticks
})

const colWidthPercent = computed(() => {
  return 100 / 12
})

const points = computed(() => {
  const startX = 20
  const endX = 980
  const spanX = endX - startX
  const topY = 12
  const bottomY = 148
  const heightSpan = bottomY - topY
  const totalW = 1000
  const totalH = 160

  return values.value.map((val, idx) => {
    const x = startX + idx * (spanX / 11)
    const y = bottomY - (val / maxVal.value) * heightSpan
    const percentX = (x / totalW) * 100
    const percentY = (y / totalH) * 100
    return {
      x,
      y,
      percentX,
      percentY,
      value: val,
      label: months[idx]
    }
  })
})

const selectedPoint = computed(() => {
  return points.value[selectedIndex.value] || points.value[0]
})

const linePathD = computed(() => {
  if (points.value.length === 0) return ''
  return points.value.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`
  }, '')
})

const areaPathD = computed(() => {
  if (points.value.length === 0) return ''
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  const bottomY = 148
  const linePart = points.value.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`
  }, '')
  return `${linePart} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`
})

const tooltipStyle = computed(() => {
  if (!selectedPoint.value) return { display: 'none' }
  const px = selectedPoint.value.percentX
  const py = selectedPoint.value.percentY
  // Clamp tooltip horizontal position so it doesn't overflow container edges
  const leftClamped = Math.min(Math.max(px, 8), 92)
  return {
    left: `${leftClamped}%`,
    top: `${Math.max(8, py - 12)}%`,
    transform: 'translate(-50%, -100%)'
  }
})

const ariaSummary = computed(() => {
  return `Grafik area tren aktivitas tahunan dari Januari hingga Desember. Nilai tertinggi ${maxVal.value}. Bulan terpilih ${selectedPoint.value?.label} dengan ${selectedPoint.value?.value} logbook.`
})
</script>
