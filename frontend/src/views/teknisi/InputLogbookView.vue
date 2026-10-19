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
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-line">
      <div>
        <div class="text-[12px] font-semibold text-primary uppercase tracking-wider">Formulir Logbook Teknisi</div>
        <h1 class="text-xl sm:text-2xl font-bold text-ink tracking-tight">Input Logbook Harian</h1>
        <p class="text-xs text-ink-2 mt-0.5">Pencatatan aktivitas pemeliharaan, servis, dan perbaikan mesin operasional Satoria.</p>
      </div>

      <RouterLink
        to="/logbook/riwayat"
        class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-line bg-surface text-ink text-xs font-medium hover:bg-muted transition shadow-sm self-start sm:self-auto"
      >
        <span>Lihat Riwayat & Kalender →</span>
      </RouterLink>
    </div>

    <!-- Banner Validasi Error jika ada -->
    <div
      v-if="formError"
      class="p-3.5 rounded-lg bg-status-rejected-bg border border-danger/30 text-status-rejected-fg text-xs flex items-center justify-between"
      role="alert"
    >
      <div class="flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0 text-danger" />
        <span class="font-medium">{{ formError }}</span>
      </div>
      <button type="button" class="text-danger hover:opacity-75 font-semibold text-xs" @click="formError = ''">
        ✕
      </button>
    </div>

    <form @submit.prevent="handleSubmit(true)" class="space-y-5">
      <!-- ======================================================== -->
      <!-- 1. BAGIAN PALING ATAS: TANGGAL MASUK (OTOMATIS SISTEM)   -->
      <!-- ======================================================== -->
      <div class="bg-surface rounded-lg p-4 border border-line shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Server class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <div class="text-[10px] uppercase font-semibold text-ink-3 tracking-wider flex items-center gap-1.5">
              <span>Tanggal Masuk (Sistem / Server)</span>
              <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-status-approved-bg text-status-approved-fg border border-success/20">
                Otomatis
              </span>
            </div>
            <div class="text-xs sm:text-sm font-bold text-ink truncate mt-0.5">
              {{ serverEntryTimestamp }}
            </div>
          </div>
        </div>

        <div class="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-line text-[11px] text-ink-2">
          <span>Pelaksana: </span>
          <strong class="text-ink font-semibold">{{ currentUserName }}</strong>
          <span class="text-ink-3 font-mono ml-1">({{ currentUserNik }})</span>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 2. BAGIAN PALING ATAS: KALENDER INPUT TANGGAL TUGAS      -->
      <!-- ======================================================== -->
      <div class="bg-surface rounded-lg p-4 sm:p-5 border border-line shadow-card space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-line gap-2">
          <div class="flex items-center gap-2">
            <CalendarIcon class="w-4 h-4 text-primary shrink-0" />
            <div>
              <h2 class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide">
                1. Tanggal Tugas / Pekerjaan
              </h2>
              <p class="text-[11px] text-ink-3">Klik salah satu tanggal pada kalender di bawah untuk memilih hari pelaksanaan tugas.</p>
            </div>
          </div>

          <!-- Lencana Tanggal Terpilih -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-ink-3">Terpilih:</span>
            <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-primary text-white shadow-sm font-mono">
              {{ formattedSelectedDate }}
            </span>
          </div>
        </div>

        <!-- Widget Kalender Visual Interaktif -->
        <div class="bg-muted/40 p-3.5 sm:p-4 rounded-lg border border-line select-none">
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
                      : 'bg-surface/50 text-ink-3 hover:bg-muted/60 opacity-60'
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
          <label for="native-task-date" class="text-xs text-ink-2 font-medium shrink-0">
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
      <div class="bg-surface rounded-lg p-4 sm:p-5 border border-line shadow-card space-y-4">
        <div class="flex items-center gap-2 pb-3 border-b border-line">
          <Clock class="w-4 h-4 text-primary shrink-0" />
          <h2 class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide">
            2. Shift, Group & Lokasi Plant
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Inputan Shift Kerja -->
          <div>
            <label for="form-shift" class="block text-xs font-semibold text-ink mb-1.5">
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
            <p class="text-[10px] text-ink-3 mt-1">Pilih jadwal jam kerja operasional shift.</p>
          </div>

          <!-- Inputan Group Kerja (DILOCK) -->
          <div>
            <label for="form-group" class="block text-xs font-semibold text-ink mb-1.5 flex items-center justify-between">
              <span>Group / Departemen</span>
              <span class="text-[10px] font-semibold text-ink-3 flex items-center gap-1">
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
              <Lock class="w-4 h-4 text-ink-3 absolute right-2.5 top-3 pointer-events-none" />
            </div>
            <p class="text-[10px] text-ink-3 mt-1">*Ditetapkan oleh Admin pada akun Anda</p>
          </div>

          <!-- Inputan Plant (DILOCK) -->
          <div>
            <label for="form-plant" class="block text-xs font-semibold text-ink mb-1.5 flex items-center justify-between">
              <span>Lokasi Fasilitas (Plant)</span>
              <span class="text-[10px] font-semibold text-ink-3 flex items-center gap-1">
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
              <Lock class="w-4 h-4 text-ink-3 absolute right-2.5 top-3 pointer-events-none" />
            </div>
            <p class="text-[10px] text-ink-3 mt-1">*Ditetapkan oleh Admin pada akun Anda</p>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 4. INPUTAN AREA PEKERJAAN (MESIN, SUB-MESIN, SPESIFIKASI)-->
      <!-- ======================================================== -->
      <div class="bg-surface rounded-lg p-4 sm:p-5 border border-line shadow-card space-y-4">
        <div class="flex items-center gap-2 pb-3 border-b border-line">
          <Cpu class="w-4 h-4 text-primary shrink-0" />
          <h2 class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide">
            3. Area Pekerjaan & Komponen Mesin
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Inputan Mesin (Dropdown) -->
          <div>
            <label for="form-machine" class="block text-xs font-semibold text-ink mb-1.5">
              Peralatan Mesin <span class="text-danger">*</span>
            </label>
            <select
              id="form-machine"
              v-model="form.machine_id"
              required
              class="w-full h-10 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer"
              @change="handleMachineChange"
            >
              <option :value="null" disabled>-- Pilih Mesin --</option>
              <option v-for="m in filteredMachines" :key="m.id" :value="m.id">
                {{ m.name }} ({{ m.code }})
              </option>
            </select>
            <p class="text-[10px] text-ink-3 mt-1">Daftar mesin aktif pada {{ lockedPlantName }}.</p>
          </div>

          <!-- Inputan Sub-Mesin (Dropdown) -->
          <div>
            <label for="form-submachine" class="block text-xs font-semibold text-ink mb-1.5">
              Bagian Mesin (Sub-Mesin)
            </label>
            <select
              id="form-submachine"
              v-model="form.sub_machine_id"
              :disabled="!form.machine_id"
              class="w-full h-10 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option :value="null">
                {{ !form.machine_id ? 'Pilih mesin terlebih dahulu' : '-- Tanpa Bagian Spesifik / Mesin Utama --' }}
              </option>
              <option v-for="sub in filteredSubMachines" :key="sub.id" :value="sub.id">
                {{ sub.name }}
              </option>
            </select>
            <p class="text-[10px] text-ink-3 mt-1">Bagian komponen mesin yang mengalami kendala/perawatan.</p>
          </div>
        </div>

        <!-- Inputan Spesifikasi Part (Text) -->
        <div>
          <label for="form-sparepart" class="block text-xs font-semibold text-ink mb-1.5">
            Spesifikasi Part / Suku Cadang Terpasang
          </label>
          <input
            id="form-sparepart"
            v-model="form.sparepart"
            type="text"
            placeholder="Contoh: Bearing SKF 6204-2Z, Seal O-Ring Silikon Ø25mm, Selang Pneumatik 6mm..."
            class="w-full h-10 px-3 rounded-md border border-line bg-surface text-xs font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
          />
          <p class="text-[10px] text-ink-3 mt-1">Tuliskan spesifikasi part, ukuran, nomor seri, atau material jika ada penggantian.</p>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 5. INPUT DETAIL AKTIVITAS (TEXT / TEXTAREA)              -->
      <!-- ======================================================== -->
      <div class="bg-surface rounded-lg p-4 sm:p-5 border border-line shadow-card space-y-3">
        <div class="flex items-center gap-2 pb-3 border-b border-line">
          <FileText class="w-4 h-4 text-primary shrink-0" />
          <h2 class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide">
            4. Detail Aktivitas & Uraian Pekerjaan
          </h2>
        </div>

        <div>
          <label for="form-activity" class="block text-xs font-semibold text-ink mb-1.5">
            Uraian Pekerjaan yang Dilaksanakan <span class="text-danger">*</span>
          </label>
          <textarea
            id="form-activity"
            v-model="form.activity_description"
            rows="4"
            required
            placeholder="Jelaskan secara rinci tindakan pekerjaan yang dilakukan, temuan masalah atau kendala teknis di lapangan, tindakan perbaikan, serta kondisi operasional mesin setelah penanganan..."
            class="w-full p-3 rounded-md border border-line bg-surface text-xs font-medium text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition leading-relaxed"
          />
          <div class="flex items-center justify-between text-[10px] text-ink-3 mt-1">
            <span>Pastikan uraian ditulis secara spesifik untuk memudahkan validasi Supervisor.</span>
            <span>{{ form.activity_description.length }} karakter</span>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 6. BAGIAN PALING BAWAH: WAKTU MULAI, SELESAI, DURASI     -->
      <!-- ======================================================== -->
      <div class="bg-surface rounded-lg p-4 sm:p-5 border border-line shadow-card space-y-4">
        <div class="flex items-center gap-2 pb-3 border-b border-line">
          <Timer class="w-4 h-4 text-primary shrink-0" />
          <h2 class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide">
            5. Waktu Mulai, Waktu Selesai & Durasi Pekerjaan
          </h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <!-- Waktu Mulai -->
          <div>
            <label for="form-start-time" class="block text-xs font-semibold text-ink mb-1.5">
              Waktu Mulai <span class="text-danger">*</span>
            </label>
            <input
              id="form-start-time"
              v-model="form.start_time"
              type="time"
              required
              class="w-full h-10 px-3 rounded-md border border-line bg-surface text-sm font-semibold font-mono text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
            <p class="text-[10px] text-ink-3 mt-1">Format 24 jam (HH:mm)</p>
          </div>

          <!-- Waktu Selesai -->
          <div>
            <label for="form-end-time" class="block text-xs font-semibold text-ink mb-1.5">
              Waktu Selesai <span class="text-danger">*</span>
            </label>
            <input
              id="form-end-time"
              v-model="form.end_time"
              type="time"
              required
              class="w-full h-10 px-3 rounded-md border border-line bg-surface text-sm font-semibold font-mono text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
            <p class="text-[10px] text-ink-3 mt-1">Format 24 jam (HH:mm)</p>
          </div>

          <!-- Durasi Terhitung Otomatis -->
          <div>
            <label class="block text-xs font-semibold text-ink mb-1.5 flex items-center justify-between">
              <span>Total Durasi</span>
              <span class="text-[10px] font-semibold text-success flex items-center gap-1">
                Kalkulasi Otomatis
              </span>
            </label>
            <div class="h-10 px-3 rounded-md border border-line bg-muted/60 flex items-center justify-between">
              <span class="text-xs sm:text-sm font-bold font-mono text-primary">
                {{ durationFormatted }}
              </span>
              <span v-if="isCrossMidnight" class="text-[9px] font-semibold text-warning bg-amber-50 px-1.5 py-0.5 rounded border border-warning/20">
                Lintas Tengah Malam (+24j)
              </span>
            </div>
            <p class="text-[10px] text-ink-3 mt-1">{{ calculatedMinutes }} menit total pengerjaan.</p>
          </div>
        </div>

        <!-- Tombol Aksi Formulir (Draft, Submit, Reset) -->
        <div class="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            class="w-full sm:w-auto h-9 px-4 rounded-md border border-line bg-surface hover:bg-muted text-ink text-xs font-medium transition"
            @click="handleResetForm"
          >
            Bersihkan Formulir
          </button>

          <div class="flex items-center gap-2.5 w-full sm:w-auto">
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
              <span>{{ submitting ? 'Mengirim...' : 'Kirim Logbook (Ajukan Approval)' }}</span>
            </button>
          </div>
        </div>
      </div>
    </form>

    <!-- ======================================================== -->
    <!-- 7. PENYIMPANAN DATA DRAFT LOGBOOK & KIRIM SEMUA DRAFT    -->
    <!-- ======================================================== -->
    <div class="bg-surface rounded-lg border border-line shadow-card overflow-hidden">
      <!-- Header Card Draft -->
      <div class="p-4 sm:p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
            <FolderArchive class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide">
                Penyimpanan Data Draft Logbook
              </h2>
              <span
                :class="[
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                  draftLogs.length > 0
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-muted text-ink-3 border-line'
                ]"
              >
                {{ draftLogs.length }} Draft Tersimpan
              </span>
            </div>
            <p class="text-xs text-ink-2 mt-0.5">
              Kumpulan aktivitas pekerjaan yang Anda simpan sebagai draft. Anda dapat menyunting, menghapus, atau mengajukan semuanya sekaligus.
            </p>
          </div>
        </div>

        <!-- Tombol Aksi Header: Kirim Semua Draft -->
        <button
          type="button"
          :disabled="draftLogs.length === 0 || submittingAllDrafts"
          class="h-9 px-4 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold transition shadow-card flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 self-start sm:self-auto"
          @click="handleSubmitAllDrafts"
        >
          <CheckCheck v-if="!submittingAllDrafts" class="w-4 h-4" />
          <svg v-else class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>{{ submittingAllDrafts ? 'Mengajukan Semua...' : 'Kirim Semua Draft untuk Approval' }}</span>
        </button>
      </div>

      <!-- Body: Empty State jika tidak ada draft -->
      <div v-if="draftLogs.length === 0" class="p-8 sm:p-12 text-center">
        <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-ink-3">
          <Inbox class="w-6 h-6" />
        </div>
        <h3 class="text-xs sm:text-sm font-semibold text-ink">Belum Ada Draft Tersimpan</h3>
        <p class="text-xs text-ink-3 max-w-md mx-auto mt-1 leading-relaxed">
          Data logbook yang Anda simpan dengan tombol <span class="font-semibold text-ink">"Simpan sebagai Draft"</span> pada formulir di atas akan ditampung di sini sebelum diajukan secara bersamaan.
        </p>
      </div>

      <!-- Body: Daftar Draft jika ada -->
      <div v-else class="divide-y divide-line">
        <!-- Sub-toolbar ringkasan -->
        <div class="px-4 py-2.5 bg-muted/40 text-[11px] text-ink-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line">
          <div class="flex items-center gap-2">
            <span class="font-medium">Total Akumulasi Durasi Draft:</span>
            <span class="font-bold text-primary font-mono">{{ totalDraftDurationFormatted }}</span>
            <span>({{ totalDraftMinutes }} menit)</span>
          </div>
          <span class="text-ink-3 text-[10px]">Periksa kembali sebelum mengirim seluruh pengajuan ke Supervisor</span>
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
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-ink-2">
                  {{ draft.shift_name }}
                </span>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary-soft text-primary">
                  {{ draft.plant_name }}
                </span>
                <span class="text-[11px] text-ink-3 font-mono">
                  {{ draft.start_time }} - {{ draft.end_time }} ({{ formatDuration(draft.duration_minutes) }})
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-2 text-xs">
                <span class="font-semibold text-ink flex items-center gap-1">
                  <Cpu class="w-3.5 h-3.5 text-primary" />
                  {{ draft.machine_name }}
                </span>
                <span v-if="draft.sub_machine_name && draft.sub_machine_name !== '-'" class="text-ink-2">
                  • {{ draft.sub_machine_name }}
                </span>
                <span v-if="draft.sparepart && draft.sparepart !== '-'" class="text-ink-3 text-[11px]">
                  (Part: {{ draft.sparepart }})
                </span>
              </div>

              <p class="text-xs text-ink-2 line-clamp-2 leading-relaxed bg-muted/40 p-2.5 rounded border border-line/60">
                {{ draft.activity_description }}
              </p>
            </div>

            <!-- Aksi per Item Draft -->
            <div class="flex items-center gap-2 shrink-0 self-end lg:self-center">
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
        <div class="p-4 bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line">
          <div class="text-xs text-ink-2">
            Ada <span class="font-bold text-ink">{{ draftLogs.length }} draft</span> siap untuk dikirimkan ke Supervisor.
          </div>

          <button
            type="button"
            :disabled="draftLogs.length === 0 || submittingAllDrafts"
            class="w-full sm:w-auto h-9 px-5 rounded-md bg-primary hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold transition shadow-card flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            @click="handleSubmitAllDrafts"
          >
            <CheckCheck v-if="!submittingAllDrafts" class="w-4 h-4" />
            <svg v-else class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>{{ submittingAllDrafts ? 'Mengajukan Semua...' : `Kirim Semua Draft (${draftLogs.length}) untuk Approval` }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useMasterStore } from '../../stores/master'
