<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="show"
      :class="[
        'fixed bottom-20 sm:bottom-20 lg:bottom-5 right-4 sm:right-5 z-50 flex items-start gap-3 p-4 bg-surface rounded-lg shadow-tooltip border border-line max-w-sm',
        customClass
      ]"
      role="alert"
    >
      <div
        :class="[
          'w-2 h-2 rounded-full shrink-0 mt-1',
          (variant === 'success' || type === 'success') ? 'bg-success' : ((variant === 'danger' || type === 'error' || type === 'danger') ? 'bg-danger' : 'bg-primary')
        ]"
      />
      <div class="text-xs font-medium text-ink flex-1 min-w-0">
        <div v-if="title" class="font-bold text-ink mb-0.5 text-xs">{{ title }}</div>
        <div class="text-ink-2 leading-relaxed break-words">
          <slot>{{ message }}</slot>
        </div>
      </div>
      <button
        type="button"
        class="text-ink-3 hover:text-ink p-1 rounded-sm transition shrink-0"
        aria-label="Tutup notifikasi"
        @click="$emit('close')"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'success' // 'success', 'danger', 'info'
  },
  type: {
    type: String,
    default: 'success'
  },
  customClass: {
    type: String,
    default: ''
  }
})

defineEmits(['close'])
</script>
