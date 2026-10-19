<template>
  <div class="w-full overflow-x-auto">
    <table class="w-full text-left text-sm border-collapse">
      <thead v-if="$slots.thead" class="border-b border-line text-xs font-semibold text-ink-2 bg-muted/60">
        <slot name="thead" />
      </thead>
      <tbody class="divide-y divide-line text-ink">
        <slot />
      </tbody>
    </table>
  </div>
</template>