import { logbookService } from '../../services/logbookService'
import { LOG_STATUS } from '../../constants/logStatus'
import { calculateDurationMinutes, formatDuration } from '../../utils/duration'
import { toLocalDateString, parseLocalDate } from '../../utils/dateKeys'

import {
  Server,
  Calendar as CalendarIcon,
  Clock,
  Cpu,
  FileText,
  Timer,
  Lock,
  Send,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FolderArchive,
  CheckCheck,
  Inbox,
  Trash2,
  Edit3
} from 'lucide-vue-next'
import Toast from '../../components/common/Toast.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const masterStore = useMasterStore()

const submitting = ref(false)
const formError = ref('')

const toast = reactive({
  show: false,
  type: 'success',
  title: '',
  message: ''
})

function showToast(type, title, message) {
  toast.type = type
  toast.title = title
  toast.message = message
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, 4000)
}

// 1. Tanggal Masuk Otomatis Server
const now = new Date()
const serverEntryTimestamp = computed(() => {
  const d = new Date()
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const dayName = days[d.getDay()]
  const dateNum = d.getDate()
  const monthName = months[d.getMonth()]
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')

  return `${dayName}, ${dateNum} ${monthName} ${year} • ${hours}:${mins} WIB`
})

// Current User Info
const currentUserName = computed(() => authStore.user?.full_name || 'Teknisi Satoria')
const currentUserNik = computed(() => authStore.user?.nik || 'TKN-001')

