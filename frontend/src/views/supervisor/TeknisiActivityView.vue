<template>
  <div class="space-y-4">
    <!-- Header Halaman -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <div class="text-[12px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
          <Users class="w-3.5 h-3.5" />
          <span>Supervisi & Kinerja Tim</span>
        </div>
        <h1 class="text-[20px] font-bold text-ink tracking-tight mt-0.5">
          Aktivitas & Frekuensi Logbook Teknisi
        </h1>
        <p class="text-xs text-ink-2 mt-0.5">
          Pantau seberapa sering teknisi di tim Anda mengisi logbook harian, konsistensi kerja, dan detail pemeliharaan mesin.
        </p>
      </div>
    </div>

    <!-- 4 KPI Ringkasan Tim -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <!-- KPI 1: Anggota Tim -->
      <div class="bg-surface rounded-lg shadow-card p-3.5 sm:p-4 border border-line flex flex-col justify-between space-y-2">
        <div class="flex items-center justify-between text-xs text-ink-3">
          <span class="font-medium uppercase text-[10px] tracking-wider">Total Teknisi Tim</span>
          <div class="w-6 h-6 rounded bg-primary-soft text-primary flex items-center justify-center">
            <Users class="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div class="text-xl sm:text-2xl font-bold text-ink font-mono">
            {{ teamTechnicians.length }}
            <span class="text-xs font-normal text-ink-3 font-sans">Orang</span>
          </div>
          <div class="text-[11px] text-ink-2 mt-0.5">
            {{ directTeamCount }} di bawah supervisi langsung
          </div>
        </div>
      </div>

      <!-- KPI 2: Aktif Hari Ini -->
      <div class="bg-surface rounded-lg shadow-card p-3.5 sm:p-4 border border-line flex flex-col justify-between space-y-2">
        <div class="flex items-center justify-between text-xs text-ink-3">
          <span class="font-medium uppercase text-[10px] tracking-wider">Aktif Hari Ini</span>
          <div class="w-6 h-6 rounded bg-status-approved-bg text-status-approved-fg flex items-center justify-center">
            <CheckCircle2 class="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div class="text-xl sm:text-2xl font-bold text-ink font-mono flex items-baseline gap-1.5">
            <span>{{ activeTodayCount }}</span>
            <span class="text-xs font-normal text-ink-3 font-sans">/ {{ teamTechnicians.length }}</span>
            <span class="text-xs font-semibold text-success font-mono ml-auto">
              {{ participationRate }}%
            </span>
          </div>
          <div class="text-[11px] text-ink-2 mt-0.5 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-success" />
            <span>Telah menginput logbook hari ini</span>
          </div>
        </div>
      </div>

      <!-- KPI 3: Total Logbook Bulan Ini -->
      <div class="bg-surface rounded-lg shadow-card p-3.5 sm:p-4 border border-line flex flex-col justify-between space-y-2">
        <div class="flex items-center justify-between text-xs text-ink-3">
          <span class="font-medium uppercase text-[10px] tracking-wider">Logbook Bulan Ini</span>
          <div class="w-6 h-6 rounded bg-primary-soft text-primary flex items-center justify-center">
            <Calendar class="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div class="text-xl sm:text-2xl font-bold text-ink font-mono">
            {{ totalMonthLogs }}
            <span class="text-xs font-normal text-ink-3 font-sans">Aktivitas</span>
          </div>
          <div class="text-[11px] text-ink-2 mt-0.5">
            {{ totalWeekLogs }} logbook 7 hari terakhir
          </div>
        </div>
      </div>

      <!-- KPI 4: Rata-rata Frekuensi -->
      <div class="bg-surface rounded-lg shadow-card p-3.5 sm:p-4 border border-line flex flex-col justify-between space-y-2">
        <div class="flex items-center justify-between text-xs text-ink-3">
          <span class="font-medium uppercase text-[10px] tracking-wider">Rata-rata Frekuensi</span>
          <div class="w-6 h-6 rounded bg-muted text-ink-2 flex items-center justify-center">
            <TrendingUp class="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div class="text-xl sm:text-2xl font-bold text-ink font-mono">
            {{ avgLogsPerTech }}
            <span class="text-xs font-normal text-ink-3 font-sans">log / teknisi</span>
          </div>
          <div class="text-[11px] text-ink-2 mt-0.5">
            Total {{ formatDuration(totalTeamDuration) }} jam kerja tercatat
          </div>
        </div>
      </div>
    </div>

    <!-- Filter & Toolbar Kontrol -->
    <div class="bg-surface p-3.5 sm:p-4 rounded-lg shadow-card border border-line space-y-3">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <!-- Scope Tabs: Tim Saya vs Semua Teknisi -->
        <div class="inline-flex rounded-md p-1 bg-muted border border-line text-xs font-medium shrink-0 self-start sm:self-auto">
          <button
            type="button"
            :class="[
              'px-3 py-1 rounded transition text-xs font-medium',
              scopeFilter === 'my_team' ? 'bg-surface text-ink font-semibold shadow-xs' : 'text-ink-3 hover:text-ink'
            ]"
            @click="scopeFilter = 'my_team'"
          >
            Tim Pimpinan Saya ({{ directTeamCount }})
          </button>
          <button
            type="button"
            :class="[
              'px-3 py-1 rounded transition text-xs font-medium',
              scopeFilter === 'all' ? 'bg-surface text-ink font-semibold shadow-xs' : 'text-ink-3 hover:text-ink'
            ]"
            @click="scopeFilter = 'all'"
          >
            Seluruh Teknisi Pabrik ({{ allTechnicians.length }})
          </button>
        </div>

        <!-- Filter Status Keaktifan & Search -->
        <div class="flex flex-wrap items-center gap-2 flex-1 justify-end">
          <!-- Status Keaktifan Select -->
          <div class="relative min-w-[150px]">
            <select
              v-model="activityStatusFilter"
              class="w-full h-8 pl-2.5 pr-7 rounded-md border border-line text-xs font-medium text-ink bg-muted focus:outline-none focus:border-primary cursor-pointer appearance-none"
            >
              <option value="ALL">Semua Tingkat Aktivitas</option>
              <option value="ACTIVE_TODAY">Aktif Hari Ini (Telah Isi Log)</option>
            </select>
            <ChevronDown class="w-3.5 h-3.5 text-ink-3 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          <!-- Urutan / Sort -->
          <div class="relative min-w-[140px]">
            <select
              v-model="sortBy"
              class="w-full h-8 pl-2.5 pr-7 rounded-md border border-line text-xs font-medium text-ink bg-muted focus:outline-none focus:border-primary cursor-pointer appearance-none"
            >
              <option value="name">Nama Teknisi (A-Z)</option>
            </select>
            <ChevronDown class="w-3.5 h-3.5 text-ink-3 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          <!-- Search Input -->
          <div class="relative w-full sm:w-60">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari nama / NIK / mesin..."
              class="w-full h-8 pl-8 pr-3 rounded-md border border-line text-xs bg-muted text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary"
            />
            <Search class="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          <!-- View Mode Toggle: Grid vs Table -->
          <div class="inline-flex rounded-md p-0.5 bg-muted border border-line shrink-0">
            <button
              type="button"
              class="p-1 rounded text-xs transition"
              :class="viewMode === 'grid' ? 'bg-surface text-primary shadow-xs' : 'text-ink-3 hover:text-ink'"
              title="Tampilan Kartu"
              @click="viewMode = 'grid'"
            >
              <LayoutGrid class="w-4 h-4" />
            </button>
            <button
              type="button"
              class="p-1 rounded text-xs transition"
              :class="viewMode === 'table' ? 'bg-surface text-primary shadow-xs' : 'text-ink-3 hover:text-ink'"
              title="Tampilan Tabel"
              @click="viewMode = 'table'"
            >
              <List class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="h-64 bg-surface rounded-lg border border-line shadow-card animate-pulse flex items-center justify-center text-xs text-ink-3"
    >
      Memuat data aktivitas & riwayat pengisian teknisi...
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredTechnicians.length === 0"
      class="bg-surface rounded-lg border border-line p-12 text-center shadow-card space-y-3"
    >
      <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-ink-3">
        <Users class="w-6 h-6" />
      </div>
      <div>
        <h3 class="text-sm font-bold text-ink">Tidak Ada Teknisi Ditemukan</h3>
        <p class="text-xs text-ink-3 mt-1 max-w-sm mx-auto">
          Tidak ada data teknisi yang sesuai dengan kriteria filter atau pencarian "{{ searchQuery }}".
        </p>
      </div>
      <button
        type="button"
        class="h-7 px-3 rounded text-xs font-medium border border-line bg-surface hover:bg-muted text-ink transition"
        @click="resetFilters"
      >
        Reset Filter
      </button>
    </div>

    <!-- TAMPILAN 1: GRID VIEW (KARTU VISUAL TEKNISI) -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      <div
        v-for="tech in filteredTechnicians"
        :key="tech.id"
        class="bg-surface rounded-lg border border-line shadow-card p-4 flex flex-col justify-between space-y-3.5 hover:border-primary/40 transition group"
      >
        <!-- Header Kartu Teknisi -->
        <div class="flex items-start justify-between gap-2.5 pb-3 border-b border-line">
          <div class="flex items-center gap-2.5 min-w-0">
            <!-- Avatar with Active Indicator Dot -->
            <div class="relative shrink-0">
              <img
                v-if="tech.photo_url"
                :src="tech.photo_url"
                :alt="tech.full_name"
                class="w-10 h-10 rounded-full object-cover border border-line"
              />
              <div
                v-else
                class="w-10 h-10 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center"
              >
                {{ getInitials(tech.full_name) }}
              </div>
              <span
                class="w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 ring-2 ring-surface shrink-0 bg-ink-3"
                title="Status aktivitas harian"
              />
            </div>

            <!-- Nama & Identitas -->
            <div class="min-w-0 leading-tight">
              <div class="flex items-center gap-1.5 flex-wrap">
                <h3 class="text-xs sm:text-sm font-bold text-ink truncate group-hover:text-primary transition" :title="tech.full_name">
                  {{ tech.full_name }}
                </h3>
                <span
                  v-if="tech.isDirectTeam"
                  class="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-primary-soft text-primary border border-primary/20 shrink-0"
                >
                  Tim Anda
                </span>
              </div>
              <div class="text-[10px] text-ink-3 font-mono mt-0.5">
                {{ tech.nik }} • {{ tech.group_name }}
              </div>
              <div class="text-[10px] text-ink-2 truncate">
                {{ tech.plant_name }}
              </div>
            </div>
          </div>
        </div>

        <!-- Metrik Angka Frekuensi Pengisian (3 Kolom Mini) -->
        <div class="grid grid-cols-3 gap-2 bg-muted/50 p-2.5 rounded-md border border-line/60 text-center">
          <div>
            <div class="text-[9px] uppercase font-semibold text-ink-3">Total Log</div>
            <div class="text-sm font-bold text-ink font-mono mt-0.5">
              {{ tech.totalLogs }}
            </div>
          </div>
          <div class="border-x border-line/60">
            <div class="text-[9px] uppercase font-semibold text-ink-3">Bulan Ini</div>
            <div class="text-sm font-bold text-primary font-mono mt-0.5">
              {{ tech.monthLogs }}
            </div>
          </div>
          <div>
            <div class="text-[9px] uppercase font-semibold text-ink-3">Total Jam</div>
            <div class="text-sm font-bold text-ink font-mono mt-0.5">
              {{ formatDuration(tech.totalDurationMinutes) }}
            </div>
          </div>
        </div>

        <!-- Konsistensi Pengisian 7 Hari Terakhir (Mini Sparkline) -->
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[10px] text-ink-3">
            <span class="font-medium">Aktivitas 7 Hari Terakhir</span>
            <span class="font-mono">{{ tech.weekLogs }} log minggu ini</span>
          </div>
          <div class="grid grid-cols-7 gap-1 h-9 items-end bg-muted/30 p-1 rounded border border-line/40">
            <div
              v-for="bar in tech.last7Days"
              :key="bar.date"
              class="flex flex-col items-center justify-end h-full group/bar relative"
            >
              <!-- Bar -->
              <div
                class="w-full max-w-[14px] rounded-t transition-all"
                :class="bar.count > 0 ? 'bg-primary' : 'bg-line'"
                :style="{ height: bar.count > 0 ? `${Math.min(100, Math.max(25, bar.count * 35))}%` : '4px' }"
              />
              <!-- Tooltip on Hover -->
              <div class="opacity-0 group-hover/bar:opacity-100 absolute -top-5 text-[8px] font-mono font-bold bg-ink text-white px-1 py-0.2 rounded pointer-events-none transition z-10 whitespace-nowrap">
                {{ bar.count }} log
              </div>
            </div>
          </div>
          <!-- Label Hari Sumbu-X -->
          <div class="grid grid-cols-7 gap-1 text-center text-[9px] text-ink-3 font-mono">
            <span v-for="bar in tech.last7Days" :key="bar.date">{{ bar.dayLabel }}</span>
          </div>
        </div>

        <!-- Ringkasan Status Approval & Mesin Terakhir -->
        <div class="space-y-2 pt-1 border-t border-line/60 text-xs">
          <!-- Breakdown Status -->
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-ink-3 text-[10px]">Status Logbook:</span>
            <div class="flex items-center gap-1.5 text-[10px] font-mono">
              <span class="text-success font-semibold" title="Approved">{{ tech.statusCounts.approved }} Acc</span>
              <span>•</span>
              <span class="text-warning font-semibold" title="Pending">{{ tech.statusCounts.pending }} Pnd</span>
              <span>•</span>
              <span class="text-danger font-semibold" title="Rejected">{{ tech.statusCounts.rejected }} Rjc</span>
            </div>
          </div>

          <!-- Mesin Sering Ditangani -->
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-ink-3 text-[10px]">Mesin Utama:</span>
            <span class="font-medium text-ink truncate max-w-[160px]" :title="tech.topMachine">
              {{ tech.topMachine }}
            </span>
          </div>

          <!-- Terakhir Mengisi Logbook -->
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-ink-3 text-[10px]">Terakhir Aktif:</span>
            <span v-if="tech.lastLog" class="text-ink-2 font-mono text-[10px]">
              {{ tech.lastLog.task_date }} ({{ tech.lastLog.start_time }})
            </span>
            <span v-else class="text-ink-3 italic text-[10px]">
              Belum pernah mengisi
            </span>
          </div>
        </div>

        <!-- Footer Tombol Lihat Detail Riwayat -->
        <div class="pt-2">
          <button
            type="button"
            class="w-full h-8 rounded border border-line bg-surface hover:bg-muted text-ink text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs group-hover:border-primary/50 group-hover:text-primary"
            @click="openTechnicianDetail(tech)"
          >
            <span>Lihat Riwayat & Detail</span>
            <ChevronRight class="w-3.5 h-3.5 text-ink-3 group-hover:text-primary group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      </div>
    </div>

    <!-- TAMPILAN 2: TABLE VIEW (TABEL RINGKASAN SEMUA ANGGOTA TIM) -->
    <div
      v-else
      class="bg-surface rounded-lg shadow-card border border-line overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse min-w-[760px]">
          <thead class="bg-muted/60 text-[11px] font-semibold text-ink-3 uppercase tracking-wider border-b border-line">
            <tr>
              <th class="py-3 px-3.5">Teknisi</th>
              <th class="py-3 px-3.5">Plant & Grup</th>
              <th class="py-3 px-3.5">Status Hari Ini</th>
              <th class="py-3 px-3.5 text-center">Total Log</th>
              <th class="py-3 px-3.5 text-center">Bulan Ini</th>
              <th class="py-3 px-3.5">Total Jam Kerja</th>
              <th class="py-3 px-3.5">Approval (Acc/Pnd/Rjc)</th>
              <th class="py-3 px-3.5">Terakhir Aktif</th>
              <th class="py-3 px-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line text-ink">
            <tr
              v-for="tech in filteredTechnicians"
              :key="tech.id"
              class="hover:bg-muted/40 transition-colors"
            >
              <!-- Teknisi -->
              <td class="py-3 px-3.5 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div class="relative shrink-0">
                    <img
                      v-if="tech.photo_url"
                      :src="tech.photo_url"
                      :alt="tech.full_name"
                      class="w-8 h-8 rounded-full object-cover border border-line"
                    />
                    <div
                      v-else
                      class="w-8 h-8 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center"
                    >
                      {{ getInitials(tech.full_name) }}
                    </div>
                  </div>
                  <div>
                    <div class="font-bold text-ink flex items-center gap-1">
                      <span>{{ tech.full_name }}</span>
                      <span
                        v-if="tech.isDirectTeam"
                        class="px-1 py-0.2 rounded text-[8px] font-semibold bg-primary-soft text-primary"
                      >
                        Tim Anda
                      </span>
                    </div>
                    <div class="text-[10px] text-ink-3 font-mono">{{ tech.nik }}</div>
                  </div>
                </div>
              </td>

              <!-- Plant & Grup -->
              <td class="py-3 px-3.5">
                <div class="text-ink font-medium">{{ tech.plant_name }}</div>
                <div class="text-[10px] text-ink-3">{{ tech.group_name }}</div>
              </td>

              <!-- Status Hari Ini -->
              <td class="py-3 px-3.5 whitespace-nowrap">
                <span
                  v-if="tech.isActiveToday"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-status-approved-bg text-status-approved-fg border border-success/20"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-success" />
                  <span>Aktif ({{ tech.todayLogs }} log)</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-ink-3"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-ink-3" />
                  <span>Belum Ada Log</span>
                </span>
              </td>

              <!-- Total Log -->
              <td class="py-3 px-3.5 text-center font-mono font-bold text-ink">
                {{ tech.totalLogs }}
              </td>

              <!-- Bulan Ini -->
              <td class="py-3 px-3.5 text-center font-mono font-bold text-primary">
                {{ tech.monthLogs }}
              </td>

              <!-- Durasi Kerja -->
              <td class="py-3 px-3.5 font-mono text-[11px] whitespace-nowrap">
                <span class="px-2 py-0.5 rounded bg-muted text-ink font-medium">
                  {{ formatDuration(tech.totalDurationMinutes) }}
                </span>
              </td>

              <!-- Status Counts -->
              <td class="py-3 px-3.5 whitespace-nowrap">
                <div class="flex items-center gap-1 text-[11px] font-mono">
                  <span class="text-success font-semibold">{{ tech.statusCounts.approved }}</span>
                  <span class="text-ink-3">/</span>
                  <span class="text-warning font-semibold">{{ tech.statusCounts.pending }}</span>
                  <span class="text-ink-3">/</span>
                  <span class="text-danger font-semibold">{{ tech.statusCounts.rejected }}</span>
                </div>
              </td>

              <!-- Terakhir Aktif -->
              <td class="py-3 px-3.5 whitespace-nowrap font-mono text-[10px] text-ink-2">
                <span v-if="tech.lastLog">{{ tech.lastLog.task_date }}</span>
                <span v-else class="text-ink-3 italic">-</span>
              </td>

              <!-- Aksi -->
              <td class="py-3 px-3.5 text-right whitespace-nowrap">
                <button
                  type="button"
                  class="h-7 px-2.5 rounded border border-line bg-surface hover:bg-muted text-ink text-xs font-semibold transition shadow-xs"
                  @click="openTechnicianDetail(tech)"
                >
                  Detail
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL DETAIL LENGKAP & RIWAYAT LOGBOOK TEKNISI -->
    <AppModal
      :is-open="!!selectedTech"
      :title="`Detail Kinerja Teknisi — ${selectedTech?.full_name || ''}`"
      size="xl"
      @close="selectedTech = null"
    >
      <div v-if="selectedTech" class="space-y-4 text-xs">
        <!-- Profil Singkat Teknisi -->
        <div class="bg-muted/40 p-3.5 rounded-lg border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <img
              v-if="selectedTech.photo_url"
              :src="selectedTech.photo_url"
              :alt="selectedTech.full_name"
              class="w-12 h-12 rounded-full object-cover border border-line"
            />
            <div
              v-else
              class="w-12 h-12 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center"
            >
              {{ getInitials(selectedTech.full_name) }}
            </div>
            <div>
              <div class="text-sm font-bold text-ink flex items-center gap-1.5">
                <span>{{ selectedTech.full_name }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded font-semibold bg-primary-soft text-primary">
                  Teknisi
                </span>
              </div>
              <div class="text-ink-2 text-xs font-mono mt-0.5">
                {{ selectedTech.nik }} • {{ selectedTech.email }}
              </div>
              <div class="text-ink-3 text-[11px] mt-0.5">
                {{ selectedTech.group_name }} • {{ selectedTech.plant_name }}
              </div>
            </div>
          </div>

          <!-- Total Log Teknisi -->
          <div class="text-left sm:text-right bg-surface sm:bg-transparent p-2 sm:p-0 rounded border sm:border-0 border-line">
            <span class="text-[10px] uppercase font-semibold text-ink-3 block">Total Logbook Diisi</span>
            <div class="text-lg font-bold text-primary font-mono flex items-baseline gap-1 sm:justify-end">
              <span>{{ selectedTech.totalLogs }}</span>
              <span class="text-xs font-normal text-ink-2 font-sans">Log</span>
            </div>
          </div>
        </div>

        <!-- Card Calendar Aktivitas & Status Logbook Teknisi -->
        <div class="bg-surface rounded-lg border border-line shadow-card p-3 sm:p-4 space-y-3">
          <!-- Header Card Calendar: Navigasi Bulan & Tombol Hari Ini -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-line">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <Calendar class="w-4 h-4" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-ink flex items-center gap-1.5 flex-wrap">
                  <span>Kalender Aktivitas Logbook</span>
                  <span class="text-[11px] font-mono font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded">
                    {{ modalCalendarMonthName }} {{ modalCalendarYear }}
                  </span>
                </h4>
                <p class="text-[10px] text-ink-3">
                  Klik tanggal untuk memfilter riwayat logbook pada hari tersebut
                </p>
              </div>
            </div>

            <!-- Tombol Navigasi Bulan -->
            <div class="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                class="px-2.5 py-1 rounded text-[11px] font-medium border border-line bg-muted/60 hover:bg-muted text-ink transition"
                @click="resetModalCalendarMonth"
              >
                Bulan Ini
              </button>
              <div class="flex items-center border border-line rounded-md bg-muted/40">
                <button
                  type="button"
                  class="p-1 text-ink-2 hover:text-ink hover:bg-muted rounded-l transition"
                  title="Bulan Sebelumnya"
                  @click="prevModalMonth"
                >
                  <ChevronLeft class="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  class="p-1 text-ink-2 hover:text-ink hover:bg-muted rounded-r transition"
                  title="Bulan Berikutnya"
                  @click="nextModalMonth"
                >
                  <ChevronRight class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Ringkasan Akumulasi Keterisian Bulan Ini (Diatas Cell Tanggal) -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div class="p-2 rounded-md bg-status-approved-bg/60 border border-success/20">
              <span class="text-[9px] uppercase font-semibold text-status-approved-fg block leading-tight">Hari Disetujui</span>
              <span class="text-sm font-bold text-success font-mono mt-0.5 block">{{ modalMonthSummary.approvedDays }} Hari</span>
            </div>
            <div class="p-2 rounded-md bg-status-pending-bg/60 border border-warning/20">
              <span class="text-[9px] uppercase font-semibold text-status-pending-fg block leading-tight">Menunggu Approval</span>
              <span class="text-sm font-bold text-warning font-mono mt-0.5 block">{{ modalMonthSummary.pendingDays }} Hari</span>
            </div>
            <div class="p-2 rounded-md bg-muted/60 border border-line">
              <span class="text-[9px] uppercase font-semibold text-ink-3 block leading-tight">Hari Tanpa Aktivitas</span>
              <span class="text-sm font-bold text-ink-2 font-mono mt-0.5 block">{{ modalMonthSummary.noLogDays }} Hari</span>
            </div>
            <div class="p-2 rounded-md bg-muted/60 border border-line">
              <span class="text-[9px] uppercase font-semibold text-ink-3 block leading-tight">Total Log Bulan Ini</span>
              <span class="text-sm font-bold text-primary font-mono mt-0.5 block">{{ modalMonthSummary.totalLogsInMonth }} Log</span>
            </div>
          </div>

          <!-- Grid Kalender Bulanan -->
          <div class="space-y-1">
            <!-- Header Hari (Senin - Minggu) -->
            <div class="grid grid-cols-7 gap-1 text-center font-semibold text-[10px] text-ink-3 uppercase select-none">
              <span v-for="d in ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']" :key="d" class="py-0.5">
                {{ d }}
              </span>
            </div>

            <!-- Cell Tanggal (7 Kolom) -->
            <div class="grid grid-cols-7 gap-1">
              <button
                v-for="cell in modalCalendarCells"
                :key="cell.dateStr"
                type="button"
                :disabled="!cell.isCurrentMonth"
                :class="[
                  'h-11 sm:h-12 rounded-md p-1 flex flex-col justify-between items-center transition relative border text-center select-none',
                  cell.isCurrentMonth ? cell.colorClass : 'opacity-20 border-transparent bg-transparent cursor-default pointer-events-none',
                  cell.isToday ? 'ring-2 ring-primary ring-offset-1 z-10 font-bold' : '',
                  modalSelectedDate === cell.dateStr ? 'ring-2 ring-ink shadow-sm' : ''
                ]"
                :title="cell.tooltip"
                @click="cell.isCurrentMonth && selectModalDate(cell.dateStr)"
              >
                <!-- Angka Tanggal & Penanda Hari Ini -->
                <div class="flex items-center justify-between w-full px-0.5">
                  <span class="text-[11px] font-bold font-mono leading-none">
                    {{ cell.dayNumber }}
                  </span>
                  <span
                    v-if="cell.isToday"
                    class="w-1.5 h-1.5 rounded-full bg-primary"
                    title="Hari ini"
                  />
                </div>

                <!-- Indikator Ringkas Jumlah Logbook / Status Hari -->
                <div class="w-full text-center">
                  <span
                    v-if="cell.logCount > 0"
                    class="text-[9px] font-bold font-mono px-1 rounded leading-tight inline-block"
                  >
                    {{ cell.logCount }} log
                  </span>
                  <span
                    v-else-if="cell.status === 'NO_LOG'"
                    class="text-[8px] font-medium leading-tight opacity-80 inline-block"
                  >
                    Tanpa Log
                  </span>
                  <span
                    v-else
                    class="text-[8px] opacity-40 leading-tight inline-block"
                  >
                    -
                  </span>
                </div>
              </button>
            </div>
          </div>

          <!-- Keterangan Legend Status Warna Sesuai Panduan (Rapi, Ringkas & Di Bawah Cell Tanggal) -->
          <div class="pt-2 border-t border-line/70 flex flex-wrap items-center justify-between gap-y-1.5 gap-x-3 text-[10px]">
            <div class="flex items-center gap-1.5 text-ink-3 font-semibold uppercase text-[9px] tracking-wider">
              <span>Status:</span>
            </div>
            <!-- Hijau: Approved -->
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-status-approved-fg shrink-0" />
              <span class="text-ink font-medium">Disetujui (Approved)</span>
            </div>
            <!-- Kuning: Pending -->
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-status-pending-fg shrink-0" />
              <span class="text-ink font-medium">Butuh Approval (Pending)</span>
            </div>
            <!-- Indikator Hari Ini -->
            <div class="flex items-center gap-1.5 text-ink-3">
              <span class="w-2 h-2 rounded-full border border-primary shrink-0" />
              <span>Hari Ini</span>
            </div>
          </div>
        </div>

        <!-- Filter Log Internal Modal -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-line">
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="font-bold text-ink text-xs uppercase tracking-wide">
              Riwayat Logbook Pengerjaan ({{ filteredModalLogs.length }})
            </h4>
            <!-- Badge Filter Tanggal Kalender Aktif -->
            <span
              v-if="modalSelectedDate"
              class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-soft text-primary border border-primary/20"
            >
              <span>Tanggal: {{ modalSelectedDate }}</span>
              <button
                type="button"
                class="hover:text-primary-dark font-bold text-[11px]"
                title="Hapus filter tanggal (tampilkan semua)"
                @click="clearModalDateFilter"
              >
                ✕
              </button>
            </span>
          </div>
          <div class="flex items-center gap-2">
            <select
              v-model="modalStatusFilter"
              class="h-7 px-2 rounded border border-line bg-muted text-[11px] font-medium text-ink focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="APPROVED">Disetujui (Approved)</option>
              <option value="PENDING">Menunggu (Pending)</option>
              <option value="REJECTED">Ditolak (Rejected)</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        <!-- Tabel Logbook Teknisi -->
        <div class="overflow-x-auto max-h-72 overflow-y-auto border border-line rounded-lg">
          <table class="w-full text-left text-xs border-collapse min-w-[620px]">
            <thead class="bg-muted sticky top-0 text-[10px] font-semibold text-ink-3 uppercase tracking-wider border-b border-line z-10">
              <tr>
                <th class="py-2 px-3">Tanggal & Jam</th>
                <th class="py-2 px-3">Mesin & Bagian</th>
                <th class="py-2 px-3">Shift</th>
                <th class="py-2 px-3">Durasi</th>
                <th class="py-2 px-3">Uraian Pekerjaan</th>
                <th class="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line text-ink">
              <tr v-if="filteredModalLogs.length === 0">
                <td colspan="6" class="py-6 text-center text-ink-3 text-xs">
                  Tidak ada catatan logbook pada filter status ini.
                </td>
              </tr>
              <tr
                v-for="log in filteredModalLogs"
                :key="log.id"
                class="hover:bg-muted/40 transition-colors"
              >
                <td class="py-2 px-3 whitespace-nowrap">
                  <div class="font-medium text-ink">{{ log.task_date }}</div>
                  <div class="text-[10px] text-ink-3 font-mono">{{ log.start_time }} - {{ log.end_time }}</div>
                </td>
                <td class="py-2 px-3">
                  <div class="font-medium text-ink">{{ log.machine_name }}</div>
                  <div class="text-[10px] text-ink-3">{{ log.sub_machine_name || '-' }}</div>
                </td>
                <td class="py-2 px-3 text-ink-2 whitespace-nowrap">
                  {{ log.shift_name }}
                </td>
                <td class="py-2 px-3 font-mono text-[10px] whitespace-nowrap">
                  {{ formatDuration(log.duration_minutes) }}
                </td>
                <td class="py-2 px-3 max-w-[220px]">
                  <p class="truncate text-ink-2" :title="log.activity_description">
                    {{ log.activity_description }}
                  </p>
                  <span v-if="log.sparepart && log.sparepart !== '-'" class="text-[10px] text-primary truncate block">
                    Part: {{ log.sparepart }}
                  </span>
                </td>
                <td class="py-2 px-3 whitespace-nowrap">
                  <AppBadge :status="log.status" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between w-full">
          <RouterLink
            v-if="selectedTech?.statusCounts.pending > 0"
            to="/approval"
            class="text-xs font-semibold text-warning hover:underline flex items-center gap-1"
          >
            <span>Ada {{ selectedTech.statusCounts.pending }} logbook pending → Tinjau di Approval</span>
          </RouterLink>
          <div v-else />

          <button
            type="button"
            class="h-8 px-4 rounded-md font-medium text-xs border border-line bg-surface text-ink hover:bg-muted transition"
            @click="selectedTech = null"
          >
            Tutup
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { teknisiService } from '../../services/teknisiService'
import { formatDuration } from '../../utils/duration'
import Avatar from '../../components/common/Avatar.vue'
import AppBadge from '../../components/common/AppBadge.vue'
import AppModal from '../../components/common/AppModal.vue'

