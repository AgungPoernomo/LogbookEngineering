<template>
  <div class="max-w-4xl mx-auto space-y-5 pb-12">
    <!-- Toast Feedback Notification -->
    <Toast
      v-if="toast.show"
      :type="toast.type"
      :title="toast.title"
      :message="toast.message"
      @close="toast.show = false"
    />

    <!-- Header Halaman -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-line"
    >
      <div>
        <div
          class="text-[12px] font-semibold text-primary uppercase tracking-wider"
        >
          Formulir Logbook Teknisi
        </div>
        <h1 class="text-xl sm:text-2xl font-bold text-ink tracking-tight">
          Input Logbook Harian
        </h1>
        <p class="text-xs text-ink-2 mt-0.5">
          Pencatatan aktivitas pemeliharaan, servis, dan perbaikan mesin
          operasional Satoria.
        </p>
      </div>

      <RouterLink
        to="/logbook/riwayat"
        class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-line bg-surface text-ink text-xs font-medium hover:bg-muted transition shadow-sm self-start sm:self-auto"
      >
        <span>Lihat Riwayat & Kalender →</span>
      </RouterLink>
    </div>

    <form @submit.prevent="handleSubmit(true)" class="space-y-5">
      <!-- ======================================================== -->
      <!-- TODO H1: BANNER PRE-FILL DARI BUKU PINTAR MESIN           -->
      <!-- ======================================================== -->
      <div
        v-if="quickStart.machine"
        class="rounded-lg border border-primary/30 bg-primary-soft p-3 flex items-start gap-2.5"
      >
        <Info class="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div class="min-w-0 flex-1 text-[11px] leading-relaxed text-ink-2">
          <span class="font-bold text-ink"
            >Diisi otomatis dari Buku Pintar Mesin:</span
          >
          <span class="font-semibold text-primary">
            {{ quickStartMachineName || "Mesin terpilih" }}</span
          >
          <span v-if="quickStart.subMachine" class="text-ink-3">
            (sub-mesin ikut terisi)</span
          >
          <span class="text-ink-3">
            — kategori &amp; mesin boleh diubah bila tidak sesuai.</span
          >
        </div>
        <button
          type="button"
          class="text-[10px] font-semibold text-primary hover:underline shrink-0"
          @click="clearQuickStart"
        >
          Sembunyikan
        </button>
      </div>

      <!-- ======================================================== -->
      <!-- 0. KATEGORI AKTIVITAS (F3.1: FORM INPUT ADAPTIF 5 TOMBOL) -->
      <!-- ======================================================== -->
      <div
        class="bg-surface rounded-lg p-4 sm:p-5 border border-line shadow-card space-y-4"
      >
        <div class="flex items-center gap-2 pb-3 border-b border-line">
          <span class="text-base leading-none">🗂️</span>
          <div>
            <h2
              class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide"
            >
              Jenis Pekerjaan Hari Ini
            </h2>
            <p class="text-[11px] text-ink-3">
              Pilih satu kategori paling sesuai dengan pekerjaan Anda di
              lapangan.
            </p>
          </div>
        </div>

        <!-- 5 Tombol Besar Kategori -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            v-for="opt in ACTIVITY_CATEGORY_OPTIONS"
            :key="opt.value"
            type="button"
            :class="[
              'flex items-start gap-3 p-3.5 rounded-lg border-2 text-left transition w-full',
              selectedCategory === opt.value
                ? 'border-primary bg-primary-soft ring-1 ring-primary/30 shadow-card'
                : 'border-line bg-surface hover:border-primary/50 hover:bg-muted/40',
            ]"
            @click="selectCategory(opt.value)"
          >
            <span class="text-2xl leading-none shrink-0">{{ opt.icon }}</span>
            <span class="min-w-0">
              <span class="block text-xs sm:text-sm font-bold text-ink">{{
                opt.label
              }}</span>
              <span class="block text-[10px] text-ink-3 leading-snug mt-0.5">{{
                opt.sublabel
              }}</span>
            </span>
          </button>
        </div>

        <!-- Chip Cepat (Quick Action Tag) sesuai kategori terpilih
             Q5: chip diperbesar + label tegas agar teknisi tidak lupa memilih -->
        <div
          v-if="categoryConfig.chips.length"
          class="pt-1"
          role="group"
          aria-labelledby="quick-action-tag-label"
        >
          <div
            id="quick-action-tag-label"
            :class="[
              'text-xs uppercase font-bold tracking-wider mb-2',
              quickActionTag ? 'text-ink' : 'text-danger',
            ]"
          >
            Pilih Aksi Cepat (Wajib) <span aria-hidden="true">*</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="chip in categoryConfig.chips"
              :key="chip"
              type="button"
              :aria-pressed="quickActionTag === chip"
              :class="[
                'inline-flex items-center justify-center min-h-11 py-2.5 px-4 rounded-lg text-xs sm:text-sm leading-snug text-center transition min-w-0 max-w-full break-words',
                quickActionTag === chip
                  ? 'border-2 border-primary bg-primary text-white shadow-sm font-semibold'
                  : 'border-2 border-dashed border-line hover:border-primary bg-muted text-ink-2',
              ]"
              @click="quickActionTag = chip"
            >
              {{ chip }}
            </button>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 1. WAKTU DIBUAT (OTOMATIS SISTEM) — MODE STRIP READ-ONLY  -->
      <!-- ======================================================== -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-[11px] text-ink-3"
      >
        <div class="flex items-center gap-1.5 min-w-0">
          <Server class="w-3.5 h-3.5 text-ink-3 shrink-0" />
          <span class="shrink-0">Waktu Dibuat (Sistem / Server):</span>
          <span class="font-medium text-ink-2 truncate">{{
            serverEntryTimestamp
          }}</span>
        </div>

        <div class="text-left sm:text-right">
          <span>Pelaksana: </span>
          <span class="font-medium text-ink-2">{{ currentUserName }}</span>
          <span class="text-ink-3 font-mono ml-1">({{ currentUserNik }})</span>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 2. BAGIAN PALING ATAS: KALENDER INPUT TANGGAL TUGAS      -->
      <!-- ======================================================== -->
      <div
        class="bg-surface rounded-lg p-4 sm:p-5 border border-line shadow-card space-y-4"
      >
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-line gap-2"
        >
          <div class="flex items-center gap-2">
            <CalendarIcon class="w-4 h-4 text-primary shrink-0" />
            <div>
              <h2
                class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide"
              >
                1. Tanggal Tugas / Pekerjaan
              </h2>
              <p class="text-[11px] text-ink-3">
                Klik salah satu tanggal pada kalender di bawah untuk memilih
                hari pelaksanaan tugas.
              </p>
            </div>
          </div>

          <!-- Lencana Tanggal Terpilih -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-ink-3">Terpilih:</span>
            <span
              class="px-2.5 py-1 rounded-md text-xs font-bold bg-primary text-white shadow-sm font-mono"
            >
              {{ formattedSelectedDate }}
            </span>
          </div>
        </div>

        <!-- Widget Kalender Visual Interaktif -->
        <div
          class="bg-muted/40 p-3.5 sm:p-4 rounded-lg border border-line select-none"
        >
          <!-- Navigasi Bulan & Tahun Kalender -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-ink">
                {{ currentMonthName }} {{ viewYear }}
              </span>
              <button
                type="button"
                class="px-2 py-0.5 rounded text-[11px] font-medium bg-surface hover:bg-muted text-primary border border-line transition"
                @click="pickToday"
              >
                Hari Ini
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded text-[11px] font-medium bg-surface hover:bg-muted text-ink-2 border border-line transition"
                @click="pickYesterday"
              >
                Kemarin
              </button>
            </div>

            <div class="flex items-center gap-1">
              <button
                type="button"
                class="w-7 h-7 rounded-md flex items-center justify-center text-ink-2 hover:bg-surface border border-line/60 transition"
                aria-label="Bulan sebelumnya"
                @click="prevMonth"
              >
                <ChevronLeft class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="w-7 h-7 rounded-md flex items-center justify-center text-ink-2 hover:bg-surface border border-line/60 transition"
                aria-label="Bulan berikutnya"
                @click="nextMonth"
              >
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Header Hari: Sen, Sel, Rab, Kam, Jum, Sab, Min -->
          <div class="grid grid-cols-7 text-center mb-1">
            <span
              v-for="(dayName, idx) in dayNamesShort"
              :key="idx"
              class="text-[11px] font-semibold text-ink-3 py-1 uppercase tracking-wider"
            >
              {{ dayName }}
            </span>
          </div>

          <!-- Sel Tanggal 7 Kolom -->
          <div class="grid grid-cols-7 gap-1 text-center">
            <button
              v-for="cell in calendarCells"
              :key="cell.dateStr"
              type="button"
              :class="[
                'h-9 rounded-md text-xs font-medium flex flex-col items-center justify-center transition-all relative',
                cell.dateStr === form.task_date
                  ? 'bg-primary text-white font-bold shadow-md scale-102 ring-2 ring-primary/40'
                  : cell.isToday
                    ? 'border border-primary text-primary font-bold bg-primary-soft/50 hover:bg-primary-soft'
                    : cell.isCurrentMonth
                      ? 'bg-surface hover:bg-muted text-ink border border-line/50 hover:border-line'
                      : 'bg-surface/50 text-ink-3 hover:bg-muted/60 opacity-60',
              ]"
              @click="selectDate(cell.dateStr)"
            >
              <span>{{ cell.dayNumber }}</span>
              <span
                v-if="cell.isToday && cell.dateStr !== form.task_date"
                class="w-1 h-1 rounded-full bg-primary mt-0.5"
              />
            </button>
          </div>
        </div>

        <!-- Input Tanggal Native Fallback / Keyboard -->
        <div class="flex items-center gap-3 pt-1">
          <label
            for="native-task-date"
            class="text-xs text-ink-2 font-medium shrink-0"
          >
            Atau pilih tanggal langsung:
          </label>
          <input
            id="native-task-date"
            v-model="form.task_date"
            type="date"
            required
            class="h-8 px-2.5 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 3. INPUTAN SHIFT, GROUP, DAN PLANT (GROUP & PLANT DILOCK)-->
      <!-- ======================================================== -->
      <div
        class="bg-surface rounded-lg p-4 sm:p-5 border border-line shadow-card space-y-4"
      >
        <div class="flex items-center gap-2 pb-3 border-b border-line">
          <Clock class="w-4 h-4 text-primary shrink-0" />
          <h2
            class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide"
          >
            2. Shift, Group & Lokasi Plant
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Inputan Shift Kerja -->
          <div>
            <label
              for="form-shift"
              class="block text-xs font-semibold text-ink mb-1.5"
            >
              Shift Kerja <span class="text-danger">*</span>
            </label>
            <select
              id="form-shift"
              v-model="form.shift_id"
              required
              class="w-full h-10 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer"
              @change="handleShiftChange"
            >
              <option v-for="s in masterStore.shifts" :key="s.id" :value="s.id">
                {{ s.name }} ({{ s.start_time }} - {{ s.end_time }})
              </option>
            </select>
            <p class="hidden sm:block text-[10px] text-ink-3 mt-1">
              Pilih jadwal jam kerja operasional shift.
            </p>
          </div>

          <!-- Inputan Group Kerja (DILOCK) -->
          <div>
            <label
              for="form-group"
              class="block text-xs font-semibold text-ink mb-1.5 flex items-center justify-between"
            >
              <span>Group / Departemen</span>
              <span
                class="text-[10px] font-semibold text-ink-3 flex items-center gap-1"
              >
                <Lock class="w-3 h-3 text-ink-3" />
                Terkunci
              </span>
            </label>
            <div class="relative">
              <input
                id="form-group"
                type="text"
                readonly
                disabled
                :value="lockedGroupName"
                class="w-full h-10 px-3 pr-8 rounded-md border border-line bg-muted text-xs font-medium text-ink-2 cursor-not-allowed select-none"
              />
              <Lock
                class="w-4 h-4 text-ink-3 absolute right-2.5 top-3 pointer-events-none"
              />
            </div>
            <p class="text-[10px] text-ink-3 mt-1">
              *Ditetapkan oleh Admin pada akun Anda
            </p>
          </div>

          <!-- Inputan Plant (DILOCK) -->
          <div>
            <label
              for="form-plant"
              class="block text-xs font-semibold text-ink mb-1.5 flex items-center justify-between"
            >
              <span>Lokasi Fasilitas (Plant)</span>
              <span
                class="text-[10px] font-semibold text-ink-3 flex items-center gap-1"
              >
                <Lock class="w-3 h-3 text-ink-3" />
                Terkunci
              </span>
            </label>
            <div class="relative">
              <input
                id="form-plant"
                type="text"
                readonly
                disabled
                :value="lockedPlantName"
                class="w-full h-10 px-3 pr-8 rounded-md border border-line bg-muted text-xs font-medium text-ink-2 cursor-not-allowed select-none"
              />
              <Lock
                class="w-4 h-4 text-ink-3 absolute right-2.5 top-3 pointer-events-none"
              />
            </div>
            <p class="text-[10px] text-ink-3 mt-1">
              *Ditetapkan oleh Admin pada akun Anda
            </p>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 4. INPUTAN AREA PEKERJAAN (ADAPTIF SESUAI KATEGORI F3.1) -->
      <!-- ======================================================== -->
      <div
        v-if="!isNonMachineCategory"
        class="bg-surface rounded-lg p-4 sm:p-5 border border-line shadow-card space-y-4"
      >
        <div class="flex items-center gap-2 pb-3 border-b border-line">
          <Cpu class="w-4 h-4 text-primary shrink-0" />
          <h2
            class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide"
          >
            3. Area Pekerjaan & Komponen Mesin
          </h2>
          <span
            class="ml-auto text-[10px] font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-full whitespace-nowrap"
          >
            {{ categoryConfig.icon }} {{ categoryConfig.label }}
          </span>
        </div>

        <!-- KERETA_TRAY_REPAIR: jumlah unit diperbaiki (mesin otomatis = KERETA) -->
        <div v-if="isKeretaCategory">
          <label
            for="form-unit-qty"
            class="block text-xs font-semibold text-ink mb-1.5"
          >
            Jumlah Unit Kereta / Tray Diperbaiki
            <span class="text-danger">*</span>
          </label>
          <input
            id="form-unit-qty"
            v-model.number="form.unit_repaired_qty"
            type="number"
            min="1"
            step="1"
            required
            class="w-full sm:w-56 h-10 px-3 rounded-md border border-line bg-surface text-sm font-semibold font-mono text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
          />
          <p class="hidden sm:block text-[10px] text-ink-3 mt-1">
            Mesin otomatis tercatat sebagai "KERETA". Minimal 1 unit.
          </p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Inputan Mesin (Dropdown) -->
          <div>
            <label
              for="form-machine"
              class="block text-xs font-semibold text-ink mb-1.5"
            >
              Peralatan Mesin
              <span
                v-if="isMachineRequired && !isUnmappedAsset"
                class="text-danger"
                >*</span
              >
            </label>

            <select
              id="form-machine"
              v-model="form.machine_id"
              :required="isMachineRequired && !isUnmappedAsset"
              :disabled="isUnmappedAsset"
              class="w-full h-10 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted"
              @change="handleMachineChange"
            >
              <option :value="null" disabled>
                {{ machinePlaceholder }}
              </option>
              <option v-for="m in filteredMachines" :key="m.id" :value="m.id">
                {{ m.name }}
              </option>
            </select>
            <p class="hidden sm:block text-[10px] text-ink-3 mt-1">
              Daftar mesin aktif pada {{ lockedPlantName }}.
            </p>
          </div>

          <!-- Inputan Sub-Mesin (Dropdown) -->
          <div>
            <label
              for="form-submachine"
              class="block text-xs font-semibold text-ink mb-1.5"
            >
              Bagian Mesin (Sub-Mesin)
              <span
                v-if="isMachineRequired && !isUnmappedAsset"
                class="text-danger"
                >*</span
              >
            </label>
            <select
              id="form-submachine"
              v-model="form.sub_machine_id"
              :disabled="!form.machine_id || isUnmappedAsset"
              class="w-full h-10 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted"
            >
              <option :value="null">
                {{
                  isUnmappedAsset
                    ? "Mesin belum terdaftar — isi catatan aset di bawah"
                    : !form.machine_id
                      ? "Pilih mesin terlebih dahulu"
                      : "-- Tanpa Bagian Spesifik / Mesin Utama --"
                }}
              </option>
              <option
                v-for="sub in filteredSubMachines"
                :key="sub.id"
                :value="sub.id"
              >
                {{ sub.name }}
              </option>
            </select>
            <p class="hidden sm:block text-[10px] text-ink-3 mt-1">
              Bagian komponen mesin yang mengalami kendala/perawatan.
            </p>
          </div>
        </div>

        <!-- Aset belum terdaftar (D12): posisi di BAWAH dropdown
             Area Pekerjaan & Komponen Mesin -->
        <div class="flex items-start gap-2 pt-1">
          <input
            id="unmapped"
            v-model="isUnmappedAsset"
            type="checkbox"
            class="mt-0.5 h-4 w-4 rounded border-line text-primary focus:ring-primary cursor-pointer shrink-0"
          />
          <label
            for="unmapped"
            class="text-sm font-medium text-ink cursor-pointer leading-tight"
          >
            Mesin / Bagian ini belum terdaftar (Input Manual)
          </label>
        </div>

        <!-- Catatan Aset Belum Terdaftar (muncul saat checkbox dicentang) -->
        <div
          v-if="isUnmappedAsset"
          class="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2"
        >
          <label
            for="form-unmapped-note"
            class="block text-xs font-semibold text-ink"
          >
            Nama / Catatan Mesin atau Bagian Belum Terdaftar
            <span class="text-danger">*</span>
          </label>
          <input
            id="form-unmapped-note"
            v-model="unmappedAssetNote"
            type="text"
            required
            maxlength="200"
            placeholder="Contoh: Mesin Filling Cair Line 3 (belum ada di master), atau Blower B3"
            class="w-full h-10 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
          />
          <p class="text-[10px] text-ink-3 leading-relaxed">
            Catatan ini tampil di
            <span class="font-semibold text-ink-2"
              >Radar Aset Belum Terdaftar</span
            >
            Admin untuk dipromosikan menjadi mesin resmi. Mesin &amp; sub-mesin
            tidak wajib dipilih selama catatan ini terisi.
          </p>
        </div>

        <!-- FASE 5.2 / v6: Sparepart dari katalog (multi-baris + qty) -->
        <div v-if="!isNonMachineCategory && selectedCategory">
          <label class="block text-xs font-semibold text-ink mb-1.5"
            >Sparepart / Suku Cadang</label
          >
          <SparepartMultiSelect
            v-model="form.sparepart_items"
            :disabled="submitting"
          />
          <p class="text-[10px] text-ink-3 mt-1">
            Pilih dari katalog. Part yang belum terdaftar bisa dicatat pada
            Uraian Pekerjaan di bagian bawah.
          </p>
        </div>

        <!-- ======================================================== -->
        <!-- Kode Kerusakan disembunyikan dari UI (revisi H-1).        -->
        <!-- Nilai `failure_code_id` diisi otomatis pada payload:      -->
        <!-- MACHINE_TROUBLE → 1, kategori lain → null (auto-generate  -->
        <!-- kode kerusakan akan ditangani backend).                   -->
        <!-- ======================================================== -->

        <!-- MACHINE_TROUBLE: kondisi akhir mesin -->
        <div
          v-if="isMachineTroubleCategory"
          class="pt-3 border-t border-line space-y-3"
        >
          <div>
            <div class="text-xs font-semibold text-ink mb-2">
              Bagaimana kondisi mesin sekarang?
              <span class="text-danger">*</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                v-for="st in MACHINE_END_STATUS_OPTIONS"
                :key="st.value"
                type="button"
                :class="[
                  'flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition w-full',
                  form.machine_end_status === st.value
                    ? 'border-primary bg-primary-soft'
                    : 'border-line bg-surface hover:border-primary/50 hover:bg-muted/40',
                ]"
                @click="form.machine_end_status = st.value"
              >
                <span class="text-base leading-none shrink-0">{{
                  st.icon
                }}</span>
                <span class="text-xs font-semibold text-ink">{{
                  st.label
                }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 5. INPUT DETAIL AKTIVITAS (TEXT / TEXTAREA)              -->
      <!-- ======================================================== -->
      <div
        class="bg-surface rounded-lg p-4 sm:p-5 border border-line shadow-card space-y-3"
      >
        <div class="flex items-center gap-2 pb-3 border-b border-line">
          <FileText class="w-4 h-4 text-primary shrink-0" />
          <h2
            class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide"
          >
            4. Detail Aktivitas & Uraian Pekerjaan
          </h2>
        </div>

        <div>
          <label
            for="form-activity"
            class="block text-xs font-semibold text-ink mb-1.5"
          >
            Uraian Pekerjaan yang Dilaksanakan
            <span class="text-danger">*</span>
          </label>
          <textarea
            id="form-activity"
            v-model="form.activity_description"
            rows="4"
            required
            maxlength="1000"
            placeholder="Jelaskan secara rinci tindakan pekerjaan yang dilakukan, temuan masalah atau kendala teknis di lapangan, tindakan perbaikan, serta kondisi operasional mesin setelah penanganan..."
            class="w-full p-3 rounded-md border border-line bg-surface text-xs font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition leading-relaxed"
          />
          <div
            class="flex items-center justify-between text-[10px] text-ink-3 mt-1"
          >
            <span
              >Pastikan uraian ditulis secara spesifik untuk memudahkan validasi
              Supervisor. Maksimal 1000 karakter.</span
            >
            <span
              :class="
                form.activity_description.length > 1000
                  ? 'text-danger font-semibold'
                  : ''
              "
            >
              {{ form.activity_description.length }}/1000 karakter
            </span>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 6. BAGIAN PALING BAWAH: WAKTU MULAI, SELESAI, DURASI     -->
      <!-- ======================================================== -->
      <div
        class="bg-surface rounded-lg p-4 sm:p-5 border border-line shadow-card space-y-4"
      >
        <div class="flex items-center gap-2 pb-3 border-b border-line">
          <Timer class="w-4 h-4 text-primary shrink-0" />
          <h2
            class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide"
          >
            5. Waktu Mulai, Waktu Selesai & Durasi Pekerjaan
          </h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <!-- Waktu Mulai -->
          <div>
            <label
              for="form-start-time"
              class="block text-xs font-semibold text-ink mb-1.5"
            >
              Waktu Mulai <span class="text-danger">*</span>
            </label>
            <div class="relative">
              <input
                id="form-start-time"
                v-model="form.start_time"
                type="time"
                required
                placeholder="--.--"
                :class="[
                  'time-field w-full h-10 px-3 rounded-md border border-line bg-surface text-sm font-semibold font-mono text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition',
                  form.start_time ? '' : 'time-field--empty',
                ]"
              />
              <!-- Placeholder kustom: input type="time" tidak menampilkan
                   atribut placeholder di Chromium, jadi "--.--" dirender
                   sebagai overlay saat nilai masih kosong. -->
              <span
                v-if="!form.start_time"
                class="time-placeholder"
                aria-hidden="true"
                >--.--</span
              >
            </div>
            <p class="text-[10px] text-ink-3 mt-1">Format 24 jam (HH:mm)</p>
          </div>

          <!-- Waktu Selesai -->
          <div>
            <label
              for="form-end-time"
              class="block text-xs font-semibold text-ink mb-1.5"
            >
              Waktu Selesai <span class="text-danger">*</span>
            </label>
            <div class="relative">
              <input
                id="form-end-time"
                v-model="form.end_time"
                type="time"
                required
                placeholder="--.--"
                :class="[
                  'time-field w-full h-10 px-3 rounded-md border border-line bg-surface text-sm font-semibold font-mono text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition',
                  form.end_time ? '' : 'time-field--empty',
                ]"
              />
              <span
                v-if="!form.end_time"
                class="time-placeholder"
                aria-hidden="true"
                >--.--</span
              >
            </div>
            <p class="text-[10px] text-ink-3 mt-1">Format 24 jam (HH:mm)</p>
          </div>

          <!-- Durasi Terhitung Otomatis -->
          <div>
            <label
              class="block text-xs font-semibold text-ink mb-1.5 flex items-center justify-between"
            >
              <span>Total Durasi</span>
              <span
                class="text-[10px] font-semibold text-success flex items-center gap-1"
              >
                Kalkulasi Otomatis
              </span>
            </label>
            <div
              class="h-10 px-3 rounded-md border border-line bg-muted/60 flex items-center justify-between"
            >
              <span class="text-xs sm:text-sm font-bold font-mono text-primary">
                {{ durationFormatted }}
              </span>
              <span
                v-if="isCrossMidnight"
                class="text-[9px] font-semibold text-warning bg-amber-50 px-1.5 py-0.5 rounded border border-warning/20"
              >
                Lintas Tengah Malam (+24j)
              </span>
            </div>
            <p class="text-[10px] text-ink-3 mt-1">
              {{ calculatedMinutes }} menit total pengerjaan.
            </p>
          </div>
        </div>

        <!-- Tombol Aksi Formulir (Draft, Submit, Reset)
             Fase 6 (mobile 360px): aksi menumpuk vertikal agar tidak berhimpitan -->
        <div
          class="pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <button
            type="button"
            class="w-full sm:w-auto h-9 px-4 rounded-md border border-line bg-surface hover:bg-muted text-ink text-xs font-medium transition"
            @click="handleResetForm"
          >
            Bersihkan Formulir
          </button>

          <div
            class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto"
          >
            <button
              type="button"
              :disabled="submitting"
              class="w-full sm:w-auto h-10 px-4 rounded-md border border-line bg-surface hover:bg-muted text-ink text-xs font-semibold transition disabled:opacity-50"
              @click="handleSubmit(false)"
            >
              Simpan sebagai Draft
            </button>

            <button
              type="submit"
              :disabled="submitting"
              class="w-full sm:w-auto h-10 px-6 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold transition shadow-card flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send class="w-3.5 h-3.5" />
              <span>{{ submitting ? "Mengirim..." : "Kirim Logbook" }}</span>
            </button>
          </div>
        </div>
      </div>
    </form>

    <!-- ======================================================== -->
    <!-- 7. PENYIMPANAN DATA DRAFT LOGBOOK & KIRIM SEMUA DRAFT    -->
    <!-- ======================================================== -->
    <div
      class="bg-surface rounded-lg border border-line shadow-card overflow-hidden"
    >
      <!-- Header Card Draft -->
      <div
        class="p-4 sm:p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-9 h-9 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5"
          >
            <FolderArchive class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2
                class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide"
              >
                Penyimpanan Data Draft Logbook
              </h2>
              <span
                :class="[
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                  draftLogs.length > 0
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-muted text-ink-3 border-line',
                ]"
              >
                {{ draftLogs.length }} Draft Tersimpan
              </span>
            </div>
            <p class="text-xs text-ink-2 mt-0.5">
              Kumpulan aktivitas pekerjaan yang Anda simpan sebagai draft. Anda
              dapat menyunting, menghapus, atau mengajukan semuanya sekaligus.
            </p>
          </div>
        </div>
      </div>

      <!-- Fase 6: Loading Skeleton saat draft sedang diambil (bukan empty state palsu) -->
      <div
        v-if="loadingDrafts && draftLogs.length === 0"
        class="p-4 sm:p-5 animate-pulse space-y-3"
      >
        <div class="h-4 bg-muted rounded w-3/4" />
        <div class="h-4 bg-muted rounded w-1/2" />
        <div class="h-14 bg-muted rounded-md" />
      </div>

      <!-- Body: Empty State jika tidak ada draft -->
      <div v-else-if="draftLogs.length === 0" class="p-8 sm:p-12 text-center">
        <div
          class="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-ink-3"
        >
          <Inbox class="w-6 h-6" />
        </div>
        <h3 class="text-xs sm:text-sm font-semibold text-ink">
          Belum Ada Draft Tersimpan
        </h3>
        <p class="text-xs text-ink-3 max-w-md mx-auto mt-1 leading-relaxed">
          Data logbook yang Anda simpan dengan tombol
          <span class="font-semibold text-ink">"Simpan sebagai Draft"</span>
          pada formulir di atas akan ditampung di sini sebelum diajukan secara
          bersamaan.
        </p>
      </div>

      <!-- Body: Daftar Draft jika ada -->
      <div v-else class="divide-y divide-line">
        <!-- Sub-toolbar ringkasan -->
        <div
          class="px-4 py-2.5 bg-muted/40 text-[11px] text-ink-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line"
        >
          <div class="flex items-center gap-2">
            <span class="font-medium">Total Akumulasi Durasi Draft:</span>
            <span class="font-bold text-primary font-mono">{{
              totalDraftDurationFormatted
            }}</span>
            <span>({{ totalDraftMinutes }} menit)</span>
          </div>
          <span class="text-ink-3 text-[10px]"
            >Periksa kembali sebelum mengirim seluruh pengajuan ke
            Supervisor</span
          >
        </div>

        <!-- List Kartu Item Draft -->
        <div class="divide-y divide-line/60">
          <div
            v-for="draft in draftLogs"
            :key="draft.id"
            class="p-4 sm:p-5 hover:bg-muted/30 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <!-- Info Detail Draft -->
            <div class="space-y-2 flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-bold text-ink">
                  {{ draft.task_date }}
                </span>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-ink-2"
                >
                  {{ draft.shift_name }}
                </span>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary-soft text-primary"
                >
                  {{ draft.plant_name }}
                </span>
                <span class="text-[11px] text-ink-3 font-mono">
                  {{ draft.start_time }} - {{ draft.end_time }} ({{
                    formatDuration(draft.duration_minutes)
                  }})
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-2 text-xs">
                <span class="font-semibold text-ink flex items-center gap-1">
                  <Cpu class="w-3.5 h-3.5 text-primary shrink-0" />
                  <span class="break-words min-w-0">{{
                    draft.machine_name
                  }}</span>
                </span>
                <span
                  v-if="
                    draft.sub_machine_name && draft.sub_machine_name !== '-'
                  "
                  class="text-ink-2"
                >
                  • {{ draft.sub_machine_name }}
                </span>
                <span v-if="draft.unmapped_asset_note" class="text-ink-2">
                  • {{ draft.unmapped_asset_note }}
                </span>
                <span
                  v-if="draft.sparepart && draft.sparepart !== '-'"
                  class="text-ink-3 text-[11px]"
                >
                  (Part: {{ draft.sparepart }})
                </span>
                <!-- FASE 5.2 / v6: draft dengan sparepart katalog -->
                <span
                  v-if="draft.spareparts && draft.spareparts.length"
                  class="text-ink-3 text-[11px]"
                >
                  ({{ draft.spareparts.length }} part katalog)
                </span>
                <!-- FASE 4.1a: kode kerusakan tersimpan pada draft -->
                <span
                  v-if="draft.failure_code || draft.failure_code_id"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-ink-2 border border-line"
                >
                  {{
                    draft.failure_code?.code || `Kode #${draft.failure_code_id}`
                  }}
                </span>
              </div>

              <p
                class="text-xs text-ink-2 line-clamp-2 leading-relaxed bg-muted/40 p-2.5 rounded border border-line/60"
              >
                {{ draft.activity_description }}
              </p>
            </div>

            <!-- Aksi per Item Draft -->
            <div
              class="flex items-center gap-2 shrink-0 self-end lg:self-center"
            >
              <button
                type="button"
                title="Muat data ini kembali ke formulir utama di atas"
                class="h-8 px-2.5 rounded border border-line bg-surface hover:bg-muted text-ink text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
                @click="handleLoadDraftToForm(draft)"
              >
                <Edit3 class="w-3.5 h-3.5 text-ink-2" />
                <span class="hidden sm:inline">Muat ke Form</span>
              </button>

              <button
                type="button"
                title="Ajukan logbook ini untuk approval supervisor"
                class="h-8 px-3 rounded bg-primary text-white hover:bg-blue-700 text-xs font-medium transition shadow-sm flex items-center gap-1.5"
                @click="handleSubmitSingleDraft(draft)"
              >
                <Send class="w-3.5 h-3.5" />
                <span>Ajukan</span>
              </button>

              <button
                type="button"
                title="Hapus draft ini"
                class="h-8 w-8 rounded border border-line bg-surface hover:bg-danger/10 hover:border-danger/30 text-ink-3 hover:text-danger transition flex items-center justify-center shadow-sm"
                @click="handleDeleteDraft(draft)"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Footer Bawah Card Draft: Kirim Semua Draft -->
        <div
          class="p-4 bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line"
        >
          <div class="text-xs text-ink-2">
            Ada
            <span class="font-bold text-ink">{{ draftLogs.length }} draft</span>
            siap untuk dikirimkan.
          </div>

          <button
            type="button"
            :disabled="draftLogs.length === 0 || submittingAllDrafts"
            class="w-full sm:w-auto h-9 px-5 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold transition shadow-card flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            @click="handleSubmitAllDrafts"
          >
            <CheckCheck v-if="!submittingAllDrafts" class="w-4 h-4" />
            <svg
              v-else
              class="animate-spin h-3.5 w-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
            <span>{{
              submittingAllDrafts
                ? "Mengajukan Semua..."
                : `Kirim Semua Draft (${draftLogs.length})`
            }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useMasterStore } from "../../stores/master";