// Group & Plant yang DILOCK
const lockedPlantId = computed(() => authStore.user?.plant_id || 1)
const lockedGroupId = computed(() => authStore.user?.group_id || 1)

const lockedPlantName = computed(() => {
  if (authStore.user?.plant_name) return authStore.user.plant_name
  const p = masterStore.plants.find(item => item.id === lockedPlantId.value)
  return p ? p.name : 'Plant 1 - Satoria Pharma Pasuruan'
})

const lockedGroupName = computed(() => {
  if (authStore.user?.group_name) return authStore.user.group_name
  const g = masterStore.workGroups.find(item => item.id === lockedGroupId.value)
  return g ? g.name : 'Maintenance & Utility'
})

// State Form Data
const todayDateStr = toLocalDateString(new Date())

const form = reactive({
  task_date: route.query.date || todayDateStr,
  plant_id: lockedPlantId.value,
  group_id: lockedGroupId.value,
  shift_id: 1,
  machine_id: null,
  sub_machine_id: null,
  sparepart: '',
  activity_description: '',
  start_time: route.query.time || '08:00',
  end_time: '10:00'
})

// State Kalender Picker Tanggal Tugas
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

const dayNamesShort = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const currentMonthName = computed(() => MONTH_NAMES_ID[viewMonth.value])

