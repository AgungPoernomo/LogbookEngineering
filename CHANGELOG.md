# CHANGELOG — Engineer Logbook Satoria

Semua perubahan penting pada proyek ini didokumentasikan di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [6.0.0] — 12 November 2026

### Filosofi
Upgrade besar dari v4.8 (**Supervisor-Oriented**) menjadi **Teknisi-Oriented & Reliability**. Prinsip "Give Value to Get Data" + **P1: Bukan Alat HR** (no Leaderboard, no Ranking, no "Hari Tanpa Log").

### Added

**Teknisi:**
- Form Input Cepat 5 Tombol Besar (adaptif per kategori aktivitas).
- Checkbox **"Mesin belum terdaftar"** (`isUnmappedAsset`) — laporkan aset baru tanpa harus ada di master (integrasi dengan Radar Aset Admin).
- **Dropdown Kode Kerusakan (Failure Code)** — ISO 14224, kondisional untuk `MACHINE_TROUBLE` & `PREVENTIVE_PM`, auto-disabled saat "Aset Belum Terdaftar".
- Papan Serah-Terima Shift (Handover Board) — pengganti Leaderboard.
- Buku Pintar Mesin (`/mesin/:id`) — timeline, MTTR/MTBF/Availability, top failure codes, top spareparts.
- Tombol "Catat Logbook untuk Mesin Ini" dari Buku Pintar (auto-prefill).
- Search bar filter mesin di dashboard.
- **Riwayat Logbook — Card-Based List** (menggantikan tabel kaku): Uraian Aktivitas langsung tampil tanpa klik detail.
- **Modal detail riwayat** — menampilkan nama Supervisor yang meng-approve ("Disetujui oleh [nama] pada [tanggal]").

**Supervisor:**
- Banner Repeat Failure di halaman approval (deteksi 30 hari + `failure_code_id` sama).
- Antrean Handover SPV (`SupervisorHandoverQueue.vue`).
- Dashboard SPV yang terisi (bug fix BUG-013/014).
- Pareto Chart Bad Actor + **"Peta Keahlian & Kontak"** (`/supervisor/reliability`) — sebelumnya "Skill Matrix".
- KPI MTTR/MTBF/Availability.
- **Peta Keahlian & Kontak** — diurutkan **abjad** (bukan ranking, P1 compliance), ditambah kolom **Email** (klik → buka email client), tooltip badge HIGH/MEDIUM/LOW berisi penjelasan "kualitas sampel, bukan skor".
- **Filter tab Approval sinkron** — rincian teknisi hanya menampilkan logbook sesuai tab aktif (PENDING/APPROVED/ALL).
- **Aktivitas Teknisi** (`/supervisor/teknisi`) — pagination client-side, filter plant, modal detail.

**Admin:**
- Radar Aset Belum Terdaftar (`/admin/unmapped-assets`) + auto-promote dengan **auto-create sub-mesin default** ("Bagian Utama") — mencegah error "Sub-mesin wajib diisi" saat teknisi memilih mesin hasil promote.
- Master Sparepart (`/admin/spareparts`) — CRUD + soft delete.
- **Master Failure Code** (`/admin/failure-codes`) — CRUD lengkap untuk 12 kode ISO 14224 (sebelumnya hanya di-seed DB). State terpisah: `failureCodes` (dropdown teknisi) vs `adminFailureCodes` (tabel admin).
- QR Code Generator (single + batch print A4) — dengan **cache buster** `?t=Date.now()`, TTL 5 menit, tombol "Muat Ulang QR", HTTP header `no-store`.
- **Akses Admin ke "Aktivitas Teknisi"** — Admin bisa memonitor semua teknisi lintas Line (sebelumnya hanya SPV).
- **Bottom Navbar Admin Mobile** — restrukturisasi: Dashboard → Pengguna → Audit → **Lainnya** → Profil. Semua menu master (Plant, Mesin, Group, Sparepart, Failure Code, Radar Aset) masuk ke **MoreMenuSheet** via tombol "Lainnya".

**Database (Fase 2):**
- 6 enum baru, 3 model baru (`FailureCode`, `Sparepart`, `LogbookSparepart`), 12 kolom keandalan di `logbooks`. Total tabel: 11 → 14.

