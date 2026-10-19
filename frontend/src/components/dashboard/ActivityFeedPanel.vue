<template>
  <div class="bg-surface rounded-lg shadow-card p-4 min-w-0 flex flex-col justify-between">
    <!-- Header per 11.5.9 -->
    <div class="flex items-center justify-between pb-3 mb-3 border-b border-line">
      <h2 class="text-[18px] font-semibold text-ink leading-6">
        Aktivitas Terbaru
      </h2>
      <span class="text-[11px] text-ink-3">Tim Lapangan</span>
    </div>

    <!-- Feed List -->
    <div class="space-y-3 flex-1 max-h-[280px] overflow-y-auto pr-0.5">
      <div
        v-if="activities.length === 0"
        class="py-8 text-center text-xs text-ink-3"
      >
        Belum ada aktivitas tim
      </div>

      <div
        v-for="(item, idx) in activities.slice(0, 6)"
        :key="idx"
        class="flex items-start gap-2.5 text-xs text-ink"
      >
        <!-- 28px Avatar / Initial per 11.5.9 -->
        <Avatar
          :name="item.user_name || item.teknisi_name"
          size="sm"
          class="mt-0.5"
        />

        <div class="flex-1 min-w-0">
          <div class="leading-snug">
            <span class="font-semibold text-ink">{{ item.user_name || item.teknisi_name }}</span>
            <span class="text-ink-2"> {{ item.actionText }} </span>
            <span class="font-medium text-ink">{{ item.targetName }}</span>
          </div>
          <div class="text-[11px] text-ink-3 mt-0.5">
            {{ item.time }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Avatar from '../common/Avatar.vue'

defineProps({
  activities: {
    type: Array,
    default: () => []
  }
})
</script>
