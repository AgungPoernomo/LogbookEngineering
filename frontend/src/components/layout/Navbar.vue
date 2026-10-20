<template>
  <header class="sticky top-0 z-30 flex h-[70px] w-full min-w-0 items-center justify-between border-b border-line bg-surface px-3.5 sm:px-5 lg:px-6">
    <!-- Left: Hamburger (mobile) & PageHeader -->
    <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
      <button
        type="button"
        class="md:hidden p-2 text-ink-2 hover:text-ink hover:bg-muted rounded-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
        aria-label="Buka menu navigasi"
        @click="$emit('toggle-sidebar')"
      >
        <Menu class="w-5 h-5" />
      </button>

      <PageHeader
        :title="currentRouteTitle"
        :subtitle="currentRouteSubtitle"
        class="truncate min-w-0"
      />
    </div>

    <!-- Right: RoleSwitcher, NotificationBell, Divider, UserMenu -->
    <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
      <!-- RoleSwitcher (Mode Pengembangan Tahap 1, per 11.5.2 & Bagian 12) -->
      <div class="relative hidden sm:block">
        <label for="role-switcher-select" class="sr-only">Beralih Peran Pengembangan</label>
        <div class="flex items-center bg-muted border border-line rounded-md px-2.5 h-[34px] gap-1.5">
          <span class="text-[11px] font-medium text-ink-3 uppercase tracking-wider hidden lg:inline">Peran:</span>
          <select
            id="role-switcher-select"
            :value="authStore.role"
            class="bg-transparent text-[12px] font-medium text-ink focus:outline-none cursor-pointer pr-1"
            aria-label="Pilih peran pengguna untuk simulasi"
            @change="handleRoleChange($event.target.value)"
          >
            <option :value="ROLES.TEKNISI">Teknisi</option>
            <option :value="ROLES.SUPERVISOR">Supervisor</option>
            <option :value="ROLES.ADMIN">Admin</option>
          </select>
        </div>
      </div>

      <!-- NotificationBell per 11.5.2 -->
      <div class="relative">
        <button
          type="button"
          class="relative flex items-center justify-center w-[34px] h-[34px] rounded-full border border-line bg-surface text-ink hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition"
          :aria-label="`${notifStore.unreadCount} notifikasi belum dibaca`"
          @click="toggleNotifications"
        >
          <Bell class="w-[18px] h-[18px] text-ink" />
          <span
            v-if="notifStore.unreadCount > 0"
            class="absolute -top-1 -right-1 flex h-[14px] min-w-[14px] px-1 items-center justify-center rounded-full bg-orange text-[10px] font-semibold text-white leading-none ring-2 ring-surface"
          >
            {{ notifStore.unreadCount }}
          </span>
        </button>

        <!-- Notification Panel Overlay -->
        <div
          v-if="showNotifications"
          class="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-surface shadow-tooltip border border-line p-4 z-50 animate-fadeIn"
        >
          <div class="flex items-center justify-between pb-3 border-b border-line mb-3">
            <h3 class="text-xs font-semibold text-ink uppercase tracking-wider">Notifikasi</h3>
            <button
              v-if="notifStore.unreadCount > 0"
              type="button"
              class="text-[11px] text-primary hover:underline font-medium"
              @click="notifStore.markAllAsRead"
            >
              Tandai semua dibaca
            </button>
          </div>

          <div class="space-y-2 max-h-72 overflow-y-auto">
            <div
              v-if="notifStore.notifications.length === 0"
              class="py-8 text-center text-xs text-ink-3"
            >
              Tidak ada notifikasi
            </div>
            <div
              v-for="item in notifStore.notifications"
              :key="item.id"
              :class="[
                'p-2.5 rounded-md border text-xs transition cursor-pointer',
                item.read_at || item.is_read
                  ? 'bg-surface border-line text-ink-2'
                  : 'bg-row-blue border-primary/20 text-ink font-medium'
              ]"
              @click="handleNotificationClick(item)"
            >
              <div class="flex items-center justify-between text-[10px] text-ink-3 mb-1">
                <span class="font-medium text-primary">{{ formatType(item.type) }}</span>
                <span>{{ formatTime(item.sent_at) }}</span>
              </div>
              <div class="font-medium text-ink mb-0.5">{{ item.subject }}</div>
              <div class="text-[11px] text-ink-2 line-clamp-2 leading-relaxed">{{ item.message }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vertical Divider (1px line, 36px height) per 11.5.2 -->
      <div class="w-px h-9 bg-line mx-1" />

      <!-- UserMenu per 11.5.2 -->
      <div class="relative">
        <button
          type="button"
          class="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition"
          aria-haspopup="true"
          :aria-expanded="showUserMenu"
          @click="showUserMenu = !showUserMenu"
        >
          <Avatar
            :src="authStore.user?.photo_url"
            :name="authStore.user?.full_name"
            size="sm"
          />
          <div class="hidden lg:block text-left max-w-[140px]">
            <div class="text-[13px] font-semibold text-ink leading-tight truncate">
              {{ authStore.user?.full_name || 'Pengguna' }}
            </div>
            <div class="text-[11px] font-normal text-ink-2 truncate">
              {{ authStore.user?.email || '-' }}
            </div>
          </div>
          <div class="hidden md:block lg:hidden text-left max-w-[100px]">
            <div class="text-[13px] font-semibold text-ink leading-tight truncate">
              {{ authStore.user?.full_name || 'Pengguna' }}
            </div>
          </div>
          <ChevronDown class="w-3.5 h-3.5 text-ink-3 hidden sm:block shrink-0" />
        </button>

        <!-- User Dropdown Popover -->
        <div
          v-if="showUserMenu"
          class="absolute right-0 mt-2 w-48 rounded-lg bg-surface shadow-tooltip border border-line py-1 z-50 text-xs text-ink"
        >
          <div class="px-3 py-2 border-b border-line md:hidden">
            <div class="font-semibold text-ink">{{ authStore.user?.full_name }}</div>
            <div class="text-[11px] text-ink-2">{{ authStore.user?.email }}</div>
          </div>

          <!-- Mobile Role Switcher within popover per 11.9 -->
          <div class="px-3 py-2 border-b border-line sm:hidden">
            <div class="text-[10px] font-medium text-ink-3 mb-1 uppercase">Ganti Peran:</div>
            <select
              :value="authStore.role"
              class="w-full bg-muted border border-line rounded px-2 py-1 text-xs"
              @change="handleRoleChange($event.target.value)"
            >
              <option :value="ROLES.TEKNISI">Teknisi</option>
              <option :value="ROLES.SUPERVISOR">Supervisor</option>
              <option :value="ROLES.ADMIN">Admin</option>
            </select>
          </div>

          <RouterLink
            to="/profil"
            class="flex items-center gap-2 px-3 py-2 hover:bg-muted transition"
            @click="showUserMenu = false"
          >
            <UserCircle class="w-4 h-4 text-ink-2" />
            <span>Profil Saya</span>
          </RouterLink>

          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-danger hover:bg-muted transition text-left"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4 text-danger" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useNotificationStore } from '../../stores/notification'