const formattedSelectedDate = computed(() => {
  if (!form.task_date) return '-'
  const d = parseLocalDate(form.task_date)
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return `${days[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`
})

// Kalender Cells Matrix (7 kolom)
const calendarCells = computed(() => {
  const year = viewYear.value
  const month = viewMonth.value

  const firstDayObj = new Date(year, month, 1)
  let firstDayIndex = firstDayObj.getDay()
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1 // 0 = Senin, 6 = Minggu

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells = []

  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const d = new Date(year, month - 1, day)
    cells.push({
      dateStr: toLocalDateString(d),
      dayNumber: day,
      isCurrentMonth: false,
      isToday: toLocalDateString(d) === todayDateStr
    })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d)
    const dateStr = toLocalDateString(dateObj)
    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayDateStr
    })
  }

  // Next month padding (lengkapi sampai kelipatan 7)
  const total = cells.length
  const remainder = total % 7
  if (remainder > 0) {
    const nextDays = 7 - remainder
    for (let d = 1; d <= nextDays; d++) {
      const dateObj = new Date(year, month + 1, d)
      cells.push({
        dateStr: toLocalDateString(dateObj),
        dayNumber: d,
        isCurrentMonth: false,
        isToday: toLocalDateString(dateObj) === todayDateStr
      })
    }
  }

  return cells
})

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

