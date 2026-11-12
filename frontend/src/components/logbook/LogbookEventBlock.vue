<template>
  <button
    type="button"
    :class="[
      'absolute rounded-md text-left transition select-none overflow-hidden z-10 hover:z-20 hover:shadow-tooltip focus:outline-none focus:ring-2 focus:ring-primary',
      bgClass,
      fgClass,
      borderLeftClass,
      isDraft ? 'border border-dashed border-status-draft-dot' : '',
      isSelected ? 'ring-2 ring-primary' : ''
    ]"
    :style="styleObj"
    :aria-label="ariaLabel"
    @click.stop="handleClick"
  >
    <div class="h-full p-1 sm:p-1.5 flex flex-col justify-start overflow-hidden leading-tight">
      <!-- Segment lanjutan indikator -->
      <div v-if="segment.isContinuation" class="flex items-center gap-1 text-[10px] opacity-80 mb-0.5">
        <CornerDownRight class="w-3 h-3 shrink-0" />
        <span>(lanjutan)</span>
      </div>

      <!-- Tinggi < 26px (<= ~30 menit pada 40px/jam): 1 baris ringkas -->
      <div v-if="segment.heightPx < 26" class="truncate text-[11px] font-medium flex items-center gap-1">
        <span class="font-mono text-[10px]">{{ timeLabel }}</span>
        <span class="font-semibold">{{ machineName }}</span>
      </div>

      <!-- Tinggi 26 - 43px (mis. 45 menit - 1 jam): 2 baris -->
      <div v-else-if="segment.heightPx < 44" class="truncate">
        <div class="font-semibold text-xs truncate">
          {{ machineName }}
        </div>
        <div class="text-[10px] font-mono opacity-85 truncate mt-0.5">
          {{ timeLabel }}
        </div>
      </div>

      <!-- Tinggi >= 44px (>= ~1 jam 15 menit): nama mesin, sub-mesin, jam -->
      <div v-else class="truncate space-y-0.5">
        <div class="font-semibold text-xs truncate">
          {{ machineName }}
        </div>
        <div v-if="subMachineName && subMachineName !== '-'" class="text-[11px] opacity-85 truncate">
          {{ subMachineName }}
        </div>
        <div class="text-[10px] font-mono opacity-85 pt-0.5">
          {{ timeLabel }}
        </div>
      </div>
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { CornerDownRight } from 'lucide-vue-next'
import { LOG_STATUS } from '../../constants/logStatus'
import { minutesToHhmm } from '../../utils/calendarLayout'

const props = defineProps({
  segment: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

function handleClick(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  emit('click', {
    segment: props.segment,
    logbook: props.segment.logbook || lb.value,
    rect: {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height
    }
  })
}

const lb = computed(() => props.segment.logbook || {})
const statusKey = computed(() => (lb.value.status || 'DRAFT').toLowerCase())
const isDraft = computed(() => lb.value.status === LOG_STATUS.DRAFT)

const bgClass = computed(() => `bg-status-${statusKey.value}-bg`)
const fgClass = computed(() => `text-status-${statusKey.value}-fg`)

const borderLeftClass = computed(() => {
  switch (lb.value.status) {
    case LOG_STATUS.PENDING:
      return 'border-l-[3px] border-l-status-pending-dot'
    case LOG_STATUS.APPROVED:
      return 'border-l-[3px] border-l-status-approved-dot'
    case LOG_STATUS.REJECTED:
      return 'border-l-[3px] border-l-status-rejected-dot'
    case LOG_STATUS.CANCELLED:
      return 'border-l-[3px] border-l-status-cancelled-dot'
    case LOG_STATUS.DRAFT:
    default:
      return 'border-l-[3px] border-l-status-draft-dot'
  }
})

const machineName = computed(() => lb.value.machine_name || 'Mesin')
const subMachineName = computed(() => lb.value.sub_machine_name)

const timeLabel = computed(() => {
  const startStr = minutesToHhmm(props.segment.startMin)
  const endStr = minutesToHhmm(props.segment.endMin)
  return `${startStr} - ${endStr}`
})

const styleObj = computed(() => ({
  top: `${props.segment.topPx}px`,
  height: `${props.segment.heightPx}px`,
  left: `${props.segment.leftPercent}%`,
  width: `calc(${props.segment.widthPercent}% - 4px)`
}))

const ariaLabel = computed(() => {
  return `Logbook ${machineName.value}, ${props.segment.day}, ${timeLabel.value}, status ${lb.value.status || 'Draft'}`
})
</script>
