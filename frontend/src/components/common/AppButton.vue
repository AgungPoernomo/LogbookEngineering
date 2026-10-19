<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
      sizeClasses[size],
      variantClasses[variant]
    ]"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-1.5 h-4 w-4 text-current"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
    <slot />
  </button>
</template>

<script setup>
const props = defineProps({
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'primary' // 'primary', 'secondary', 'danger', 'success', 'outline', 'ghost'
  },
  size: {
    type: String,
    default: 'md' // 'sm', 'md', 'lg'
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const sizeClasses = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base'
}

const variantClasses = {
  primary: 'bg-primary hover:bg-blue-700 active:bg-blue-800 text-white shadow-card',
  secondary: 'bg-surface hover:bg-muted text-ink border border-line shadow-card',
  danger: 'bg-danger hover:bg-red-600 active:bg-red-700 text-white shadow-card',
  success: 'bg-success hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-card',
  outline: 'border border-primary text-primary hover:bg-primary-soft/40',
  ghost: 'bg-transparent hover:bg-muted text-ink shadow-none'
}
</script>
