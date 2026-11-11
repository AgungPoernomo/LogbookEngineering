<template>
  <div class="space-y-4">
    <!-- ============ HEADER ============ -->
    <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
      <div class="min-w-0">
        <div
          class="text-[12px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5"
        >
          <Activity class="w-3.5 h-3.5" />
          <span>Keandalan Aset</span>
        </div>
        <h1 class="text-[20px] font-bold text-ink tracking-tight mt-0.5">
          Analitik Keandalan — Pareto &amp; Peta Keahlian
        </h1>
        <p class="text-xs text-ink-2 mt-0.5 max-w-3xl">
          Prioritas perbaikan berdasarkan Hukum Pareto (80/20) dan siapa yang
          bisa dihubungi untuk mesin/kerusakan
        </p>
      </div>

      <!-- Filter Bulan/Tahun -->
      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <div class="relative">
          <select
            v-model="selectedYearMonth"
            class="h-9 pl-8 pr-8 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer appearance-none"
            title="Pilih periode bulan"
            @change="fetchData"
          >
            <option
              v-for="opt in yearMonthOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <Calendar
            class="w-3.5 h-3.5 text-ink-3 absolute left-2.5 top-2.5 pointer-events-none"
          />
          <ChevronDown
            class="w-3.5 h-3.5 text-ink-3 absolute right-2.5 top-2.5 pointer-events-none"
          />
        </div>

        <button
          type="button"
          class="h-9 px-3 rounded-md border border-line bg-surface hover:bg-muted text-ink text-xs font-medium transition shadow-card inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="loading"
          @click="fetchData"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          <span>Muat Ulang</span>
        </button>
      </div>
    </div>

    <!-- Info scope plant -->
    <div
      v-if="filters.plant_name || filters.is_scoped_to_plant"
      class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-2 bg-surface border border-line rounded-lg px-3 py-2 shadow-card"
    >
      <span class="inline-flex items-center gap-1.5">
        <Building2 class="w-3.5 h-3.5 text-ink-3" />
        Cakupan:
        <span class="font-semibold text-ink">{{
          filters.plant_name || "Semua Plant"
        }}</span>
      </span>
      <span class="inline-flex items-center gap-1.5">
        <CalendarDays class="w-3.5 h-3.5 text-ink-3" />
        Periode:
        <span class="font-semibold text-ink">{{ periodLabel }}</span>
      </span>
      <span v-if="filters.is_scoped_to_plant" class="text-ink-3">
        (Supervisor terkunci pada plant sendiri)
      </span>
    </div>

    <!-- Error State -->
    <div
      v-if="errorMessage"
      class="bg-status-rejected-bg border border-danger/30 text-status-rejected-fg rounded-lg px-4 py-3 text-xs flex items-start gap-2"
    >
      <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <div class="font-semibold">Gagal memuat analitik keandalan</div>
        <div class="mt-0.5">{{ errorMessage }}</div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="space-y-3">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          v-for="n in 4"
          :key="`sk-kpi-${n}`"
          class="h-20 bg-surface rounded-lg border border-line shadow-card animate-pulse"
        />
      </div>
      <div
        class="h-64 bg-surface rounded-lg border border-line shadow-card animate-pulse"
      />
      <div
        class="h-64 bg-surface rounded-lg border border-line shadow-card animate-pulse"
      />
      <div
        class="h-52 bg-surface rounded-lg border border-line shadow-card animate-pulse"
      />
    </div>

    <template v-else>
      <!-- ============ KPI RINGKASAN ============ -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          v-for="kpi in summaryCards"
          :key="kpi.label"
          class="bg-surface rounded-lg shadow-card p-3.5 border border-line flex flex-col justify-between space-y-2"
        >
          <div class="flex items-center justify-between text-ink-3">
            <span class="font-medium uppercase text-[10px] tracking-wider">{{
              kpi.label
            }}</span>
            <div
              class="w-6 h-6 rounded flex items-center justify-center"
              :class="kpi.iconClass"
            >
              <component :is="kpi.icon" class="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div
              class="text-xl sm:text-2xl font-bold font-mono"
              :class="kpi.valueClass"
            >
              {{ kpi.value }}
              <span class="text-xs font-normal text-ink-3 font-sans">{{
                kpi.unit
              }}</span>
            </div>
            <div class="text-[11px] text-ink-2 mt-0.5">{{ kpi.hint }}</div>
          </div>
        </div>
      </div>

      <!-- ============ BARIS 1: PARETO MESIN ============ -->
      <section
        class="bg-surface rounded-lg shadow-card border border-line overflow-hidden"
      >
        <header
          class="px-4 py-3 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-md bg-status-rejected-bg text-status-rejected-fg flex items-center justify-center shrink-0"
            >
              <Cpu class="w-4 h-4" />
            </div>
            <div>
              <h2 class="text-xs font-bold text-ink uppercase tracking-wider">
                Pareto Mesin (Bad Actor Aset)
              </h2>
              <p class="text-[11px] text-ink-2">
                Grafik batang = total downtime per mesin. Garis hitam =
                persentase kumulatif (sumbu kanan).
              </p>
            </div>
          </div>
          <span class="text-[11px] text-ink-3 shrink-0">
            {{ machinePareto.length }} mesin ditampilkan
          </span>
        </header>

        <div v-if="machinePareto.length === 0" class="px-4 py-10 text-center">
          <div
            class="w-10 h-10 mx-auto rounded-full bg-muted flex items-center justify-center mb-2"
          >
            <Cpu class="w-5 h-5 text-ink-3" />
          </div>
          <p class="text-xs font-medium text-ink">
            Belum ada data gangguan mesin pada periode ini.
          </p>
          <p class="text-[11px] text-ink-3 mt-0.5">
            Pareto terbentuk dari logbook berstatus PENDING/APPROVED dengan
            kategori Perbaikan Mesin.
          </p>
        </div>

        <div v-else class="px-3 sm:px-4 pt-3 pb-1">
          <!-- HERO: Grafik Pareto (Bar + Garis Kumulatif) -->
          <ParetoChart
            :items="machinePareto"
            metric="machine"
            value-label="Downtime (Jam)"
            :threshold-percent="paretoThreshold"
            :max-bars="PARETO_CHART_MAX_BARS"
            caption="Diagram Pareto downtime per mesin"
          />
        </div>

        <!-- Detail tabel angka pasti (di bawah grafik) -->
        <div v-if="machinePareto.length > 0" class="px-3 sm:px-4 pt-1 pb-2">
          <div
            class="flex items-center gap-1.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider"
          >
            <Table2 class="w-3 h-3" />
            <span>Tabel Detail Pareto Mesin</span>
          </div>
        </div>

        <div
          v-if="machinePareto.length > 0"
          class="overflow-x-auto border-t border-line"
        >
          <table
            class="w-full text-left text-[12px] border-collapse min-w-[760px]"
          >
            <thead class="bg-muted/60 text-ink-2 border-b border-line">
              <tr class="font-semibold">
                <th class="px-3 py-2.5 w-10 text-center">#</th>
                <th class="px-3 py-2.5">Nama Mesin</th>
                <th class="px-3 py-2.5 text-right w-28">Breakdown</th>
                <th class="px-3 py-2.5 text-right w-28">Downtime (Jam)</th>
                <th class="px-3 py-2.5 text-right w-24">Kontribusi</th>
                <th class="px-3 py-2.5 w-[220px]">% Kumulatif</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr
                v-for="row in machinePareto"
                :key="`machine-${row.machine_id ?? row.rank}`"
                :class="
                  row.is_vital_few ? 'bg-row-red/40' : 'hover:bg-muted/40'
                "
              >
                <td class="px-3 py-2.5 text-center font-mono text-ink-3">
                  {{ row.rank }}
                </td>
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <RouterLink
                      v-if="row.machine_id"
                      :to="`/mesin/${row.machine_id}`"
                      class="font-semibold text-ink hover:text-primary hover:underline"
                    >
                      {{ row.name }}
                    </RouterLink>
                    <span v-else class="font-semibold text-ink">{{
                      row.name
                    }}</span>
                    <span
                      v-if="row.is_vital_few"
                      class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide bg-status-rejected-bg text-status-rejected-fg border border-danger/30"
                    >
                      Bad Actor
                    </span>
                  </div>
                </td>
                <td
                  class="px-3 py-2.5 text-right font-mono"
                  :class="
                    row.is_vital_few ? 'text-danger font-semibold' : 'text-ink'
                  "
                >
                  {{ row.breakdown_count }}
                </td>
                <td
                  class="px-3 py-2.5 text-right font-mono"
                  :class="
                    row.is_vital_few ? 'text-danger font-semibold' : 'text-ink'
                  "
                >
                  {{ formatHours(row.downtime_hours) }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono text-ink-2">
                  {{ formatPercent(row.percent) }}
                </td>
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-2">
                    <div
                      class="flex-1 h-2 rounded-full bg-line overflow-hidden"
                      role="presentation"
                    >
                      <div
                        class="h-full rounded-full transition-all duration-300"
                        :class="
                          row.is_vital_few ? 'bg-danger' : 'bg-primary/50'
                        "
                        :style="{
                          width: `${clampPercent(row.cumulative_percent)}%`,
                        }"
                      />
                    </div>
                    <span
                      class="font-mono text-[11px] w-12 text-right"
                      :class="
                        row.is_vital_few
                          ? 'text-danger font-semibold'
                          : 'text-ink-3'
                      "
                    >
                      {{ formatPercent(row.cumulative_percent) }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="px-4 py-2.5 border-t border-line bg-muted/30">
          <p class="text-[11px] text-ink-3 flex items-start gap-1.5">
            <Info class="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{{
              notes.pareto ||
              "Pareto menandai aset penyumbang 80% gangguan, bukan penilaian teknisi."
            }}</span>
          </p>
        </footer>
      </section>
      <!-- ============ BARIS 2: PARETO FAILURE CODE ============ -->
      <section
        class="bg-surface rounded-lg shadow-card border border-line overflow-hidden"
      >
        <header
          class="px-4 py-3 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-md bg-status-pending-bg text-status-pending-fg flex items-center justify-center shrink-0"
            >
              <Wrench class="w-4 h-4" />
            </div>
            <div>
              <h2 class="text-xs font-bold text-ink uppercase tracking-wider">
                Pareto Kode Kerusakan
              </h2>
              <p class="text-[11px] text-ink-2">
                Grafik batang = frekuensi kejadian. Garis hitam = persentase
                kumulatif (sumbu kanan).
              </p>
            </div>
          </div>
          <span class="text-[11px] text-ink-3 shrink-0">
            {{ failurePareto.length }} kode ditampilkan
          </span>
        </header>

        <div v-if="failurePareto.length === 0" class="px-4 py-10 text-center">
          <div
            class="w-10 h-10 mx-auto rounded-full bg-muted flex items-center justify-center mb-2"
          >
            <Wrench class="w-5 h-5 text-ink-3" />
          </div>
          <p class="text-xs font-medium text-ink">
            Belum ada kode kerusakan tercatat pada periode ini.
          </p>
          <p class="text-[11px] text-ink-3 mt-0.5">
            Pastikan teknisi memilih kode kerusakan saat mengisi logbook
            perbaikan mesin.
          </p>
        </div>

        <div v-else class="px-3 sm:px-4 pt-3 pb-1">
          <!-- HERO: Grafik Pareto Kode Kerusakan (Bar + Garis Kumulatif) -->
          <ParetoChart
            :items="failurePareto"
            metric="failure"
            value-label="Frekuensi Kejadian"
            show-code-prefix
            :threshold-percent="paretoThreshold"
            :max-bars="PARETO_CHART_MAX_BARS"
            caption="Diagram Pareto frekuensi kode kerusakan"
          />
        </div>

        <!-- Detail tabel angka pasti (di bawah grafik) -->
        <div v-if="failurePareto.length > 0" class="px-3 sm:px-4 pt-1 pb-2">
          <div
            class="flex items-center gap-1.5 text-[10px] font-semibold text-ink-3 uppercase tracking-wider"
          >
            <Table2 class="w-3 h-3" />
            <span>Tabel Detail Pareto Kode Kerusakan</span>
          </div>
        </div>

        <div
          v-if="failurePareto.length > 0"
          class="overflow-x-auto border-t border-line"
        >
          <table
            class="w-full text-left text-[12px] border-collapse min-w-[840px]"
          >
            <thead class="bg-muted/60 text-ink-2 border-b border-line">
              <tr class="font-semibold">
                <th class="px-3 py-2.5 w-10 text-center">#</th>
                <th class="px-3 py-2.5">Kode &amp; Nama Kerusakan</th>
                <th class="px-3 py-2.5 w-32">Kategori</th>
                <th class="px-3 py-2.5 text-right w-24">Frekuensi</th>
                <th class="px-3 py-2.5 text-right w-28">Downtime (Jam)</th>
                <th class="px-3 py-2.5 w-[220px]">% Kumulatif</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr
                v-for="row in failurePareto"
                :key="`failure-${row.failure_code_id ?? row.rank}`"
                :class="
                  row.is_vital_few ? 'bg-row-red/40' : 'hover:bg-muted/40'
                "
              >
                <td class="px-3 py-2.5 text-center font-mono text-ink-3">
                  {{ row.rank }}
                </td>
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span
                      class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted border border-line text-ink-2"
                    >
                      {{ row.code || `#${row.failure_code_id}` }}
                    </span>
                    <span class="font-semibold text-ink">{{ row.name }}</span>
                    <span
                      v-if="row.is_vital_few"
                      class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide bg-status-rejected-bg text-status-rejected-fg border border-danger/30"
                    >
                      Vital Few
                    </span>
                  </div>
                </td>
                <td class="px-3 py-2.5">
                  <span
                    class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-ink-2 border border-line"
                  >
                    {{ categoryLabel(row.category) }}
                  </span>
                </td>
                <td
                  class="px-3 py-2.5 text-right font-mono"
                  :class="
                    row.is_vital_few ? 'text-danger font-semibold' : 'text-ink'
                  "
                >
                  {{ row.count }}
                </td>
                <td class="px-3 py-2.5 text-right font-mono text-ink-2">
                  {{ formatHours(row.downtime_hours) }}
                </td>
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-2">
                    <div
                      class="flex-1 h-2 rounded-full bg-line overflow-hidden"
                      role="presentation"
                    >
                      <div
                        class="h-full rounded-full transition-all duration-300"
                        :class="
                          row.is_vital_few ? 'bg-danger' : 'bg-primary/50'
                        "
                        :style="{
                          width: `${clampPercent(row.cumulative_percent)}%`,
                        }"
                      />
                    </div>
                    <span
                      class="font-mono text-[11px] w-12 text-right"
                      :class="
                        row.is_vital_few
                          ? 'text-danger font-semibold'
                          : 'text-ink-3'
                      "
                    >
                      {{ formatPercent(row.cumulative_percent) }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <!-- ============ BARIS 3: PETA KEAHLIAN & KONTAK ============ -->
      <section
        class="bg-surface rounded-lg shadow-card border border-line overflow-hidden"
      >
        <header class="px-4 py-3 border-b border-line">
          <div
            class="flex flex-col sm:flex-row sm:items-start justify-between gap-2"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-7 h-7 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0"
              >
                <GraduationCap class="w-4 h-4" />
              </div>
              <div>
                <h2 class="text-xs font-bold text-ink uppercase tracking-wider">
                  Peta Keahlian &amp; Kontak
                </h2>
                <p class="text-[11px] text-ink-2">
                  Siapa yang paling tahu mesin X dan kode kerusakan Y — untuk
                  penugasan, bukan penilaian.
                </p>
              </div>
            </div>
            <span class="text-[11px] text-ink-3 shrink-0">
              {{ skillMatrix.length }} teknisi
            </span>
          </div>

          <!-- Pengingat Aturan P1 -->
          <div
            class="mt-2.5 flex items-start gap-1.5 rounded-md bg-primary-soft/60 border border-primary/20 px-2.5 py-1.5"
          >
            <ShieldCheck class="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p class="text-[11px] text-primary-text-on-soft font-medium">
              {{
                notes.skill_matrix ||
                "Siapa yang bisa dihubungi untuk mesin/kode kerusakan tertentu. Bukan penilaian kinerja."
              }}
            </p>
          </div>
        </header>

        <div v-if="skillMatrix.length === 0" class="px-4 py-10 text-center">
          <div
            class="w-10 h-10 mx-auto rounded-full bg-muted flex items-center justify-center mb-2"
          >
            <GraduationCap class="w-5 h-5 text-ink-3" />
          </div>
          <p class="text-xs font-medium text-ink">
            Belum ada histori penanganan pada periode ini.
          </p>
          <p class="text-[11px] text-ink-3 mt-0.5">
            Pilih periode lain atau tunggu logbook perbaikan mesin disetujui.
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table
            class="w-full text-left text-[12px] border-collapse min-w-[720px]"
          >
            <thead class="bg-muted/60 text-ink-2 border-b border-line">
              <tr class="font-semibold">
                <th class="px-3 py-2.5">Nama Teknisi</th>
                <th class="px-3 py-2.5">Spesialisasi Mesin</th>
                <th class="px-3 py-2.5">Spesialisasi Kode Kerusakan</th>
                <th class="px-3 py-2.5 w-28 text-center">Data Pendukung</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr
                v-for="tech in skillMatrix"
                :key="`skill-${tech.user_id}`"
                class="hover:bg-muted/40"
              >
                <!-- Nama Teknisi -->
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-2">
                    <span
                      class="w-7 h-7 rounded-full bg-primary-soft text-primary-text-on-soft text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden"
                    >
                      <img
                        v-if="tech.photo_url"
                        :src="tech.photo_url"
                        :alt="tech.full_name"
                        class="w-full h-full object-cover"
                      />
                      <template v-else>{{
                        getInitials(tech.full_name)
                      }}</template>
                    </span>
                    <div class="min-w-0">
                      <div class="font-semibold text-ink truncate">
                        {{ tech.full_name }}
                      </div>
                      <div class="text-[10px] text-ink-3 font-mono truncate">
                        {{ tech.nik || "-"
                        }}<span v-if="tech.group_name">
                          • {{ tech.group_name }}</span
                        >
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Spesialisasi Mesin -->
                <td class="px-3 py-2.5">
                  <template v-if="tech.machine_name">
                    <div class="flex items-center gap-1.5">
                      <Cpu class="w-3.5 h-3.5 text-ink-3 shrink-0" />
                      <RouterLink
                        v-if="tech.machine_id"
                        :to="`/mesin/${tech.machine_id}`"
                        class="font-medium text-ink hover:text-primary hover:underline truncate"
                      >
                        {{ tech.machine_name }}
                      </RouterLink>
                      <span v-else class="font-medium text-ink truncate">{{
                        tech.machine_name
                      }}</span>
                    </div>
                    <div class="text-[10px] text-ink-3 mt-0.5">
                      {{ tech.machine_handled_count }} penanganan ({{
                        formatPercent(tech.machine_share_percent)
                      }})
                    </div>
                  </template>
                  <span v-else class="text-ink-3 italic text-[11px]"
                    >Belum ada data mesin</span
                  >
                </td>

                <!-- Spesialisasi Kode Kerusakan -->
                <td class="px-3 py-2.5">
                  <template v-if="tech.failure_code || tech.failure_name">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span
                        class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted border border-line text-ink-2"
                      >
                        {{ tech.failure_code || "-" }}
                      </span>
                      <span class="font-medium text-ink truncate">{{
                        tech.failure_name || "-"
                      }}</span>
                    </div>
                    <div class="text-[10px] text-ink-3 mt-0.5">
                      {{ tech.failure_handled_count }} penanganan ({{
                        formatPercent(tech.failure_share_percent)
                      }})
                    </div>
                  </template>
                  <span v-else class="text-ink-3 italic text-[11px]"
                    >Belum ada data kode kerusakan</span
                  >
                </td>

                <!-- Data Pendukung (bukan skor kinerja) -->
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                    :class="confidenceClass(tech.confidence)"
                    :title="confidenceHint(tech.confidence)"
                  >
                    <component
                      :is="confidenceIcon(tech.confidence)"
                      class="w-3 h-3"
                    />
                    {{ tech.confidence }}
                  </span>
                  <div class="text-[10px] text-ink-3 mt-0.5 font-mono">
                    {{ tech.total_handled }} log
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="px-4 py-2.5 border-t border-line bg-muted/30">
          <p class="text-[11px] text-ink-3 flex items-start gap-1.5">
            <Info class="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Top-1 mesin &amp; kode kerusakan diambil dari histori penanganan
              pada periode terpilih. Kolom "Data Pendukung" hanya menandakan
              banyaknya sampel, bukan nilai kinerja.
              <template v-if="notes.data_basis">{{
                notes.data_basis
              }}</template>
            </span>
          </p>
        </footer>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { RouterLink } from "vue-router";
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Cpu,
  GraduationCap,
  Info,
  Layers,
  RefreshCw,
  ShieldCheck,
  Table2,
  TrendingDown,
  Wrench,
} from "lucide-vue-next";
import { useAuthStore } from "../../stores/auth";
import { ROLES } from "../../constants/roles";
import ParetoChart from "../../components/charts/ParetoChart.vue";
import {
  reliabilityAnalyticsService,
  buildYearMonthOptions,
  formatYearMonthLabel,
  PARETO_DEFAULT_LIMIT,
  PARETO_THRESHOLD_PERCENT,
} from "../../services/reliabilityAnalyticsService";
import { getWIBYearMonth } from "../../utils/dateKeys";