import { logbookService } from "../../services/logbookService";
import { LOG_STATUS } from "../../constants/logStatus";
import { calculateDurationMinutes, formatDuration } from "../../utils/duration";
import { toLocalDateString, parseLocalDate } from "../../utils/dateKeys";
import { validateLogbookTimeRange } from "../../utils/timeValidation";
import {
  isTechnicianRole,
  resolveAutoSubMachineId,
  resolveQueryMachine,
  resolveQuerySubMachine,
  resolveQuickStartCategory,
} from "../../utils/logbookQuickStart";
import { alert } from "../../utils/alert";
import {
  mapDraftSpareparts,
  toSparepartPayload,
} from "../../utils/sparepartItems";

import {
  Server,
  Calendar as CalendarIcon,
  Clock,
  Cpu,
  FileText,
  Timer,
  Lock,
  Send,
  ChevronLeft,
  ChevronRight,
  FolderArchive,
  CheckCheck,
  Inbox,
  Info,
  Trash2,
  Edit3,
} from "lucide-vue-next";
import Toast from "../../components/common/Toast.vue";
import SparepartMultiSelect from "../../components/logbook/SparepartMultiSelect.vue";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const masterStore = useMasterStore();

const submitting = ref(false);

const toast = reactive({
  show: false,
  type: "success",
  title: "",
  message: "",
});

