# Progress Upgrade v6.0 (Reliability & Teknisi-Oriented)

> **Dokumen ini adalah "Memory Bank" proyek.** 
> Jika AI Agent (DeepSeek/Claude/dll) memulai sesi baru atau berganti model, berikan file ini agar Agent langsung memahami konteks apa yang sudah dikerjakan.
> **Spesifikasi Utama:** `AGENT_SPEC_Upgrade_Engineer_Logbook_Satoria_v6.md`

---

## 📌 Status Saat Ini
- **Branch Aktif:** `feat/v6-reliability`
- **Fase Selesai:** Fase 0, Fase 1, Fase 2.
- **Fase Berjalan:** Fase 3A (UI Form 5 Tombol Besar).
- **Status Test:** Backend 59/59 Lulus, Frontend 14/14 Lulus.

---

## ✅ FASE 0 — Recon & Baseline (SELESAI)
- Baseline test awal: 34 backend, 9 frontend lulus.
- `machines.plant_id` sudah ada (nullable).
- `machine.code` tidak ada di database (hanya di UI).
- Masalah Node v24 lokal: script test diubah menjadi `node --test "test/**/*.test.js"`.
- Branch git dibuat: `feat/v6-reliability`.

## ✅ FASE 1 — Hotfix Black Box & Stabilitas (SELESAI)
- **13 Bug diperbaiki:** (Scope approval SPV per-Line, validasi waktu, anti multi-submit, hapus draft, pagination/filter tabel, dll).
- **Stabilitas Jaringan:** `masterStore.js` menerapkan Stale-While-Revalidate (cache `localStorage`).
- **Standarisasi SweetAlert2:** Menghapus banner error merah inline di 8 file Vue (termasuk `LogbookForm.vue`). Semua validasi & konfirmasi kini menggunakan pop-up SweetAlert.
- **P1 (Bukan Alat HR):** Menghapus Leaderboard, Ranking, dan indikator "Hari Tanpa Log".
- **Label:** Mengubah semua teks "Plant" menjadi "Line".
- **Test:** Backend 42/42 Lulus, Frontend 14/14 Lulus.

## ✅ FASE 2 — Migrasi Database (SELESAI)
- **Schema Prisma:** Menambahkan 6 enum baru (`ActivityCategory`, `MachineEndStatus`, dll), 3 model baru (`FailureCode`, `Sparepart`, `LogbookSparepart`), dan kolom baru di `Logbook`, `User`, `Machine`. Semua aditif (tidak menghapus data lama).
- **Controller:** `logbookController.js` diperbarui untuk menerima payload baru, memvalidasi per kategori (tabel 4.3), dan menurunkan `maintenance_type` (tabel 4.2).
- **Seed:** 12 FailureCode (ISO 14224) dan 10 Sparepart awal berhasil dimasukkan.
- **Migrasi DB:** Menggunakan `npx prisma db push` (bukan `migrate dev` karena menghindari reset database).
- **Test:** Backend 59/59 Lulus (termasuk 17 test baru untuk validasi kategori).

---

## 🚀 FASE 3 — Pengalaman Teknisi (SEDANG BERJALAN)
Fase ini adalah perubahan fundamental dari *Supervisor-oriented* menjadi *Teknisi-oriented*.

### F3.1 Form Input Adaptif (5 Tombol Besar) - [PROSES]
- Target file: `frontend/src/views/teknisi/InputLogbookView.vue`.
- Menambahkan 5 tombol: 🔧 MACHINE_TROUBLE, 🛡️ PREVENTIVE_PM, 🛒 KERETA_TRAY_REPAIR, ⚡ FABRICATION_PROJECT, 📋 SUPPORT_NON_MACHINE.
- Form menyesuaikan kategori (sembunyikan mesin jika NON_MACHINE, tampilkan qty jika KERETA, tampilkan status akhir & downtime jika TROUBLE).

### F3.2 Quick-start & QR [BELUM]
### F3.3 Papan Serah-Terima Shift [BELUM]
### F3.4 Riwayat Mesin [BELUM]

## 🚀 FASE 4 — Supervisor (BELUM)
## 🚀 FASE 5 — Admin (BELUM)

---

## 📝 Aturan untuk AI Agent Selanjutnya
1. Baca file ini dan spesifikasi utama (`AGENT_SPEC_Upgrade...`).
2. Patuhi daftar file LOCKED di Bagian 7.1 spesifikasi.
3. Jangan ubah schema database lagi (Fase 2 sudah selesai).
4. Hemat token: Jangan baca seluruh repo. Fokus hanya pada file yang diminta di setiap fase.