const authStore = useAuthStore();

/**
 * Batas jumlah bar yang digambar pada grafik Pareto.
 * Tabel detail di bawah grafik tetap menampilkan seluruh baris dari backend
 * (PARETO_DEFAULT_LIMIT = 15), sehingga tidak ada angka yang hilang.
 */
const PARETO_CHART_MAX_BARS = 12;

// ---- State ----
const loading = ref(false);
const errorMessage = ref("");
const selectedYearMonth = ref(getWIBYearMonth());
const yearMonthOptions = ref(buildYearMonthOptions(12));

const rawData = ref({
  filters: {
    year_month: getWIBYearMonth(),
    plant_id: null,
    plant_name: null,
    is_scoped_to_plant: false,
    limit: PARETO_DEFAULT_LIMIT,
    period_start: null,
    period_end: null,
    pareto_threshold_percent: 80,
  },
  summary: {},
  machinePareto: [],
  failurePareto: [],
  skillMatrix: [],
  notes: {},
});

// AbortController agar request lama dibatalkan saat filter diganti cepat.
let activeController = null;

// ---- Computed view state ----
const filters = computed(() => rawData.value.filters);
const summary = computed(() => rawData.value.summary);
const machinePareto = computed(() => rawData.value.machinePareto);
const failurePareto = computed(() => rawData.value.failurePareto);
const skillMatrix = computed(() => rawData.value.skillMatrix);
const notes = computed(() => rawData.value.notes || {});

