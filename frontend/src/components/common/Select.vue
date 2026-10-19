<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="id"
      class="block text-xs font-medium text-ink mb-1.5"
    >
      {{ label }}
      <span v-if="required" class="text-danger ml-0.5">*</span>
    </label>
    <div class="relative rounded-md shadow-sm">
      <select
        :id="id"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :aria-describedby="error ? `${id}-error` : (hint ? `${id}-hint` : undefined)"
        :aria-invalid="!!error"
        :class="[
          'block w-full h-10 pl-3 pr-9 bg-surface text-sm font-medium text-ink rounded-md border appearance-none transition-colors focus:outline-none disabled:bg-muted disabled:text-ink-3 disabled:cursor-not-allowed cursor-pointer',
          error
            ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger'
            : 'border-line focus:border-primary focus:ring-1 focus:ring-primary'
        ]"
        @change="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur', $event)"
      >
        <option v-if="placeholder" value="" disabled :selected="!modelValue">
          {{ placeholder }}
        </option>
        <slot>
          <option
            v-for="opt in options"
            :key="opt.value !== undefined ? opt.value : opt"
            :value="opt.value !== undefined ? opt.value : opt"
          >
            {{ opt.label !== undefined ? opt.label : opt }}
          </option>
        </slot>
      </select>
      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-ink-3">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
    <p
      v-if="error"
      :id="`${id}-error`"
      class="mt-1 text-xs text-danger font-medium"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      :id="`${id}-hint`"
      class="mt-1 text-xs text-ink-2"
    >
      {{ hint }}
    </p>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  id: {
    type: String,
    default: () => `select-${Math.random().toString(36).slice(2, 9)}`
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue', 'blur'])
</script>