function showToast(type, title, message) {
  toast.type = type;
  toast.title = title;
  toast.message = message;
  toast.show = true;
  setTimeout(() => {
    toast.show = false;
  }, 4000);
}

// 1. Tanggal Masuk Otomatis Server
const now = new Date();
const serverEntryTimestamp = computed(() => {
  const d = new Date();
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const dayName = days[d.getDay()];
  const dateNum = d.getDate();
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");

  return `${dayName}, ${dateNum} ${monthName} ${year} • ${hours}:${mins} WIB`;
});

// Current User Info
const currentUserName = computed(
  () => authStore.user?.full_name || "Teknisi Satoria",
);
const currentUserNik = computed(() => authStore.user?.nik || "TKN-001");

// Group & Plant yang DILOCK
const lockedPlantId = computed(() => authStore.user?.plant_id || 1);
const lockedGroupId = computed(() => authStore.user?.group_id || 1);

const lockedPlantName = computed(() => {
  if (authStore.user?.plant_name) return authStore.user.plant_name;
  const p = masterStore.plants.find((item) => item.id === lockedPlantId.value);
  return p ? p.name : "Plant 1 - Satoria Pharma Pasuruan";
});

const lockedGroupName = computed(() => {
  if (authStore.user?.group_name) return authStore.user.group_name;
  const g = masterStore.workGroups.find(
    (item) => item.id === lockedGroupId.value,
  );
  return g ? g.name : "Maintenance & Utility";
});