**Scripts (Operasional):**
- `backend/scripts/detect-dummy-data.js` — audit *read-only* untuk mendeteksi data testing (kata kunci "test", "e2e", email bukan `@satoria.co.id`, duplikat).
- `backend/scripts/cleanup-dummy-data.js` — *surgical cleanup* dengan konfirmasi interaktif (bukan nuke seluruh DB).

### Fixed

**Black Box (Fase 1):**
- BUG-003–012: 13 bug (validasi waktu, multi-submit, email, dll).

**Dashboard (Fase 4):**
- BUG-013: Filter bulan/search merusak agregasi dashboard.
- BUG-014: `groupBy` aggregate tidak di-scope per plant.

**Input & Quick-Start (Fase 6):**
- BUG-015 (TDZ): `filteredMachines` diakses sebelum deklarasi di `InputLogbookView.vue` → halaman blank.
- **Auto-select mesin membandel** — form membuka dengan mesin pertama otomatis terpilih. Fix: hapus `form.machine_id = filteredMachines.value[0].id` dari `onMounted`, hanya auto-select jika dari QR/draft.

**RBAC (Fase 4.1b):**
- BUG RBAC: Supervisor bisa intip data Line lain via `?plant_id=X` — ditutup via `handoverScope.js`.
- **Logika `isDirectTeam` salah** — SPV melihat seluruh teknisi pabrik sebagai "Tim Saya". Fix: OR (`||`) → **AND** (`&&`) untuk `group_id` + `plant_id`. Contoh: SPV Group 30001 Line 1 sekarang hanya melihat 11 teknisi (bukan 35).

**UI/UX (Fase 6 Sesi 4):**
- **Scroll page terkunci saat jari menyentuh kalender mingguan** (`/logbook/riwayat`, mobile). Container scroll internal `TimeGrid.vue` memakai `overscroll-contain` sehingga *scroll chaining* ke halaman induk terputus. Fix: hapus `overscroll-contain` → `overscroll-y-auto` + `touch-action: pan-y` (class `.time-grid-scroll`) agar scroll internal jam 00:00–23:00 tetap normal dan momentum dilempar ke page saat mentok atas/bawah. Layout, tinggi, dan logika planner tidak berubah.
- **"Disetujui oleh" kosong** di modal riwayat setelah logbook di-approve. Fix: `viewLog.supervisor_name` → `viewLog.latest_approval?.supervisor_name`.
- **Tabel riwayat kurang detail** — Uraian Aktivitas harus klik modal dulu. Fix: redesign **Card-Based List** (Uraian langsung tampil).
- **Kalender mingguan tidak seimbang** dengan sidebar & posisi log melenceng dari jenjang jam. Fix: `items-stretch` + dynamic `--planner-hour-h` via `getComputedStyle` (bukan hardcode `60px`).
- **Bottom Navbar Admin tidak lengkap** — hanya 5 item, menu master tidak bisa diakses di mobile. Fix: restrukturisasi + `MoreMenuSheet.vue`.
- **Checkbox "Mesin belum terdaftar" hilang** dari form input. Fix: munculkan kembali.
- **Sub-mesin kosong setelah promote** — dropdown hanya `-- Tanpa Bagian Spesifik --`, submit kena error. Fix: backend auto-create sub-mesin + frontend auto-select jika hanya 1.
- **Cache SWR tidak ter-invalidate** — teknisi harus hard-refresh untuk lihat mesin baru. Fix: `invalidate()` hapus `localStorage` + `fetchAll(true)` saat buka form.
- **Approval filter tab tidak sinkron** — membuka tab "Perlu Approval" tetap menampilkan semua status. Fix: `approvalFilter.js` + 20 unit test.
- **Repeat Failure banner tidak muncul** — logika hanya ada di `approvalController`, padahal frontend panggil `/logbooks`. Fix: shared helper `repeatFailure.js` di kedua controller.
- **Aktivitas Teknisi tombol mati** — mismatch `camelCase`/`snake_case` + silent error. Fix: normalisasi + error handling yang benar.
- **QR Code cache localhost setelah deploy** — gambar QR di browser normal masih render URL lama. Fix: cache buster `?t=Date.now()` + TTL 5 menit + tombol "Muat Ulang QR".
- **Softened dashboard colors** — indikator delta turun berwarna merah (kesan menuduh). Fix: ubah ke abu-abu netral (P1 alignment).

