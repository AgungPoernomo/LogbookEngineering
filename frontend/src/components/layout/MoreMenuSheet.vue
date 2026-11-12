<template>
  <!--
    Bottom Sheet Navigasi "Lainnya" (Khusus Mobile & Tablet).
    Dipakai oleh BottomNavbar.vue untuk menampilkan menu yang tidak masuk 5 slot utama.
  -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-end justify-center lg:hidden"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-ink/30 backdrop-blur-[1px]"
          @click="$emit('close')"
        />

        <!-- Panel -->
        <div
          ref="panelRef"
          tabindex="-1"
          class="relative w-full max-w-md sm:max-w-xl md:max-w-2xl bg-surface border-t border-line rounded-t-xl shadow-tooltip max-h-[80vh] flex flex-col focus:outline-none"
        >
          <!-- Drag Handle -->
          <div class="flex justify-center pt-2 pb-1">
            <span class="w-10 h-1 rounded-full bg-line" aria-hidden="true" />
          </div>

          <!-- Header -->
          <div class="flex items-center justify-between px-4 pb-3 pt-1 border-b border-line">
            <h2 class="text-sm font-semibold text-ink">{{ title }}</h2>
            <button
              type="button"
              class="w-7 h-7 rounded-md flex items-center justify-center text-ink-2 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition"
              aria-label="Tutup menu lainnya"
              @click="$emit('close')"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Daftar Menu -->
          <div class="flex-1 overflow-y-auto px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <div
              v-for="section in sections"
              :key="section.title"
              class="mb-3 last:mb-0"
            >
              <div class="text-[11px] font-medium text-ink-3 uppercase tracking-wider px-2 mb-1.5">
                {{ section.title }}
              </div>
              <ul class="space-y-1">
                <li v-for="item in section.items" :key="item.path">
                  <RouterLink
                    :to="item.path"
                    :aria-current="isItemActive(item) ? 'page' : undefined"
                    :class="[
                      'flex items-center gap-3 h-11 px-3 rounded-md text-[14px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      isItemActive(item)
                        ? 'bg-primary text-white'
                        : 'text-ink hover:bg-muted'
                    ]"
                    @click="$emit('close')"
                  >
                    <component
                      :is="item.icon"
                      :class="[
                        'w-[18px] h-[18px] shrink-0',
                        isItemActive(item) ? 'text-white' : 'text-ink-2'
                      ]"
                    />
                    <span class="truncate">{{ item.name }}</span>
                  </RouterLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { X } from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Menu Lainnya'
  },
  // [{ title: 'Menu', items: [{ name, path, icon, activePrefixes? }] }]
  sections: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close'])

const route = useRoute()
const panelRef = ref(null)

function isItemActive(item) {
  if (item.activePrefixes) {
    return item.activePrefixes.some(prefix => route.path.startsWith(prefix))
  }
  return route.path === item.path
}

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

// Kunci scroll body selama sheet terbuka & pasang listener keyboard.
watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      panelRef.value?.focus()
    } else {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeydown)
    }
  }
)

onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
})
</script>