// State Form Data
const todayDateStr = toLocalDateString(new Date());

const form = reactive({
  task_date: route.query.date || todayDateStr,
  plant_id: lockedPlantId.value,
  group_id: lockedGroupId.value,
  shift_id: 1,
  machine_id: null,
  sub_machine_id: null,
  sparepart: "",
  // FASE 5.2 / v6: sparepart dari katalog → [{ sparepart_id, qty_used, part_name, part_code, unit }]
  sparepart_items: [],
  activity_description: "",
  // Waktu sengaja kosong agar placeholder "--.--" tampil sampai teknisi mengisi
  start_time: route.query.time || "",
  end_time: "",
  // F3.1: field adaptif sesuai kategori aktivitas
  machine_end_status: "NORMAL_RESOLVED",
  unit_repaired_qty: null,
});

// ========================================================
// ASET BELUM TERDAFTAR (D12)
// Teknisi dapat melaporkan mesin / bagian yang belum ada di master data
// lewat `unmapped_asset_note`. Backend mengizinkan mesin & sub-mesin kosong
// untuk kategori wajib-mesin selama catatan ini terisi (lihat
// `backend/src/utils/reliability.js`).
// ========================================================
const isUnmappedAsset = ref(false);
const unmappedAssetNote = ref("");

const trimmedUnmappedNote = computed(() => unmappedAssetNote.value.trim());
const hasUnmappedNote = computed(() => trimmedUnmappedNote.value.length > 0);

