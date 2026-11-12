# Progress Upgrade v6.0 (Reliability & Teknisi-Oriented)

> **Dokumen ini adalah "Memory Bank" proyek.** 
> Jika AI Agent (DeepSeek/Claude/dll) memulai sesi baru atau berganti model, berikan file ini agar Agent langsung memahami konteks apa yang sudah dikerjakan.
> **Spesifikasi Utama:** `AGENT_SPEC_Upgrade_Engineer_Logbook_Satoria_v6.md`

---

## 📌 Status Saat Ini

- **Branch Aktif:** `main` (Production)
- **Status:** ✅ **v6.0 SELESAI & DEPLOYED** (12 November 2026)
- **Fase Selesai:** Fase 0–7 (semua fase tuntas)
- **Status Test:** Backend **248/248** Lulus, Frontend **121/121** Lulus
- **Production:**
  - Frontend: https://satoria-log-aktivitas-me.vercel.app
  - Backend: https://logbook-pharma-backend.vercel.app
  - Database: TiDB Cloud (Production)
- **Next:** v6.1 (PWA/Offline-First & JWT Security) — lihat Backlog
- **⚠️ Handover Pending:** Project Vercel masih di akun developer sebelumnya (`lanaajs's projects`) — WAJIB dipindahkan ke akun perusahaan.

---

## ✅ FASE 0 — Recon & Baseline (SELESAI)
- Baseline test awal: 34 backend, 9 frontend lulus.
- `machines.plant_id` sudah ada (nullable). `machine.code` tidak ada.
- Masalah Node v24 lokal: script test diubah menjadi `node --test "test/**/*.test.js"`.
- Branch git dibuat: `feat/v6-reliability`.

## ✅ FASE 1 — Hotfix Black Box & Stabilitas (SELESAI)
- **13 Bug diperbaiki** (Scope approval SPV, validasi waktu, anti multi-submit, dll).
- **Stabilitas Jaringan:** `masterStore.js` menerapkan Stale-While-Revalidate (cache `localStorage`).
- **Standarisasi SweetAlert2:** Menghapus banner error inline (semua pakai pop-up).
- **P1:** Menghapus Leaderboard, Ranking, "Hari Tanpa Log". Ubah "Plant" jadi "Line".
- **Test:** Backend 42/42 Lulus, Frontend 14/14 Lulus.

## ✅ FASE 2 — Migrasi Database (SELESAI)
- **Schema Prisma:** 6 enum baru (`ActivityCategory`, `MachineEndStatus`, dll), 3 model baru (`FailureCode`, `Sparepart`, `LogbookSparepart`).
- **Controller:** `logbookController.js` validasi per kategori (tabel 4.3) & turunkan `maintenance_type` (tabel 4.2).
- **Seed:** 12 FailureCode (ISO 14224) dan 10 Sparepart awal.
- **Migrasi DB:** Menggunakan `npx prisma db push` (tanpa reset).
- **Test:** Backend 59/59 Lulus (17 test validasi kategori).

---

## 🚀 FASE 3 — Pengalaman Teknisi (SELESAI)

### ✅ F3.1 Form Input Adaptif (5 Tombol Besar) — [SELESAI]
- `InputLogbookView.vue` dirombak menjadi 5 tombol besar (🔧, 🛡️, 🛒, ⚡, 📋).
- Form adaptif (sembunyikan mesin jika NON_MACHINE, dll).

### ⏸️ F3.2 Quick-start & QR — [DITUNDA]
- Menunggu stiker fisik QR Code dicetak.

### ✅ F3.3 Papan Serah-Terima Shift (Handover Board) — [SELESAI]
- **Tujuan:** Menggantikan slot Leaderboard di Dashboard Teknisi.
- **Backend:** `handoverController.js` (Dedup log terbaru per mesin, filter `WAITING_SPAREPART` & `TEMPORARY_FIX`, sort criticality). Route: `GET /api/v1/handover`.
- **Frontend:** `HandoverBoard.vue` (Papan UI dengan filter & modal detail).
- **Bugfix Sampingan:**
  1. Fix token Service (pakai Pinia).
  2. Fix layout Grid (tinggi `StatisticsChartCard` disamakan jadi `min-h-[320px]`).
  3. Fix data "Teknisi di Line Ini" kosong (Buka *read-only* `GET /users` untuk Teknisi, filter ketat `plant_id` JWT di `userController.js`).