function selectDate(dateStr) {
  form.task_date = dateStr
  const d = parseLocalDate(dateStr)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}

function pickToday() {
  selectDate(todayDateStr)
}

function pickYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  selectDate(toLocalDateString(d))
}

// Master Machines & Sub Machines Terfilter
const filteredMachines = computed(() => {
  return masterStore.machines.filter(m => m.plant_id === lockedPlantId.value)
})

const filteredSubMachines = computed(() => {
  if (!form.machine_id) return []
  return masterStore.subMachines.filter(sub => sub.machine_id === form.machine_id)
})

function handleMachineChange() {
  form.sub_machine_id = null
}

function handleShiftChange() {
  const s = masterStore.shifts.find(item => item.id === form.shift_id)
  if (s) {
    // Saran otomatis waktu jika masih default
    if (form.start_time === '08:00' && form.end_time === '10:00') {
      form.start_time = s.start_time
      form.end_time = s.end_time
    }
  }
}

// Perhitungan Durasi
const calculatedMinutes = computed(() => {
  return calculateDurationMinutes(form.start_time, form.end_time)
})

const durationFormatted = computed(() => {
  return formatDuration(calculatedMinutes.value)
})

const isCrossMidnight = computed(() => {
  if (!form.start_time || !form.end_time) return false
  const [sH, sM] = form.start_time.split(':').map(Number)
  const [eH, eM] = form.end_time.split(':').map(Number)
  return (eH * 60 + eM) < (sH * 60 + sM)
})