/** Toggle "Mesin / Bagian ini belum terdaftar" — kosongkan pilihan mesin. */
watch(isUnmappedAsset, (active) => {
  if (active) {
    form.machine_id = null;
    form.sub_machine_id = null;
    // Mesin manual → banner pre-fill dari tautan QR tidak lagi relevan
    clearQuickStart();
  } else {
    unmappedAssetNote.value = "";
  }
});

function resetUnmappedAsset() {
  isUnmappedAsset.value = false;
  unmappedAssetNote.value = "";
}

// ========================================================
// TODO H1: PRE-FILL DARI BUKU PINTAR MESIN (`?machine=&sub=&task_type=`)
// Flow "scan QR → Buku Pintar Mesin → Catat Logbook" harus langsung mengisi
// mesin, sub-mesin, dan kategori. Logika parsing/otorisasi ada di
// `utils/logbookQuickStart.js` (diuji unit) agar view tetap ringkas.
// ========================================================
const quickStart = reactive({
  // true = mesin terpilih berasal dari tautan (bukan pilihan manual teknisi)
  machine: false,
  subMachine: false,
  // alasan param diabaikan: '' | 'invalid' | 'denied' | 'unknown'
  ignoredReason: "",
  // ID dari tautan yang master-nya belum termuat → diisi setelah master tiba
  pendingMachineId: null,
  pendingSubMachineId: null,
});

const quickStartMachineName = computed(() => {
  if (!quickStart.machine || !form.machine_id) return "";
  return masterStore.machines.find((m) => m.id === form.machine_id)?.name || "";
});

// Master Machines & Sub Machines Terfilter
const filteredMachines = computed(() => {
  return masterStore.machines.filter((m) => m.plant_id === lockedPlantId.value);
});

/**
 * Terapkan `?machine=&sub=&task_type=` ke form.
 *
 * - Mesin dari tautan hanya diisi bila param `?machine=` valid; tanpa param,
 *   form dibiarkan kosong ("Pilih Mesin").
 * - Bila mesin berada di Line lain / tidak dikenal, param diabaikan dan
 *   alasan disimpan agar bisa ditampilkan sebagai toast informatif (F3.3).
 * - Bila master mesin belum termuat, ID disimpan sebagai pending dan
 *   diterapkan lagi setelah `masterStore.fetchAll()` selesai.
 *
 * @param {Record<string, any>} query
 * @param {{ silent?: boolean }} [options] `silent` untuk pemanggilan ulang
 *        setelah master termuat (tanpa toast ganda)
 */
function applyQuickStartQuery(query = {}, { silent = false } = {}) {
  const hasMachineParam = query?.machine !== undefined && query?.machine !== "";
  if (!hasMachineParam) return;

  const machines = filteredMachines.value;
  const result = resolveQueryMachine(
    query.machine,
    machines,
    lockedPlantId.value,
  );

  if (result.status === "pending") {
    quickStart.pendingMachineId = result.machineId;
    quickStart.pendingSubMachineId = query?.sub ?? null;
    return;
  }

  quickStart.pendingMachineId = null;
  quickStart.pendingSubMachineId = null;

  if (result.status !== "applied") {
    quickStart.machine = false;
    quickStart.subMachine = false;
    quickStart.ignoredReason = result.status;
    if (result.message && !silent) {
      showToast("info", "Mesin Tidak Diisi Otomatis", result.message);
    }
    return;
  }

  // Kategori hanya dipaksa bila user memang teknisi (form ini khusus teknisi,
  // tapi dijaga agar helper tetap aman dipakai di konteks lain).
  if (isTechnicianRole(authStore.role) && query?.task_type) {
    const category = resolveQuickStartCategory(query.task_type);
    form.machine_end_status = "NORMAL_RESOLVED";
    selectCategory(category);
  }

  // Tautan QR menunjuk mesin yang TERDAFTAR pada master → mode input manual dilepas
  // agar watcher `isUnmappedAsset` tidak mengosongkan mesin yang baru diisi.
  resetUnmappedAsset();

  form.machine_id = result.machineId;
  quickStart.machine = true;
  quickStart.ignoredReason = "";

  const sub = resolveQuerySubMachine(
    query?.sub,
    result.machineId,
    masterStore.subMachines,
  );
  form.sub_machine_id = sub.subMachineId;
  quickStart.subMachine = sub.applied;

  if (!silent) {
    const machineName = result.machine?.name || `Mesin #${result.machineId}`;
    showToast(
      "info",
      "Mesin Sudah Terisi Otomatis",
      `Form diisi untuk ${machineName}. Lengkapi chip aksi & uraian pekerjaan sebelum mengirim.`,
    );
  }
  router.replace({ path: "/logbook/input" });
}

/** Hapus penanda pre-fill (mis. teknisi memilih mesin lain secara manual). */
function clearQuickStart() {
  quickStart.machine = false;
  quickStart.subMachine = false;
  quickStart.ignoredReason = "";
  quickStart.pendingMachineId = null;
  quickStart.pendingSubMachineId = null;
}

// ========================================================
// F3.1: KATEGORI AKTIVITAS (5 TOMBOL BESAR) & CHIP CEPAT
// ========================================================
const ACTIVITY_CATEGORY_OPTIONS = [
  {
    value: "MACHINE_TROUBLE",
    icon: "🔧",
    label: "Perbaikan & Setting Mesin",
    sublabel: "Mesin trouble, macet, bocor, ganti part, atau setting",
    chips: [
      "Ganti Part Rusak",
      "Setting / Adjust",
      "Mesin Macet / Error",
      "Bocor Angin / Air / Oli",
    ],
  },
  {
    value: "PREVENTIVE_PM",
    icon: "🛡️",
    label: "Rawat Rutin & Kebersihan",
    sublabel: "Lubrikasi, greasing, cleaning mesin, atau cek rutin",
    chips: [
      "Lubrikasi / Greasing",
      "Cleaning Mesin / Area",
      "Backwash / Kuras",
      "Cek Rutin",
    ],
  },
  {
    value: "KERETA_TRAY_REPAIR",
    icon: "🛒",
    label: "Repair Kereta & Tray",
    sublabel: "Khusus kereta, roda, bearing, dan tray autoclave",
    chips: [
      "Ganti Bearing Roda/Tray",
      "Las Rangka / Stoper",
      "Luruskan / Bending Tray",
      "Rakitan Baru",
    ],
  },
  {
    value: "FABRICATION_PROJECT",
    icon: "⚡",
    label: "Bengkel, Las & Project",
    sublabel: "Potong plat, bubut, bikin part, atau garap project line",
    chips: [
      "Potong / Gerinda / Bor",
      "Pengelasan (Las)",
      "Bubut / Milling",
      "Garap Project Line",
    ],
  },
  {
    value: "SUPPORT_NON_MACHINE",
    icon: "📋",
    label: "Tugas Non-Mesin",
    sublabel: "Standby line, gambar CAD, TOR/DOR, cek stok, training",
    chips: [
      "Standby Jaga Line",
      "Drawing / Sket CAD",
      "TOR / DOR / Admin Part",
      "Cek Gudang / Stok",
      "Meeting / Training / HR",
    ],
  },
];

const MACHINE_END_STATUS_OPTIONS = [
  { value: "NORMAL_RESOLVED", icon: "🟢", label: "Mesin sudah normal & aman" },
  {
    value: "MONITORING_NEEDED",
    icon: "🟡",
    label: "Masih jalan, perlu dipantau shift berikutnya",
  },
  {
    value: "TEMPORARY_FIX",
    icon: "🟠",
    label: "Perbaikan sementara (belum permanen)",
  },
];