import { ROLES } from '../../constants/roles'
import PageHeader from './PageHeader.vue'
import Avatar from '../common/Avatar.vue'
import {
  Bell,
  Menu,
  ChevronDown,
  UserCircle,
  LogOut
} from 'lucide-vue-next'

defineEmits(['toggle-sidebar'])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationStore()

const showNotifications = ref(false)
const showUserMenu = ref(false)
let pollTimer = null
const POLL_INTERVAL = 60000 // 60 detik (menghemat bandwidth & beban server)

function toggleNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    notifStore.fetchNotifications()
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (authStore.isAuthenticated && !document.hidden) {
      notifStore.fetchUnreadCount()
    }
  }, POLL_INTERVAL)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    // Hentikan polling saat tab tidak aktif (Page Visibility API)
    stopPolling()
  } else {
    // Aktifkan kembali polling dan segera refresh unread count saat tab dibuka kembali
    if (authStore.isAuthenticated) {
      notifStore.fetchUnreadCount()
      startPolling()
    }
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    notifStore.fetchUnreadCount()
    startPolling()
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  stopPolling()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

watch(
  () => authStore.user?.id,
  (newId) => {
    if (newId) {
      notifStore.fetchUnreadCount()
      startPolling()
    } else {
      stopPolling()
    }
  }
)

const currentRouteTitle = computed(() => {
  if (route.meta?.title) return route.meta.title
  if (route.path === '/dashboard') return 'Dashboard'
  return 'Engineer Logbook'
})

const currentRouteSubtitle = computed(() => {
  if (route.path === '/dashboard') {
    if (authStore.isTeknisi) return 'Ringkasan aktivitas logbook Anda'
    if (authStore.isSupervisor) return 'Monitoring operasional dan antrean approval tim'
    if (authStore.isAdmin) return 'Ringkasan sistem dan audit log operasional'
  }
  return ''
})

function formatType(type) {
  const map = {
    LOGBOOK_SUBMITTED: 'Pengajuan Logbook',
    LOGBOOK_PENDING_APPROVAL: 'Menunggu Approval',
    LOGBOOK_APPROVED: 'Disetujui',
    LOGBOOK_REJECTED: 'Ditolak / Revisi',
    BULK_DRAFTS_SUBMITTED: 'Draft Serentak',
    DRAFTS_SUBMITTED: 'Draft Terkirim',
    USER_CREATED: 'Akun Baru',
    USER_UPDATED: 'Akun Diperbarui'
  }
  return map[type] || type || 'Notifikasi'
}

function formatTime(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return dateStr
  }
}

async function handleRoleChange(targetRole) {
  if (authStore.role === targetRole) return
  await authStore.quickLoginAs(targetRole)
  showUserMenu.value = false
  await notifStore.fetchNotifications()
  router.push('/dashboard')
}

async function handleNotificationClick(item) {
  if (!item.is_read && !item.read_at) {
    await notifStore.markAsRead(item.id)
  }
  showNotifications.value = false

  if (authStore.isTeknisi) {
    if (item.type?.includes('REJECT') && item.logbook_id) {
      router.push(`/logbook/edit/${item.logbook_id}`)
    } else {
      router.push('/logbook/riwayat')
    }
  } else if (authStore.isSupervisor) {
    router.push('/approval')
  } else if (authStore.isAdmin) {
    if (item.type?.includes('USER')) {
      router.push('/admin/users')
    } else {
      router.push('/admin/audit')
    }
  }
}

async function handleLogout() {
  showUserMenu.value = false
  await authStore.logout()
  router.push('/login')
}
</script>
