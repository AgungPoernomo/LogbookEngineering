<template>
  <button
    type="button"
    :title="chip.fullTitle"
    :class="[
      'h-[22px] w-full rounded-md px-2 text-xs font-medium flex items-center gap-1.5 transition select-none truncate text-left',
      chip.type === 'total'
        ? 'bg-primary text-white cursor-default'
        : chip.type === 'rejected'
          ? 'bg-status-rejected-bg text-status-rejected-fg border border-danger/20 hover:bg-status-rejected-bg/80 cursor-pointer'
          : 'bg-status-draft-bg text-status-draft-fg border border-line hover:bg-status-draft-bg/80 cursor-pointer'
    ]"
    @click="handleClick"
  >
    <Clock v-if="chip.type === 'total'" class="w-3.5 h-3.5 shrink-0" />
    <AlertCircle v-else-if="chip.type === 'rejected'" class="w-3.5 h-3.5 shrink-0 text-danger" />
    <FileText v-else class="w-3.5 h-3.5 shrink-0 text-ink-2" />

    <span class="truncate">
      <span class="hidden sm:inline">{{ chip.label }}</span>
      <span class="sm:hidden">{{ chip.shortLabel || chip.label }}</span>
    </span>
  </button>
</template>

<script setup>
import { Clock, AlertCircle, FileText } from 'lucide-vue-next'

const props = defineProps({
  chip: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['openEdit'])

function handleClick() {
  if (props.chip.type === 'rejected' || props.chip.type === 'draft') {
    emit('openEdit', props.chip.firstId)
  }
}
</script>