// Default kategori otomatis dari sub_team user (spec F3.1).
const SUB_TEAM_DEFAULT_CATEGORY = {
  DRAFTER: "SUPPORT_NON_MACHINE",
  PART_SOURCE: "SUPPORT_NON_MACHINE",
  KERETA_TEAM: "KERETA_TRAY_REPAIR",
  WORKSHOP_FAB: "FABRICATION_PROJECT",
  LINE_TECH: "MACHINE_TROUBLE",
};

const defaultCategory =
  SUB_TEAM_DEFAULT_CATEGORY[authStore.user?.sub_team] || "MACHINE_TROUBLE";

const selectedCategory = ref(defaultCategory);
const quickActionTag = ref("");

const categoryConfig = computed(
  () =>
    ACTIVITY_CATEGORY_OPTIONS.find(
      (opt) => opt.value === selectedCategory.value,
    ) || ACTIVITY_CATEGORY_OPTIONS[0],
);

const isNonMachineCategory = computed(
  () => selectedCategory.value === "SUPPORT_NON_MACHINE",
);
const isKeretaCategory = computed(
  () => selectedCategory.value === "KERETA_TRAY_REPAIR",
);
const isMachineTroubleCategory = computed(
  () => selectedCategory.value === "MACHINE_TROUBLE",
);
const isMachineRequired = computed(
  () =>
    selectedCategory.value === "MACHINE_TROUBLE" ||
    selectedCategory.value === "PREVENTIVE_PM",
);

/** Placeholder dropdown mesin — kosong secara default sampai teknisi memilih. */
const machinePlaceholder = computed(() => {
  if (isUnmappedAsset.value)
    return "-- Mesin tidak ada di master (lihat catatan) --";
  return isMachineRequired.value ? "Pilih Mesin" : "-- Tanpa Mesin Spesifik --";
});

function selectCategory(category) {
  selectedCategory.value = category;
  quickActionTag.value = "";

  if (category === "SUPPORT_NON_MACHINE") {
    form.machine_id = null;
    form.sub_machine_id = null;
    form.sparepart = "";
    form.sparepart_items = [];
    // Tugas non-mesin dilarang menyertakan aset (backend menolak mesin apapun)
    resetUnmappedAsset();
  }
  if (category !== "MACHINE_TROUBLE") {
    form.machine_end_status = "NORMAL_RESOLVED";
  }
  if (category !== "KERETA_TRAY_REPAIR") {
    form.unit_repaired_qty = null;
  }
}

// State Kalender Picker Tanggal Tugas
const viewYear = ref(new Date().getFullYear());
const viewMonth = ref(new Date().getMonth());

const dayNamesShort = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const currentMonthName = computed(() => MONTH_NAMES_ID[viewMonth.value]);

watch(
  () => route.query,
  (newQuery) => {
    if (newQuery?.date) {
      form.task_date = newQuery.date;
      try {
        const d = parseLocalDate(newQuery.date);
        viewYear.value = d.getFullYear();
        viewMonth.value = d.getMonth();
      } catch {}
    }
    if (newQuery?.time) {
      form.start_time = newQuery.time;
    }
    if (newQuery?.machine) {
      applyQuickStartQuery(newQuery);
    }
  },
  { immediate: true },
);

