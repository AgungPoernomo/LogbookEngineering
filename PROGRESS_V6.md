# Progress Upgrade v6.0 (Reliability & Teknisi-Oriented)

> **Dokumen ini adalah "Memory Bank" proyek.** 
> Jika AI Agent (DeepSeek/Claude/dll) memulai sesi baru atau berganti model, berikan file ini agar Agent langsung memahami konteks apa yang sudah dikerjakan.
> **Spesifikasi Utama:** `AGENT_SPEC_Upgrade_Engineer_Logbook_Satoria_v6.md`

---

## 📌 Status Saat Ini
- **Branch Aktif:** `feat/v6-reliability`
- **Fase Selesai:** Fase 0, 1, 2, 3.1, 3.3, 3.4.
- **Fase Berjalan:** Fase 4 (Persiapan Supervisor Dashboard).
- **Status Test:** Backend 59/59 Lulus, Frontend 14/14 Lulus.
- **⚠️ Catatan Penting Backend:** Ada bug library `path-to-regexp` di `node_modules` lokal. Jalankan `npm install` di folder `backend` jika route API >1 segmen error 404.

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

### ✅ F3.1 Form Input Adaptif (5 Tombol Besar) - [SELESAI]
- `InputLogbookView.vue` dirombak menjadi 5 tombol besar (🔧, 🛡️, 🛒, ⚡, 📋).
- Form adaptif (sembunyikan mesin jika NON_MACHINE, dll).

### ⏸️ F3.2 Quick-start & QR - [DITUNDA]
- Menunggu stiker fisik QR Code dicetak.

### ✅ F3.3 Papan Serah-Terima Shift (Handover Board) - [SELESAI]
- **Tujuan:** Menggantikan slot Leaderboard di Dashboard Teknisi.
- **Backend:** `handoverController.js` (Dedup log terbaru per mesin, filter `WAITING_SPAREPART` & `TEMPORARY_FIX`, sort criticality). Route: `GET /api/v1/handover`.
- **Frontend:** `HandoverBoard.vue` (Papan UI dengan filter & modal detail). 
- **Bugfix Sampingan:** 
  1. Fix token Service (pakai Pinia).
  2. Fix layout Grid (tinggi `StatisticsChartCard` disamakan jadi `min-h-[320px]`).
  3. Fix data "Teknisi di Line Ini" kosong (Buka *read-only* `GET /users` untuk Teknisi, filter ketat `plant_id` JWT di `userController.js`).

### ✅ F3.4 Riwayat Mesin / Buku Pintar (Machine History) - [SELESAI]
- **Backend:** `machineHistoryController.js` (Endpoint `GET /api/v1/machines/:id/history`). Optimasi query paralel, hitung statistik dari seluruh periode, filter WIB.
- **Frontend:** `MachineHistoryView.vue` (821 baris). UI lengkap: Header detail, Statistik downtime, Timeline pagination (Prev/Next), Sidebar Top Failure Codes & Spareparts. Anti-race condition (`requestSeq`).
- **Integrasi:** Card mesin di `TeknisiDashboard.vue` sekarang bisa diklik menuju `/mesin/:id`.

---

## ✅ FASE 4 — Pengalaman Supervisor (SELESAI)

### ✅ F4.1a Banner Repeat Failure - [SELESAI]
- **Backend:** `approvalController.js` diperkaya dengan deteksi `repeat_failure` (1 query tambahan, window 30 hari, filter `machine_id` + `failure_code_id` + status PENDING/APPROVED).
- **Frontend:** Banner peringatan di `ApprovalListView.vue` + link ke Buku Pintar Mesin.
- **Bugfix:** Perbaikan scope `<template v-for>` (Vue 3) dan sinkronisasi field `logs` vs `logbooks`.

### ✅ F4.1b Antrean Handover Supervisor - [SELESAI]
- **Backend:** Refactor `handoverController.js` menggunakan util baru `handoverScope.js`. Menutup celah RBAC di mana Supervisor bisa mengintip Line lain via URL.
- **Frontend:** Komponen baru `SupervisorHandoverQueue.vue` (tabel padat dengan indikator "Umur Terbuka") disisipkan di Dashboard Supervisor.