const periodLabel = computed(() => {
  const ym = filters.value.year_month || selectedYearMonth.value;
  return formatYearMonthLabel(ym);
});

/**
 * Ambang Hukum Pareto untuk garis bantu grafik (default 80%).
 * Diambil dari respons backend agar grafik & tabel memakai acuan yang sama.
 */
const paretoThreshold = computed(() => {
  const value = Number(filters.value.pareto_threshold_percent);
  return Number.isFinite(value) && value > 0 ? value : PARETO_THRESHOLD_PERCENT;
});

/**
 * Kartu ringkasan. Disusun dari angka agregasi ASET (bukan per-teknisi),
 * sejalan dengan aturan P1.
 */
const summaryCards = computed(() => {
  const s = summary.value || {};
  const downtimeHours = Number(s.total_downtime_hours) || 0;
  const breakdown = Number(s.total_breakdown) || 0;
  const vitalMachines = Number(s.vital_machine_count) || 0;
  const totalMachines = Number(s.total_machines_with_downtime) || 0;
  const topMachine = s.top_machine_name || "-";

  return [
    {
      label: "Total Downtime",
      value: formatHours(downtimeHours),
      unit: "Jam",
      hint: "Akumulasi mesin berhenti pada periode ini",
      icon: TrendingDown,
      iconClass: "bg-status-rejected-bg text-status-rejected-fg",
      valueClass: "text-danger",
    },
    {
      label: "Kejadian Breakdown",
      value: String(breakdown),
      unit: "kali",
      hint: "Logbook dengan tipe maintenance BREAKDOWN",
      icon: Wrench,
      iconClass: "bg-status-pending-bg text-status-pending-fg",
      valueClass: "text-ink",
    },
    {
      label: "Mesin Vital (80%)",
      value: totalMachines > 0 ? `${vitalMachines}/${totalMachines}` : "0",
      unit: "mesin",
      hint: "Jumlah mesin penyumbang 80% downtime",
      icon: Cpu,
      iconClass: "bg-primary-soft text-primary",
      valueClass: "text-primary",
    },
    {
      label: "Bad Actor Utama",
      value: topMachine,
      unit: "",
      hint: "Mesin dengan downtime tertinggi",
      icon: AlertTriangle,
      iconClass: "bg-row-red text-danger",
      valueClass: "text-ink text-base sm:text-lg leading-tight",
    },
  ];
});