const formattedSelectedDate = computed(() => {
  if (!form.task_date) return "-";
  const d = parseLocalDate(form.task_date);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return `${days[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
});

// Kalender Cells Matrix (7 kolom)
const calendarCells = computed(() => {
  const year = viewYear.value;
  const month = viewMonth.value;

  const firstDayObj = new Date(year, month, 1);
  let firstDayIndex = firstDayObj.getDay();
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // 0 = Senin, 6 = Minggu

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const d = new Date(year, month - 1, day);
    cells.push({
      dateStr: toLocalDateString(d),
      dayNumber: day,
      isCurrentMonth: false,
      isToday: toLocalDateString(d) === todayDateStr,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = toLocalDateString(dateObj);
    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayDateStr,
    });
  }

  // Next month padding (lengkapi sampai kelipatan 7)
  const total = cells.length;
  const remainder = total % 7;
  if (remainder > 0) {
    const nextDays = 7 - remainder;
    for (let d = 1; d <= nextDays; d++) {
      const dateObj = new Date(year, month + 1, d);
      cells.push({
        dateStr: toLocalDateString(dateObj),
        dayNumber: d,
        isCurrentMonth: false,
        isToday: toLocalDateString(dateObj) === todayDateStr,
      });
    }
  }

  return cells;
});

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11;
    viewYear.value--;
  } else {
    viewMonth.value--;
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0;
    viewYear.value++;
  } else {
    viewMonth.value++;
  }
}

function selectDate(dateStr) {
  form.task_date = dateStr;
  const d = parseLocalDate(dateStr);
  viewYear.value = d.getFullYear();
  viewMonth.value = d.getMonth();
}

function pickToday() {
  selectDate(todayDateStr);
}

function pickYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  selectDate(toLocalDateString(d));
}

const filteredSubMachines = computed(() => {
  if (!form.machine_id) return [];
  return masterStore.subMachines.filter(
    (sub) => sub.machine_id === form.machine_id,
  );
});

/**
 * Isi sub-mesin otomatis bila mesin yang dipilih hanya punya satu bagian.
 * Dipakai agar teknisi tidak lupa memilih bagian mesin (sub-mesin wajib pada
 * kategori MACHINE_TROUBLE & PREVENTIVE_PM). Mesin dengan >1 bagian tetap
 * dibiarkan kosong karena teknisi harus memilih bagian yang benar-benar rusak.
 *
 * @returns {boolean} true bila sub-mesin berhasil dipilih otomatis
 */
function autoSelectSingleSubMachine() {
  const autoId = resolveAutoSubMachineId(
    form.machine_id,
    filteredSubMachines.value,
  );
  if (!autoId) return false;
  form.sub_machine_id = autoId;
  return true;
}

function handleMachineChange() {
  form.sub_machine_id = null;
  // Memilih mesin dari master = aset SUDAH terdaftar → lepas mode input manual
  // (catatan ikut dibersihkan agar tidak mengirim data ganda).
  if (isUnmappedAsset.value) resetUnmappedAsset();
  // Mesin dipilih manual → banner pre-fill tidak relevan lagi
  clearQuickStart();
  // Mesin dengan satu-satunya bagian → sub-mesin langsung terisi
  autoSelectSingleSubMachine();
  // Kalau user override manual, hapus query pre-fill dari URL
  if (route.query?.machine) {
    router.replace({ path: "/logbook/input" });
  }
}

function handleShiftChange() {
  const s = masterStore.shifts.find((item) => item.id === form.shift_id);
  if (s) {
    // Saran otomatis waktu hanya bila teknisi belum mengisi kedua kolom waktu
    if (!form.start_time && !form.end_time) {
      form.start_time = s.start_time;
      form.end_time = s.end_time;
    }
  }
}

// Perhitungan Durasi
const calculatedMinutes = computed(() => {
  return calculateDurationMinutes(form.start_time, form.end_time);
});

const durationFormatted = computed(() => {
  return formatDuration(calculatedMinutes.value);
});

const isCrossMidnight = computed(() => {
  if (!form.start_time || !form.end_time) return false;
  const [sH, sM] = form.start_time.split(":").map(Number);
  const [eH, eM] = form.end_time.split(":").map(Number);
  return eH * 60 + eM < sH * 60 + sM;
});

function handleResetForm() {
  form.task_date = todayDateStr;
  form.shift_id = 1;
  form.machine_id = null;
  form.sub_machine_id = null;
  form.sparepart = "";
  form.sparepart_items = [];
  form.activity_description = "";
  // Kosongkan waktu agar placeholder "--.--" muncul kembali
  form.start_time = "";
  form.end_time = "";
  // F3.1: reset kategori adaptif ke default sub_team & bersihkan chip
  selectedCategory.value = defaultCategory;
  quickActionTag.value = "";
  form.machine_end_status = "NORMAL_RESOLVED";
  form.unit_repaired_qty = null;
  // D12: bersihkan penanda & catatan aset belum terdaftar
  resetUnmappedAsset();
  // TODO H1: hentikan penanda pre-fill — teknisi meminta form kosong
  clearQuickStart();
  if (route.query?.machine || route.query?.task_type) {
    router.replace({ path: "/logbook/input" });
  }
}

// Submit Form
async function handleSubmit(isSubmitForApproval) {
  if (!form.task_date) {
    await alert.error(
      "Data Belum Lengkap",
      "Silakan pilih tanggal tugas pada kalender.",
    );
    return;
  }

  // F3.1: mesin & sub-mesin wajib hanya untuk kategori yang membutuhkannya (Bagian 4.3).
  // D12: boleh dikosongkan bila teknisi mengisi catatan aset belum terdaftar.
  if (isMachineRequired.value && !isUnmappedAsset.value && !form.machine_id) {
    await alert.error(
      "Data Belum Lengkap",
      "Silakan pilih peralatan mesin yang ditangani, atau centang “Mesin / Bagian ini belum terdaftar” dan isi catatannya.",
    );
    return;
  }

  if (
    isMachineRequired.value &&
    !isUnmappedAsset.value &&
    !form.sub_machine_id
  ) {
    await alert.error(
      "Data Belum Lengkap",
      "Silakan pilih bagian mesin (sub-mesin) yang ditangani, atau centang “Mesin / Bagian ini belum terdaftar” dan isi catatannya.",
    );
    return;
  }

  // D12: catatan aset belum terdaftar wajib berisi bila checkbox dicentang.
  if (isUnmappedAsset.value && !hasUnmappedNote.value) {
    await alert.error(
      "Catatan Aset Belum Terdaftar",
      "Tuliskan nama mesin atau bagian yang belum terdaftar agar Admin dapat mempromosikannya ke master data.",
    );
    return;
  }

  // FASE 4.1a: kode kerusakan disembunyikan dari UI (revisi H-1) dan diisi
  // otomatis pada payload — tidak ada validasi pilihan manual lagi.

  // F3.1: chip aksi cepat (quick_action_tag) wajib dipilih untuk semua kategori.
  if (!quickActionTag.value) {
    await alert.error(
      "Chip Aksi Belum Dipilih",
      "Silakan pilih salah satu chip aksi cepat sesuai pekerjaan Anda.",
    );
    return;
  }

  // F3.1: kategori Repair Kereta & Tray wajib mengisi jumlah unit minimal 1.
  if (isKeretaCategory.value) {
    const qty = Number(form.unit_repaired_qty);
    if (!Number.isFinite(qty) || qty < 1) {
      await alert.error(
        "Jumlah Unit Belum Diisi",
        "Kategori Repair Kereta & Tray wajib mengisi jumlah unit minimal 1.",
      );
      return;
    }
  }

  if (!form.activity_description || !form.activity_description.trim()) {
    await alert.error(
      "Data Belum Lengkap",
      "Uraian aktivitas pekerjaan wajib diisi secara lengkap.",
    );
    return;
  }

  if (!form.start_time || !form.end_time) {
    await alert.error(
      "Data Belum Lengkap",
      "Waktu mulai dan waktu selesai wajib diisi.",
    );
    return;
  }

  // BUG-012: uraian maksimal 1000 karakter
  if (form.activity_description.length > 1000) {
    await alert.error(
      "Uraian Terlalu Panjang",
      "Uraian aktivitas maksimal 1000 karakter.",
    );
    return;
  }

  // BUG-003 & BUG-004: validasi urutan waktu & durasi 0 menit
  const selectedShift = masterStore.shifts.find((s) => s.id === form.shift_id);
  const timeError = validateLogbookTimeRange(
    form.start_time,
    form.end_time,
    selectedShift,
  );
  if (timeError) {
    await alert.error("Waktu Tidak Valid", timeError);
    return;
  }

  // F1.3: konfirmasi sebelum menyimpan/mengajukan logbook
  const isConfirmed = await alert.confirm(
    isSubmitForApproval
      ? "Ajukan Logbook untuk Persetujuan?"
      : "Simpan sebagai Draft?",
    isSubmitForApproval
      ? "Logbook harian akan dikirim ke Supervisor untuk diperiksa."
      : "Logbook akan disimpan sebagai draft dan dapat Anda lanjutkan nanti.",
    isSubmitForApproval ? "Ya, ajukan" : "Ya, simpan",
  );
  if (!isConfirmed) return;

  submitting.value = true;
  try {
    const selectedPlant = masterStore.plants.find(
      (p) => p.id === lockedPlantId.value,
    );
    const selectedShift = masterStore.shifts.find(
      (s) => s.id === form.shift_id,
    );
    const selectedMachine = masterStore.machines.find(
      (m) => m.id === form.machine_id,
    );
    const selectedSubMachine = masterStore.subMachines.find(
      (s) => s.id === form.sub_machine_id,
    );

    // FASE 5.2 / v6: hanya item valid (qty > 0) yang dikirim; kategori
    // non-mesin dilarang menyertakan sparepart (divalidasi backend).
    const sparepartItemsPayload = isNonMachineCategory.value
      ? []
      : toSparepartPayload(form.sparepart_items);

    const payload = {
      task_date: form.task_date,
      plant_id: lockedPlantId.value,
      plant_name: lockedPlantName.value || selectedPlant?.name || "Plant 1",
      group_id: lockedGroupId.value,
      group_name: lockedGroupName.value,
      shift_id: form.shift_id,
      shift_name: selectedShift?.name || `Shift ${form.shift_id}`,
      machine_id: isNonMachineCategory.value ? null : form.machine_id,
      machine_name: isNonMachineCategory.value
        ? "Non-Mesin"
        : selectedMachine?.name ||
          (hasUnmappedNote.value
            ? trimmedUnmappedNote.value
            : "Aset belum terdaftar"),
      sub_machine_id: isNonMachineCategory.value
        ? null
        : form.sub_machine_id || null,
      sub_machine_name: isNonMachineCategory.value
        ? "-"
        : selectedSubMachine?.name ||
          (hasUnmappedNote.value ? "Bagian belum terdaftar" : "-"),
      sparepart: isNonMachineCategory.value
        ? null
        : form.sparepart?.trim() || null,
      // FASE 5.2 / v6: sparepart katalog (array) → tersimpan di logbook_spareparts
      has_sparepart: sparepartItemsPayload.length > 0,
      sparepart_items: sparepartItemsPayload,
      // FASE 4.1a (revisi H-1): dropdown Kode Kerusakan disembunyikan dari UI.
      // MACHINE_TROUBLE → default 1, kategori lain → null (auto-generate kode
      // kerusakan akan ditangani backend).
      failure_code_id: selectedCategory.value === "MACHINE_TROUBLE" ? 1 : null,
      activity_description: form.activity_description.trim(),
      start_time: form.start_time,
      end_time: form.end_time,
      duration_minutes: calculatedMinutes.value,
      // ---- F3.1 / v6 Reliability fields (Bagian 4.1) ----
      activity_category: selectedCategory.value,
      quick_action_tag: quickActionTag.value,
      machine_end_status: form.machine_end_status,
      // Toggle downtime dihapus dari UI (revisi H-1) → selalu false / 0.
      is_downtime: false,
      downtime_minutes: 0,
      unit_repaired_qty: isKeretaCategory.value
        ? Number(form.unit_repaired_qty) || null
        : null,
      // D12: catatan aset belum terdaftar (dipromosikan Admin lewat Radar Aset)
      unmapped_asset_note: hasUnmappedNote.value
        ? trimmedUnmappedNote.value
        : null,
      is_submit: isSubmitForApproval,
      status: isSubmitForApproval ? LOG_STATUS.PENDING : LOG_STATUS.DRAFT,
    };

    const created = await logbookService.createLogbook(payload, authStore.user);

    const successTitle = isSubmitForApproval
      ? "Logbook Berhasil Diajukan!"
      : "Draft Logbook Disimpan!";
    const successMsg = isSubmitForApproval
      ? "Pengajuan logbook harian berhasil dikirim untuk pemeriksaan Supervisor."
      : "Logbook tersimpan sebagai draft dan dapat Anda lanjutkan nanti.";

    // Eksperimen Offline-First (PWA): jika tersimpan ke antrean offline,
    // tampilkan toast peringatan (kuning) — BUKAN toast sukses — agar teknisi
    // tahu data belum terkirim dan akan disinkronkan otomatis saat sinyal kembali.
    const isOfflineQueued =
      created &&
      (created.offline === true || created.status === OFFLINE_STATUS);
    if (isOfflineQueued) {
      showToast(
        "warning",
        "Koneksi Terputus",
        "Koneksi terputus. Logbook disimpan di perangkat Anda dan akan dikirim otomatis saat sinyal kembali.",
      );
      submitting.value = false;
      return;
    }

    // F1.3: gunakan SweetAlert2 untuk sukses kirim logbook
    if (isSubmitForApproval) {
      await alert.success(successTitle, successMsg);
    } else {
      showToast("success", successTitle, successMsg);
    }

    // Kosongkan waktu setelah logbook tersimpan (kirim maupun draft) agar
    // field kembali menampilkan placeholder "--.--" untuk input berikutnya.
    form.start_time = "";
    form.end_time = "";

    if (isSubmitForApproval) {
      // Bersihkan deskripsi dan sparepart agar siap input aktivitas berikutnya tanpa berpindah halaman
      form.activity_description = "";
      form.sparepart = "";
      form.sparepart_items = [];
      // F3.1: bersihkan chip & field adaptif untuk input berikutnya
      quickActionTag.value = "";
      form.machine_end_status = "NORMAL_RESOLVED";
      form.unit_repaired_qty = null;
      // D12: lepas penanda aset belum terdaftar untuk input berikutnya
      resetUnmappedAsset();
    }

    // Refresh daftar draft tersimpan
    await fetchDraftLogs();
  } catch (err) {
    await alert.error(
      "Gagal Menyimpan Logbook",
      err.message ||
        "Terjadi kesalahan saat menyimpan logbook. Silakan coba lagi.",
    );
  } finally {
    submitting.value = false;
  }
}

// ========================================================
// LOGIKA CARD PENYIMPANAN DRAFT LOGBOOK & SUBMIT BERSAMAAN
// ========================================================
const draftLogs = ref([]);
const loadingDrafts = ref(false);
const submittingAllDrafts = ref(false);

const totalDraftMinutes = computed(() => {
  return draftLogs.value.reduce((acc, d) => acc + (d.duration_minutes || 0), 0);
});

const totalDraftDurationFormatted = computed(() => {
  return formatDuration(totalDraftMinutes.value);
});

async function fetchDraftLogs() {
  if (!authStore.user?.id) return;

  // Offline: jangan panggil API yang pasti gagal (memunculkan error merah di
  // console). Biarkan form kosong — draft tetap bisa dimuat saat sinyal kembali.
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    loadingDrafts.value = false;
    return;
  }

  loadingDrafts.value = true;
  try {
    const list = await logbookService.getLogbooks({
      userId: authStore.user.id,
      status: LOG_STATUS.DRAFT,
    });
    draftLogs.value = list;
  } catch (err) {
    // Offline / jaringan putus → bukan error sesungguhnya, cukup warn agar
    // console tidak merah. Form sengaja dibiarkan kosong (memang offline).
    if (isNetworkError(err)) {
      console.warn(
        "Draft logbook tidak dimuat (offline) — akan dimuat saat sinyal kembali.",
        err,
      );
    } else {
      console.error("Gagal memuat draft logbook:", err);
    }
  } finally {
    loadingDrafts.value = false;
  }
}

async function handleSubmitAllDrafts() {
  if (draftLogs.value.length === 0) return;
  // F1.3: konfirmasi sebelum mengajukan seluruh draft
  const isConfirmed = await alert.confirm(
    "Ajukan Semua Draft Logbook?",
    `${draftLogs.value.length} draft logbook akan dikirim bersamaan untuk diperiksa Supervisor.`,
    "Ya, ajukan semua",
  );
  if (!isConfirmed) return;
  submittingAllDrafts.value = true;
  try {
    const count = draftLogs.value.length;
    await logbookService.submitAllDrafts(authStore.user.id, authStore.user);
    showToast(
      "success",
      "Semua Draft Berhasil Diajukan!",
      `${count} draft logbook telah dikirimkan secara bersamaan untuk pemeriksaan Supervisor.`,
    );
    await fetchDraftLogs();
  } catch (err) {
    showToast(
      "danger",
      "Gagal Mengajukan Draft",
      err.message || "Terjadi kesalahan saat mengajukan seluruh draft logbook.",
    );
  } finally {
    submittingAllDrafts.value = false;
  }
}

async function handleSubmitSingleDraft(draft) {
  // F1.3: konfirmasi sebelum mengajukan draft
  const isConfirmed = await alert.confirm(
    "Ajukan Draft Logbook?",
    `Draft untuk mesin ${draft.machine_name} akan dikirim untuk diperiksa Supervisor.`,
    "Ya, ajukan",
  );
  if (!isConfirmed) return;
  try {
    await logbookService.updateLogbook(
      draft.id,
      { ...draft, is_submit: true, status: LOG_STATUS.PENDING },
      authStore.user,
    );
    showToast(
      "success",
      "Draft Berhasil Diajukan!",
      `Logbook #${draft.id} (${draft.machine_name}) telah diajukan ke Supervisor.`,
    );
    await fetchDraftLogs();
  } catch (err) {
    showToast(
      "danger",
      "Gagal Mengajukan Draft",
      err.message || "Gagal mengajukan draft logbook.",
    );
  }
}