function handleResetForm() {
  form.task_date = todayDateStr
  form.shift_id = 1
  form.machine_id = null
  form.sub_machine_id = null
  form.sparepart = ''
  form.activity_description = ''
  form.start_time = '08:00'
  form.end_time = '10:00'
  formError.value = ''
}

// Submit Form
async function handleSubmit(isSubmitForApproval) {
  formError.value = ''

  if (!form.task_date) {
    formError.value = 'Silakan pilih tanggal tugas pada kalender.'
    return
  }

  if (!form.machine_id) {
    formError.value = 'Silakan pilih peralatan mesin yang ditangani.'
    return
  }

  if (!form.activity_description || !form.activity_description.trim()) {
    formError.value = 'Uraian aktivitas pekerjaan wajib diisi secara lengkap.'
    return
  }

  if (!form.start_time || !form.end_time) {
    formError.value = 'Waktu mulai dan waktu selesai wajib diisi.'
    return
  }

  submitting.value = true
  try {
    const selectedPlant = masterStore.plants.find(p => p.id === lockedPlantId.value)
    const selectedShift = masterStore.shifts.find(s => s.id === form.shift_id)
    const selectedMachine = masterStore.machines.find(m => m.id === form.machine_id)
    const selectedSubMachine = masterStore.subMachines.find(s => s.id === form.sub_machine_id)

    const payload = {
      task_date: form.task_date,
      plant_id: lockedPlantId.value,
      plant_name: lockedPlantName.value || selectedPlant?.name || 'Plant 1',
      group_id: lockedGroupId.value,
      group_name: lockedGroupName.value,
      shift_id: form.shift_id,
      shift_name: selectedShift?.name || `Shift ${form.shift_id}`,
      machine_id: form.machine_id,
      machine_name: selectedMachine?.name || 'Mesin Pabrik',
      sub_machine_id: form.sub_machine_id || null,
      sub_machine_name: selectedSubMachine?.name || '-',
      sparepart: form.sparepart?.trim() || null,
      activity_description: form.activity_description.trim(),
      start_time: form.start_time,
      end_time: form.end_time,
      duration_minutes: calculatedMinutes.value,
      is_submit: isSubmitForApproval,
      status: isSubmitForApproval ? LOG_STATUS.PENDING : LOG_STATUS.DRAFT
    }

    await logbookService.createLogbook(payload, authStore.user)

    const successTitle = isSubmitForApproval
      ? 'Logbook Berhasil Diajukan!'
      : 'Draft Logbook Disimpan!'
    const successMsg = isSubmitForApproval
      ? 'Pengajuan logbook harian berhasil dikirim untuk pemeriksaan Supervisor.'
      : 'Logbook tersimpan sebagai draft dan dapat Anda lanjutkan nanti.'

    showToast('success', successTitle, successMsg)

    if (isSubmitForApproval) {
      // Bersihkan deskripsi dan sparepart agar siap input aktivitas berikutnya tanpa berpindah halaman
      form.activity_description = ''
      form.sparepart = ''
    }

    // Refresh daftar draft tersimpan
    await fetchDraftLogs()
  } catch (err) {
    formError.value = err.message || 'Terjadi kesalahan saat menyimpan logbook. Silakan coba lagi.'
  } finally {
    submitting.value = false
  }
}