### Security
- RBAC audit 11 skenario PASSED (`scripts/rbac-audit.ps1`).
- Endpoint `/admin/*` dan `/machines/:id/qr*` khusus Admin.
- Endpoint `/supervisor/*` khusus Supervisor + Admin.
- Endpoint `GET /master/*` = semua role (untuk dropdown form).
- Endpoint `GET /approvals/technicians` — SPV terkunci ke `plant_id` JWT (zero cross-Line leakage).

### Removed
- Leaderboard, Ranking, Lencana peringkat, "Hari Tanpa Log" — dihapus permanen (P1).
- 7 file view yatim (`AdminSpvDashboard.vue`, `DataTeknisiView.vue`, dll).

### Changed
- Label UI "Plant" → "Line".
- "Skill Matrix" → **"Peta Keahlian & Kontak"** (P1 alignment, urutan abjad + email kontak).
- Library notifikasi: SweetAlert2 (standar tunggal, tanpa banner error inline).
- Cache master: Stale-While-Revalidate (`masterStore.js` + `localStorage`) + force refresh saat buka form input.
- Bundle: lazy loading route + subset font Inter (bundle utama 420kB → 93kB).
- **Test suite** — dari 176/176 + 55/55 menjadi **248/248 (backend) + 121/121 (frontend)** setelah 15 bug fix Sesi 4 dan penambahan modul baru (failure code, repeat failure, activity filter, dll).

### Known Limitations (v6.0)
- Fase 3.2 (QR Quick-Start) ditunda — menunggu stiker fisik.
- Aplikasi butuh internet (offline-first masuk backlog v6.1).
- PWA belum diimplementasi (backlog v6.1).
- **JWT Stale Claims** — perubahan `role`/`plant_id` di DB tidak auto-refresh di JWT user sampai login ulang (maks 24 jam). Workaround: logout-login manual. Fix v6.1: `GET /auth/me` refresh + kurangi expiry ke 2-4 jam.

### Deployment
- **Frontend:** https://satoria-log-aktivitas-me.vercel.app
- **Backend:** https://logbook-pharma-backend.vercel.app
- **Database:** TiDB Cloud (Production)
- **CI/CD:** GitHub Actions (5/5 hijau) + Vercel Auto-Deploy (push ke `main` = rebuild otomatis).
- **Environment Variables:**
  - Backend: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL`
  - Frontend: `VITE_API_BASE_URL`

### Tech Stack
- Backend: Node.js Express + Prisma + TiDB Cloud.
- Frontend: Vue 3 + Vite + Tailwind CSS + Chart.js + Pinia + Vue Router.
- Testing: `node --test` (backend) + Vitest (frontend) — **248/248 + 121/121 lulus**.
- Deployment: Vercel (frontend + backend serverless).

---

## [4.8.0] — 21 Oktober 2026 (Baseline Sebelum v6.0)

Versi terakhir sebelum upgrade v6.0. Fitur: form basic, approval per-log, dashboard SPV/Admin dengan leaderboard (sudah dihapus di v6.0).

---

## [Unreleased] — v6.1 (Planned)

### To Add
- PWA + Offline-first (request SPV) — manifest.json + service worker + IndexedDB.
- Dashboard skeleton proper (saat ini hanya teks "Memuat...").
- `ASSIGN_TO_EXISTING` di F5.1 (promote ke mesin existing).
- Fase 3.2 QR Quick-Start (setelah stiker fisik dicetak).
- Backfill sub-mesin untuk mesin lama (dibuat sebelum patch F5.1).
- Notifikasi ke user saat data akun diubah Admin ("Silakan login ulang").

### To Fix
- **JWT Stale Claims** (SECURITY) — `GET /auth/me` refresh on app init + reduce JWT expiry to 2-4 jam.
- Token konsistensi (`amber-*`/`blue-*` → `text-warning`/`text-primary`).
- `hasLoadedOnce` reset saat ganti mesin di `MachineHistoryView`.
- Performance audit endpoint `/reliability-analytics` dan halaman Admin (pagination server-side, lazy load chart).
- Restore mesin untuk logbook orphan (ID 3330007 user Slamet, dll).

---

Format: [Keep a Changelog](https://keepachangelog.com/).
Versioning: [Semantic Versioning](https://semver.org/).