### ✅ F3.4 Riwayat Mesin / Buku Pintar (Machine History) — [SELESAI]
- **Backend:** `machineHistoryController.js` (Endpoint `GET /api/v1/machines/:id/history`). Optimasi query paralel, hitung statistik dari seluruh periode, filter WIB.
- **Frontend:** `MachineHistoryView.vue` (821 baris). UI lengkap: Header detail, Statistik downtime, Timeline pagination (Prev/Next), Sidebar Top Failure Codes & Spareparts. Anti-race condition (`requestSeq`).
- **Integrasi:** Card mesin di `TeknisiDashboard.vue` sekarang bisa diklik menuju `/mesin/:id`.

---

## ✅ FASE 4 — Pengalaman Supervisor (SELESAI)

### ✅ F4.1a Banner Repeat Failure — [SELESAI]
- **Backend:** `approvalController.js` diperkaya dengan deteksi `repeat_failure` (1 query tambahan, window 30 hari, filter `machine_id` + `failure_code_id` + status PENDING/APPROVED).
- **Frontend:** Banner peringatan di `ApprovalListView.vue` + link ke Buku Pintar Mesin.
- **Bugfix:** Perbaikan scope `<template v-for>` (Vue 3) dan sinkronisasi field `logs` vs `logbooks`.

### ✅ F4.1b Antrean Handover Supervisor — [SELESAI]
- **Backend:** Refactor `handoverController.js` menggunakan util baru `handoverScope.js`. Menutup celah RBAC di mana Supervisor bisa mengintip Line lain via URL.
- **Frontend:** Komponen baru `SupervisorHandoverQueue.vue` (tabel padat dengan indikator "Umur Terbuka") disisipkan di Dashboard Supervisor.

### 🚨 BUG-013 & BUG-014 (Dashboard SPV) — [SELESAI]
- **Backend:** Perbaikan query agregasi statistik di `overviewController.js` (memisahkan filter bulan, search, dan `groupBy` per Line). Menambahkan filter untuk membuang data `task_date` rusak.
- **Frontend:** Perbaikan chart kosong di `PlantCard.vue` menjadi *stub abu-abu*.
- **Test:** Menambahkan 12 test regresi baru (`overviewDashboard.test.js`, `overviewPlantStats.test.js`).

### ✅ F4.3 KPI Keandalan (MTTR/MTBF/Availability) — [SELESAI]
- **Backend:** Membuat pure function `reliabilityMetrics.js` (WIB-safe, anti NaN/Infinity) + 26 test. Diintegrasikan ke `machineHistoryController.js`.
- **Frontend:** Menambahkan 3 kartu KPI di `MachineHistoryView.vue`.
- **Catatan:** MTTR menggunakan `duration_minutes`, MTBF berbasis gap antar `BREAKDOWN`.

### ✅ F4.4 Pareto Bad Actor & Skill Matrix — [SELESAI]
- **Backend:** Controller baru `reliabilityAnalyticsController.js` + Service baru `reliabilityAnalyticsService.js`. Menggunakan `groupBy` Prisma murni (tanpa raw SQL) untuk menghitung Pareto Mesin, Pareto Kode Kerusakan, dan Skill Matrix. Dilengkapi 24 test.
- **Frontend:** Halaman baru `ReliabilityAnalyticsView.vue` + menu Sidebar.
- **Visualisasi:** Komponen baru `ParetoChart.vue` (Bar + Line Kumulatif) menggunakan Chart.js. Terdaftar secara lokal untuk optimasi bundle.
- **Aturan P1:** Skill Matrix diurutkan abjad (bukan ranking) untuk mencegah *HR-tool*. Di-rename menjadi **"Peta Keahlian & Kontak"** + tambah kolom email (klik → buka email client). Warna email `text-primary`, bukan `amber-*`/`blue-*`.

