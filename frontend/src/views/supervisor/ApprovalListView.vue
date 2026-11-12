<template>
  <div class="space-y-4">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div>
        <div
          class="text-[12px] font-medium text-primary uppercase tracking-wider"
        >
          Pemeriksaan & Persetujuan
        </div>
        <h1 class="text-[20px] font-semibold text-ink tracking-tight">
          Approval Logbook Teknisi
        </h1>
        <p class="text-xs text-ink-2 mt-0.5">
          Proses approval dilakukan per teknisi. Menyetujui teknisi akan
          otomatis menyetujui seluruh logbook yang diajukan ke database.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-status-pending-bg text-status-pending-fg text-xs font-medium border border-warning/20"
        >
          <span
            class="w-1.5 h-1.5 rounded-full bg-status-pending-dot animate-pulse"
          />
          {{ pendingTechCount }} Teknisi Menunggu Approval ({{
            pendingLogCount
          }}
          Logbook)
        </span>
      </div>
    </div>

    <!-- Filter & Toolbar -->
    <div
      class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line flex flex-col md:flex-row items-center justify-between gap-3"
    >
      <!-- Status Tabs -->
      <div
        class="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0"
      >
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          type="button"
          :class="[
            'px-3 py-1.5 rounded-md text-xs font-medium transition shrink-0',
            selectedFilter === tab.value
              ? 'bg-primary text-white font-semibold'
              : 'text-ink-2 hover:bg-muted',
          ]"
          @click="selectedFilter = tab.value"
        >
          {{ tab.label }}
          <span
            :class="[
              'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
              selectedFilter === tab.value
                ? 'bg-white/20 text-white'
                : 'bg-line text-ink-2',
            ]"
          >
            {{ getCount(tab.value) }}
          </span>
        </button>
      </div>

      <!-- Search Input & Mode Switcher -->
      <div class="flex items-center gap-2 w-full md:w-auto justify-end">
        <div class="relative w-full md:w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari teknisi / plant / mesin..."
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

        <!-- Mode Toggle (Per Teknisi vs Semua Logbook)
             Fase 6: tampil juga di HP agar tampilan "Semua Log" tetap bisa dipilih -->
        <div
          class="flex items-center bg-muted border border-line rounded-md p-0.5 shrink-0"
        >
          <button
            type="button"
            :class="[
              'px-2.5 py-1 text-xs rounded transition font-medium',
              viewMode === 'technician'
                ? 'bg-surface text-ink font-semibold shadow-xs'
                : 'text-ink-3 hover:text-ink',
            ]"
            @click="viewMode = 'technician'"
            title="Kelompokkan persetujuan per teknisi"
          >
            Per Teknisi
          </button>
          <button
            type="button"
            :class="[
              'px-2.5 py-1 text-xs rounded transition font-medium',
              viewMode === 'logbook'
                ? 'bg-surface text-ink font-semibold shadow-xs'
                : 'text-ink-3 hover:text-ink',
            ]"
            @click="viewMode = 'logbook'"
            title="Tampilan daftar per entri logbook"
          >
            Semua Log
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- Fase 6: Loading Skeleton (jangan blank / empty state palsu) -->
    <!-- ======================================================== -->
    <div v-if="logbookStore.loading" class="space-y-3.5" aria-busy="true">
      <div
        v-for="n in 3"
        :key="`sk-tech-${n}`"
        class="bg-surface rounded-lg shadow-card border border-line p-4 sm:p-5 animate-pulse"
      >
        <div class="flex items-center gap-3.5">
          <div class="w-9 h-9 rounded-full bg-muted shrink-0" />
          <div class="flex-1 space-y-2 min-w-0">
            <div class="h-4 bg-muted rounded w-3/4" />
            <div class="h-4 bg-muted rounded w-1/2" />
          </div>
          <div class="hidden sm:block w-28 h-8 bg-muted rounded-md shrink-0" />
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAMPILAN 1: Approval Berdasarkan User (Teknisi)            -->
    <!-- ======================================================== -->
    <div v-else-if="viewMode === 'technician'" class="space-y-3.5">
      <!-- Empty State -->
      <div
        v-if="filteredTechnicians.length === 0"
        class="bg-surface rounded-lg shadow-card border border-line p-10 text-center text-ink-3 text-xs"
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="text-sm font-semibold text-ink">
          Tidak ada pengajuan yang sesuai filter
        </div>
        <div class="text-xs text-ink-2 mt-0.5">
          {{
            searchQuery.trim()
              ? "Tidak ada teknisi yang cocok dengan kata kunci pencarian."
              : selectedFilter === LOG_STATUS.PENDING
                ? "Seluruh logbook teknisi telah diproses dengan baik."
                : "Tidak ada riwayat pada kriteria ini."
          }}
        </div>
      </div>

      <!-- Kartu Per Teknisi -->
      <div
        v-for="tech in filteredTechnicians"
        :key="tech.user_id"
        class="bg-surface rounded-lg shadow-card border border-line overflow-hidden transition-all duration-150"
      >
        <!-- Header Kartu Teknisi -->
        <div
          class="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface hover:bg-muted/10 transition-colors"
        >
          <!-- Info Teknisi -->
          <div class="flex items-start sm:items-center gap-3.5 min-w-0">
            <Avatar
              :src="tech.user_photo_url"
              :name="tech.user_name"
              size="lg"
            />
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2
                  class="text-sm sm:text-base font-bold text-ink leading-tight truncate"
                >
                  {{ tech.user_name }}
                </h2>
                <span
                  class="text-xs font-mono text-ink-3 bg-muted px-2 py-0.5 rounded border border-line"
                >
                  {{ tech.user_nik }}
                </span>
                <span
                  class="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded"
                >
                  {{ tech.plant_name }}
                </span>
                <span
                  v-if="tech.work_group_name && tech.work_group_name !== '-'"
                  class="text-xs text-ink-2 bg-muted px-2 py-0.5 rounded"
                >
                  {{ tech.work_group_name }}
                </span>
              </div>

              <!-- Metrik Ringkas Pengajuan -->
              <div
                class="flex flex-wrap items-center gap-3 text-xs text-ink-2 mt-1.5"
              >
                <div class="flex items-center gap-1">
                  <span class="font-semibold text-ink"
                    >{{ tech.visibleLogCount }} Logbook</span
                  >
                  <span
                    v-if="tech.reviewableCount > 0"
                    class="text-status-pending-fg font-semibold"
                  >
                    ({{ tech.reviewableCount }} diajukan)
                  </span>
                </div>
                <span>•</span>
                <div>
                  Total Durasi:
                  <span class="font-semibold text-primary">{{
                    formatDuration(tech.visibleDurationMinutes)
                  }}</span>
                </div>
                <span v-if="tech.visibleMachines.length > 0">•</span>
                <div
                  v-if="tech.visibleMachines.length > 0"
                  class="truncate max-w-xs text-ink-3"
                >
                  Mesin: {{ tech.visibleMachines.slice(0, 2).join(", ")
                  }}{{
                    tech.visibleMachines.length > 2
                      ? " +" + (tech.visibleMachines.length - 2)
                      : ""
                  }}
                </div>
              </div>
            </div>
          </div>

          <!-- Aksi Persetujuan Per Teknisi -->
          <div
            class="flex flex-wrap items-center gap-2 shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-line"
          >
            <!-- Tombol Setujui Semua Logbook Milik Teknisi Ini
                 Hanya mengirim logbook PENDING yang lolos filter tab aktif -->
            <button
              v-if="tech.reviewableCount > 0"
              type="button"
              :disabled="actionLoading"
              class="h-8 px-4 rounded-md text-xs font-semibold bg-success hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              @click="approveTechnician(tech)"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Setujui Semua Log ({{ tech.reviewableCount }})</span>
            </button>

            <!-- Tombol Tolak Seluruh Pengajuan Teknisi Ini -->
            <button
              v-if="tech.reviewableCount > 0"
              type="button"
              :disabled="actionLoading"
              class="h-8 px-3 rounded-md text-xs font-medium bg-status-rejected-bg text-status-rejected-fg hover:bg-danger/10 border border-danger/20 transition flex items-center gap-1 disabled:opacity-50"
              @click="openRejectModal(tech)"
            >
              <svg
                class="w-4 h-4 text-danger"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>Tolak dengan Catatan</span>
            </button>

            <!-- Status Lencana Jika Kartu Tidak Punya Logbook PENDING pada tab aktif -->
            <div
              v-else-if="canBulkReview()"
              class="flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted text-xs font-medium text-ink-2"
            >
              <span
                v-if="tech.approvedCount > 0"
                class="text-success font-semibold flex items-center gap-1"
              >
                <span class="w-2 h-2 rounded-full bg-success" />
                {{ tech.approvedCount }} Disetujui
              </span>
              <span
                v-if="tech.rejectedCount > 0"
                class="text-danger font-semibold flex items-center gap-1 ml-2"
              >
                <span class="w-2 h-2 rounded-full bg-danger" />
                {{ tech.rejectedCount }} Ditolak
              </span>
            </div>

            <!-- Toggle Rincian Logbook -->
            <button
              type="button"
              class="h-8 px-3 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition flex items-center gap-1"
              @click="toggleTechDetails(tech.user_id)"
            >
              <span>{{
                isTechExpanded(tech.user_id) ? "Tutup Rincian" : "Lihat Rincian"
              }}</span>
              <svg
                :class="[
                  'w-3.5 h-3.5 text-ink-3 transition-transform duration-200',
                  isTechExpanded(tech.user_id) ? 'rotate-180' : '',
                ]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Rincian Logbook Teknisi (Card List - Uraian langsung terbaca) -->
        <div
          v-if="isTechExpanded(tech.user_id)"
          class="border-t border-line bg-muted/20"
        >
          <div
            class="px-4 py-2 bg-muted/40 border-b border-line flex items-center justify-between text-xs text-ink-2 font-medium"
          >
            <span
              >Daftar Logbook
              {{
                selectedFilter === LOG_STATUS.PENDING
                  ? "yang menunggu persetujuan"
                  : selectedFilter === LOG_STATUS.APPROVED
                    ? "yang sudah disetujui"
                    : selectedFilter === LOG_STATUS.REJECTED
                      ? "yang ditolak"
                      : ""
              }}
              dari {{ tech.user_name }}:</span
            >
            <span class="text-ink-3">{{ tech.logs.length }} entri log</span>
          </div>

          <!-- Banner Repeat Failure (level teknisi, tepat di atas daftar logbook) -->
          <div
            v-if="repeatingTechIds.has(tech.user_id)"
            class="mx-3 sm:mx-4 mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs bg-warning/10 text-warning border border-warning/30"
            role="alert"
          >
            <span aria-hidden="true" class="font-bold leading-4">!</span>
            <p class="leading-relaxed">
              <span class="font-semibold"
                >&#9888;&#65039; Repeat Failure terdeteksi</span
              >
              &mdash; ada logbook dengan mesin dan kode kerusakan yang sama pada
              pengajuan teknisi ini. Validasi teknis dan riwayat perbaikan
              sebelum menyetujui.
            </p>
          </div>

          <div class="p-3 sm:p-4">
            <!-- Kartu Logbook: gaya konsisten dengan halaman Riwayat Teknisi -->
            <div
              v-for="log in tech.logs"
              :id="`approval-card-${log.id}`"
              :key="log.id"
              :class="[
                'border rounded-xl p-3 sm:p-4 mb-3 last:mb-0 bg-surface hover:shadow-card transition-shadow',
                log.status === LOG_STATUS.REJECTED
                  ? 'border-danger/30'
                  : 'border-line',
              ]"
            >
              <!-- Header: Tanggal & Shift (kiri) | Status (kanan) -->
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
                    class="hidden sm:inline text-[11px] font-mono text-ink-3 truncate"
                    >{{ log.start_time }} - {{ log.end_time }}</span
                  >
                </div>
                <AppBadge :status="log.status" />
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
                    <span class="font-bold text-ink">{{
                      log.machine_name
                    }}</span>
                    <span class="font-normal text-ink-2">
                      / {{ log.sub_machine_name || "-" }}</span
                    >
                    <!-- Jenis Pekerjaan (activity_category) — gaya netral -->
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

              <!-- Kode Kerusakan (Fase 4.1a) -->
              <div v-if="failureCodeLabel(log)" class="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-muted text-ink-2 text-[11px] font-medium max-w-[20rem]"
                  :title="failureCodeLabel(log)"
                >
                  <svg
                    class="w-3 h-3 text-ink-3 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <span class="truncate">
                    <span class="text-ink-3">Kode:</span>
                    <span class="font-semibold text-ink">{{
                      failureCodeLabel(log)
                    }}</span>
                  </span>
                </span>
                <span
                  v-if="isRepeatFailureLog(log, tech.logs)"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-warning/10 text-warning border border-warning/30 text-[11px] font-semibold"
                >
                  <span aria-hidden="true">&#9888;&#65039;</span>
                  Repeat
                  {{ repeatFailureOf(log, tech.logs)?.occurrence_count }}x
                </span>
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

              <!-- Catatan Pemeriksaan (jika ada, mis. hasil penolakan) -->
              <div
                v-if="log.approval_notes"
                class="mt-2 p-2.5 rounded-md bg-status-rejected-bg border border-danger/20 text-status-rejected-fg text-[11px]"
              >
                <div class="font-semibold mb-0.5">Catatan Pemeriksaan:</div>
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
                    {{ formatDuration(log.duration_minutes) }} ({{
                      log.duration_minutes
                    }}
                    mnt)
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
                    class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                    @click="activeLogDetail = log"
                  >
                    Detail
                  </button>
                </div>
              </div>

              <!-- Peringatan Repeat Failure (per kartu logbook) -->
              <div
                v-if="isRepeatFailureLog(log, tech.logs)"
                class="mt-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md px-3 py-2 text-xs bg-warning/10 text-warning border border-warning/20"
              >
                <div class="flex items-start gap-2 min-w-0">
                  <span aria-hidden="true" class="font-semibold leading-4"
                    >!</span
                  >
                  <p class="leading-relaxed">
                    <span class="font-semibold">Repeat Failure</span> -
                    Mesin ini sudah
                    <span class="font-semibold"
                      >{{
                        repeatFailureOf(log, tech.logs)?.occurrence_count
                      }}x</span
                    >
                    mengalami
                    <span class="font-semibold"
                      >{{
                        repeatFailureOf(log, tech.logs)?.failure_code
                      }}
                      ({{
                        repeatFailureOf(log, tech.logs)?.failure_code_name
                      }})</span
                    >
                    dalam
                    {{ repeatFailureOf(log, tech.logs)?.window_days }} hari
                    terakhir.
                    <span class="text-ink-3"
                      >Validasi teknis sebelum menyetujui.</span
                    >
                  </p>
                </div>
                <a
                  v-if="repeatFailureOf(log, tech.logs)?.machine_id"
                  :href="`/mesin/${repeatFailureOf(log, tech.logs)?.machine_id}`"
                  class="shrink-0 font-medium text-primary hover:underline whitespace-nowrap"
                >
                  Lihat Buku Pintar Mesin &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAMPILAN 2: Tabel Flat Semua Logbook (Existing Mode)       -->
    <!-- ======================================================== -->
    <div
      v-else
      class="bg-surface rounded-lg shadow-card border border-line overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table
          class="w-full text-left text-[13px] border-collapse min-w-[750px]"
        >
          <thead
            class="bg-muted/60 text-xs font-semibold text-ink-2 border-b border-line"
          >
            <tr>
              <th class="px-4 py-3">Teknisi & Plant</th>
              <th class="px-4 py-3">Mesin & Bagian</th>
              <th class="px-4 py-3">Waktu & Durasi</th>
              <th class="px-4 py-3 w-[34%] min-w-[260px]">Uraian Pekerjaan</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr v-if="filteredLogs.length === 0">
              <td colspan="6" class="px-4 py-10 text-center">
                <Inbox class="w-10 h-10 mx-auto mb-2 text-ink-3 opacity-60" />
                <div class="text-sm font-semibold text-ink">
                  Belum ada data logbook
                </div>
                <div class="text-xs text-ink-2 mt-0.5">
                  {{
                    searchQuery.trim()
                      ? "Tidak ada logbook yang cocok dengan kata kunci pencarian."
                      : selectedFilter === LOG_STATUS.PENDING
                        ? "Seluruh logbook teknisi telah diproses dengan baik."
                        : "Tidak ada logbook pada status ini untuk periode saat ini."
                  }}
                </div>
              </td>
            </tr>
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              class="hover:bg-muted/40 transition-colors group"
            >
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="font-semibold text-ink">{{ log.user_name }}</div>
                <div class="text-xs text-ink-3 font-mono">
                  {{ log.user_nik }}
                </div>
                <div class="text-[11px] text-ink-2">{{ log.plant_name }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-ink">{{ log.machine_name }}</div>
                <div class="text-xs text-ink-2">{{ log.sub_machine_name }}</div>
                <!-- Jenis Pekerjaan (activity_category) & chip aksi cepat -->
                <div class="mt-1 flex flex-wrap items-center gap-1">
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
                <div
                  v-if="failureCodeLabel(log)"
                  class="mt-1 flex flex-wrap items-center gap-1"
                >
                  <span
                    class="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-muted text-ink-2 text-[10px] font-semibold"
                    :title="failureCodeLabel(log)"
                  >
                    {{ failureCodeLabel(log) }}
                  </span>
                  <span
                    v-if="isRepeatFailureLog(log)"
                    class="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-warning/10 text-warning border border-warning/30 text-[10px] font-semibold"
                    title="Repeat failure terdeteksi"
                  >
                    &#9888;&#65039; Repeat
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="text-xs text-ink font-medium">
                  {{ log.task_date }} ({{ log.shift_name }})
                </div>
                <div class="text-xs font-mono text-ink-3">
                  {{ log.start_time }} - {{ log.end_time }}
                </div>
                <span
                  class="inline-block mt-0.5 px-2 py-0.5 rounded-sm text-[10px] font-medium bg-muted text-ink-2"
                >
                  {{ formatDuration(log.duration_minutes) }}
                </span>
              </td>
              <td class="px-4 py-3 align-top">
                <p
                  class="text-xs text-ink leading-relaxed whitespace-pre-wrap break-words min-w-[260px]"
                >
                  {{ log.activity_description }}
                </p>
                <div
                  v-if="log.sparepart && log.sparepart !== '-'"
                  class="text-[11px] text-primary mt-1 font-medium"
                >
                  Part: {{ log.sparepart }}
                </div>
                <!-- FASE 5.2 / v6: sparepart katalog (array) -->
                <div
                  v-if="log.spareparts && log.spareparts.length"
                  class="flex flex-wrap items-center gap-1 mt-1"
                >
                  <span
                    v-for="(sp, spIdx) in log.spareparts"
                    :key="`${log.id}-row-sp-${spIdx}`"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-muted text-primary border border-line"
                  >
                    {{ sp.part_name || sp.part_code || "Part" }}
                    <span class="font-mono"
                      >{{ sp.qty_used }}{{ sp.unit ? ` ${sp.unit}` : "" }}</span
                    >
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <AppBadge :status="log.status" />
                <div
                  v-if="log.supervisor_name"
                  class="text-[11px] text-ink-3 mt-1"
                >
                  Oleh: {{ log.supervisor_name }}
                </div>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="h-7 px-2.5 rounded-md text-xs font-medium border border-line bg-surface text-ink hover:bg-muted transition"
                    @click="activeLogDetail = log"
                  >
                    Detail
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Catatan Penolakan Per Teknisi -->
    <AppModal
      :is-open="!!rejectTarget"
      title="Tolak Pengajuan Logbook Teknisi"
      @close="rejectTarget = null"
    >
      <form
        v-if="rejectTarget"
        @submit.prevent="submitRejection"
        class="space-y-3.5 text-xs"
      >
        <div
          class="p-3 bg-status-rejected-bg border border-danger/20 rounded-md text-status-rejected-fg"
        >
          <div class="font-semibold text-sm">
            Teknisi: {{ rejectTarget.user_name }} ({{ rejectTarget.user_nik }})
          </div>
          <div class="text-[11px] mt-0.5">
            Menolak akan mengembalikan seluruh
            <strong
              >{{
                rejectTarget.pendingCount || rejectTarget.logs?.length
              }}
              logbook</strong
            >
            yang diajukan oleh teknisi ini ke status DITOLAK agar dapat
            diperbaiki. Catatan revisi wajib diisi.
          </div>
        </div>

        <div>
          <label
            for="reject-textarea"
            class="block font-medium text-ink mb-1.5"
          >
            Catatan Revisi / Alasan Penolakan <span class="text-danger">*</span>
          </label>
          <textarea
            id="reject-textarea"
            v-model="rejectionReason"
            rows="4"
            required
            placeholder="Tuliskan alasan penolakan dan instruksi perbaikan untuk teknisi ini..."
            class="w-full p-2.5 rounded-md border border-line bg-surface text-sm font-medium text-ink focus:border-danger focus:ring-1 focus:ring-danger focus:outline-none leading-relaxed"
          />
        </div>

        <div class="pt-2 flex justify-end gap-2 border-t border-line">
          <button
            type="button"
            class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
            @click="rejectTarget = null"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="actionLoading"
            class="h-8 px-4 rounded-md bg-danger hover:bg-red-600 active:bg-red-700 text-white font-medium text-xs transition shadow-card disabled:opacity-50"
          >
            {{
              actionLoading
                ? "Memproses..."
                : "Konfirmasi Tolak Seluruh Logbook"
            }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- Modal Detail Logbook Satuan -->
    <AppModal
      :is-open="!!activeLogDetail"
      title="Pemeriksaan Detail Logbook"
      @close="activeLogDetail = null"
    >
      <div v-if="activeLogDetail" class="space-y-3.5 text-xs">
        <div
          class="flex items-center justify-between pb-3 border-b border-line"
        >
          <div>
            <div class="text-[10px] text-ink-3">
              Logbook ID #{{ activeLogDetail.id }}
            </div>
            <div class="font-semibold text-sm text-ink">
              {{ activeLogDetail.user_name }} • {{ activeLogDetail.user_nik }}
            </div>
          </div>
          <AppBadge :status="activeLogDetail.status" />
        </div>

        <div class="grid grid-cols-2 gap-2 text-ink">
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold"
              >LOKASI PLANT</span
            >
            <span class="font-semibold text-ink">{{
              activeLogDetail.plant_name
            }}</span>
          </div>
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold"
              >MESIN & SUB-MESIN</span
            >
            <span class="font-semibold text-ink">{{
              activeLogDetail.machine_name
            }}</span>
            <div class="text-ink-2">
              {{ activeLogDetail.sub_machine_name || "-" }}
            </div>
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
            {{ getActivityCategoryLabel(activeLogDetail.activity_category) }}
          </span>
        </div>

        <!-- F3.1 / v6: chip aksi cepat (quick_action_tag) -->
        <div
          v-if="activeLogDetail.quick_action_tag"
          class="p-2.5 bg-muted rounded-md"
        >
          <span class="text-ink-3 block text-[10px] uppercase font-semibold"
            >AKSI CEPAT</span
          >
          <span
            class="inline-flex items-center bg-primary-soft text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-medium mt-0.5"
          >
            {{ activeLogDetail.quick_action_tag }}
          </span>
        </div>

        <div
          v-if="failureCodeLabel(activeLogDetail)"
          class="p-2.5 bg-muted rounded-md"
        >
          <span class="text-ink-3 block text-[10px] uppercase font-semibold"
            >KODE KERUSAKAN</span
          >
          <span class="font-semibold text-ink">{{
            failureCodeLabel(activeLogDetail)
          }}</span>
        </div>

        <div
          v-if="isRepeatFailureLog(activeLogDetail)"
          class="p-2.5 rounded-md bg-warning/10 border border-warning/30 text-warning text-[11px] leading-relaxed"
        >
          <div class="font-semibold mb-0.5">
            &#9888;&#65039; Repeat Failure terdeteksi
          </div>
          <div>
            Mesin ini sudah
            {{ repeatFailureOf(activeLogDetail)?.occurrence_count }}x mengalami
            {{ repeatFailureOf(activeLogDetail)?.failure_code }}
            ({{ repeatFailureOf(activeLogDetail)?.failure_code_name }}) dalam
            {{ repeatFailureOf(activeLogDetail)?.window_days }} hari terakhir.
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-ink">
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold"
              >WAKTU</span
            >
            <span class="font-medium"
              >{{ activeLogDetail.task_date }} ({{
                activeLogDetail.shift_name
              }})</span
            >
            <div class="font-mono text-ink-2">
              {{ activeLogDetail.start_time }} - {{ activeLogDetail.end_time }}
            </div>
          </div>
          <div class="p-2.5 bg-muted rounded-md">
            <span class="text-ink-3 block text-[10px] uppercase font-semibold"
              >DURASI</span
            >
            <span class="font-semibold text-primary"
              >{{ formatDuration(activeLogDetail.duration_minutes) }} ({{
                activeLogDetail.duration_minutes
              }}
              menit)</span
            >
          </div>
        </div>

        <div class="p-2.5 bg-muted rounded-md">
          <span
            class="text-ink-3 block text-[10px] uppercase font-semibold mb-0.5"
            >SUKU CADANG (SPAREPART)</span
          >
          <ul
            v-if="
              activeLogDetail.spareparts && activeLogDetail.spareparts.length
            "
            class="space-y-1"
          >
            <li
              v-for="(sp, spIdx) in activeLogDetail.spareparts"
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
            activeLogDetail.sparepart || "-"
          }}</span>
        </div>

        <div>
          <span
            class="font-semibold text-ink-2 uppercase text-[10px] block mb-1"
            >Uraian Lengkap Aktivitas</span
          >
          <div
            class="p-3 bg-muted rounded-md leading-relaxed border border-line text-ink whitespace-pre-line"
          >
            {{ activeLogDetail.activity_description }}
          </div>
        </div>

        <div
          v-if="activeLogDetail.approval_notes"
          class="p-3 bg-status-rejected-bg border border-danger/20 rounded-md text-status-rejected-fg"
        >
          <div class="font-semibold mb-0.5">Catatan Pemeriksaan:</div>
          <div>{{ activeLogDetail.approval_notes }}</div>
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
          @click="activeLogDetail = null"
        >
          Tutup
        </button>
      </template>
    </AppModal>

    <!-- Toast Notifikasi Umpan Balik -->
    <Toast
      :show="toast.show"
      :title="toast.title"
      :message="toast.message"
      :variant="toast.variant"
      @close="toast.show = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "../../stores/auth";
