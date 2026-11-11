<template>
  <div
    class="bg-surface rounded-lg border border-line shadow-card p-4 sm:p-5 flex flex-col justify-between space-y-4"
  >
    <!-- Header -->
    <div class="flex items-center justify-between pb-3 border-b border-line">
      <div class="flex items-center gap-2">
        <Users class="w-4 h-4 text-primary" />
        <h3
          class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wider"
        >
          USER AKTIF PER PLANT
        </h3>
      </div>
      <span class="text-[10px] text-ink-3">Monitoring rasio</span>
    </div>

    <!-- Progress List untuk Tiap Plant (1 - 4) -->
    <div class="space-y-3.5 flex-1 justify-center flex flex-col">
      <div
        v-for="item in summary.plants"
        :key="item.plantId"
        class="space-y-1.5"
      >
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="w-2.5 h-2.5 rounded-full shrink-0"
              :style="{ backgroundColor: item.color.hex }"
            />
            <span class="font-semibold text-ink truncate">{{ item.name }}</span>
            <span class="text-[11px] text-ink-3 truncate hidden sm:inline">{{
              item.fullName
            }}</span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="text-ink-2 font-mono text-[11px]">
              {{ item.active }} / {{ item.total }}
            </span>
            <span class="font-bold text-ink text-xs w-9 text-right font-mono">
              {{ item.percentage }}%
            </span>
          </div>
        </div>

        <!-- Progress Bar Baris -->
        <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{
              width: `${Math.min(100, Math.max(item.percentage, item.active > 0 ? 5 : 0))}%`,
              backgroundColor: item.color.hex,
            }"
          />
        </div>
      </div>
    </div>

    <!-- Footer Summary Total -->
    <div
      class="pt-3 border-t border-line flex items-center justify-between text-xs"
    >
      <div class="text-ink-2">
        Total:
        <strong class="text-ink">{{ summary.total?.active || 0 }}</strong> dari
        {{ summary.total?.total || 0 }} user
        <span class="font-semibold text-primary ml-1"
          >({{ summary.total?.percentage || 0 }}%)</span
        >
      </div>

      <div class="flex items-center gap-1 text-[11px]">
        <span class="text-ink-3 bg-muted">
          {{ summary.total?.delta?.text || "0%" }}
        </span>
        <span class="text-ink-3">vs. kemarin</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Users } from "lucide-vue-next";

defineProps({
  summary: {
    type: Object,
    default: () => ({
      plants: [],
      total: {
        active: 0,
        total: 0,
        percentage: 0,
        delta: { text: "0%", isUp: true },
      },
    }),
  },
});
</script>
