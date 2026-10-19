<template>
  <AppModal
    :is-open="isOpen"
    :title="`Daftar User Aktif — ${plant?.name || 'Plant'}`"
    @close="$emit('close')"
  >
    <div class="space-y-3 max-h-[420px] overflow-y-auto pr-1">
      <div
        v-if="!users || users.length === 0"
        class="p-6 text-center text-xs text-ink-3"
      >
        Belum ada user aktif pada plant ini untuk periode yang dipilih.
      </div>

      <div
        v-for="user in users"
        :key="user.id"
        class="p-2.5 rounded-lg border border-line bg-muted/40 hover:bg-muted flex items-center justify-between gap-3 transition"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <img
            v-if="user.photo_url"
            :src="user.photo_url"
            :alt="user.name"
            class="w-9 h-9 rounded-full object-cover shrink-0 border border-line"
          />
          <div
            v-else
            class="w-9 h-9 rounded-full bg-primary-soft text-primary font-semibold text-xs flex items-center justify-center shrink-0"
          >
            {{ user.initials }}
          </div>

          <div class="min-w-0">
            <div class="text-xs font-semibold text-ink truncate">
              {{ user.name }}
            </div>
            <div class="text-[11px] text-ink-2 truncate">
              {{ user.activity_description }}
            </div>
          </div>
        </div>

        <div class="text-right shrink-0">
          <span class="text-[10px] font-mono text-ink-3 block">Aktivitas Terakhir</span>
          <span class="text-xs font-medium text-ink">{{ user.last_activity_time }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="h-8 px-4 rounded-md border border-line bg-surface text-ink hover:bg-muted text-xs font-medium transition"
        @click="$emit('close')"
      >
        Tutup
      </button>
    </template>
  </AppModal>
</template>

<script setup>
import AppModal from '../../common/AppModal.vue'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  plant: {
    type: Object,
    default: null
  },
  users: {
    type: Array,
    default: () => []
  }
})

defineEmits(['close'])
</script>
