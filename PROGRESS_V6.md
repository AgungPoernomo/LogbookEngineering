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

## 🚀 FASE 4 — Supervisor (BERJALAN)
*(Validasi Teknis, Pareto, MTTR/MTBF, Skill Matrix)*

### ✅ F4.1b Antrean Handover Supervisor - [SELESAI]
- **Pendekatan Frontend:** Komponen baru `SupervisorHandoverQueue.vue` (tabel ringkas: Nama Mesin, Status, Teknisi Terakhir, Tanggal, Umur, Aksi) — dipilih karena `HandoverBoard.vue` berorientasi kartu untuk teknisi, sedangkan Supervisor perlu tabel padat dengan *umur terbuka dalam hari* (F4.2) dan aksi ganda (Detail + Riwayat Mesin).
- **Data source:** Tetap `GET /api/v1/handover` (tanpa endpoint/schema baru, tanpa N+1).
- **Penempatan:** `SupervisorDashboard.vue` — tepat di bawah `DashboardOverviewLogBook` (KPI) dan **di atas** `StatisticsChartCard` (high visibility). Prop `plantId` tidak dikirim (null).
- **Backend (perbaikan RBAC):** Sebelumnya Supervisor bisa override `?plant_id=` dan `?plant_id=ALL` (bocor lintas Line). Logika dipindah ke util murni `backend/src/utils/handoverScope.js` → `resolveHandoverPlantScope()`. Kini: Teknisi & Supervisor **dikunci** ke `plant_id` JWT; hanya Admin yang boleh override/`ALL`. Supervisor tanpa `plant_id` → data kosong (bukan error).
- **Token desain:** 0 hex color; memakai `bg-surface`, `border-line`, `text-ink`, `text-primary`, `bg-warning/10`, `bg-danger/10`, `bg-success/10`, `bg-muted`.
- **P1:** Tidak ada leaderboard/ranking/poin. Empty state positif: "Tidak ada mesin yang menggantung 🎉".
- **Test:** `backend/test/handoverSupervisor.test.js` (14 test). Total backend **85/85 lulus**, frontend 16/16 lulus.
- **TODO (lanjutan):** Aksi "Detail" saat ini mengarah ke `/mesin/:id` (Buku Pintar). Ganti dengan modal detail logbook + Approve/Reject saat F4.1 dibuka.

## 🚀 FASE 5 — Admin (BELUM)
*(Radar Aset, Master Sparepart, Generator QR)*

---

## 📝 Aturan untuk AI Agent Selanjutnya
1. Baca file ini dan spesifikasi utama (`AGENT_SPEC_Upgrade...`).
2. Patuhi daftar file LOCKED di Bagian 7.1 spesifikasi.
3. Jangan ubah schema database lagi (Fase 2 sudah selesai).
4. Hemat token: Jangan baca seluruh repo. Fokus hanya pada file yang diminta di setiap fase.