import { useLogbookStore } from "../../stores/logbook";
import { LOG_STATUS } from "../../constants/logStatus";
import {
  buildTechnicianCards,
  canBulkReview as utilCanBulkReview,
  countTechniciansForTab,
  getReviewableLogs,
} from "../../utils/approvalFilter";
import {
  formatFailureCodeLabel,
  resolveRepeatFailure,
} from "../../utils/repeatFailure";
import { formatDuration } from "../../utils/duration";
import { getActivityCategoryLabel } from "../../utils/categoryLabel";
import { alert } from "../../utils/alert";
import { Inbox } from "lucide-vue-next";
import AppBadge from "../../components/common/AppBadge.vue";
import AppModal from "../../components/common/AppModal.vue";
import Avatar from "../../components/common/Avatar.vue";
import Toast from "../../components/common/Toast.vue";

const authStore = useAuthStore();
const logbookStore = useLogbookStore();

const selectedFilter = ref(LOG_STATUS.PENDING);
const searchQuery = ref("");
const viewMode = ref("technician"); // 'technician' (default) | 'logbook'
const activeLogDetail = ref(null);
const rejectTarget = ref(null);
const rejectionReason = ref("");
const actionLoading = ref(false);
const expandedTechMap = ref({});

const toast = ref({
  show: false,
  title: "",
  message: "",
  variant: "success",
});