### ✅ TODO H1 Tombol "Catat Logbook" + Auto-Pre-fill Form — [SELESAI]
- **Latar:** README 11.5.13 menjanjikan tombol "Catat Logbook untuk mesin ini" di Buku Pintar Mesin, tetapi belum ada di Fase 3.4 → flow "scan QR → Buku Pintar → catat logbook" terputus.
- **Frontend (`MachineHistoryView.vue`):** tombol primary `SquarePen` "Catat Logbook untuk Mesin Ini" di grup aksi header (sebelah Kembali/periode/refresh). `router.push('/logbook/input?machine=<id>&task_type=MACHINE_TROUBLE')`. Tombol hanya tampil untuk Teknisi (rute `/logbook/input` = `roles: [TEKNISI]`) dan dinonaktifkan selama data mesin belum termuat.
- **Frontend (`InputLogbookView.vue`):** pre-fill `?machine=&sub=&task_type=` lewat watcher `route.query` yang sudah ada (termasuk `task_type` → `activity_category`), banner "Diisi otomatis dari Buku Pintar Mesin", toast informatif bila param diabaikan (mesin Line lain / ID tak dikenal), dan preselect mesin pertama **tidak** menimpa mesin dari tautan.
- **Util baru:** `utils/logbookQuickStart.js` (`parseMachineId`, `resolveQueryMachine`, `resolveQuerySubMachine`, `resolveQuickStartCategory`, `isTechnicianRole`, `buildMachineQuickStartRoute`) + `logbookQuickStart.test.js` (20 test).
- **Verifikasi:** Frontend 55/55 test lulus; `npm run build` sukses.

---

## ✅ FASE 5 — Admin (SELESAI)

### ✅ F5.1 Radar Aset Belum Terdaftar — [SELESAI]
- **Backend:** `adminUnmappedAssetController.js` — grouping logbook dengan `unmapped_asset_note`, `PROMOTE_UNMAPPED_ASSET` transaction (create machine + update logbooks + audit trail).
- **Frontend:** `UnmappedAssetsView.vue` + `/admin/unmapped-assets`. Modal "Jadikan Mesin Baru" dengan pre-fill dari baris.
- **Bug Fixed:** `B_GENERAL` → `B_ESSENTIAL` (typo enum AI Agent).
- **Bug Fixed (Sesi 4):** Auto-create sub-mesin default ("Bagian Utama") saat promote, agar teknisi tidak kena error "Sub-mesin wajib diisi".
- **Test:** 11 unit test (`adminUnmappedAsset.test.js`) + 13 test regresi sub-mesin.

### ✅ F5.2 Master Sparepart — [SELESAI]
- **Backend:** `masterController.js` + `case 'spareparts'` (GET/POST/PUT/DELETE). Soft delete (`is_active=false`). Pure function `buildSparepartPayload` + `buildSparepartWhere` + `mapSparepart`.
- **Frontend:** `MasterSparepartView.vue` + `/admin/spareparts`. Filter tab Tipe (MACHINE_PART / CONSUMABLE_WORKSHOP), search debounce, modal CRUD.
- **Test:** 17 unit test (`masterSparepart.test.js`).

### ✅ F5.3 QR Generator — [SELESAI]
- **Backend:** `qrcode` package (pure JS, no native binding). Endpoint `GET /machines/:id/qr` (PNG blob), `GET /machines/:id/qr-data` (JSON info), `GET /machines/qr-batch` (batch data, max 200).
- **Frontend:** `MachineQrModal.vue` (single QR), `MachineQRPrintView.vue` (batch print A4, 3 kolom), `machineQrService.js` (fetch as blob + cache Pinia), `qrPrint.js` (utility HTML print).
- **Deteksi Bug Kritis:** `<img src>` tidak bisa kirim `Authorization` header → fetch sebagai blob + `URL.createObjectURL()`.
- **Bug Fixed (Sesi 4):** Cache buster `?t=Date.now()` + TTL 5 menit + tombol "Muat Ulang QR". HTTP header `no-store`. Mengatasi QR localhost setelah deploy Vercel.
- **Test:** 13 unit test (`machineQr.test.js`) + 3 test cache buster.

