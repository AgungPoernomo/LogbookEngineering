<template>
  <div class="space-y-8 relative w-full">
    <!-- Header Halaman Riwayat Logbook -->
    <div class="pb-2 border-b border-line">
      <div>
        <div
          class="text-[12px] font-semibold text-primary uppercase tracking-wider"
        >
          Arsip & Jadwal Kerja Teknisi
        </div>
        <h1 class="text-xl sm:text-2xl font-bold text-ink tracking-tight">
          Riwayat & Perencana Logbook
        </h1>
        <p class="text-xs text-ink-2 mt-0.5">
          Pemantauan jadwal mingguan, status persetujuan supervisor, dan arsip
          riwayat pekerjaan.
        </p>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- BAGIAN 1: Kalender Mingguan Teknisi (UI dari Input Logbook) -->
    <!-- ======================================================== -->
    <section class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
          <h2
            class="text-sm font-bold text-ink uppercase tracking-wide truncate"
          >
            Jadwal & Visualisasi Logbook Mingguan
          </h2>
        </div>

        <div class="flex items-center gap-2 sm:gap-3 shrink-0">
          <span class="hidden sm:inline text-[11px] text-ink-3">
            Klik slot waktu atau kartu logbook untuk detail
          </span>
          <button
            type="button"
            class="h-8 px-2 sm:px-2.5 rounded-md border border-line bg-surface text-ink-2 hover:text-ink hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition focus:outline-none focus:ring-2 focus:ring-primary"
            :aria-expanded="isCalendarExpanded"
            aria-controls="week-calendar-area"
            :aria-label="
              isCalendarExpanded
                ? 'Lipat kalender mingguan'
                : 'Bentangkan kalender mingguan'
            "
            :title="
              isCalendarExpanded
                ? 'Lipat kalender mingguan'
                : 'Bentangkan kalender mingguan'
            "
            @click="isCalendarExpanded = !isCalendarExpanded"
          >
            <component
              :is="isCalendarExpanded ? ChevronUp : ChevronDown"
              class="w-4 h-4"
            />
            <span class="hidden md:inline">
              {{ isCalendarExpanded ? "Lipat" : "Bentangkan" }}
            </span>
          </button>
        </div>
      </div>

      <!-- Layout Kalender: Sidebar Kiri + Kartu Kalender Utama -->
      <!-- Layout Kalender: Sidebar Kiri + Kartu Kalender Utama -->
      <div
        v-show="isCalendarExpanded"
        id="week-calendar-area"
        class="flex items-stretch gap-4 w-full"
      >
        <!-- Panel Kiri (>= 1280px) -->
        <div class="hidden xl:flex h-full shrink-0">
          <PlannerSidebarPanel
            class="h-full"
            :selected-date="selectedDate"
            :filters="filters"
            :shifts="masterStore.shifts"
            @update:selected-date="handleDateSelect"
            @select-date="handleDateSelect"
            @create="handleNavigateInput"
          />
        </div>

        <!-- Kartu Kalender Utama -->
        <WeekCalendarCard
          class="h-full flex-1 min-w-0 min-h-[420px]"
          :days="calculatedDays"
          :toolbar-title="toolbarTitle"
          :loading="loadingCalendar"
          :is-empty="isCalendarEmpty"
          :all-filters-disabled="allFiltersDisabled"
          :has-today="rangeIncludesToday"
          :selected-logbook-id="selectedLogbookForPopover?.id"
          @today="handleGoToday"
          @prev="handlePrevRange"
          @next="handleNextRange"
          @open-filter="isFilterDrawerOpen = true"
          @create="handleNavigateInput"
          @create-slot="handleCreateFromSlot"
          @click-block="handleBlockClick"
          @open-edit="handleNavigateEdit"
        />
      </div>

      <!-- Popover Ringkasan Logbook -->
      <LogbookEventPopover
        v-if="selectedLogbookForPopover"
        :logbook="selectedLogbookForPopover"
        :anchor-rect="popoverAnchorRect"
        @close="selectedLogbookForPopover = null"
        @view-detail="handlePopoverViewDetail"
        @edit="handleNavigateEdit"
      />

      <!-- Drawer Filter untuk layar < 1280px -->
      <FilterDrawer
        :is-open="isFilterDrawerOpen"
        :selected-date="selectedDate"
        :filters="filters"
        :shifts="masterStore.shifts"
        @close="isFilterDrawerOpen = false"
        @update:selected-date="handleDateSelect"
        @select-date="handleDateSelect"
      />
    </section>

    <!-- ======================================================== -->
    <!-- BAGIAN 2: Arsip & Tabel Riwayat Logbook (Existing UI)      -->
    <!-- ======================================================== -->
    <section class="space-y-4 pt-4 border-t border-line">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-ink-2" />
          <h2 class="text-sm font-bold text-ink uppercase tracking-wide">
            Daftar Arsip Riwayat Logbook
          </h2>
        </div>
        <span class="text-[11px] text-ink-3">
          Total: {{ myLogs.length }} entri tercatat
        </span>
      </div>

      <!-- Filter Bar & Search -->
      <div
        class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line flex flex-col md:flex-row items-center justify-between gap-3"
      >
        <!-- Status Tabs -->
        <div
          class="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0"
        >
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            :class="[
              'px-3 py-1.5 rounded-md text-xs font-medium transition shrink-0',
              activeStatus === tab.value
                ? 'bg-primary text-white font-semibold'
                : 'text-ink-2 hover:bg-muted',
            ]"
            @click="activeStatus = tab.value"
          >
            {{ tab.label }}
            <span
              :class="[
                'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                activeStatus === tab.value
                  ? 'bg-white/20 text-white'
                  : 'bg-line text-ink-2',
              ]"
            >
              {{ getCountForStatus(tab.value) }}
            </span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative w-full md:w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari mesin / uraian / part..."
            class="w-full h-9 pl-8 pr-3 rounded-md border border-line text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-muted placeholder:text-ink-3"
          />
          <svg
            class="w-4 h-4 text-ink-3 absolute left-2.5 top-2.5 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      <!-- Logs Card List (High Information Density) -->
      <div>
        <!-- Empty State -->
        <div
          v-if="filteredLogs.length === 0"
          class="bg-surface rounded-xl shadow-card border border-line p-10 text-center"
        >
          <svg
            class="w-10 h-10 mx-auto mb-2 text-ink-3/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div class="text-sm font-semibold text-ink">Belum ada logbook</div>
          <div class="text-xs text-ink-2 mt-0.5">
            Tidak ada data logbook yang cocok dengan filter saat ini.
          </div>
        </div>

        <!-- Kartu Logbook: data esensial langsung terbaca -->
        <div
          v-for="log in filteredLogs"
          :id="`logbook-card-${log.id}`"
          :key="log.id"
          :class="[
            'border rounded-xl p-3 sm:p-4 mb-3 bg-surface hover:shadow-card transition-shadow',
            log.status === LOG_STATUS.REJECTED
              ? 'border-danger/30'
              : 'border-line',
          ]"
        >
          <!-- Header: Tanggal & Shift (kiri) | Status & Reviewer (kanan) -->
          <div
            class="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2.5 border-b border-line"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-primary-soft text-primary-text-on-soft text-[11px] font-semibold"
              >
                <svg
                  class="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {{ log.task_date }}
              </span>
              <span class="text-[11px] font-medium text-ink-2 shrink-0">{{
                log.shift_name
              }}</span>
              <span
                class="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-sm bg-muted text-[10px] font-medium text-ink-3 truncate max-w-[9rem]"
                :title="log.plant_name"
                >{{ log.plant_name }}</span
              >
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <AppBadge :status="log.status" />
              <span
                v-if="getReviewerName(log)"
                class="text-[11px] text-ink-3 max-w-[9rem] truncate"
                :title="getReviewerName(log)"
              >
                {{ getReviewerName(log) }}
              </span>
            </div>
          </div>
          <!-- Body: Mesin & Sub-Mesin -->
          <div class="flex items-start gap-1.5 text-[13px] leading-snug">
            <svg
              class="w-3.5 h-3.5 mt-0.5 text-ink-3 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
            </svg>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="font-bold text-ink">{{ log.machine_name }}</span>
                <span class="font-normal text-ink-2">
                  / {{ log.sub_machine_name || "-" }}</span
                >
                <!-- Jenis Pekerjaan (activity_category) — gaya netral, kontras dengan chip aksi cepat -->
                <span
                  class="inline-flex items-center bg-muted text-ink-2 border border-line px-2 py-0.5 rounded text-[10px] font-medium"
                  :title="`Jenis Pekerjaan: ${getActivityCategoryLabel(log.activity_category)}`"
                >
                  {{ getActivityCategoryLabel(log.activity_category) }}
                </span>
                <!-- F3.1 / v6: chip aksi cepat (quick_action_tag) -->
                <span
                  v-if="log.quick_action_tag"
                  class="inline-flex items-center bg-primary-soft text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-medium"
                  :title="log.quick_action_tag"
                >
                  {{ log.quick_action_tag }}
                </span>
              </div>
            </div>
          </div>

          <!-- Highlight: Uraian Aktivitas (tampil penuh, tanpa line-clamp) -->
          <div class="mt-2">
            <span
              class="text-[10px] font-semibold text-ink-3 uppercase tracking-wide block mb-1"
              >Uraian Aktivitas</span
            >
            <p
              class="text-[13px] leading-relaxed text-ink whitespace-pre-wrap break-words"
            >
              {{ log.activity_description }}
            </p>
          </div>

          <!-- Catatan Revisi (jika ditolak) -->
          <div
            v-if="log.status === LOG_STATUS.REJECTED && log.approval_notes"
            class="mt-2 p-2.5 rounded-md bg-status-rejected-bg border border-danger/20 text-status-rejected-fg text-[11px]"
          >
            <div class="font-semibold mb-0.5">
              Catatan Revisi dari {{ getReviewerName(log) || "Supervisor" }}:
            </div>
            <div class="leading-relaxed whitespace-pre-wrap break-words">
              {{ log.approval_notes }}
            </div>
          </div>

          <!-- Footer: Durasi, Suku Cadang & Aksi -->
          <div
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2.5 pt-2.5 border-t border-line"
          >
            <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-medium bg-muted text-ink-2"
              >
                <svg
                  class="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {{ log.start_time }} - {{ log.end_time }} ({{
                  formatDuration(log.duration_minutes)
                }})
              </span>
              <span
                v-if="log.sparepart && log.sparepart !== '-'"
                class="inline-flex items-center px-2 py-0.5 rounded-sm font-medium bg-muted text-primary max-w-[16rem] truncate"
                :title="log.sparepart"
              >
                Part: {{ log.sparepart }}
              </span>
              <!-- FASE 5.2 / v6: sparepart katalog (array) -->
              <span
                v-for="(sp, spIdx) in log.spareparts || []"
                :key="`${log.id}-sp-${spIdx}`"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-medium bg-muted text-primary max-w-[16rem]"
                :title="`${sp.part_name || sp.part_code || 'Part'} — ${sp.qty_used} ${sp.unit || ''}`"
              >
                <span class="truncate">{{
                  sp.part_name || sp.part_code || "Part"
                }}</span>
                <span class="font-mono text-[10px] shrink-0"
                  >{{ sp.qty_used }}{{ sp.unit ? ` ${sp.unit}` : "" }}</span
                >
              </span>
            </div>

            <div class="flex items-center gap-1.5 shrink-0 justify-end">
              <button
                type="button"
                class="h-7 px-2.5 rounded-md border border-line bg-surface text-ink hover:bg-muted text-xs font-medium transition"
                @click="viewLog = log"
              >
                Detail
              </button>
              <button
                v-if="
                  log.status === LOG_STATUS.REJECTED ||
                  log.status === LOG_STATUS.DRAFT
                "
                type="button"
                class="h-7 px-2.5 rounded-md bg-primary text-white hover:bg-blue-700 text-xs font-medium transition shadow-sm"
                @click="handleNavigateEdit(log.id)"
              >
                {{ log.status === LOG_STATUS.REJECTED ? "Revisi" : "Edit" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Modal Detail Logbook -->
    <AppModal
      :is-open="!!viewLog"
      title="Detail Logbook Pekerjaan"
      @close="viewLog = null"
    >
      <div v-if="viewLog" class="space-y-3.5 text-xs">
        <div
          class="flex items-center justify-between pb-3 border-b border-line"
        >
          <div>
            <div class="text-ink-3 text-[10px]">
              Logbook ID #{{ viewLog.id }}
            </div>
            <div class="font-semibold text-sm text-ink">
              {{ viewLog.task_date }} • {{ viewLog.shift_name }}
            </div>
          </div>
          <AppBadge :status="viewLog.status" />
        </div>

        <div
          v-if="viewLog.status === 'REJECTED' && viewLog.approval_notes"
          class="p-3 bg-status-rejected-bg border border-danger/20 rounded-md text-status-rejected-fg"
        >
          <div class="font-semibold mb-1">
            Catatan Revisi dari {{ viewLog.supervisor_name || "Supervisor" }}:
          </div>
          <div class="leading-relaxed">{{ viewLog.approval_notes }}</div>
        </div>

        <div
          v-if="viewLog.status === 'APPROVED'"
          class="p-3 bg-status-approved-bg border border-success/20 rounded-md text-status-approved-fg flex items-center justify-between"
        >
          <span
            >Disetujui oleh:
            <strong>{{ viewLog.supervisor_name }}</strong></span
          >
          <span class="text-success text-[11px]">{{
            viewLog.reviewed_at
          }}</span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-ink">
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold"
              >LOKASI PLANT</span
            >
            <span class="font-semibold text-ink">{{ viewLog.plant_name }}</span>
          </div>
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold"
              >MESIN & BAGIAN</span
            >
            <span class="font-semibold text-ink">{{
              viewLog.machine_name
            }}</span>
            <div class="text-ink-2">{{ viewLog.sub_machine_name }}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-ink">
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold"
              >WAKTU</span
            >
            <span class="font-mono font-medium"
              >{{ viewLog.start_time }} - {{ viewLog.end_time }}</span
            >
          </div>
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold"
              >DURASI</span
            >
            <span class="font-semibold text-primary"
              >{{ formatDuration(viewLog.duration_minutes) }} ({{
                viewLog.duration_minutes
              }}
              mnt)</span
            >
          </div>
        </div>

        <!-- Jenis Pekerjaan (activity_category) -->
        <div class="p-2.5 bg-muted rounded-md">
          <span class="text-ink-3 block text-[10px] uppercase font-semibold"
            >JENIS PEKERJAAN</span
          >
          <span
            class="inline-flex items-center bg-surface text-ink-2 border border-line px-2 py-0.5 rounded text-[10px] font-medium mt-0.5"
          >
            {{ getActivityCategoryLabel(viewLog.activity_category) }}
          </span>
        </div>

        <!-- F3.1 / v6: chip aksi cepat (quick_action_tag) -->
        <div v-if="viewLog.quick_action_tag" class="p-2.5 bg-muted rounded-md">
          <span class="text-ink-3 block text-[10px] uppercase font-semibold"
            >AKSI CEPAT</span
          >
          <span
            class="inline-flex items-center bg-primary-soft text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-medium mt-0.5"
          >
            {{ viewLog.quick_action_tag }}
          </span>
        </div>

        <div class="p-2.5 bg-muted rounded-md">
          <span
            class="text-ink-3 block text-[10px] uppercase font-semibold mb-0.5"
            >SUKU CADANG</span
          >
          <ul
            v-if="viewLog.spareparts && viewLog.spareparts.length"
            class="space-y-1"
          >
            <li
              v-for="(sp, spIdx) in viewLog.spareparts"
              :key="`detail-sp-${spIdx}`"
              class="flex items-center justify-between gap-2 text-ink"
            >
              <span class="font-medium truncate">{{
                sp.part_name || sp.part_code || "Part"
              }}</span>
              <span class="font-mono text-[11px] text-ink-2 shrink-0"
                >{{ sp.qty_used }}{{ sp.unit ? ` ${sp.unit}` : "" }}</span
              >
            </li>
          </ul>
          <span v-else class="text-ink font-medium">{{
            viewLog.sparepart || "-"
          }}</span>
        </div>

        <div>
          <span
            class="font-semibold text-ink-2 uppercase text-[10px] block mb-1"
            >Uraian Aktivitas</span
          >
          <div
            class="p-3 bg-muted rounded-md leading-relaxed border border-line text-ink"
          >
            {{ viewLog.activity_description }}
          </div>
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
          @click="viewLog = null"
        >
          Tutup
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { ChevronDown, ChevronUp } from "lucide-vue-next";
import { useAuthStore } from "../../stores/auth";
import { useMasterStore } from "../../stores/master";
import { useLogbookStore } from "../../stores/logbook";
import { logbookService } from "../../services/logbookService";
import { LOG_STATUS } from "../../constants/logStatus";
import { formatDuration } from "../../utils/duration";
import { getActivityCategoryLabel } from "../../utils/categoryLabel";
import {
  toLocalDateString,
  addDays,
  getWeekStart,
  formatDateRange,
} from "../../utils/dateKeys";
import {
  splitLogbookToSegments,
  layoutDaySegments,
  computeDaySummary,
} from "../../utils/calendarLayout";

import PlannerSidebarPanel from "../../components/logbook/PlannerSidebarPanel.vue";
import WeekCalendarCard from "../../components/logbook/WeekCalendarCard.vue";
import LogbookEventPopover from "../../components/logbook/LogbookEventPopover.vue";
import FilterDrawer from "../../components/logbook/FilterDrawer.vue";
import FabCreate from "../../components/logbook/FabCreate.vue";
import AppBadge from "../../components/common/AppBadge.vue";
import AppModal from "../../components/common/AppModal.vue";

const router = useRouter();
const authStore = useAuthStore();
const masterStore = useMasterStore();
const logbookStore = useLogbookStore();

// State Tanggal Kalender (default hari ini)
const todayStr = toLocalDateString(new Date());
const selectedDate = ref(todayStr);

// State Collapse Kalender Mingguan (default terbentang)
const isCalendarExpanded = ref(true);

// Responsive Visible Day Count
const visibleDayCount = ref(7);

function updateVisibleDays() {
  const w = window.innerWidth;
  if (w >= 1024) {
    visibleDayCount.value = 7;
  } else if (w >= 768) {
    visibleDayCount.value = 3;
  } else {
    visibleDayCount.value = 1;
  }
}

// Filter State Kalender
const filters = reactive({
  status: {
    DRAFT: true,
    PENDING: true,
    APPROVED: true,
    REJECTED: true,
    CANCELLED: true,
  },
  shifts: {},
});

// UI Interaction State Kalender
const loadingCalendar = ref(false);
const rawCalendarLogs = ref([]);
const isFilterDrawerOpen = ref(false);
const selectedLogbookForPopover = ref(null);
const popoverAnchorRect = ref(null);

// State Daftar Riwayat (card list)
const activeStatus = ref("ALL");
const searchQuery = ref("");
const viewLog = ref(null);

// Nama Supervisor peninjau (approval terakhir) untuk header kartu
function getReviewerName(log) {
  if (!log) return "";
  if (log.latest_approval?.supervisor_name)
    return log.latest_approval.supervisor_name;
  if (log.supervisor_name) return log.supervisor_name;
  return log.status === LOG_STATUS.PENDING ? "Menunggu SPV" : "";
}

// Rentang Tanggal Kalender
const startDateStr = computed(() => {
  if (visibleDayCount.value === 7) {
    return getWeekStart(selectedDate.value, 1);
  }
  return selectedDate.value;
});

const rangeDays = computed(() => {
  const days = [];
  const count = visibleDayCount.value;
  const start = startDateStr.value;
  for (let i = 0; i < count; i++) {
    days.push(addDays(start, i));
  }
  return days;
});

const endDateStr = computed(() => {
  const arr = rangeDays.value;
  return arr[arr.length - 1];
});

const toolbarTitle = computed(() => {
  if (visibleDayCount.value === 1) {
    return formatDateRange(selectedDate.value, selectedDate.value);
  }
  return formatDateRange(startDateStr.value, endDateStr.value);
});

const rangeIncludesToday = computed(() => {
  return rangeDays.value.includes(todayStr);
});

const allFiltersDisabled = computed(() => {
  const allStatusOff = Object.values(filters.status).every((v) => v === false);
  const allShiftOff =
    Object.values(filters.shifts).length > 0 &&
    Object.values(filters.shifts).every((v) => v === false);
  return allStatusOff || allShiftOff;
});

const filteredCalendarLogs = computed(() => {
  return rawCalendarLogs.value.filter((log) => {
    if (log.status && filters.status[log.status] === false) return false;
    const sId = log.shift_id;
    if (sId !== undefined && sId !== null && filters.shifts[sId] === false)
      return false;
    return true;
  });
});

const calculatedDays = computed(() => {
  const logs = filteredCalendarLogs.value;

  return rangeDays.value.map((dayDate) => {
    const daySegments = [];
    logs.forEach((log) => {
      const segs = splitLogbookToSegments(log);
      segs.forEach((s) => {
        if (s.day === dayDate || s.dateKey === dayDate) {
          daySegments.push(s);
        }
      });
    });

    const layoutedBlocks = layoutDaySegments(daySegments);
    // Filter logbook yang dimulai pada tanggal ini untuk ringkasan chip harian
    const dayLogs = logs.filter((l) => l.task_date === dayDate);
    const summary = computeDaySummary(dayDate, dayLogs);

    return {
      dateStr: dayDate,
      dateKey: dayDate,
      isToday: dayDate === todayStr,
      segments: layoutedBlocks,
      blocks: layoutedBlocks,
      summaryChips: summary.chips || [],
      summary,
    };
  });
});

const isCalendarEmpty = computed(() => {
  if (loadingCalendar.value) return false;
  return calculatedDays.value.every((d) => (d.segments || []).length === 0);
});

// Data Tabel Riwayat
const myLogs = computed(() => {
  return logbookStore.logbooks.filter(
    (l) => Number(l.user_id) === Number(authStore.user?.id),
  );
});

const statusTabs = [
  { label: "Semua", value: "ALL" },
  { label: "Draft", value: LOG_STATUS.DRAFT },
  { label: "Menunggu Approval", value: LOG_STATUS.PENDING },
  { label: "Disetujui", value: LOG_STATUS.APPROVED },
  { label: "Ditolak", value: LOG_STATUS.REJECTED },
];

function getCountForStatus(status) {
  if (status === "ALL") return myLogs.value.length;
  return myLogs.value.filter((l) => l.status === status).length;
}

const filteredLogs = computed(() => {
  let list = myLogs.value;

  if (activeStatus.value !== "ALL") {
    list = list.filter((l) => l.status === activeStatus.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (l) =>
        l.activity_description?.toLowerCase().includes(q) ||
        l.machine_name?.toLowerCase().includes(q) ||
        l.sub_machine_name?.toLowerCase().includes(q) ||
        l.sparepart?.toLowerCase().includes(q),
    );
  }

  return list;
});

// Actions & Methods Kalender
async function loadCalendarData() {
  if (!startDateStr.value || !endDateStr.value) return;
  loadingCalendar.value = true;
  try {
    const list = await logbookService.list({
      dateFrom: startDateStr.value,
      dateTo: endDateStr.value,
      userId: authStore.user?.id,
    });
    rawCalendarLogs.value = Array.isArray(list) ? list : [];
  } catch (err) {
    console.error("Gagal memuat data kalender mingguan:", err);
    rawCalendarLogs.value = [];
  } finally {
    loadingCalendar.value = false;
  }
}

function handleDateSelect(dateKey) {
  selectedDate.value = dateKey;
}

function handleGoToday() {
  selectedDate.value = todayStr;
}

function handlePrevRange() {
  selectedDate.value = addDays(selectedDate.value, -visibleDayCount.value);
}

function handleNextRange() {
  selectedDate.value = addDays(selectedDate.value, visibleDayCount.value);
}

function handleBlockClick(payload) {
  if (!payload) return;
  const logbook = payload.logbook || payload.segment?.logbook || payload;
  selectedLogbookForPopover.value = logbook;
  popoverAnchorRect.value = payload.rect || null;
}

function handlePopoverViewDetail(lb) {
  viewLog.value = lb;
  selectedLogbookForPopover.value = null;
}

function handleNavigateInput() {
  router.push("/logbook/input");
}

function handleCreateFromSlot(slot) {
  const date = slot.task_date || slot.date;
  const time = slot.start_time || slot.time;
  router.push({
    path: "/logbook/input",
    query: {
      date,
      time,
    },
  });
}

function handleNavigateEdit(id) {
  router.push(`/logbook/edit/${id}`);
}

watch([startDateStr, endDateStr], () => {
  loadCalendarData();
});

onMounted(async () => {
  updateVisibleDays();
  window.addEventListener("resize", updateVisibleDays);

  if (masterStore.shifts.length === 0) {
    await masterStore.fetchAll();
  }

  masterStore.shifts.forEach((s) => {
    if (filters.shifts[s.id] === undefined) {
      filters.shifts[s.id] = true;
    }
  });

  await Promise.all([
    loadCalendarData(),
    logbookStore.fetchLogbooks({ userId: authStore.user?.id }),
  ]);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateVisibleDays);
});
</script>