import {
  Users,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronRight,
  ChevronLeft
} from 'lucide-vue-next'

const authStore = useAuthStore()

const loading = ref(false)
const allTechnicians = ref([])
const selectedTech = ref(null)

// Toolbar filters
const scopeFilter = ref('my_team') // 'my_team' | 'all'
const activityStatusFilter = ref('ALL') // 'ALL' | 'ACTIVE_TODAY' | 'INACTIVE_TODAY' | 'HIGH_ACTIVITY' | 'NEEDS_ATTENTION'
const sortBy = ref('name') // 'name' (urutan default; ranking keaktifan dihapus sesuai P1)
const searchQuery = ref('')
const viewMode = ref('grid') // 'grid' | 'table'

// Modal state didefinisikan bersama state kalender di bawah


async function loadData() {
  loading.value = true
  try {
    const data = await teknisiService.getSupervisorTeamOverview(authStore.user)
    allTechnicians.value = data.technicians || []
  } catch (err) {
    console.error('Gagal memuat data aktivitas teknisi tim:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('')
}

// Filtered by direct team vs all
const teamTechnicians = computed(() => {
  if (scopeFilter.value === 'my_team') {
    return allTechnicians.value.filter(t => t.isDirectTeam)
  }
  return allTechnicians.value
})

const directTeamCount = computed(() => {
  return allTechnicians.value.filter(t => t.isDirectTeam).length
})

// KPI Computeds
const activeTodayCount = computed(() => {
  return teamTechnicians.value.filter(t => t.isActiveToday).length
})

const participationRate = computed(() => {
  if (teamTechnicians.value.length === 0) return 0
  return Math.round((activeTodayCount.value / teamTechnicians.value.length) * 100)
})

const totalMonthLogs = computed(() => {
  return teamTechnicians.value.reduce((acc, t) => acc + t.monthLogs, 0)
})

const totalWeekLogs = computed(() => {
  return teamTechnicians.value.reduce((acc, t) => acc + t.weekLogs, 0)
})

const totalTeamDuration = computed(() => {
  return teamTechnicians.value.reduce((acc, t) => acc + t.totalDurationMinutes, 0)
})

const avgLogsPerTech = computed(() => {
  if (teamTechnicians.value.length === 0) return 0
  return (totalMonthLogs.value / teamTechnicians.value.length).toFixed(1)
})

// Final filtered & sorted list of technicians
const filteredTechnicians = computed(() => {
  let list = [...teamTechnicians.value]

  // Filter Keaktifan
  if (activityStatusFilter.value === 'ACTIVE_TODAY') {
    list = list.filter(t => t.isActiveToday)
  } else if (activityStatusFilter.value === 'INACTIVE_TODAY') {
    list = list.filter(t => !t.isActiveToday)
  } else if (activityStatusFilter.value === 'HIGH_ACTIVITY') {
    list = list.filter(t => t.frequencyScore === 'Sangat Rajin')
  } else if (activityStatusFilter.value === 'NEEDS_ATTENTION') {
    list = list.filter(t => t.frequencyScore === 'Perlu Perhatian' || t.totalLogs === 0)
  }

  // Filter Search Query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(t =>
      t.full_name?.toLowerCase().includes(q) ||
      t.nik?.toLowerCase().includes(q) ||
      t.topMachine?.toLowerCase().includes(q) ||
      t.plant_name?.toLowerCase().includes(q) ||
      t.group_name?.toLowerCase().includes(q)
    )
  }

  // Sorting
  if (sortBy.value === 'most_active') {
    list.sort((a, b) => b.totalLogs - a.totalLogs)
  } else if (sortBy.value === 'least_active') {
    list.sort((a, b) => a.totalLogs - b.totalLogs)
  } else if (sortBy.value === 'name') {
    list.sort((a, b) => a.full_name.localeCompare(b.full_name))
  }

  return list
})