### ✅ F5.4 Master Failure Code — [SELESAI, ditambahkan Sesi 4]
- **Latar:** Fitur wajib Fase 5 yang terlewat. UI dropdown Kode Kerusakan tidak ada di form teknisi, padahal backend sudah mendukung `failure_code_id` (ISO 14224).
- **Backend:** `masterController.js` + `case 'failure-codes'` (GET/POST/PUT/DELETE). Soft delete (`is_active=false`). Proteksi duplikat (case-insensitive, 409).
- **Frontend:** `MasterFailureCodeView.vue` + `/admin/failure-codes`. Filter kategori, search debounce, pagination. State terpisah: `failureCodes` (untuk dropdown teknisi) vs `adminFailureCodes` (untuk tabel admin).
- **Integrasi:** Dropdown di `InputLogbookView.vue` (kondisional `MACHINE_TROUBLE` & `PREVENTIVE_PM`, auto-disabled saat "Aset Belum Terdaftar"). Field `failure_code_id` masuk payload submit.
- **Test:** 5 unit test backend (`masterFailureCode.test.js`).

### 🚨 BUG-015 — TDZ di InputLogbookView (FASE 6) — [SELESAI]
- `filteredMachines` diakses di `applyQuickStartQuery` (line 920) sebelum dideklarasi (line 1100+). Ini penyebab halaman `/logbook/input?machine=1` **blank** (hanya sidebar).
- **Fix:** Reorder — pindahkan deklarasi `filteredMachines` ke atas `applyQuickStartQuery`.

---

## ✅ FASE 6 — Hardening (SELESAI)

### ✅ F6-H1 Catat Logbook dari Buku Pintar — [SELESAI]
- **Frontend:** `MachineHistoryView.vue` + tombol "Catat Logbook untuk Mesin Ini" (khusus Teknisi). `InputLogbookView.vue` handler `?machine=&sub=&task_type=` dengan state machine (`empty|invalid|applied|denied|unknown|pending`).
- **Helper:** `logbookQuickStart.js` + 20 unit test. Kontrak query terdokumentasi, bukan tersembunyi di view.
- **Bug Fixed:** TDZ (reorder) + `router.replace` untuk clear query string setelah prefill.

### ✅ F6-H2 RBAC Audit — [SELESAI]
- **Skrip:** `backend/scripts/rbac-audit.ps1` — 11 test otomatis.
- **Hasil:** **11/11 PASSED**. Zero kebocoran RBAC di endpoint baru Fase 5.
- **Kompatibel:** PowerShell 5.1 (Windows default) & 7+.

### ✅ F6-H3 Verifikasi `FRONTEND_URL` — [SELESAI]
- `backend/.env`: `FRONTEND_URL="http://localhost:5173"`
- `backend/.env.example`: dokumentasi + komentar untuk production domain.
- **Fase 7:** Sudah diubah ke domain Vercel production (`https://satoria-log-aktivitas-me.vercel.app`).

### ✅ F6-S2 UI Polish (3 file, 105 insertions) — [SELESAI]
- **InputLogbookView:** skeleton draft (loadingDrafts tidak dipakai di template sejak Fase 2.6), mobile flex-col, `clearQuickStart()` setelah "Muat ke Form".
- **ApprovalListView:** skeleton loading (blank white sebelumnya), empty state kontekstual (search vs status), toggle "Semua Log" visible di HP (sebelumnya `hidden sm:flex` = tidak bisa diakses mobile).
- **MachineHistoryView:** skeleton 7 kartu (4 stat + 3 KPI, sebelumnya `—`), `shrink-0` di label, judul kondisional error state.
- **Total:** 55/55 frontend test lulus, build 1.99s.

### ✅ F6-S3 Dokumentasi — [SELESAI]
- README, PROGRESS, CHANGELOG sudah di-update (9 November 2026).

### ✅ F6-S4 E2E Test Manual — [SELESAI]
- **4 skenario role PASS:**
  1. **Teknisi → Input → SPV Approve → Cek Buku Pintar** — PASS
  2. **Admin → Radar Aset → Promote → Cek Master** — PASS
  3. **Admin → QR Code → Cetak (single + batch)** — PASS
  4. **SPV → Approval → Repeat Failure → Pareto Chart** — PASS
- **15 Bug Kritis Ditemukan & Diperbaiki** (lihat sub-section di bawah).
- **Database Cleanup:** 44 akun dummy + mesin testing dihapus secara *surgical* (data asli aman). Script `detect-dummy-data.js` (read-only) & `cleanup-dummy-data.js` tersimpan untuk referensi.
- **Final Test:** Backend **248/248**, Frontend **121/121**, Build sukses, GitHub Actions **5/5 hijau**.

