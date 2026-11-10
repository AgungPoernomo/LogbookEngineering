<template>
  <!-- Sidebar Aside (Hanya aktif pada Desktop lg: >= 1024px. Dinonaktifkan pada HP & Tablet) -->
  <aside
    :class="[
      'hidden lg:flex fixed top-0 bottom-0 left-0 z-40 flex-col bg-surface border-r border-line transition-all duration-200 select-none shadow-none',
      collapsed ? 'w-[72px]' : 'w-52'
    ]"
    aria-label="Menu utama"
  >
    <!-- Header: Logo & Collapse Button -->
    <div class="relative flex h-[70px] items-center justify-between px-4 border-b border-line">
      <!-- Logo Brand -->
      <RouterLink to="/dashboard" class="flex items-center gap-2.5 overflow-hidden focus:outline-none">
        <!-- Logo SVG Placeholder per 11.5.1 / 11.12 U-2 -->
        <div class="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white shrink-0">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span
          v-if="!collapsed"
          class="text-[20px] font-semibold text-ink tracking-tight whitespace-nowrap"
        >
          Satoria
        </span>
      </RouterLink>

      <!-- Collapse Toggle Button (Desktop only) -->
      <button
        type="button"
        class="hidden lg:flex absolute -right-3 top-[23px] w-6 h-6 items-center justify-center rounded-full bg-surface border border-line text-primary shadow-xs hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary z-50 transition"
        :aria-label="collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'"
        @click="toggleCollapse"
      >
        <ChevronRight v-if="collapsed" class="w-3.5 h-3.5 text-primary" />
        <ChevronLeft v-else class="w-3.5 h-3.5 text-primary" />
      </button>
    </div>

    <!-- Navigation Content -->
      <div class="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <!-- Section: Menu -->
        <nav aria-label="Navigasi aplikasi">
          <div
            v-if="!collapsed"
            class="text-[12px] font-normal text-ink-3 px-3 mb-2"
          >
            Menu
          </div>
          <ul class="space-y-1">
            <li v-for="item in menuSectionItems" :key="item.path">
              <RouterLink
                :to="item.path"
                custom
                v-slot="{ href, navigate }"
              >
                <a
                  :href="href"
                  :aria-current="isItemActive(item) ? 'page' : undefined"
                  :class="[
                    'flex items-center h-[34px] px-3 rounded-md text-[14px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    collapsed ? 'justify-center px-0' : 'gap-3',
                    isItemActive(item)
                      ? 'bg-primary text-white font-medium'
                      : 'text-ink hover:bg-muted'
                  ]"
                  :title="collapsed ? item.name : undefined"
                  @click="handleNavClick(navigate)"
                >
                  <component
                    :is="getIcon(item.icon)"
                    :class="[
                      'w-[18px] h-[18px] shrink-0 transition-colors',
                      isItemActive(item) ? 'text-white' : 'text-ink-2 group-hover:text-ink'
                    ]"
                  />
                  <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
                </a>
              </RouterLink>
            </li>
          </ul>
        </nav>

        <!-- Section: Akun -->
        <nav aria-label="Navigasi akun">
          <div
            v-if="!collapsed"
            class="text-[12px] font-normal text-ink-3 px-3 mb-2"
          >
            Akun
          </div>
          <ul class="space-y-1">
            <li v-for="item in accountSectionItems" :key="item.path">
              <RouterLink
                :to="item.path"
                custom
                v-slot="{ href, navigate }"
              >
                <a
                  :href="href"
                  :aria-current="isItemActive(item) ? 'page' : undefined"
                  :class="[
                    'flex items-center h-[34px] px-3 rounded-md text-[14px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    collapsed ? 'justify-center px-0' : 'gap-3',
                    isItemActive(item)
                      ? 'bg-primary text-white font-medium'
                      : 'text-ink hover:bg-muted'
                  ]"
                  :title="collapsed ? item.name : undefined"
                  @click="handleNavClick(navigate)"
                >
                  <component
                    :is="getIcon(item.icon)"
                    :class="[
                      'w-[18px] h-[18px] shrink-0 transition-colors',
                      isItemActive(item) ? 'text-white' : 'text-ink-2'
                    ]"
                  />
                  <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
                </a>
              </RouterLink>
            </li>
          </ul>
        </nav>
      </div>

      <!-- Footer: SidebarProfile per 11.5.1 -->
      <div class="p-3 border-t border-line bg-surface">
        <div
          :class="[
            'flex items-center gap-2.5 rounded-md p-1.5 transition-colors',
            collapsed ? 'justify-center' : 'justify-between'
          ]"
        >
          <div class="flex items-center gap-2.5 overflow-hidden">
            <Avatar
              :src="authStore.user?.photo_url"
              :name="authStore.user?.full_name"
              size="md"
            />
            <div v-if="!collapsed" class="min-w-0 flex-1">
              <div class="text-[13px] font-semibold text-ink leading-tight truncate">
                {{ authStore.user?.full_name || 'Pengguna' }}
              </div>
              <div class="text-[11px] font-normal text-ink-2 truncate">
                {{ authStore.user?.email || '-' }}
              </div>
            </div>
          </div>

          <button
            v-if="!collapsed"
            type="button"
            class="text-ink-3 hover:text-danger p-1 rounded-md transition"
            aria-label="Keluar dari akun"
            title="Keluar"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { NAVIGATION_MENU } from '../../constants/menu'
import Avatar from '../common/Avatar.vue'
import {
  LayoutGrid,
  SquarePen,
  ClipboardList,
  ClipboardCheck,
  FileBarChart,
  Users,
  Database,
  ScrollText,
  UserCircle,
  Building2,
  Cpu,
  Layers,
  LineChart,
  Radar,
  Wrench,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-vue-next'

const emit = defineEmits(['collapse-change'])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const collapsed = ref(false)

function toggleCollapse() {
  collapsed.value = !collapsed.value
  emit('collapse-change', collapsed.value)
}

const iconMap = {
  LayoutGrid,
  SquarePen,
  ClipboardList,
  ClipboardCheck,
  FileBarChart,
  Users,
  Database,
  Building2,
  Cpu,
  Layers,
  LineChart,
  Radar,
  // FASE 5.2 — ikon Master Sparepart.
  Wrench,
  ScrollText,
  UserCircle
}

function getIcon(name) {
  return iconMap[name] || LayoutGrid
}

const userAllowedItems = computed(() => {
  if (!authStore.role) return []
  return NAVIGATION_MENU.filter(item => item.roles.includes(authStore.role))
})

const menuSectionItems = computed(() => {
  return userAllowedItems.value.filter(item => item.section === 'Menu')
})

const accountSectionItems = computed(() => {
  return userAllowedItems.value.filter(item => item.section === 'Akun')
})

function isItemActive(item) {
  if (item.activeMatchPrefixes) {
    return item.activeMatchPrefixes.some(prefix => route.path.startsWith(prefix))
  }
  return route.path === item.path
}

function handleNavClick(navigate) {
  navigate()
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>
