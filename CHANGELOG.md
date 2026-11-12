# CHANGELOG — Engineer Logbook Satoria

Semua perubahan penting pada proyek ini didokumentasikan di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [6.0.0] — 9 November 2026

### Filosofi
Upgrade besar dari v4.8 (**Supervisor-Oriented**) menjadi **Teknisi-Oriented & Reliability**. Prinsip "Give Value to Get Data" + **P1: Bukan Alat HR** (no Leaderboard, no Ranking, no "Hari Tanpa Log").

### Added
**Teknisi:**
- Form Input Cepat 5 Tombol Besar (adaptif per kategori aktivitas).
- Papan Serah-Terima Shift (Handover Board) — pengganti Leaderboard.
- Buku Pintar Mesin (`/mesin/:id`) — timeline, MTTR/MTBF/Availability, top failure codes, top spareparts.
- Tombol "Catat Logbook untuk Mesin Ini" dari Buku Pintar (auto-prefill).
- Search bar filter mesin di dashboard.

**Supervisor:**
- Banner Repeat Failure di halaman approval (deteksi 30 hari + failure_code_id sama).
- Antrean Handover SPV (`SupervisorHandoverQueue.vue`).
- Dashboard SPV yang terisi (bug fix BUG-013/014).
- Pareto Chart Bad Actor + Skill Matrix (`/supervisor/reliability`).
- KPI MTTR/MTBF/Availability.

**Admin:**
- Radar Aset Belum Terdaftar (`/admin/unmapped-assets`) + auto-promote.
- Master Sparepart (`/admin/spareparts`) — CRUD + soft delete.
- QR Code Generator (single + batch print A4).

**Database (Fase 2):**
- 6 enum baru, 3 model baru (`FailureCode`, `Sparepart`, `LogbookSparepart`), 12 kolom keandalan di `logbooks`. Total tabel: 11 → 14.

### Fixed
- BUG-003–012: 13 bug black box Fase 1 (validasi waktu, multi-submit, email, dll).
- BUG-013: Filter bulan/search merusak agregasi dashboard.
- BUG-014: `groupBy` aggregate tidak di-scope per plant.
- BUG-015 (TDZ): `filteredMachines` diakses sebelum deklarasi di `InputLogbookView.vue`.
- BUG RBAC (Fase 4.1b): Supervisor bisa intip data Line lain via `?plant_id=X` — ditutup via `handoverScope.js`.

### Security
- RBAC audit 11 skenario PASSED (`scripts/rbac-audit.ps1`).
- Endpoint `/admin/*` dan `/machines/:id/qr*` khusus Admin.
- Endpoint `/supervisor/*` khusus Supervisor + Admin.
- Endpoint `GET /master/*` = semua role (untuk dropdown form).

### Removed
- Leaderboard, Ranking, Lencana peringkat, "Hari Tanpa Log" — dihapus permanen (P1).
- 7 file view yatim (`AdminSpvDashboard.vue`, `DataTeknisiView.vue`, dll).

### Changed
- Label UI "Plant" → "Line".
- Library notifikasi: SweetAlert2 (standar tunggal, tanpa banner error inline).
- Cache master: Stale-While-Revalidate (`masterStore.js` + `localStorage`).
- Bundle: lazy loading route + subset font Inter (bundle utama 420kB → 93kB).

### Known Limitations (v6.0)
- Fase 3.2 (QR Quick-Start) ditunda — menunggu stiker fisik.
- Aplikasi butuh internet (offline-first masuk backlog v6.1).
- PWA belum diimplementasi (backlog v6.1).

### Tech Stack
- Backend: Node.js Express + Prisma + TiDB Cloud.
- Frontend: Vue 3 + Vite + Tailwind CSS + Chart.js + Pinia + Vue Router.
- Testing: `node --test` (backend) + Vitest (frontend) — 176/176 + 55/55 lulus.
- Deployment: Vercel (frontend + backend serverless).

---

## [4.8.0] — 21 Oktober 2026 (Baseline Sebelum v6.0)

Versi terakhir sebelum upgrade v6.0. Fitur: form basic, approval per-log, dashboard SPV/Admin dengan leaderboard (sudah dihapus di v6.0).

---

## [Unreleased] — v6.1 (Planned)

### To Add
- PWA + Offline-first (request SPV).
- Dashboard skeleton proper (saat ini hanya teks "Memuat...").
- `ASSIGN_TO_EXISTING` di F5.1 (promote ke mesin existing).
- Fase 3.2 QR Quick-Start (setelah stiker fisik dicetak).

### To Fix
- Token konsistensi (`amber-*`/`blue-*` → `text-warning`/`text-primary`).
- `hasLoadedOnce` reset saat ganti mesin di `MachineHistoryView`.
- Performance audit endpoint `/reliability-analytics`.

---

Format: [Keep a Changelog](https://keepachangelog.com/).
Versioning: [Semantic Versioning](https://semver.org/).