function showToast(title, message, variant = "success") {
  toast.value = { show: true, title, message, variant };
  setTimeout(() => {
    toast.value.show = false;
  }, 4000);
}

onMounted(async () => {
  await logbookStore.fetchLogbooks();
});

const filterTabs = [
  { label: "Perlu Approval", value: LOG_STATUS.PENDING },
  { label: "Semua", value: "ALL" },
  { label: "Disetujui", value: LOG_STATUS.APPROVED },
  { label: "Ditolak", value: LOG_STATUS.REJECTED },
];

// Pengelompokan Logbook Per Teknisi (User)
const allTechniciansGrouped = computed(() => {
  const map = new Map();

  for (const log of logbookStore.logbooks) {
    const uId =
      log.user_id || log.user?.id || log.user_nik || log.user_name || "unknown";
    if (!map.has(uId)) {
      map.set(uId, {
        user_id: log.user_id || log.user?.id,
        user_name: log.user_name || log.user?.full_name || "Teknisi",
        user_nik: log.user_nik || log.user?.nik || "-",
        user_email: log.user_email || log.user?.email || "",
        user_photo_url: log.user_photo_url || log.user?.photo_url,
        plant_name: log.plant_name || log.plant?.name || "-",
        work_group_name:
          log.work_group_name || log.user?.work_group?.name || "-",
        logs: [],
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        totalDurationMinutes: 0,
        machines: [],
      });
    }

    const tech = map.get(uId);
    tech.logs.push(log);
    if (log.status === LOG_STATUS.PENDING || log.status === "PENDING")
      tech.pendingCount++;
    if (log.status === LOG_STATUS.APPROVED || log.status === "APPROVED")
      tech.approvedCount++;
    if (log.status === LOG_STATUS.REJECTED || log.status === "REJECTED")
      tech.rejectedCount++;
    tech.totalDurationMinutes += log.duration_minutes || 0;

    if (log.machine_name && !tech.machines.includes(log.machine_name)) {
      tech.machines.push(log.machine_name);
    }
  }

  return Array.from(map.values());
});

