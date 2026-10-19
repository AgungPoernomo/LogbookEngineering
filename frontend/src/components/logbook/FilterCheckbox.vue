<template>
  <label class="flex items-center gap-2.5 h-8 cursor-pointer select-none group text-xs">
    <div class="relative flex items-center justify-center">
      <input
        type="checkbox"
        :checked="modelValue"
        class="sr-only peer"
        @change="$emit('update:modelValue', $event.target.checked)"
      />
      <!-- Custom Checkbox Box -->
      <div
        :class="[
          'w-4.5 h-4.5 rounded flex items-center justify-center transition-all border',
          modelValue ? 'border-transparent text-white' : 'border-line bg-surface group-hover:border-ink-3',
          modelValue && colorClass ? colorClass : (modelValue ? 'bg-primary' : '')
        ]"
      >
        <svg
          v-if="modelValue"
          class="w-3 h-3 text-white"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>

    <!-- Label & Description -->
    <div class="flex-1 min-w-0">
      <div class="text-ink font-medium truncate flex items-center gap-1.5">
        <span>{{ label }}</span>
        <span v-if="badge" class="text-[10px] text-ink-2 font-normal">({{ badge }})</span>
      </div>
      <div v-if="sublabel" class="text-[11px] text-ink-2 truncate">
        {{ sublabel }}
      </div>
    </div>
  </label>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: true
  },
  label: {
    type: String,
    required: true
  },
  sublabel: {
    type: String,
    default: ''
  },
  badge: {
    type: [String, Number],
    default: ''
  },
  colorClass: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue'])
</script>