### 🚨 BUG-013 & BUG-014 (Dashboard SPV) - [SELESAI]
- **Backend:** Perbaikan query agregasi statistik di `overviewController.js` (memisahkan filter bulan, search, dan `groupBy` per Line). Menambahkan filter untuk membuang data `task_date` rusak.
- **Frontend:** Perbaikan chart kosong di `PlantCard.vue` menjadi *stub abu-abu*.
- **Test:** Menambahkan 12 test regresi baru (`overviewDashboard.test.js`, `overviewPlantStats.test.js`).

### ✅ F4.3 KPI Keandalan (MTTR/MTBF/Availability) - [SELESAI]
- **Backend:** Membuat pure function `reliabilityMetrics.js` (WIB-safe, anti NaN/Infinity) + 26 test. Diintegrasikan ke `machineHistoryController.js`.
- **Frontend:** Menambahkan 3 kartu KPI di `MachineHistoryView.vue`.
- **Catatan:** MTTR menggunakan `duration_minutes`, MTBF berbasis gap antar `BREAKDOWN`.

### ✅ F4.4 Pareto Bad Actor & Skill Matrix - [SELESAI]
- **Backend:** Controller baru `reliabilityAnalyticsController.js` + Service baru `reliabilityAnalyticsService.js`. Menggunakan `groupBy` Prisma murni (tanpa raw SQL) untuk menghitung Pareto Mesin, Pareto Kode Kerusakan, dan Skill Matrix. Dilengkapi 24 test.
- **Frontend:** Halaman baru `ReliabilityAnalyticsView.vue` + menu Sidebar. 
- **Visualisasi:** Komponen baru `ParetoChart.vue` (Bar + Line Kumulatif) menggunakan Chart.js. Terdaftar secara lokal untuk optimasi bundle.

### ✅ TODO H1 Tombol "Catat Logbook" + Auto-Pre-fill Form - [SELESAI]
- **Latar:** README 11.5.13 menjanjikan tombol "Catat Logbook untuk mesin ini" di Buku Pintar Mesin, tetapi belum ada di Fase 3.4 → flow "scan QR → Buku Pintar → catat logbook" terputus.
- **Frontend (`MachineHistoryView.vue`):** tombol primary `SquarePen` "Catat Logbook untuk Mesin Ini" di grup aksi header (sebelah Kembali/periode/refresh). `router.push('/logbook/input?machine=<id>&task_type=MACHINE_TROUBLE')`. Tombol hanya tampil untuk Teknisi (rute `/logbook/input` = `roles: [TEKNISI]`) dan dinonaktifkan selama data mesin belum termuat.
- **Frontend (`InputLogbookView.vue`):** pre-fill `?machine=&sub=&task_type=` lewat watcher `route.query` yang sudah ada (termasuk `task_type` → `activity_category`), banner "Diisi otomatis dari Buku Pintar Mesin", toast informatif bila param diabaikan (mesin Line lain / ID tak dikenal), dan preselect mesin pertama **tidak** menimpa mesin dari tautan.
- **Util baru:** `utils/logbookQuickStart.js` (`parseMachineId`, `resolveQueryMachine`, `resolveQuerySubMachine`, `resolveQuickStartCategory`, `isTechnicianRole`, `buildMachineQuickStartRoute`) + `logbookQuickStart.test.js` (20 test).
- **Verifikasi:** Frontend 55/55 test lulus; `npm run build` sukses.

- **Aturan P1:** Skill Matrix diurutkan abjad (bukan ranking) untuk mencegah *HR-tool*.

---

## 🚀 FASE 5 — Admin (SEDANG BERJALAN)
*(Radar Aset Belum Terdaftar, Master Sparepart, Generator QR)*

---

## 📝 Aturan untuk AI Agent Selanjutnya
1. Baca file ini dan spesifikasi utama (`AGENT_SPEC_Upgrade...`).
2. Patuhi daftar file LOCKED di Bagian 7.1 spesifikasi.
3. Jangan ubah schema database lagi (Fase 2 sudah selesai).
4. Hemat token: Jangan baca seluruh repo. Fokus hanya pada file yang diminta di setiap fase.