function resetFilters() {
  scopeFilter.value = 'my_team'
  activityStatusFilter.value = 'ALL'
  sortBy.value = 'name'
  searchQuery.value = ''
}

// Modal State & Kalender Aktivitas Logbook Teknisi
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const modalStatusFilter = ref('ALL')
const modalSelectedDate = ref(null)
const modalCalendarYear = ref(new Date().getFullYear())
const modalCalendarMonth = ref(new Date().getMonth())

const modalCalendarMonthName = computed(() => {
  return MONTH_NAMES_ID[modalCalendarMonth.value]
})

function prevModalMonth() {
  if (modalCalendarMonth.value === 0) {
    modalCalendarMonth.value = 11
    modalCalendarYear.value -= 1
  } else {
    modalCalendarMonth.value -= 1
  }
}

function nextModalMonth() {
  if (modalCalendarMonth.value === 11) {
    modalCalendarMonth.value = 0
    modalCalendarYear.value += 1
  } else {
    modalCalendarMonth.value += 1
  }
}

function resetModalCalendarMonth() {
  const now = new Date()
  modalCalendarYear.value = now.getFullYear()
  modalCalendarMonth.value = now.getMonth()
}

function selectModalDate(dateStr) {
  if (modalSelectedDate.value === dateStr) {
    modalSelectedDate.value = null
  } else {
    modalSelectedDate.value = dateStr
  }
}

