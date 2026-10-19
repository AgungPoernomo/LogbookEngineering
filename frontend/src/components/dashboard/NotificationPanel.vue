<template>
  <div class="bg-surface rounded-lg shadow-card p-4 min-w-0 flex flex-col justify-between">
    <!-- Header per 11.5.8 -->
    <div class="flex items-center justify-between pb-3 mb-3 border-b border-line">
      <h2 class="text-[18px] font-semibold text-ink leading-6">
        Notifikasi
      </h2>
      <span
        v-if="unreadCount > 0"
        class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange/15 text-orange"
      >
        {{ unreadCount }} baru
      </span>
    </div>

    <!-- Notifications List -->
    <div class="space-y-2 flex-1 max-h-[280px] overflow-y-auto pr-0.5">
      <div
        v-if="notifications.length === 0"
        class="py-8 text-center text-xs text-ink-3"
      >
        Tidak ada notifikasi
      </div>

      <div
        v-for="item in notifications.slice(0, 5)"
        :key="item.id"
        :class="[
          'p-2.5 rounded-md border text-xs transition-colors cursor-pointer flex items-start gap-2.5',
          !item.read_at
            ? 'bg-row-blue border-primary/20 text-ink'
            : 'bg-surface border-line text-ink-2 hover:bg-muted/50'
        ]"
        @click="handleClick(item)"
      >
        <!-- Icon 28px rounded per 11.5.8 -->
        <div
          :class="[
            'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
            !item.read_at ? 'bg-primary text-white' : 'bg-muted text-ink-3'
          ]"
        >
          <Bell class="w-3.5 h-3.5" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-0.5">
            <span class="text-[11px] font-semibold truncate" :class="!item.read_at ? 'text-primary' : 'text-ink-2'">
              {{ item.type || 'Sistem' }}
            </span>
            <span class="text-[10px] text-ink-3 shrink-0">
              {{ item.sent_at }}
            </span>
          </div>

          <p class="text-[12px] leading-snug line-clamp-2 text-ink">
            {{ item.message }}
          </p>
        </div>

        <!-- 6px primary dot if unread per 11.5.8 -->
        <span
          v-if="!item.read_at"
          class="w-1.5 h-1.5 rounded-full bg-primary shrink-0 self-center"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useNotificationStore } from '../../stores/notification'
import { Bell } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationStore()

const notifications = computed(() => notifStore.notifications || [])
const unreadCount = computed(() => notifStore.unreadCount || 0)

function handleClick(item) {
  notifStore.markAsRead(item.id)
  if (authStore.isTeknisi) {
    if (item.type?.includes('Reject') && item.logbook_id) {
      router.push(`/logbook/edit/${item.logbook_id}`)
    } else {
      router.push('/logbook/riwayat')
    }
  } else if (authStore.isSupervisor) {
    if (item.logbook_id) {
      router.push(`/approval/detail/${item.logbook_id}`)
    } else {
      router.push('/approval')
    }
  }
}
</script>
