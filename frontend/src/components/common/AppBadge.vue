<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium leading-none transition-colors h-[22px]',
      badgeClass
    ]"
  >
    <span v-if="hasDot" :class="['w-1.5 h-1.5 rounded-full shrink-0', dotClass]" />
    <slot>{{ text }}</slot>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { LOG_STATUS_CONFIG } from '../../constants/status'
import { ROLE_BADGE_COLORS } from '../../constants/roles'

const props = defineProps({
  status: {
    type: String,
    default: null
  },
  role: {
    type: String,
    default: null
  },
  text: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'default'
  },
  hasDot: {
    type: Boolean,
    default: true
  }
})

const badgeClass = computed(() => {
  if (props.status && LOG_STATUS_CONFIG[props.status]) {
    return LOG_STATUS_CONFIG[props.status].color
  }
  if (props.role && ROLE_BADGE_COLORS[props.role]) {
    return ROLE_BADGE_COLORS[props.role]
  }

  const variants = {
    primary: 'bg-primary-soft text-primary-text-on-soft',
    success: 'bg-status-approved-bg text-status-approved-fg',
    warning: 'bg-status-pending-bg text-status-pending-fg',
    danger: 'bg-status-rejected-bg text-status-rejected-fg',
    info: 'bg-primary-soft text-primary',
    default: 'bg-status-draft-bg text-status-draft-fg'
  }
  return variants[props.variant] || variants.default
})

const dotClass = computed(() => {
  if (props.status && LOG_STATUS_CONFIG[props.status]) {
    return LOG_STATUS_CONFIG[props.status].dot
  }
  return 'bg-current opacity-70'
})
</script>
