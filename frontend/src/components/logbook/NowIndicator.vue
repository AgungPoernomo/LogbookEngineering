<template>
  <div
    class="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
    :style="{ top: `${nowPx}px` }"
    aria-hidden="true"
  >
    <!-- Dot Merah 8px -->
    <div class="w-2 h-2 rounded-full bg-danger -ml-1 shrink-0 shadow-sm" />
    <!-- Garis Merah 2px -->
    <div class="h-0.5 bg-danger flex-1" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const nowPx = ref(getNowMinutesToPx())
let timer = null

function getNowMinutesToPx() {
  const d = new Date()
  const minutes = d.getHours() * 60 + d.getMinutes()
  return (minutes / 60) * 60 // 1 hour = 60px
}

onMounted(() => {
  nowPx.value = getNowMinutesToPx()
  timer = setInterval(() => {
    nowPx.value = getNowMinutesToPx()
  }, 60000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