### 🐛 Bug Fixes Sesi 4 (15 Bug Kritis)

| # | Bug | Fix |
|---|---|---|
| 1 | "Disetujui oleh" kosong di modal riwayat | Ganti `viewLog.supervisor_name` → `viewLog.latest_approval?.supervisor_name` |
| 2 | Tabel riwayat kurang detail (Uraian tersembunyi) | Redesign **Card-Based List** — Uraian Aktivitas langsung tampil tanpa klik |
| 3 | Kalender tidak seimbang & log melenceng | `items-stretch` + dynamic `--planner-hour-h` via `getComputedStyle` (bukan hardcode) |
| 4 | Bottom Navbar Admin tidak lengkap | Restrukturisasi: Dashboard → Pengguna → Audit → Lainnya → Profil + `MoreMenuSheet` |
| 5 | Checkbox "Mesin belum terdaftar" hilang | Munculkan kembali + toggle `isUnmappedAsset` |
| 6 | Auto-select mesin membandel saat form dibuka | Hapus `form.machine_id = filteredMachines.value[0].id` dari `onMounted` |
| 7 | Sub-mesin kosong setelah promote aset | Backend auto-create "Bagian Utama" (nested `sub_machines.create`) |
| 8 | Cache SWR tidak ter-invalidate | `invalidate()` hapus `localStorage` + `fetchAll(true)` saat buka form |
| 9 | Master Failure Code terlewat | CRUD lengkap + endpoint backend `failure-codes` |
| 10 | Approval filter tab tidak sinkron | `approvalFilter.js` — rincian hanya tampilkan status sesuai tab + 20 test |
| 11 | Repeat Failure banner tidak muncul | Shared helper `repeatFailure.js` — dipanggil di `logbookController` (bukan hanya `approvalController`) |
| 12 | Aktivitas Teknisi tombol mati | Fix mismatch `camelCase`/`snake_case` + error handling (jangan silent) |
| 13 | Tim SPV = seluruh teknisi | Logika `isDirectTeam` OR (`\|\|`) → **AND** (`&&`) untuk `group_id` & `plant_id` |
| 14 | Pagination Aktivitas Teknisi | Client-side pagination (12 item/halaman) + reset saat ganti tab/filter |
| 15 | QR Code cache localhost setelah deploy | Cache buster `?t=Date.now()` + TTL 5 menit + tombol "Muat Ulang QR" |

---

## ✅ FASE 7 — Release & Deployment (SELESAI)

- **Status:** ✅ **Live di Production** (12 November 2026).
- **Branch:** `main` (sudah merged dari `feat/v6-reliability`, branch fitur dihapus).
- **Frontend Vercel:** https://satoria-log-aktivitas-me.vercel.app
- **Backend Vercel:** https://logbook-pharma-backend.vercel.app
- **Database:** TiDB Cloud (Production)
- **Environment Variables (Production):**
  - **Backend:** `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL=https://satoria-log-aktivitas-me.vercel.app`
  - **Frontend:** `VITE_API_BASE_URL=https://logbook-pharma-backend.vercel.app/api/v1`
- **CI/CD:** GitHub Actions (5/5 hijau) + Vercel Auto-Deploy (push ke `main` = auto rebuild).
- **Smoke Test Production:** ✅ Login Admin, ✅ Login Teknisi, ✅ Input logbook, ✅ QR Code scan (via Incognito), ✅ QR Code scan (normal tab setelah cache buster).
- **⚠️ Handover Pending:** Project Vercel masih di akun developer sebelumnya. Wajib dipindahkan ke akun perusahaan.

---

## 📦 BACKLOG v6.1 (Ditunda dari v6.0)

### 🔴 Prioritas Tinggi (User Feedback)
- **PWA Foundation** — Request SPV: aplikasi dimohon tidak bergantung internet. Solusi: manifest.json + service worker + "Add to Home Screen". Estimasi: 1-2 hari.
- **Offline-First Logbook** — IndexedDB + background sync API. Teknisi bisa input 100% offline, sync otomatis saat online. Estimasi: 2-3 hari.
- **Capacitor APK** (opsional) — Bungkus PWA jadi APK untuk distribusi via Play Store atau file manual. Estimasi: 2 hari.