async function handleDeleteDraft(draft) {
  // F1.3: konfirmasi via SweetAlert2
  const ok = await alert.confirm(
    "Hapus Draft Logbook?",
    `Draft untuk mesin ${draft.machine_name} (${draft.task_date}) akan dihapus permanen.`,
    "Ya, hapus",
  );
  if (!ok) return;
  try {
    await logbookService.deleteLogbook(draft.id, authStore.user);
    showToast(
      "success",
      "Draft Dihapus",
      "Data draft logbook berhasil dihapus.",
    );
    await fetchDraftLogs();
  } catch (err) {
    await alert.error(
      "Gagal Menghapus Draft",
      err.message || "Gagal menghapus draft logbook.",
    );
  }
}

function handleLoadDraftToForm(draft) {
  // BUG-007 (LOG-09): isi hanya mesin, sub-mesin, sparepart, dan uraian.
  // Tanggal & jam TIDAK ditimpa agar tidak mengubah konteks input yang sedang aktif.
  // Fase 6: penanda pre-fill dilepas agar banner "Diisi otomatis" tidak menyesatkan
  // (mesin kini berasal dari draft yang dipilih teknisi, bukan dari tautan).
  clearQuickStart();
  form.machine_id = draft.machine_id;
  form.sub_machine_id = draft.sub_machine_id || null;
  // Kembalikan kategori agar field adaptif (mis. kondisi akhir mesin) tampil.
  if (draft.activity_category) {
    selectedCategory.value = draft.activity_category;
  }
  form.sparepart = draft.sparepart === "-" ? "" : draft.sparepart || "";
  // FASE 5.2 / v6: draft menyimpan item katalog → kembalikan ke picker (qty + cache nama part)
  form.sparepart_items = mapDraftSpareparts(draft.spareparts);
  form.activity_description = draft.activity_description || "";

  // D12: draft hasil laporan aset baru dikembalikan sebagai mode input manual
  if (draft.unmapped_asset_note) {
    isUnmappedAsset.value = true;
    unmappedAssetNote.value = draft.unmapped_asset_note;
  } else {
    resetUnmappedAsset();
  }

  // Fokuskan ke formulir utama di atas
  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast(
    "info",
    "Draft Dimuat ke Formulir",
    `Draft ${draft.machine_name} telah dimuat ke form utama. Tanggal & jam tidak diubah.`,
  );
}

onMounted(async () => {
  // F1.2 — Anti stale-data: master (mesin & sub-mesin) SELALU ditarik ulang dari
  // API setiap kali form dibuka. Tanpa `force`, cache SWR 5 menit membuat mesin /
  // sub-mesin yang baru ditambahkan Admin tidak muncul sampai hard refresh.
  // `force = true` juga menahan kontrol sampai fetch selesai, sehingga logika
  // pre-fill `quickStart.pendingMachineId` di bawah melihat daftar mesin terbaru.
  masterStore.invalidate();
  await masterStore.fetchAll(true);

  if (quickStart.pendingMachineId) {
    // Master mesin baru tersedia setelah fetch → terapkan pre-fill dari tautan.
    applyQuickStartQuery(
      {
        machine: quickStart.pendingMachineId,
        sub: quickStart.pendingSubMachineId,
      },
      { silent: false },
    );
    quickStart.pendingMachineId = null;
    quickStart.pendingSubMachineId = null;
  }

  // Mesin dari tautan QR tanpa `?sub=` juga ikut auto-select bila hanya 1 bagian.
  if (form.machine_id && !form.sub_machine_id && !quickStart.subMachine) {
    autoSelectSingleSubMachine();
  }
  // Sengaja TIDAK ada auto-select mesin pertama: form harus kosong ("Pilih Mesin")
  // bila teknisi membuka /logbook/input tanpa `?machine=` (mis. dari tautan QR).

  // Muat daftar draft logbook tersimpan milik teknisi
  await fetchDraftLogs();
});
</script>

<style scoped>
/* ==========================================================
   Field Waktu (type="time") — placeholder kustom "--.--"
   Chromium tidak merender atribut `placeholder` pada input time,
   sehingga teks "--.--" ditampilkan sebagai overlay saat kosong.
   ========================================================== */
.time-placeholder {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  padding-left: 0.75rem; /* selaras dengan px-3 input */
  pointer-events: none;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: #9ca3af; /* ink-3 */
  user-select: none;
}

/* Sembunyikan teks bawaan browser ("--:--") saat kolom masih kosong dan
   tidak fokus, agar tidak bertumpuk dengan placeholder "--.--". */
.time-field--empty:not(:focus)::-webkit-datetime-edit {
  color: transparent;
}

/* Saat fokus, sembunyikan placeholder kustom supaya segment editor
   bawaan browser (jam : menit) terlihat jelas untuk diisi. */
.time-field--empty:focus + .time-placeholder {
  display: none;
}

/* Fallback non-WebKit (mis. Firefox): tidak punya pseudo-element
   ::-webkit-datetime-edit, jadi warna teks input dibuat transparan
   selama kolom masih kosong & tidak fokus. */
@supports not selector(::-webkit-datetime-edit) {
  .time-field--empty:not(:focus) {
    color: transparent;
  }
}

/* Sembunyikan spinner/ikon picker bawaan agar visual kolom waktu bersih. */
.time-field::-webkit-calendar-picker-indicator {
  opacity: 0.55;
  cursor: pointer;
}
</style>
