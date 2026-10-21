<template>
  <nav
    class="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-surface/95 backdrop-blur-md border-t border-line shadow-[0_-2px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)]"
    aria-label="Navigasi Bawah Perangkat Seluler dan Tablet"
  >
    <div class="flex items-center justify-around h-16 max-w-md sm:max-w-xl md:max-w-2xl mx-auto px-1.5 sm:px-4">
      <RouterLink
        v-for="item in currentNavItems"
        :key="item.path"
        :to="item.path"
        class="group relative flex flex-col items-center justify-center flex-1 h-full py-1 text-center focus:outline-none select-none transition-transform active:scale-95"
        :aria-current="isItemActive(item) ? 'page' : undefined"
      >
        <!-- Top Active Indicator Bar (Subtle) -->
        <span
          v-if="isItemActive(item)"
          class="absolute top-0 w-8 sm:w-10 h-0.5 bg-primary rounded-full animate-fadeIn"
        />

        <!-- Icon Container with Active Pill -->
        <div
          :class="[
            'relative flex items-center justify-center w-10 sm:w-12 h-7 rounded-full transition-colors duration-150',
            isItemActive(item)
              ? 'bg-primary/10 text-primary'
              : 'text-ink-3 group-hover:text-ink group-hover:bg-muted/50'
          ]"
        >
          <component
            :is="item.icon"
            :class="[
              'w-[18px] h-[18px] sm:w-5 sm:h-5 transition-all duration-150',
              isItemActive(item) ? 'stroke-[2.2] scale-105' : 'stroke-[1.75]'
            ]"
          />

          <!-- Badge Notifikasi / Pending jika relevan -->
          <span
            v-if="item.badgeCount && item.badgeCount > 0"
            class="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-orange text-white text-[9px] font-bold leading-none ring-2 ring-surface"
          >
            {{ item.badgeCount > 99 ? '99+' : item.badgeCount }}
          </span>
        </div>

        <!-- Label Teks -->
        <span
          :class="[
            'text-[10px] sm:text-[11px] leading-tight mt-0.5 tracking-tight transition-colors duration-150 truncate max-w-[70px] sm:max-w-[85px]',
            isItemActive(item)
              ? 'text-primary font-semibold'
              : 'text-ink-2 group-hover:text-ink font-normal'
          ]"
        >
          {{ item.name }}
        </span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useNotificationStore } from '../../stores/notification'
import {
  LayoutGrid,
  SquarePen,
  ClipboardList,
  ClipboardCheck,
  FileBarChart,
  Users,
  Building2,
  ScrollText,
  UserCircle
} from 'lucide-vue-next'

const route = useRoute()
const authStore = useAuthStore()
const notifStore = useNotificationStore()

// Daftar Item Navigasi Bawah per Peran (Mobile & Tablet)
const currentNavItems = computed(() => {
  if (authStore.isTeknisi) {
    return [
      {
        name: 'Dashboard',
        path: '/dashboard',
        icon: LayoutGrid,
        activePrefixes: ['/dashboard']
      },
      {
        name: 'Input Log',
        path: '/logbook/input',
        icon: SquarePen,
        activePrefixes: ['/logbook/input']
      },
      {
        name: 'Riwayat',
        path: '/logbook/riwayat',
        icon: ClipboardList,
        activePrefixes: ['/logbook/riwayat', '/logbook/edit']
      },
      {
        name: 'Profil',
        path: '/profil',
        icon: UserCircle,
        activePrefixes: ['/profil']
      }
    ]
  }

  if (authStore.isSupervisor) {
    return [
      {
        name: 'Dashboard',
        path: '/dashboard',
        icon: LayoutGrid,
        activePrefixes: ['/dashboard']
      },
      {
        name: 'Approval',
        path: '/approval',
        icon: ClipboardCheck,
        activePrefixes: ['/approval'],
        badgeCount: notifStore.unreadCount
      },
      {
        name: 'Aktivitas',
        path: '/supervisor/teknisi',
        icon: Users,
        activePrefixes: ['/supervisor/teknisi']
      },
      {
        name: 'Laporan',
        path: '/laporan',
        icon: FileBarChart,
        activePrefixes: ['/laporan']
      },
      {
        name: 'Profil',
        path: '/profil',
        icon: UserCircle,
        activePrefixes: ['/profil']
      }
    ]
  }

  if (authStore.isAdmin) {
    return [
      {
        name: 'Dashboard',
        path: '/dashboard',
        icon: LayoutGrid,
        activePrefixes: ['/dashboard']
      },
      {
        name: 'Pengguna',
        path: '/admin/users',
        icon: Users,
        activePrefixes: ['/admin/users']
      },
      {
        name: 'Master',
        path: '/admin/plants',
        icon: Building2,
        activePrefixes: ['/admin/plants', '/admin/machines', '/admin/groups', '/admin/master']
      },
      {
        name: 'Audit',
        path: '/admin/audit',
        icon: ScrollText,
        activePrefixes: ['/admin/audit']
      },
      {
        name: 'Profil',
        path: '/profil',
        icon: UserCircle,
        activePrefixes: ['/profil']
      }
    ]
  }

  // Fallback default
  return [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutGrid,
      activePrefixes: ['/dashboard']
    },
    {
      name: 'Profil',
      path: '/profil',
      icon: UserCircle,
      activePrefixes: ['/profil']
    }
  ]
})

function isItemActive(item) {
  if (item.activePrefixes) {
    return item.activePrefixes.some(prefix => route.path.startsWith(prefix))
  }
  return route.path === item.path
}
</script>
