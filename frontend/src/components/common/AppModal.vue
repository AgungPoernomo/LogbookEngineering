<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
        @click.self="closeOnBackdrop && close()"
      >
        <div
          class="bg-surface rounded-lg shadow-tooltip border border-line w-full max-w-lg overflow-hidden transform transition-all"
        >
          <div class="flex items-center justify-between px-5 py-4 border-b border-line">
            <h3 class="text-base font-semibold text-ink">
              <slot name="title">{{ title }}</slot>
            </h3>
            <button
              type="button"
              class="text-ink-3 hover:text-ink rounded-md p-1 transition"
              aria-label="Tutup dialog"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="px-5 py-4 max-h-[75vh] overflow-y-auto text-body text-ink">
            <slot />
          </div>

          <div v-if="$slots.footer" class="px-5 py-3.5 bg-muted border-t border-line flex justify-end gap-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close'])

function close() {
  emit('close')
}
</script>