// ---------------------------------------------------------------------
// Sinkronisasi Tab Aktif <-> Rincian Logbook Kartu Teknisi
// Logika filter dipisah ke src/utils/approvalFilter.js agar dapat diuji:
// tab PENDING -> hanya logbook PENDING, APPROVED/REJECTED -> sesuai status,
// tab ALL -> seluruh logbook. Kartu tanpa logbook pada tab aktif dihilangkan.
// ---------------------------------------------------------------------

// Apakah ada tombol aksi bulk (Setujui / Tolak) pada kartu teknisi
function canBulkReview() {
  return utilCanBulkReview(selectedFilter.value);
}

// Teknisi Terfilter + Logbook di dalam kartu ikut difilter sesuai tab aktif
const filteredTechnicians = computed(() => {
  let list = buildTechnicianCards(
    allTechniciansGrouped.value,
    selectedFilter.value,
  );

  // Filter pencarian
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (t) =>
        t.user_name.toLowerCase().includes(q) ||
        t.user_nik.toLowerCase().includes(q) ||
        t.plant_name.toLowerCase().includes(q) ||
        t.machines.some((m) => m.toLowerCase().includes(q)),
    );
  }

  return list;
});

// Logbook Flat Terfilter
const filteredLogs = computed(() => {
  let list = logbookStore.logbooks;

  if (selectedFilter.value !== "ALL") {
    list = list.filter((l) => l.status === selectedFilter.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (l) =>
        l.user_name?.toLowerCase().includes(q) ||
        l.user_nik?.toLowerCase().includes(q) ||
        l.machine_name?.toLowerCase().includes(q) ||
        l.activity_description?.toLowerCase().includes(q) ||
        l.sparepart?.toLowerCase().includes(q),
    );
  }

  return list;
});