function clearModalDateFilter() {
  modalSelectedDate.value = null
}

function openTechnicianDetail(tech) {
  selectedTech.value = tech
  modalStatusFilter.value = 'ALL'
  modalSelectedDate.value = null
  const now = new Date()
  modalCalendarYear.value = now.getFullYear()
  modalCalendarMonth.value = now.getMonth()
}

// 42 cells grid (Starts Monday: Sen - Min)
const modalCalendarCells = computed(() => {
  if (!selectedTech.value) return []
  const y = modalCalendarYear.value
  const m = modalCalendarMonth.value
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const firstDayOfMonth = new Date(y, m, 1)
  const lastDayOfMonth = new Date(y, m + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()

  // Monday = 0, ..., Sunday = 6
  let firstDayIndex = (firstDayOfMonth.getDay() - 1 + 7) % 7

  const userLogs = selectedTech.value.logs || []
  const cells = []

  // Hari dari bulan sebelumnya (padding)
  const prevMonthLastDate = new Date(y, m, 0).getDate()
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthLastDate - i
    const prevM = m === 0 ? 11 : m - 1
    const prevY = m === 0 ? y - 1 : y
    const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: false,
      isFuture: false,
      logCount: 0,
      status: 'PREV_MONTH',
      colorClass: '',
      tooltip: ''
    })
  }

  // Hari dalam bulan berjalan
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isToday = dateStr === todayStr
    const isFuture = dateStr > todayStr
    const dayLogs = userLogs.filter(l => l.task_date === dateStr)
    const logCount = dayLogs.length

    let status = 'NO_LOG'
    let colorClass = ''
    let tooltip = `${d} ${modalCalendarMonthName.value} ${y}: `

    if (logCount > 0) {
      const hasPending = dayLogs.some(l => l.status === 'PENDING')
      const hasApproved = dayLogs.some(l => l.status === 'APPROVED')
      const hasRejected = dayLogs.some(l => l.status === 'REJECTED')

      // Sesuai panduan user:
      // Kuning untuk log yang butuh diapprove (PENDING)
      // Hijau untuk log yang sudah approve (APPROVED)
      if (hasPending) {
        status = 'PENDING'
        colorClass = 'bg-status-pending-bg border-warning/60 text-status-pending-fg font-semibold hover:border-warning'
        tooltip += `${logCount} Logbook (Menunggu Persetujuan / Butuh Diapprove)`
      } else if (hasApproved) {
        status = 'APPROVED'
        colorClass = 'bg-status-approved-bg border-success/60 text-status-approved-fg font-semibold hover:border-success'
        tooltip += `${logCount} Logbook (Disetujui / Approved)`
      } else if (hasRejected) {
        status = 'REJECTED'
        colorClass = 'bg-status-rejected-bg border-danger/60 text-status-rejected-fg font-semibold hover:border-danger'
        tooltip += `${logCount} Logbook (Perlu Revisi / Ditolak)`
      } else {
        status = 'DRAFT'
        colorClass = 'bg-muted border-line text-ink-2 font-medium hover:border-ink-3'
        tooltip += `${logCount} Logbook (Draft)`
      }
    } else {
      if (isFuture) {
        status = 'FUTURE'
        colorClass = 'bg-muted/30 border-line/40 text-ink-3 hover:bg-muted/60'
        tooltip += 'Hari Mendatang'
      } else {
        // Merah hari tanpa log (sesuai instruksi user)
        status = 'NO_LOG'
        colorClass = 'bg-status-rejected-bg border-danger/40 text-status-rejected-fg font-medium hover:border-danger'
        tooltip += 'Hari Tanpa Log (Tidak Ada Logbook Terisi)'
      }
    }

    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday,
      isFuture,
      logCount,
      status,
      colorClass,
      tooltip
    })
  }

  // Padding hari bulan berikutnya
  const remaining = (7 - (cells.length % 7)) % 7
  for (let i = 1; i <= remaining; i++) {
    const nextM = m === 11 ? 0 : m + 1
    const nextY = m === 11 ? y + 1 : y
    const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    cells.push({
      dateStr,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: false,
      isFuture: true,
      logCount: 0,
      status: 'NEXT_MONTH',
      colorClass: '',
      tooltip: ''
    })
  }

  return cells
})

const modalMonthSummary = computed(() => {
  const currentMonthCells = modalCalendarCells.value.filter(c => c.isCurrentMonth)
  const approvedDays = currentMonthCells.filter(c => c.status === 'APPROVED').length
  const pendingDays = currentMonthCells.filter(c => c.status === 'PENDING').length
  const noLogDays = currentMonthCells.filter(c => c.status === 'NO_LOG').length
  const totalLogsInMonth = currentMonthCells.reduce((acc, c) => acc + c.logCount, 0)

  return {
    approvedDays,
    pendingDays,
    noLogDays,
    totalLogsInMonth
  }
})

const filteredModalLogs = computed(() => {
  if (!selectedTech.value) return []
  let list = selectedTech.value.logs || []
  if (modalSelectedDate.value) {
    list = list.filter(l => l.task_date === modalSelectedDate.value)
  }
  if (modalStatusFilter.value !== 'ALL') {
    list = list.filter(l => l.status === modalStatusFilter.value)
  }
  return list
})
</script>
