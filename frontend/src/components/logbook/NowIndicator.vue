<template>
  <div
    class="absolute left-0 right-0 z-0 pointer-events-none flex items-center"
    :style="{ top: `calc(var(--planner-hour-h) * ${(nowMin / 60).toFixed(4)})` }"
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

// Posisi sekarang dalam menit sejak 00:00; tinggi piksel mengikuti --planner-hour-h
const nowMin = ref(getNowMinutes())
let timer = null

function getNowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

onMounted(() => {
  nowMin.value = getNowMinutes()
  timer = setInterval(() => {
    nowMin.value = getNowMinutes()
  }, 60000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