const pendingTechCount = computed(() => {
  return allTechniciansGrouped.value.filter((t) => t.pendingCount > 0).length;
});

const pendingLogCount = computed(() => {
  return logbookStore.logbooks.filter((l) => l.status === LOG_STATUS.PENDING)
    .length;
});

// ---------------------------------------------------------------------
// Fase 4.1a: Repeat Failure (banner kuning) & Kode Kerusakan
// Backend (GET /logbooks) mengirim `is_repeat_failure` + detail
// `repeat_failure`. Bila flag belum tersedia, dihitung ulang dari logbook
// saudara di kartu teknisi yang sama (aturan identik: machine_id +
// failure_code_id sama, >= 2 kejadian dalam 30 hari).
// ---------------------------------------------------------------------
const repeatingTechIds = computed(() => {
  const ids = new Set();
  for (const tech of filteredTechnicians.value) {
    if (tech.logs.some((log) => resolveRepeatFailure(log, tech.logs))) {
      ids.add(tech.user_id);
    }
  }
  return ids;
});

function isRepeatFailureLog(log, siblingLogs = []) {
  return Boolean(resolveRepeatFailure(log, siblingLogs));
}

function repeatFailureOf(log, siblingLogs = []) {
  return resolveRepeatFailure(log, siblingLogs);
}

