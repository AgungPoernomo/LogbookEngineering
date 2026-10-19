<template>
  <div class="relative w-[92px] h-[92px] shrink-0 select-none flex items-center justify-center">
    <svg class="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
      <!-- Background track if total is 0 -->
      <circle
        v-if="total === 0"
        cx="50"
        cy="50"
        r="36"
        fill="transparent"
        stroke="#E6E9F0"
        stroke-width="22"
      />

      <!-- Segments -->
      <g v-else>
        <circle
          v-for="(seg, idx) in segments"
          :key="idx"
          cx="50"
          cy="50"
          r="36"
          fill="transparent"
          :stroke="seg.color"
          stroke-width="22"
          :stroke-dasharray="`${seg.length} ${circumference}`"
          :stroke-dashoffset="seg.offset"
          class="transition-all duration-300"
        />
      </g>
    </svg>

    <!-- Percentage labels inside segments (only if >= 8%) per 11.5.5 -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
      <text
        v-for="(seg, idx) in visiblePercentSegments"
        :key="`lbl-${idx}`"
        :x="seg.labelX"
        :y="seg.labelY"
        text-anchor="middle"
        dominant-baseline="central"
        fill="#FFFFFF"
        class="text-[9px] font-semibold select-none"
      >
        {{ seg.percent }}%
      </text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Items array: [{ status, count, color }]
  items: {
    type: Array,
    required: true
  }
})

const radius = 36
const circumference = 2 * Math.PI * radius // ~ 226.195

const total = computed(() => {
  return props.items.reduce((acc, curr) => acc + (curr.count || 0), 0)
})

const segments = computed(() => {
  if (total.value === 0) return []
  let cumulativeOffset = 0
  return props.items.map((item) => {
    const frac = item.count / total.value
    const length = frac * circumference
    const seg = {
      ...item,
      frac,
      percent: Math.round(frac * 100),
      length,
      offset: -cumulativeOffset
    }
    cumulativeOffset += length
    return seg
  })
})

const visiblePercentSegments = computed(() => {
  if (total.value === 0) return []
  let cumulativeAngle = -Math.PI / 2 // Start at top (-90 deg)
  return segments.value
    .filter(seg => seg.percent >= 8)
    .map(seg => {
      const angle = cumulativeAngle + (seg.frac * Math.PI)
      cumulativeAngle += seg.frac * 2 * Math.PI
      // Radius for label position (center of ring thickness: radius 36)
      const labelR = 36
      const labelX = 50 + labelR * Math.cos(angle)
      const labelY = 50 + labelR * Math.sin(angle)
      return {
        ...seg,
        labelX,
        labelY
      }
    })
})
</script>