// ========================================================
// LOGIKA CARD PENYIMPANAN DRAFT LOGBOOK & SUBMIT BERSAMAAN
// ========================================================
const draftLogs = ref([])
const loadingDrafts = ref(false)
const submittingAllDrafts = ref(false)

const totalDraftMinutes = computed(() => {
  return draftLogs.value.reduce((acc, d) => acc + (d.duration_minutes || 0), 0)
})

const totalDraftDurationFormatted = computed(() => {
  return formatDuration(totalDraftMinutes.value)
})

async function fetchDraftLogs() {
  if (!authStore.user?.id) return
  loadingDrafts.value = true
  try {
    const list = await logbookService.getLogbooks({
      userId: authStore.user.id,
      status: LOG_STATUS.DRAFT
    })
    draftLogs.value = list
  } catch (err) {
    console.error('Gagal memuat draft logbook:', err)
  } finally {
    loadingDrafts.value = false
  }
}

async function handleSubmitAllDrafts() {
  if (draftLogs.value.length === 0) return
  submittingAllDrafts.value = true
  try {
    const count = draftLogs.value.length
    await logbookService.submitAllDrafts(authStore.user.id, authStore.user)
    showToast('success', 'Semua Draft Berhasil Diajukan!', `${count} draft logbook telah dikirimkan secara bersamaan untuk pemeriksaan Supervisor.`)
    await fetchDraftLogs()
  } catch (err) {
    showToast('danger', 'Gagal Mengajukan Draft', err.message || 'Terjadi kesalahan saat mengajukan seluruh draft logbook.')
  } finally {
    submittingAllDrafts.value = false
  }
}

async function handleSubmitSingleDraft(draft) {
  try {
    await logbookService.updateLogbook(draft.id, { ...draft, is_submit: true, status: LOG_STATUS.PENDING }, authStore.user)
    showToast('success', 'Draft Berhasil Diajukan!', `Logbook #${draft.id} (${draft.machine_name}) telah diajukan ke Supervisor.`)
    await fetchDraftLogs()
  } catch (err) {
    showToast('danger', 'Gagal Mengajukan Draft', err.message || 'Gagal mengajukan draft logbook.')
  }
}

async function handleDeleteDraft(draft) {
  if (!confirm(`Hapus draft logbook untuk mesin ${draft.machine_name} (${draft.task_date})?`)) return
  try {
    await logbookService.deleteLogbook(draft.id, authStore.user)
    showToast('success', 'Draft Dihapus', 'Data draft logbook berhasil dihapus.')
    await fetchDraftLogs()
  } catch (err) {
    showToast('danger', 'Gagal Menghapus Draft', err.message || 'Gagal menghapus draft logbook.')
  }
}

function handleLoadDraftToForm(draft) {
  form.task_date = draft.task_date
  form.shift_id = draft.shift_id
  form.machine_id = draft.machine_id
  form.sub_machine_id = draft.sub_machine_id || null
  form.sparepart = draft.sparepart === '-' ? '' : (draft.sparepart || '')
  form.activity_description = draft.activity_description || ''
  form.start_time = draft.start_time || '08:00'
  form.end_time = draft.end_time || '10:00'

  // Sinkronisasi tahun dan bulan kalender jika diperlukan
  try {
    const d = parseLocalDate(draft.task_date)
    viewYear.value = d.getFullYear()
    viewMonth.value = d.getMonth()
  } catch {
    // fallback
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
  showToast('info', 'Draft Dimuat ke Formulir', `Draft ${draft.machine_name} (${draft.task_date}) telah dimuat ke form utama di atas.`)
}

onMounted(async () => {
  if (masterStore.plants.length === 0 || masterStore.machines.length === 0) {
    await masterStore.fetchAll()
  }

  // Preselect first machine if available
  if (filteredMachines.value.length > 0 && !form.machine_id) {
    form.machine_id = filteredMachines.value[0].id
  }

  // Muat daftar draft logbook tersimpan milik teknisi
  await fetchDraftLogs()
})
</script>