function failureCodeLabel(log) {
  return formatFailureCodeLabel(log);
}

function getCount(status) {
  // Angka badge tab dihitung dari logbook nyata per status,
  // sehingga selalu konsisten dengan kartu yang dirender (tidak ada kartu kosong).
  return countTechniciansForTab(allTechniciansGrouped.value, status);
}

function isTechExpanded(userId) {
  // Default terbuka jika belum pernah diubah agar supervisor langsung melihat rincian log
  return expandedTechMap.value[userId] !== false;
}

function toggleTechDetails(userId) {
  expandedTechMap.value[userId] = !isTechExpanded(userId);
}

// Persetujuan Per Teknisi (Menyetujui semua log pending milik teknisi tersebut)
async function approveTechnician(tech) {
  if (!tech.user_id) return;

  // Hanya logbook PENDING yang lolos filter tab aktif yang boleh diproses.
  // Logbook yang sudah APPROVED / REJECTED tidak akan ikut terkirim.
  const pendingLogs = getReviewableLogs(tech.logs, selectedFilter.value);
  const pendingCount = pendingLogs.length;
  if (pendingCount === 0) return;

  // F1.3: konfirmasi persetujuan via SweetAlert2
  const ok = await alert.confirm(
    "Setujui Seluruh Logbook Teknisi?",
    `Seluruh ${pendingCount} logbook PENDING milik ${tech.user_name} akan disetujui sekaligus.`,
    "Ya, setujui",
  );
  if (!ok) return;
  actionLoading.value = true;
  try {
    const res = await logbookStore.approveByTechnician(
      tech.user_id,
      "Disetujui per teknisi sesuai SOP pemeliharaan.",
    );
    const processedCount = res?.data?.processed_count ?? pendingCount;
    showToast(
      "Approval Berhasil Disimpan",
      `Seluruh logbook (${processedCount} entri) milik Teknisi ${tech.user_name} otomatis disetujui dan tersimpan ke database.`,
    );
  } catch (err) {
    showToast(
      "Gagal Menyetujui",
      err.message || "Terjadi kesalahan sistem.",
      "danger",
    );
  } finally {
    actionLoading.value = false;
  }
}