### 🔴 Prioritas Tinggi — SECURITY (v6.1)
- **JWT Stale Claims**: Plant/role changes di DB tidak auto-refresh di JWT user.
  - Skenario: Admin ubah role SPV → Teknisi, user tetap punya akses SPV hingga 24 jam.
  - Mitigasi v6.0: Workaround logout-login (manual).
  - Fix v6.1: `GET /auth/me` refresh on app init + reduce JWT expiry to 2-4 jam.
  - Estimasi: 4-6 jam.

### 🟡 Prioritas Sedang
- **Dashboard Skeleton Proper** — TeknisiDashboard, SupervisorDashboard, AdminDashboard saat ini pakai teks "Memuat..." bukan skeleton. Ganti `animate-pulse`.
- **Token Konsistensi** — Beberapa file masih pakai `amber-*`/`blue-*` (bukan token `text-warning`/`text-primary`). Technical debt, low priority.
- **`hasLoadedOnce` Reset Logic** — Cek apakah reset saat ganti mesin di MachineHistoryView. Kalau tidak, layout shift saat navigasi.
- **F5.1 `ASSIGN_TO_EXISTING`** — Promote aset ke mesin existing (bukan cuma create baru). User story: teknisi salah ketik nama mesin, padahal mesinnya sudah ada.
- **Performance Audit Halaman Admin** — Halaman Admin (Dashboard, Master Mesin, Aktivitas Teknisi) terasa lambat karena beban data. Kandidat: pagination server-side, lazy load chart, atau cache strategi yang lebih cerdas.

### 🟡 Prioritas Sedang — Data Hygiene (v6.1)
- **Restore mesin untuk logbook orphan:**
  - 1 logbook asli (ID 3330007, user 60081/Slamet, "Monitoring line 04 area kelas c dan f") — mesin hilang sebelum cleanup, `machine_id = null`
  - 12 logbook testing (deskripsi "uji", user 60001/Fina) — orphan, kandidat hapus jika Fina konfirmasi testing
  - Aksi: restore mesin via Prisma Studio atau script kecil, lalu re-link
- **Backfill sub-mesin untuk mesin lama** — Mesin yang dibuat sebelum patch F5.1 belum punya sub-mesin default. Perlu script backfill.
- **Audit nama mesin tidak wajar** — Cek master machine untuk nama seperti jam ("8:57") atau typo lain.
- **Soft delete audit** — Pertimbangkan soft delete untuk master data (bukan hard delete) demi audit trail.

### 🟢 Prioritas Rendah
- **F3.2 QR Quick-Start** — Menunggu stiker fisik QR Code dicetak.
- **Performance Audit Endpoint `/reliability-analytics`** — Response time jika data tumbuh.
- **Notifikasi ke user saat data akun diubah Admin** — Supaya user tahu harus login ulang (minimal email "Data akun Anda berubah, silakan login ulang").

---

## 📊 Status Test Terakhir (12 November 2026 — Pre-Deploy)

- **Backend:** **248/248** lulus (`node --test "test/**/*.test.js"`)
- **Frontend:** **121/121** lulus (`vitest run`)
- **RBAC Audit:** **11/11 PASSED** (`scripts/rbac-audit.ps1`)
- **GitHub Actions CI:** **5/5 hijau** ✅
- **Build Production:** Sukses (Vercel, zero error)

---

## 📝 Aturan untuk AI Agent Selanjutnya

1. Baca file ini dan spesifikasi utama (`AGENT_SPEC_Upgrade...`).
2. Patuhi daftar file LOCKED di Bagian 7.1 spesifikasi.
3. Jangan ubah schema database lagi (Fase 2 sudah selesai).
4. Hemat token: Jangan baca seluruh repo. Fokus hanya pada file yang diminta.
5. **v6.0 sudah LIVE di `main`**. Jika mengerjakan v6.1, buat branch baru (`feat/v6.1-pwa`), jangan langsung commit ke `main`.
6. **Token desain:** Gunakan `text-ink`, `bg-surface`, `border-line`, dll. JANGAN pakai hex.
7. **Filosofi P1 (Bukan Alat HR):** Tidak ada leaderboard, ranking, atau metrik penilaian individu. Nama teknisi hanya sebagai "kontak siapa yang tahu".