// ---- Formatter ----
const CATEGORY_LABELS = {
  MECHANICAL: "Mekanikal",
  ELECTRICAL: "Elektrikal",
  INSTRUMENTATION: "Instrumentasi",
  UTILITY: "Utilitas",
  PROCESS: "Proses",
};

/**
 * Format jam dengan 1 desimal, tanpa desimal .0 yang berisik.
 * Contoh: 2.5 -> "2,5" | 12 -> "12" | null -> "-"
 */
function formatHours(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  const rounded = Math.round(num * 10) / 10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(".", ",");
}

/**
 * Format persentase 1 desimal dengan koma desimal Indonesia.
 * Contoh: 86.5 -> "86,5%" | null -> "-"
 */
function formatPercent(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  const rounded = Math.round(num * 10) / 10;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(".", ",");
  return `${text}%`;
}

/** Clamp persentase ke 0-100 untuk lebar progress bar. */
function clampPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(100, Math.max(0, num));
}

function categoryLabel(category) {
  if (!category) return "-";
  return CATEGORY_LABELS[category] || category;
}

function getInitials(name) {
  if (!name) return "?";
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/**
 * Kelas badge "Data Pendukung".
 * HANYA menandai kualitas sampel data — bukan skor kinerja teknisi (P1).
 */
function confidenceClass(level) {
  switch (level) {
    case "HIGH":
      return "bg-status-approved-bg text-status-approved-fg border-success/30";
    case "MEDIUM":
      return "bg-status-pending-bg text-status-pending-fg border-warning/30";
    default:
      return "bg-muted text-ink-3 border-line";
  }
}

function confidenceHint(level) {
  switch (level) {
    case "HIGH":
      return "Banyak data pendukung (≥ 5 penanganan) — kontak ahli cukup kuat";
    case "MEDIUM":
      return "Data pendukung sedang (2-4 penanganan) — indikasi awal";
    default:
      return "Data baru 1 penanganan — indikasi awal, bukan penilaian kinerja";
  }
}

function confidenceIcon(level) {
  if (level === "HIGH") return CheckCircle2;
  if (level === "MEDIUM") return Layers;
  return Info;
}

// ---- Data fetching ----
async function fetchData() {
  if (activeController) activeController.abort();
  const controller = new AbortController();
  activeController = controller;

  loading.value = true;
  errorMessage.value = "";

  try {
    // plant_id hanya dikirim untuk Admin; Supervisor dikunci ke plant JWT di backend.
    const isAdmin = authStore.role === ROLES.ADMIN;

    const data = await reliabilityAnalyticsService.getReliabilityAnalytics({
      year_month: selectedYearMonth.value,
      plant_id: isAdmin ? authStore.user?.plant_id || undefined : undefined,
      signal: controller.signal,
    });

    rawData.value = data;
  } catch (err) {
    // Abaikan pembatalan request (pergantian filter cepat).
    if (err?.name === "AbortError") return;
    errorMessage.value =
      err?.message || "Terjadi kesalahan saat menghubungi server.";
    rawData.value = {
      ...rawData.value,
      summary: {},
      machinePareto: [],
      failurePareto: [],
      skillMatrix: [],
    };
  } finally {
    if (activeController === controller) {
      loading.value = false;
      activeController = null;
    }
  }
}

onMounted(() => {
  fetchData();
});

onBeforeUnmount(() => {
  if (activeController) activeController.abort();
  activeController = null;
});
</script>
