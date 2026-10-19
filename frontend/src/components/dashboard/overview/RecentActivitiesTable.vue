<template>
  <div class="bg-surface rounded-lg border border-line shadow-card overflow-hidden flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b border-line flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Clock class="w-4 h-4 text-primary" />
        <h3 class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wider">
          AKTIVITAS TERBARU SELURUH PLANT
        </h3>
      </div>
      <span class="text-[11px] text-ink-3">
        5 logbook terbaru
      </span>
    </div>

    <!-- Table Container -->
    <div class="overflow-x-auto flex-1">
      <table class="w-full text-left text-xs border-collapse min-w-[680px]">
        <thead class="bg-muted/70 text-[11px] font-semibold text-ink-2 border-b border-line">
          <tr>
            <th class="px-3.5 py-2.5">Waktu</th>
            <th class="px-3.5 py-2.5">Plant</th>
            <th class="px-3.5 py-2.5">Mesin / Aktivitas</th>
            <th class="px-3.5 py-2.5">Shift</th>
            <th class="px-3.5 py-2.5">Teknisi / User</th>
            <th class="px-3.5 py-2.5 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line text-ink">
          <tr v-if="!activities || activities.length === 0">
            <td colspan="6" class="px-4 py-8 text-center text-xs text-ink-3">
              Belum ada aktivitas yang sesuai dengan filter saat ini.
            </td>
          </tr>
          <tr
            v-for="item in activities"
            :key="item.id"
            class="hover:bg-muted/40 transition group"
          >
            <!-- Waktu -->
            <td class="px-3.5 py-3 whitespace-nowrap font-mono text-[11px] text-ink-2">
              {{ item.formatted_time }}
            </td>

            <!-- Plant Badge -->
            <td class="px-3.5 py-3 whitespace-nowrap">
              <span
                class="px-2 py-0.5 rounded text-[11px] font-semibold"
                :style="{
                  backgroundColor: `${item.plant_color.hex}18`,
                  color: item.plant_color.hex,
                  borderColor: `${item.plant_color.hex}40`
                }"
              >
                Plant {{ item.plant_id }}
              </span>
            </td>

            <!-- Mesin / Aktivitas -->
            <td class="px-3.5 py-3 max-w-xs">
              <div class="font-medium text-ink truncate group-hover:text-primary transition">
                {{ item.machine_name }}
              </div>
              <div class="text-[11px] text-ink-2 truncate">
                {{ item.activity_description }}
              </div>
            </td>

            <!-- Shift Badge -->
            <td class="px-3.5 py-3 whitespace-nowrap">
              <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-muted border border-line text-ink-2">
                {{ item.shift_name?.split(' ')[0] || 'Shift' }}
              </span>
            </td>

            <!-- User -->
            <td class="px-3.5 py-3 whitespace-nowrap">
              <div class="flex items-center gap-1.5">
                <div class="w-5 h-5 rounded-full bg-primary-soft text-primary font-bold text-[9px] flex items-center justify-center shrink-0">
                  {{ item.user_initials }}
                </div>
                <span class="font-medium text-xs text-ink truncate max-w-[120px]">
                  {{ item.user_name }}
                </span>
              </div>
            </td>

            <!-- Aksi Detail -->
            <td class="px-3.5 py-3 text-right whitespace-nowrap">
              <button
                type="button"
                class="w-7 h-7 rounded inline-flex items-center justify-center text-ink-2 hover:bg-muted hover:text-primary transition"
                title="Lihat Detail Logbook"
                @click="$emit('open-log-detail', item)"
              >
                <ArrowRight class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { Clock, ArrowRight } from 'lucide-vue-next'

defineProps({
  activities: {
    type: Array,
    default: () => []
  }
})

defineEmits(['open-log-detail'])
</script>
