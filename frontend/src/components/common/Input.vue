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
      <div
        v-if="$slots.prefix"
        class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-3"
      >
        <slot name="prefix" />
      </div>
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-describedby="error ? `${id}-error` : (hint ? `${id}-hint` : undefined)"
        :aria-invalid="!!error"
        :class="[
          'block w-full h-10 px-3 bg-surface text-sm font-medium text-ink rounded-md border transition-colors placeholder:text-ink-3 placeholder:font-normal focus:outline-none disabled:bg-muted disabled:text-ink-3 disabled:cursor-not-allowed',
          $slots.prefix ? 'pl-9' : '',
          $slots.suffix ? 'pr-9' : '',
          error
            ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger'
            : 'border-line focus:border-primary focus:ring-1 focus:ring-primary'
        ]"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />
      <div
        v-if="$slots.suffix"
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-3"
      >
        <slot name="suffix" />
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
    default: () => `input-${Math.random().toString(36).slice(2, 9)}`
  },
  label: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
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

defineEmits(['update:modelValue', 'blur', 'focus'])
</script>