function openRejectModal(tech) {
  // Snapshot hanya logbook PENDING pada tab & pencarian aktif,
  // agar bulk reject tidak menyentuh logbook yang sudah diproses.
  const pendingLogs = getReviewableLogs(tech.logs, selectedFilter.value);
  if (pendingLogs.length === 0) return;

  rejectTarget.value = {
    ...tech,
    logs: pendingLogs,
    reviewableLogs: pendingLogs,
    reviewableCount: pendingLogs.length,
    pendingCount: pendingLogs.length,
  };
  rejectionReason.value = "";
}

async function submitRejection() {
  if (!rejectTarget.value) return;

  const pendingCount = rejectTarget.value.pendingCount || 0;
  if (pendingCount === 0) {
    rejectTarget.value = null;
    return;
  }

  // Validasi catatan penolakan (F1.3: SweetAlert, bukan banner inline)
  if (!rejectionReason.value.trim()) {
    await alert.error(
      "Catatan Wajib Diisi",
      "Catatan revisi untuk teknisi wajib diisi sebelum menolak pengajuan.",
    );
    return;
  }

  // F1.3: konfirmasi sebelum menolak pengajuan
  const isConfirmed = await alert.confirm(
    "Tolak Pengajuan Logbook Teknisi?",
    `Seluruh ${pendingCount} logbook PENDING milik ${rejectTarget.value.user_name} akan dikembalikan ke status DITOLAK.`,
    "Ya, tolak",
  );
  if (!isConfirmed) return;

  actionLoading.value = true;
  try {
    await logbookStore.rejectByTechnician(
      rejectTarget.value.user_id,
      rejectionReason.value,
    );
    showToast(
      "Logbook Teknisi Ditolak",
      `Pengajuan logbook milik Teknisi ${rejectTarget.value.user_name} telah ditolak dengan catatan perbaikan.`,
      "danger",
    );
    rejectTarget.value = null;
  } catch (err) {
    showToast(
      "Gagal Menolak",
      err.message || "Terjadi kesalahan sistem.",
      "danger",
    );
  } finally {
    actionLoading.value = false;
  }
}
</script>
