# Engineer Logbook Satoria

> Platform digital berbasis web untuk mendigitalisasi pencatatan aktivitas kerja harian teknisi, pengelolaan persetujuan logbook, pemantauan operasional, serta penyusunan laporan kinerja tim teknisi di lingkungan Satoria.

| Item | Keterangan |
|---|---|
| **Nama Proyek** | Engineer Logbook Satoria |
| **Status** | Produksi & Stabil (CI/CD Otomatis, Sentry Monitoring, TiDB Cloud) |
| **Frontend** | Vue.js 3 + Tailwind CSS |
| **Backend** | Node.js Express + Prisma ORM |
| **Database** | TiDB (SQL, kompatibel MySQL) |
| **Deployment** | Vercel |
| **Repositori** | GitHub (private) |
| **IDE** | Antigravity IDE |
| **Versi Dokumen** | 4.8 |

---

## Daftar Isi

1. [Latar Belakang](#1-latar-belakang)
2. [Tujuan Proyek](#2-tujuan-proyek)
3. [Ruang Lingkup](#3-ruang-lingkup)
4. [Pengguna & Hak Akses (RBAC)](#4-pengguna--hak-akses-rbac)
5. [Daftar Fitur per Peran](#5-daftar-fitur-per-peran)
6. [Alur Bisnis Utama](#6-alur-bisnis-utama)
7. [Arsitektur Teknologi](#7-arsitektur-teknologi)
8. [Struktur Folder yang Direkomendasikan](#8-struktur-folder-yang-direkomendasikan)
9. [Rancangan Data (Model & ERD Terbaru)](#9-rancangan-data-model--erd-terbaru)
10. [Rancangan Halaman & Routing](#10-rancangan-halaman--routing)
11. [Panduan Desain UI](#11-panduan-desain-ui)
12. [Alur Kerja Pengembangan](#12-alur-kerja-pengembangan)
13. [Rencana Backend & API](#13-rencana-backend--api)
14. [Rencana Deployment](#14-rencana-deployment)
15. [Panduan Git & GitHub](#15-panduan-git--github)
16. [Keamanan](#16-keamanan)
17. [Standar Penulisan Kode](#17-standar-penulisan-kode)
18. [Pengujian](#18-pengujian)
19. [Risiko & Asumsi](#19-risiko--asumsi)
20. [Pertanyaan Terbuka & Catatan Penyempurnaan](#20-pertanyaan-terbuka--catatan-penyempurnaan)
21. [Glosarium](#21-glosarium)
22. [Panduan Menggunakan Dokumen Ini dengan Antigravity IDE](#22-panduan-menggunakan-dokumen-ini-dengan-antigravity-ide)

---

## 1. Latar Belakang

Pencatatan aktivitas harian teknisi di lingkungan Satoria merupakan bagian penting dalam pengelolaan pemeliharaan dan operasional mesin. Informasi mengenai pekerjaan yang dilakukan, waktu pelaksanaan, mesin yang ditangani, suku cadang yang digunakan, dan hasil pekerjaan sangat diperlukan untuk mendukung koordinasi tim serta evaluasi operasional.

Apabila pencatatan dilakukan secara manual (buku fisik, spreadsheet terpisah, atau pesan chat), sejumlah kendala dapat muncul:

- Data tersebar, berisiko hilang, dan sulit direkap.
- Format pengisian tidak seragam antar teknisi.
- Proses validasi dan persetujuan oleh Supervisor lambat serta sulit ditelusuri.
- Pemantauan kinerja dan beban kerja tidak real-time.
- Risiko duplikasi pencatatan dan salah ketik.

**Engineer Logbook Satoria** dibangun sebagai satu platform terpusat agar teknisi dapat mencatat logbook harian dengan format baku, sementara Supervisor dan Admin dapat meninjau, menyetujui, serta memantau pekerjaan secara terstruktur.

---

## 2. Tujuan Proyek

### Tujuan Utama
Mendigitalisasi dan memusatkan seluruh pencatatan, pelaporan, pemantauan, dan validasi aktivitas kerja teknisi di Satoria.

### Tujuan Spesifik
1. Mendigitalisasi pencatatan aktivitas kerja harian teknisi secara terstandar.
2. Menyediakan alur pengajuan, pemeriksaan, dan persetujuan (*approval*) logbook yang efisien.
3. Mempermudah pemantauan status logbook melalui dashboard ringkasan aktivitas operasional.
4. Memusatkan pengelolaan master data (Plant, Work Group, Shift, Machine, Sub-Machine).
5. Menyediakan fitur ekspor laporan tim ke format PDF atau Excel.
6. Menyediakan notifikasi email dan notifikasi dalam aplikasi (*InApp*) untuk mempercepat tindak lanjut.
7. Menyediakan *audit trail* untuk menelusuri aktivitas dan akuntabilitas pengguna.

### Indikator Keberhasilan
- Seluruh teknisi mengisi logbook harian melalui platform web.
- Waktu proses approval berkurang dibanding sistem manual.
- Supervisor/Admin dapat melihat rekap dan statistik tanpa perlu menyusun laporan manual.
- Perubahan master data (plant/shift/mesin) dapat dikelola langsung via UI Admin tanpa mengubah kode.

---

## 3. Ruang Lingkup

### 3.1 Termasuk (In Scope)
- Autentikasi pengguna berbasis JWT dan otorisasi *Role-Based Access Control* (RBAC) untuk Admin, Supervisor, dan Teknisi.
- Manajemen Master Data (Roles, Work Groups, Plants, Shifts, Machines, Sub-Machines).
- Pencatatan logbook harian (termasuk durasi otomatis, perhitungan shift melintasi tengah malam, suku cadang, dan status draft).
- Alur approval logbook (Approve/Reject dengan catatan perbaikan dari Supervisor).
- Dashboard ringkasan operasional yang disesuaikan per peran.
- Ekspor laporan tim ke PDF dan Excel dengan filter tanggal, plant, work group, mesin, dan status.
- Notifikasi email & dalam aplikasi (*InApp*) untuk status approval.
- Audit trail (*User Activities*) untuk mencatat tindakan sensitif pengguna.
- Antarmuka responsif (desktop, tablet, ponsel).

### 3.2 Tidak Termasuk (Out of Scope)
- Pengendalian mesin secara langsung atau integrasi PLC/IoT.
- Aplikasi mobile native (menggunakan web browser responsif).
- Pengelolaan inventaris/persediaan suku cadang mendalam (hanya pencatatan teks suku cadang pada logbook).
- Pemrosesan penggajian (payroll/HRIS).
- Mode offline penuh.

---

## 4. Pengguna & Hak Akses (RBAC)

Sistem menerapkan *Role-Based Access Control* (RBAC) dengan pembatasan hak akses berbasis tabel `roles`.

| Peran | Deskripsi | Tanggung Jawab Utama |
|---|---|---|
| **Teknisi** | Pelaksana pekerjaan lapangan / engineering | Mengisi logbook, menyimpan draft, mengajukan logbook, merevisi logbook ditolak, melihat dashboard pribadi |
| **Supervisor** | Pengawas operasional & tim teknisi | Meninjau & menyetujui/menolak logbook teknisi, memberikan catatan revisi, memantau dashboard tim, mengekspor laporan (PDF/Excel) |
| **Admin** | Pengelola operasional & konfigurasi sistem | Mengelola akun pengguna (CRUD & aktivasi), mengelola Master Data (Plant, Shift, Group, Mesin, Sub-mesin), melihat Audit Trail |

### Matriks Hak Akses

| Fitur | Teknisi | Supervisor | Admin |
|---|:---:|:---:|:---:|
| Login & Logout | Ya | Ya | Ya |
| Kelola Profil Pribadi | Ya | Ya | Ya |
| Dashboard Ringkasan | Ya (Pribadi) | Ya (Tim / Plant) | Ya (Sistem) |
| Input Logbook Harian (Draft/Submit) | Ya | - | - |
| Riwayat & Status Logbook Sendiri | Ya | - | - |
| Meninjau & Approval Logbook | - | Ya | Opsional* |
| Ekspor Laporan Tim (PDF/Excel) | - | Ya | Opsional |
| Manajemen Akun Pengguna (CRUD) | - | - | Ya |
| Manajemen Master Data (Plant, Shift, Machine, Group) | - | - | Ya |
| Akses Audit Trail (`user_activities`) | - | - | Ya |

> **Catatan Admin Approval:** Admin tidak otomatis menyetujui logbook kecuali diberikan kewenangan eksplisit.
>
> **Catatan Otorisasi Backend:** Keamanan hak akses wajib diterapkan ketat di level backend/API, bukan sekadar menyembunyikan elemen UI.

---

## 5. Daftar Fitur per Peran

### 5.1 Teknisi

| Fitur | Deskripsi | Prioritas |
|---|---|---|
| **Login & Auth** | Masuk menggunakan NIK/Email dan Kata Sandi | Wajib |
| **Input Logbook** | Form pencatatan aktivitas kerja harian (Plant, Shift, Mesin, Sub-mesin, Jam Mulai-Selesai, Durasi, Suku Cadang, Deskripsi) | Wajib |
| **Draft & Submit** | Simpan sebagai `Draft` atau kirim (`Pending`) untuk diperiksa Supervisor | Wajib |
| **Riwayat & Status** | Pemantauan logbook dengan status: `Draft`, `Pending`, `Approved`, `Rejected`, `Cancelled` | Wajib |
| **Revisi Logbook** | Memperbaiki dan mengirim ulang logbook berstatus `Rejected` | Wajib |
| **Dashboard** | Statistik pribadi: logbook per status, tren aktivitas, notifikasi persetujuan | Wajib |

### 5.2 Supervisor

| Fitur | Deskripsi | Prioritas |
|---|---|---|
| **Approval Logbook** | Meninjau pengajuan logbook teknisi: setujui (`Approved`) atau tolak (`Rejected`) **wajib dengan catatan** | Wajib |
| **Aktivitas Teknisi** | Memantau seberapa sering setiap teknisi tim mengisi logbook harian, status aktif hari ini, metrik jam kerja, konsistensi 7 hari, mesin utama, dan detail riwayat (`/supervisor/teknisi`) | Wajib |
| **Dashboard Tim** | Ringkasan operasional: total logbook pending, tren pekerjaan per plant/shift/mesin, status approval | Wajib |
| **Ekspor Laporan** | Cetak/unduh laporan tim dalam format **PDF** dan **Excel** dengan filter rentang tanggal, plant, group, mesin, & status | Wajib |

### 5.3 Admin

| Fitur | Deskripsi | Prioritas |
|---|---|---|
| **Manajemen Akun** | Tambah, edit, nonaktifkan akun pengguna (NIK, Email, Nama, Role, Plant, Work Group, Foto) | Wajib |
| **Master Plant** | Kelola data referensi unit fasilitas dan plant operasional Satoria Group (`/admin/plants`) | Wajib |
| **Master Machine** | Kelola data registrasi mesin utama dan komponen sub-mesin / suku cadang terpasang per plant (`/admin/machines`) | Wajib |
| **Master Group** | Kelola pengaturan jadwal shift kerja operasional serta grup/departemen spesialisasi engineering (`/admin/groups`) | Wajib |
| **Audit Trail** | Melihat log aktivitas pengguna (`user_activities`) untuk penelusuran aksi sensitif | Wajib |
| **Pengaturan Sistem** | Konfigurasi operasional dan pengaturan notifikasi email | Wajib |

---

## 6. Alur Bisnis Utama

### 6.1 Siklus Logbook & Approval

```mermaid
flowchart TD
    A[Teknisi Login] --> B[Isi Form Logbook Harian]
    B --> C{Aksi Simpan}
    C -->|Simpan Draft| D[Status: Draft]
    D --> B
    C -->|Kirim Logbook| E[Status: Pending]
    E --> F[Trigger Notifikasi Email / InApp ke Supervisor]
    F --> G[Supervisor Meninjau Logbook]
    G --> H{Keputusan Approval}
    H -->|Approve| I[Status: Approved]
    H -->|Reject + Catatan Revisi| J[Status: Rejected]
    I --> K[Notifikasi ke Teknisi & Masuk Laporan/Dashboard]
    J --> L[Notifikasi ke Teknisi]
    L --> M[Teknisi Perbaiki Logbook]
    M --> E
```

### 6.2 Siklus Notifikasi & Audit Trail

```mermaid
flowchart LR
    A[Pengguna Melakukan Akses/Aksi] --> B{Jenis Aksi}
    B -->|Aksi Sistem/Sensitif| C[Catat ke user_activities]
    B -->|Submit/Approval Logbook| D[Buat Data Notifikasi]
    D --> E[Kirim Email via Queue/SMTP & Simpan InApp Notification]
```

---

## 7. Arsitektur Teknologi

### 7.1 Ringkasan Stack

| Lapisan | Teknologi | Alasan |
|---|---|---|
| **Frontend** | Vue.js 3 (Composition API, `<script setup>`) | Lightweight, reaktif, modular |
| **Build Tool** | Vite | Server pengembangan ultra cepat, standar Vue modern |
| **UI Framework** | Tailwind CSS | Utility-first, konsisten, responsif |
| **Font UI** | Inter (paket `@fontsource/inter`) | Font sans-serif sesuai referensi UI (lihat Bagian 11.3) |
| **Ikon UI** | `lucide-vue-next` | Ikon garis (outline) sesuai referensi UI (lihat Bagian 11.8) |
| **Grafik UI** | Chart.js + `vue-chartjs` *(asumsi, dapat diganti)* | Area chart, donut, dan bar mini pada dashboard (lihat Bagian 11.5) |
| **Routing** | Vue Router | Single Page Application routing & Navigation Guards |
| **State Management** | Pinia | Managing state terpusat (Auth, Logbook, Master Data) |
| **Backend (Tahap 2)** | Node.js + Express / Fastify | REST API yang cepat dan terstruktur |
| **Database** | TiDB (SQL) | Distributed SQL, kompatibel MySQL, skalabel |
| **ORM / Query** | Prisma / Knex.js | Migrasi skema & akses database aman |
| **Auth** | JWT + bcrypt / argon2 | Autentikasi stateless & hashing kata sandi |
| **Deployment** | Vercel & TiDB Cloud | Hosting serverless & database cloud terkelola |

### 7.2 Realisasi Dua Tahap & Status Operasional

- **Tahap 1 (Selesai):** Pembangunan seluruh antarmuka pengguna (UI) & logika antarmuka yang terstandarisasi, responsif, dan telah diverifikasi.
- **Tahap 2 (Selesai):** Pembangunan Backend REST API Express.js, skema TiDB Cloud (Prisma ORM), autentikasi JWT & otorisasi RBAC ketat, pengiriman Notifikasi In-App & Email, Avatar Object Storage, dan eliminasi penuh data mock.
- **Fokus Operasional Saat Ini:** Pengujian keandalan & otorisasi (RBAC security test), integrasi CI otomatis (GitHub Actions `npm test` & `npm run build`), pemisahan environment database dev vs prod, monitoring galat Sentry, serta manajemen cadangan (*backup & disaster recovery*) TiDB Cloud.

---

## 8. Struktur Folder yang Direkomendasikan

Aplikasi menggunakan pendekatan **monorepo sederhana**:

```text
engineer-logbook-satoria/
├── README.md                    # Dokumen acuan tunggal proyek
├── .gitignore
├── docs/                        # Dokumentasi tambahan
│   ├── erd.md
│   └── api-spec.md
│
├── frontend/                    # Aplikasi Vue 3 + Vite
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── assets/              # CSS global, token desain (tokens.css), logo Satoria, ikon
│       ├── components/
│       │   ├── common/          # Button, Input, Select, Modal, Table, Badge, Toast, Card, IconButton, ProgressBar, Avatar
│       │   ├── layout/          # Sidebar, Navbar, PageHeader (+ NavItem, SidebarProfile, UserMenu, NotificationBell, RoleSwitcher)
│       │   ├── charts/          # Komponen grafik statistik dashboard (AreaChart, DonutChart, MiniBarChart)
│       │   └── dashboard/       # StatCard, StatisticsChartCard, StatusDonutCard, ProgressListCard, RecentTableCard, NotificationPanel, ActivityFeedPanel, CalendarCard
│       ├── layouts/             # AuthLayout.vue, MainLayout.vue
│       ├── views/
│       │   ├── auth/            # LoginView.vue
│       │   ├── teknisi/         # Dashboard, InputLogbook, RiwayatLogbook, DetailLogbook
│       │   ├── supervisor/      # Dashboard, ApprovalList, DetailApproval, LaporanTim
│       │   ├── admin/           # Dashboard, UserManagement, MasterData, AuditTrail
│       │   └── shared/          # ProfileView, SettingsView, NotFoundView, ForbiddenView
│       ├── router/
│       │   ├── index.js
│       │   └── guards.js        # Guard autentikasi & role (Teknisi/Supervisor/Admin)
│       ├── stores/              # Pinia stores: auth, logbook, master, notification
│       ├── services/            # Lapisan Abstraksi Data (Dummy -> API Axios)
│       │   ├── authService.js
│       │   ├── logbookService.js
│       │   ├── masterService.js
│       │   ├── reportService.js
│       │   └── auditService.js
│       ├── mock/                # DATA DUMMY TAHAP 1
│       │   ├── users.js
│       │   ├── logbooks.js
│       │   ├── masterData.js
│       │   └── auditLogs.js
│       ├── utils/               # Date formatter, durasi kalkulator, export helpers
│       └── constants/           # roles.js, logStatus.js, menu.js
│
└── backend/                     # Dibuat pada Tahap 2 (Node.js)
    ├── package.json
    ├── prisma/                  # Skema & migrasi TiDB
    │   └── schema.prisma
    └── src/
        ├── server.js
        ├── routes/              # auth, logbooks, approvals, master, reports, audit
        ├── controllers/
        ├── middlewares/         # auth, rbac, errorHandler
        ├── services/            # mailerService, logbookService, auditService
        └── utils/
```

---

## 9. Rancangan Data (Model & ERD Terbaru)

Database dirancang dengan **11 tabel utama** untuk mendukung seluruh transaksi operasional, approval, notifikasi, dan audit trail.

```mermaid
erDiagram
    ROLES ||--o{ USERS : "ditugaskan pada"
    WORK_GROUPS ||--o{ USERS : "memiliki anggota"
    PLANTS ||--o{ USERS : "lokasi kerja"
    USERS ||--o{ LOGBOOKS : "mencatat"
    PLANTS ||--o{ LOGBOOKS : "lokasi pekerjaan"
    SHIFTS ||--o{ LOGBOOKS : "jadwal pekerjaan"
    MACHINES ||--o{ LOGBOOKS : "objek pekerjaan"
    SUB_MACHINES ||--o{ LOGBOOKS : "bagian mesin"
    MACHINES ||--o{ SUB_MACHINES : "memiliki"
    LOGBOOKS ||--o{ LOGBOOK_APPROVALS : "memiliki riwayat"
    USERS ||--o{ LOGBOOK_APPROVALS : "diperiksa oleh"
    USERS ||--o{ USER_ACTIVITIES : "melakukan"
    USERS ||--o{ NOTIFICATIONS : "menerima"
    LOGBOOKS ||--o{ NOTIFICATIONS : "berkaitan dengan"

    USERS {
        bigint id PK
        string nik UK
        string email UK
        string full_name
        string password_hash
        bigint role_id FK
        bigint group_id FK
        bigint plant_id FK
        string photo_url
        boolean is_active
        datetime created_at
    }
    LOGBOOKS {
        bigint id PK
        bigint user_id FK
        bigint plant_id FK
        bigint shift_id FK
        bigint machine_id FK
        bigint sub_machine_id FK
        date task_date
        string sparepart
        text activity_description
        time start_time
        time end_time
        int duration_minutes
        enum status "DRAFT|PENDING|APPROVED|REJECTED|CANCELLED"
        datetime created_at
    }
    LOGBOOK_APPROVALS {
        bigint id PK
        bigint logbook_id FK
        bigint supervisor_id FK
        enum status "APPROVED|REJECTED"
        text notes
        datetime reviewed_at
    }
    NOTIFICATIONS {
        bigint id PK
        bigint user_id FK
        bigint logbook_id FK
        string type
        enum channel "EMAIL|INAPP"
        string recipient_email
        string subject
        text message
        string status
        text error_message
        datetime sent_at
        datetime read_at
    }
    USER_ACTIVITIES {
        bigint id PK
        bigint user_id FK
        string activity
        text detail
        datetime created_at
    }
```

### Rincian Tabel Master Data

1. **roles**: `id`, `name` (Admin, Supervisor, Teknisi), `description`.
2. **work_groups**: `id`, `name`.
3. **plants**: `id`, `name`.
4. **shifts**: `id`, `name`, `start_time`, `end_time`.
5. **machines**: `id`, `name` *(Rekomendasi penambahan `plant_id` FK)*.
6. **sub_machines**: `id`, `machine_id` FK, `name`.

---

## 10. Rancangan Halaman & Routing

| Path | Halaman | Hak Akses Peran |
|---|---|---|
| `/login` | Login Antarmuka | Publik |
| `/dashboard` | Dashboard Utama (Tampilan otomatis sesuai Peran) | Semua |
| `/logbook/input` | Form Input Logbook Harian | Teknisi |
| `/logbook/riwayat` | Daftar Logbook Saya & Status | Teknisi |
| `/logbook/edit/:id` | Edit Logbook (Draft / Rejected) | Teknisi |
| `/approval` | Daftar Pengajuan Approval Logbook | Supervisor |
| `/approval/detail/:id` | Detail Pemeriksaan & Action Approval | Supervisor |
| `/supervisor/teknisi` | Aktivitas & Frekuensi Logbook Teknisi Tim | Supervisor |
| `/laporan` | Ekspor Laporan Tim (PDF / Excel) | Supervisor |
| `/admin/users` | Manajemen Akun Pengguna | Admin |
| `/admin/plants` | Master Plant (Manajemen Fasilitas & Pabrik) | Admin |
| `/admin/machines` | Master Machine (Mesin Utama & Sub-Mesin) | Admin |
| `/admin/groups` | Master Group (Shift Kerja & Grup Kerja) | Admin |
| `/admin/master` | *Redirect ke `/admin/plants` (Kompatibilitas)* | Admin |
| `/admin/audit` | Audit Trail Activity Logs | Admin |
| `/profil` | Pengaturan Profil Pribadi & Kata Sandi | Semua |
| `/403` | Halaman Akses Ditolak (*Forbidden*) | Semua |
| `*` | Page Not Found | Semua |

---

## 11. Panduan Desain UI

> Bagian ini menggabungkan prinsip desain asli proyek dengan spesifikasi UI dari file referensi `UI-SPEC-dashboard-saildo.md` (selanjutnya disebut **Referensi UI**). Mulai versi 1.4, token dan pola visual pada Bagian 11 ini **menggantikan** token AdminCN yang tercatat pada Riwayat Versi 1.3.

### 11.1 Aturan Penggunaan Bagian Ini (untuk AI Agent)

1. Kata **WAJIB** = harus dipenuhi. **SEBAIKNYA** = rekomendasi. **OPSIONAL** = boleh dilewati.
2. **Hierarki sumber kebenaran:** (a) logika, peran, hak akses, rute, alur bisnis, model data, dan istilah bisnis mengikuti Bagian 1-10 dan 12-22 dokumen ini; (b) tampilan visual mengikuti Bagian 11 ini. Jika terjadi konflik, (a) menang untuk **konten dan perilaku**, Bagian 11 menang untuk **tampilan**.
3. Referensi UI adalah dashboard keuangan. **Jangan** menyalin konten, istilah, angka, atau fitur keuangan darinya (Earnings, Spend, Customer, kartu kredit, Balance, Quick Transfer, Send Money, Country, Order). Yang diambil hanya struktur layout, design token, dan pola komponen. Konten diganti dengan konten Satoria pada 11.6.
4. Seluruh teks antarmuka berbahasa Indonesia baku (Bagian 17). Teks berbahasa Inggris pada Referensi UI tidak dipakai.
5. Nama komponen mengikuti penamaan Bagian 8 (contoh: `Navbar`, bukan `Header`) dan berupa Vue SFC `PascalCase`.
6. Angka pada dashboard WAJIB dihitung dari data mock (`src/mock/`) melalui lapisan `services/`; dilarang menulis angka langsung (hardcode) di komponen.
7. Seluruh warna, radius, shadow, dan spasi WAJIB lewat token pada 11.3; tidak ada kode hex di dalam komponen.
8. Semua nilai px dan hex adalah **estimasi visual** dari gambar Referensi UI, bukan nilai dari file desain asli.
9. Dilarang menambah fitur, halaman, rute, tabel, atau peran yang tidak tercantum di dokumen ini. Hal yang tidak jelas dicatat di 11.12.

### 11.2 Prinsip Umum

1. **Branding & Tema:** Menggunakan identitas visual Satoria dengan warna primer profesional, diwujudkan melalui design token pada 11.3 (menggantikan token AdminCN versi 1.3).
2. **Responsivitas:** Wajib *Mobile-Friendly* untuk kenyamanan Teknisi saat menginput dari perangkat ponsel/tablet di area pabrik (*plant*).
3. **Status Badges:**
   - `Draft`: Abu-abu (*Gray*)
   - `Pending`: Kuning/Amber (*Warning*)
   - `Approved`: Hijau (*Success*)
   - `Rejected`: Merah (*Danger*)
   - `Cancelled`: Hitam/Gelap
4. **Kondisi UI Terkelola:** Loading skeleton, empty state (data kosong), validasi form real-time, toast notification success/error, dan modal konfirmasi aksi berbahaya.

### 11.3 Design Tokens

#### 11.3.1 Warna

| Token | Hex (estimasi) | Dipakai pada |
|---|---|---|
| `primary` | `#2563EB` | Menu aktif, tombol utama, garis grafik, bar sorotan, border input fokus, tautan |
| `primary-soft` | `#DBE7FB` | Bar non-aktif pada mini chart, area gradien grafik, latar badge informasi |
| `primary-text-on-soft` | `#3B6FD8` | Teks pada latar `primary-soft`, teks persen delta |
| `app` | `#F3F5F9` | Latar canvas di belakang kartu |
| `surface` | `#FFFFFF` | Kartu, sidebar, navbar |
| `muted` | `#F7F8FB` | Latar input pencarian/filter, panel sekunder, hover item |
| `line` | `#E6E9F0` | Border input, tombol sekunder, garis pemisah, grid grafik |
| `ink` | `#111827` | Judul, angka besar, teks utama |
| `ink-2` | `#6B7280` | Subjudul, label, header tabel |
| `ink-3` | `#9CA3AF` | Placeholder, sumbu grafik, tanggal bulan lain pada kalender |
| `success` | `#22A55B` | Status Approved, progress bar |
| `warning` | `#EAB308` | Status Pending, progress bar |
| `violet` | `#5B4BDB` | Progress bar |
| `orange` | `#F97316` | Badge jumlah notifikasi belum dibaca (`#F59E0B`) |
| `danger` | `#EF4444` | Status Rejected, pesan error |
| `row-blue` | `#EAF1FD` | Latar baris legend tersorot |
| `row-red` | `#FDECEC` | Latar baris legend tersorot (status Rejected) |

> Jika Satoria memiliki nilai warna resmi, ganti di satu tempat saja (`tokens.css` dan `tailwind.config.js`).

#### 11.3.2 Warna Status Logbook

Referensi UI tidak memuat status logbook. Nilai di bawah adalah keputusan implementasi yang mengikuti pemetaan warna pada 11.2 butir 3.

| Status | Latar badge | Teks badge | Warna segmen donut / titik legend |
|---|---|---|---|
| `Draft` | `#F3F4F6` | `#4B5563` | `#9CA3AF` |
| `Pending` | `#FEF3C7` | `#B45309` | `#EAB308` |
| `Approved` | `#DCFCE7` | `#15803D` | `#22A55B` |
| `Rejected` | `#FEE2E2` | `#B91C1C` | `#EF4444` |
| `Cancelled` | `#1F2937` | `#FFFFFF` | `#374151` |

Badge status: tinggi ± 22 px, padding horizontal 8 px, radius `sm` (6 px) atau pill, teks 11-12 px bobot 500. Label teks status WAJIB tampil (warna tidak boleh menjadi satu-satunya pembeda).

#### 11.3.3 Tipografi

Font: **Inter** (fallback `system-ui, sans-serif`).

| Role | Ukuran | Bobot | Line-height | Dipakai pada |
|---|---|---|---|---|
| `title-page` | 18 px | 600 | 24 px | Judul halaman pada Navbar |
| `subtitle-page` | 12 px | 400 | 16 px | Subjudul halaman |
| `card-title-lg` | 18 px | 600 | 24 px | Judul kartu besar |
| `card-title-md` | 16 px | 600 | 22 px | Judul kartu kecil |
| `stat-value` | 18 px | 600 | 24 px | Angka pada StatCard |
| `stat-label` | 12 px | 400 | 16 px | Label StatCard |
| `stat-delta` | 12 px | 500 | 16 px | Persentase perubahan |
| `nav-item` | 14 px | 500 | 20 px | Item menu sidebar |
| `nav-section-label` | 12 px | 400 | 16 px | Label seksi sidebar |
| `body` | 13 px | 400 | 18 px | Teks legend, baris daftar, isi tabel |
| `caption` | 11 px | 400 | 14 px | Sumbu grafik, keterangan tooltip |
| `input-value` | 14 px | 500 | 20 px | Isi input dan select |
| `button` | 14 px | 500 | 20 px | Teks tombol |

#### 11.3.4 Spasi, Radius, Shadow, Border

| Token | Nilai | Pemakaian |
|---|---|---|
| `space-1` / `2` / `3` / `4` / `5` / `6` | 4 / 8 / 12 / 16 / 20 / 24 px | Skala spasi (gap antar kartu = `space-4`; padding kartu = 16-24 px; jarak antar item menu = 8 px) |
| `radius-sm` | 6 px | Badge, tombol kecil, bar mini |
| `radius-md` | 8 px | Item menu aktif, input, select, tombol |
| `radius-lg` | 12 px | Kartu konten |
| `radius-xl` | 16 px | Thumbnail dan elemen besar |
| `radius-full` | 9999 px | Tombol ikon bulat, avatar |
| `shadow-card` | `0 1px 2px rgba(16,24,40,0.04)` | Kartu (nyaris datar) |
| `shadow-tooltip` | `0 4px 12px rgba(16,24,40,0.10)` | Tooltip grafik, popover dropdown |
| Border kartu | tanpa border (SEBAIKNYA); pembeda lewat kontras `surface` terhadap `app` | Kartu |
| Border kontrol | 1 px `line` | Input, select, tombol sekunder |
| Border fokus | 1.5 px `primary` | Input dalam state fokus |

#### 11.3.5 Konfigurasi Tailwind

```js
// frontend/tailwind.config.js (potongan)
export default {
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', soft: '#DBE7FB' },
        app: '#F3F5F9',
        surface: '#FFFFFF',
        muted: '#F7F8FB',
        line: '#E6E9F0',
        ink: { DEFAULT: '#111827', 2: '#6B7280', 3: '#9CA3AF' },
        success: '#22A55B',
        warning: '#EAB308',
        violet: '#5B4BDB',
        orange: '#F97316',
        danger: '#EF4444',
        status: {
          draft:     { bg: '#F3F4F6', fg: '#4B5563' },
          pending:   { bg: '#FEF3C7', fg: '#B45309' },
          approved:  { bg: '#DCFCE7', fg: '#15803D' },
          rejected:  { bg: '#FEE2E2', fg: '#B91C1C' },
          cancelled: { bg: '#1F2937', fg: '#FFFFFF' },
        },
      },
      borderRadius: { sm: '6px', md: '8px', lg: '12px', xl: '16px' },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04)',
        tooltip: '0 4px 12px rgba(16,24,40,0.10)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
}
```

Nilai yang sama WAJIB juga tersedia sebagai CSS variable di `src/assets/tokens.css` untuk dipakai library grafik (Chart.js tidak membaca kelas Tailwind).

### 11.4 Layout Global (`MainLayout.vue`)

Berlaku untuk semua halaman setelah login. `AuthLayout.vue` (halaman `/login`) tidak termasuk dan memakai token yang sama tanpa sidebar/navbar.

```
+-----------+----------------------------------------------------------+
| SIDEBAR   | NAVBAR (tinggi ± 70 px)                                  |
| ± 208 px  +--------------------------------------+-------------------+
| (tetap,   | KOLOM UTAMA (fleksibel)              | KOLOM KANAN       |
| putih)    |  - Baris 3 StatCard                  | ± 288 px          |
|           |  - Kartu grafik tren                 |  - Panel 1        |
|           |  - Baris: Donut status + Progress    |  - Panel 2        |
|           |  - Kartu tabel terbaru               |                   |
+-----------+--------------------------------------+-------------------+
```

| Properti | Nilai |
|---|---|
| Lebar sidebar | 208 px (`w-52`) |
| Tinggi navbar | 70 px |
| Padding area konten | 16-18 px |
| Gap antar kartu | 16 px |
| Kolom kanan | lebar tetap 288 px (hanya pada halaman Dashboard) |
| Kolom utama | `flex-1`, `min-w-0` |
| Baris 1 | 3 kolom sama lebar (`grid-cols-3`), tinggi kartu ± 88 px |
| Baris 2 | 1 kolom penuh (kartu tren), tinggi ± 266 px |
| Baris 3 | 2 kolom: donut status ± 62% dan daftar progress ± 38%, tinggi ± 190 px |
| Baris 4 | 1 kolom penuh (tabel terbaru) |
| Scroll | Sidebar `sticky`/`fixed` setinggi 100vh dengan scroll internal; Navbar `sticky top-0` (SEBAIKNYA); konten scroll vertikal |

Halaman non-dashboard (Input Logbook, Riwayat, Approval, Laporan, Manajemen Akun, Master Data, Audit Trail, Profil) memakai Sidebar dan Navbar yang sama dan **satu kolom konten penuh** (tanpa kolom kanan), dengan isi berupa kartu putih `rounded-lg` di atas canvas `app`.

```html
<div class="flex min-h-screen bg-app">
  <aside class="hidden md:flex w-52 shrink-0 flex-col bg-surface"> ... </aside>
  <div class="flex-1 min-w-0">
    <header class="h-[70px] bg-surface px-4 flex items-center gap-4"> ... </header>
    <main class="p-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_288px]">
      <section class="grid gap-4 min-w-0"> ... </section>
      <aside class="grid gap-4 content-start md:grid-cols-2 xl:grid-cols-1"> ... </aside>
    </main>
  </div>
</div>
```

### 11.5 Spesifikasi Komponen

#### 11.5.1 Sidebar (`components/layout/Sidebar.vue`)

| Elemen | Spesifikasi |
|---|---|
| Latar | `surface`; pemisah ke konten lewat kontras warna (border kanan 1 px `line` OPSIONAL) |
| Logo | Ikon (SVG placeholder, 24 px) + teks "Satoria" 20 px bobot 600 warna `ink`. Logo asli Satoria menggantikan placeholder bila tersedia di `assets/` (lihat 11.12 U-2) |
| Tombol collapse | Chevron kiri kecil berwarna `primary` di tepi kanan sidebar sejajar navbar; fungsi: collapse sidebar menjadi mode ikon |
| Label seksi | "Menu" dan "Akun", 12 px, `ink-3`, margin bawah 8 px |
| Item menu | Tinggi ± 34 px, padding horizontal 12 px, radius 8 px, ikon 18 px + gap 12 px + teks 14 px |
| Item aktif | Latar `primary`, teks dan ikon putih, bobot 500, `aria-current="page"` |
| Item default | Latar transparan, teks dan ikon `ink` |
| Profil bawah (`SidebarProfile`) | Avatar bulat 32 px + nama (13 px, 600) + email (11 px, `ink-2`) + ikon keluar (logout) di kanan |

Daftar menu per peran (rute mengikuti Bagian 10; WAJIB disimpan di `constants/menu.js` dan difilter berdasarkan peran):

| Peran | Seksi | Label menu | Rute | Ikon (lucide, saran) |
|---|---|---|---|---|
| Semua | Menu | Dashboard | `/dashboard` | `LayoutGrid` |
| Teknisi | Menu | Input Logbook | `/logbook/input` | `SquarePen` |
| Teknisi | Menu | Riwayat Logbook | `/logbook/riwayat` | `ClipboardList` |
| Supervisor | Menu | Approval Logbook | `/approval` | `ClipboardCheck` |
| Supervisor | Menu | Laporan Tim | `/laporan` | `FileBarChart` |
| Admin | Menu | Manajemen Akun | `/admin/users` | `Users` |
| Admin | Menu | Master Data | `/admin/master` | `Database` |
| Admin | Menu | Audit Trail | `/admin/audit` | `ScrollText` |
| Semua | Akun | Profil | `/profil` | `UserCircle` |

- Rute `/logbook/edit/:id` mengaktifkan menu "Riwayat Logbook"; rute `/approval/detail/:id` mengaktifkan menu "Approval Logbook".
- Tidak ada submenu (tidak ada chevron-down pada item menu).
- Nama ikon dapat menyesuaikan versi `lucide-vue-next` yang terpasang.

#### 11.5.2 Navbar (`components/layout/Navbar.vue` dan `PageHeader.vue`)

| Elemen | Spesifikasi |
|---|---|
| Latar | `surface`, tinggi 70 px, padding horizontal 16-18 px |
| `PageHeader` | Judul halaman (`title-page`) di atas dan subjudul (`subtitle-page`, `ink-2`) di bawah, rata kiri. Contoh subjudul dashboard: "Ringkasan aktivitas logbook Anda" |
| `RoleSwitcher` | Select kecil (tinggi 34 px, latar `muted`, radius 8) untuk beralih peran Teknisi/Supervisor/Admin. **Wajib dipertahankan** (Bagian 12, Fase 1 butir 1), hanya tampil pada mode pengembangan Tahap 1 |
| `NotificationBell` | Tombol ikon bulat 34 px, border 1 px `line`, ikon `Bell`, badge angka `orange` (± 12 px, pojok kanan atas) berisi jumlah notifikasi InApp belum dibaca; badge disembunyikan jika 0 |
| Pemisah | Garis vertikal 1 px `line`, tinggi 36 px |
| `UserMenu` | Avatar bulat 28-30 px + nama (13 px, 600) + email (11 px, `ink-2`) + chevron-down. Popover berisi "Profil Saya" (`/profil`) dan "Keluar" |
| Hamburger | Hanya di bawah `md`: membuka sidebar sebagai drawer |

#### 11.5.3 `StatCard` (3 instance pada baris 1)

| Properti | Nilai |
|---|---|
| Ukuran | ± 180 × 88 px, radius 12, padding 12-16 px, latar `surface`, `shadow-card` |
| Kiri atas | Label (`stat-label`, `ink-2`) |
| Kiri tengah | Nilai (`stat-value`) |
| Kiri bawah | Badge delta: ikon panah-tren dalam kotak kecil (± 14 px, radius 4, border `primary`) + teks persentase `primary`. Persentase dibandingkan periode sebelumnya dari data mock; jika data pembanding tidak ada, badge disembunyikan |
| Kanan | `MiniBarChart`: bar vertikal lebar ± 10 px, gap ± 6 px, radius 3. Bar terakhir (hari ini) berwarna `primary`, bar lain `primary-soft`. Jumlah bar = 7 (aktivitas 7 hari terakhir, sesuai Riwayat Versi 1.3) |
| Varian meter | Untuk kartu "Teknisi Aktif" (Supervisor): `MiniBarChart` diganti `ProgressBar` (tinggi 8 px, radius 4, fill `primary`, track `primary-soft`) dengan teks "aktif / total" |

#### 11.5.4 `StatisticsChartCard` (tren aktivitas)

| Elemen | Spesifikasi |
|---|---|
| Header | Judul (`card-title-lg`) kiri; label rentang data kanan (contoh "Jan - Des 2026") + ikon kalender, border 1 px `line`, radius 8, tinggi 30 px. Pada Fase 1 label bersifat statis (OPSIONAL dibuat interaktif) |
| Jenis grafik | Area chart, satu garis `primary` (stroke 1.5-2 px), kurva **linear** (garis patah, bukan smooth) |
| Isi area | Gradien vertikal `primary` opasitas ± 0.20 di atas menjadi transparan di bawah |
| Grid | Garis horizontal dan vertikal putus-putus (dashed), warna `line` |
| Sumbu Y | 5-6 label kelipatan rapi, mulai dari 0, teks `caption` `ink-3`; skala otomatis mengikuti nilai tertinggi data |
| Sumbu X | 12 label bulan: Jan, Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des |
| Sorotan | Kolom vertikal gradien (lebar ± 18 px, `primary` pekat di atas memudar ke bawah) dan titik bulat putih bergaris biru pada bulan terpilih. Bulan terpilih awal = bulan berjalan |
| Tooltip | Kotak putih, radius 8, `shadow-tooltip`, di atas titik terpilih. Baris 1: jumlah logbook (`primary`, 13 px, 600). Baris 2: keterangan "Total logbook" (`ink-3`, 11 px). Penanda kotak biru kecil (± 18 × 18 px, radius 3) di atas tooltip |
| Interaksi | Hover/tap pada titik atau kolom memindahkan sorotan dan tooltip |

#### 11.5.5 `StatusDonutCard` (distribusi status logbook)

| Elemen | Spesifikasi |
|---|---|
| Header | Judul kiri; dropdown periode kanan (border 1 px `line`, radius 8, chevron-down, tinggi 28 px); opsi: "Bulanan", "Tahunan"; bawaan "Bulanan" |
| Donut | Diameter luar ± 92 px, radius dalam ± 28 px, tebal ring ± 20-24 px. Label persen putih (10 px, 600) di dalam segmen; label **disembunyikan** jika segmen < 8% |
| Segmen | 5 status logbook dengan warna pada 11.3.2 |
| Legend | Daftar di kanan donut; tiap baris: titik warna 6 px, teks "Status (persen%)", nilai jumlah rata kanan. Baris dengan status `Approved` dan `Rejected` boleh diberi latar tint `row-blue` / `row-red` sebagai sorotan. Status dengan jumlah 0 tetap tampil |

#### 11.5.6 `ProgressListCard` (rasio persetujuan per kelompok)

| Elemen | Spesifikasi |
|---|---|
| Header | Judul (`card-title-md`) kiri; ikon tiga titik horizontal (`MoreHorizontal`) kanan (visual saja) |
| Baris | Nama kelompok (13 px, 500) di kiri atas; persen rata kanan; progress bar di bawah nama (tinggi ± 10 px, radius 3, track `#EEF0F4`) |
| Warna fill | Berurutan siklus: `success`, `warning`, `violet`, `primary` |
| Isi | Persentase = logbook berstatus `Approved` ÷ total logbook pada kelompok × 100 (dibulatkan). Kelompok: **Shift** untuk Teknisi, **Plant** untuk Supervisor dan Admin |
| Label teks | Persen WAJIB tampil sebagai teks (tidak hanya warna) |

#### 11.5.7 `RecentTableCard` (tabel ringkas)

| Elemen | Spesifikasi |
|---|---|
| Header | Judul kiri; tombol "Lihat Semua" kanan (border 1 px `line`, radius 8, chevron-right, tinggi 32 px, teks 13 px) menuju rute pada 11.6 |
| Header tabel | Teks 13 px bobot 500 `ink`, diikuti ikon sort (panah atas-bawah, 12 px). Klik header mengurutkan baris (client-side atas data mock) |
| Baris | Maksimal 5 baris. Teks `body`; kolom status memakai badge 11.3.2. Garis pemisah antar baris 1 px `line` |
| Empty state | Pesan "Belum ada data" + ikon, tinggi minimal 120 px |
| Loading | Skeleton 5 baris |

#### 11.5.8 `NotificationPanel` (kolom kanan)

| Elemen | Spesifikasi |
|---|---|
| Kartu | `surface`, radius 12, padding 16 px; judul "Notifikasi" (`card-title-lg`) |
| Item | Ikon bulat 28 px, teks pesan (`body`, maksimal 2 baris), waktu relatif (`caption`, `ink-3`). Item belum dibaca (`read_at` kosong) diberi titik `primary` 6 px dan latar `row-blue` |
| Sumber data | Notifikasi berkanal `INAPP` milik pengguna aktif (Bagian 9, tabel `notifications`) |
| Klik item | Menandai dibaca pada state UI/mock dan membuka halaman logbook terkait sesuai peran (Teknisi: `/logbook/riwayat`, atau `/logbook/edit/:id` bila ditolak; Supervisor: `/approval/detail/:id`) |
| Kosong | "Tidak ada notifikasi" |

#### 11.5.9 `ActivityFeedPanel` (kolom kanan, khusus Supervisor)

| Elemen | Spesifikasi |
|---|---|
| Kartu | Sama dengan `NotificationPanel`; judul "Aktivitas Terbaru" |
| Item | Avatar/inisial 28 px, kalimat singkat (contoh: "{Teknisi} mengajukan logbook {Mesin}"), waktu relatif |
| Sumber data | Diturunkan dari logbook dan riwayat approval pada tim (BUKAN dari `user_activities`, karena Audit Trail hanya untuk Admin, Bagian 4) |

#### 11.5.10 `CalendarCard` (kolom kanan, Teknisi dan Admin)

| Elemen | Spesifikasi |
|---|---|
| Header | Judul "Pilih Tanggal" kiri; dropdown nama bulan kanan (border 1 px `line`, radius 8) |
| Baris hari | `Sn Sl Rb Km Jm Sb Mg` (12 px, 500, `ink`); minggu dimulai **Senin** |
| Sel tanggal | Grid 7 kolom, tinggi sel ± 32 px, angka 12 px rata tengah |
| Tanggal bulan lain | `ink-3` |
| Hari ini | Kotak outline 1 px `primary`, radius 4, teks `primary` |
| Tanggal memiliki logbook | Titik kecil 4 px `primary` di bawah angka (dihitung dari `task_date` pada mock) |
| Tanggal dipilih | Latar `primary`, teks putih. Memilih tanggal memfilter baris `RecentTableCard` pada halaman yang sama (client-side). Fungsi filter ini OPSIONAL; bila tidak dibuat, kalender hanya bersifat tampilan |
| Data | Menerima props `month` dan `year`; nilai bawaan = bulan dan tahun berjalan (`new Date()`); WAJIB menampilkan seluruh baris bulan (5-6 baris) |

#### 11.5.11 Komponen umum (`components/common/`)

| Komponen | Spesifikasi |
|---|---|
| `Card` | `surface`, radius 12, padding 16 px, `shadow-card` |
| `Button` primary | Latar `primary`, teks putih, radius 8, tinggi 40 px (varian kecil 32 px) |
| `Button` secondary | Latar `surface`, border 1 px `line`, teks `ink`, radius 8 |
| `Input` / `Select` | Tinggi 40 px, radius 8, border 1 px `line`, teks `input-value`; label di atas (13-14 px, 500) |
| `Badge` | Lihat 11.3.2 |
| `IconButton` | Bulat 34 px, border 1 px `line`, ikon 18 px |
| `Avatar` | Bulat; foto dari `photo_url`, cadangan berupa inisial nama. Dilarang memakai foto dari gambar Referensi UI |
| `Toast`, `Modal` | Radius 12, `shadow-tooltip`, latar `surface` |

Halaman non-dashboard memakai komponen umum ini. Referensi UI tidak memuat tata letak halaman form/tabel/modal, sehingga tata letak detail halaman tersebut mengikuti kebutuhan fitur pada Bagian 5 dengan pola: kartu putih di atas canvas `app`, judul kartu `card-title-lg`, tombol utama di kanan atas kartu, tabel dengan gaya `RecentTableCard`.

### 11.6 Pemetaan Konten Dashboard per Peran

Rute dashboard tetap `/dashboard` (Bagian 10); isi menyesuaikan peran. Semua angka dihitung dari mock.

| Slot UI | Teknisi (pribadi) | Supervisor (tim / plant) | Admin (sistem) |
|---|---|---|---|
| StatCard 1 | Total Logbook | Pending (menunggu tinjauan) | Total Pengguna |
| StatCard 2 | Pending | Approved | Pengguna Aktif |
| StatCard 3 | Ditolak (perlu revisi) | Teknisi Aktif (varian meter) | Total Logbook |
| Kartu grafik tren | "Tren Aktivitas" (logbook milik sendiri per bulan) | "Tren Aktivitas Tim" | "Tren Aktivitas Sistem" |
| Kartu donut | "Status Logbook" (milik sendiri) | "Status Logbook Tim" | "Status Logbook Sistem" |
| Kartu progress | "Persetujuan per Shift" | "Persetujuan per Plant" (4 plant, sesuai versi 1.3) | "Persetujuan per Plant" |
| Tabel ringkas | "Logbook Terbaru": Tanggal, Mesin, Shift, Durasi, Status; "Lihat Semua" → `/logbook/riwayat` | "Pengajuan Pending": Teknisi, Tanggal, Mesin, Plant, tombol "Tinjau" → `/approval/detail/:id`; "Lihat Semua" → `/approval` | "Aktivitas Pengguna Terbaru": Pengguna, Aktivitas, Waktu (dari `user_activities`); "Lihat Semua" → `/admin/audit` |
| Kolom kanan atas | `NotificationPanel` | `NotificationPanel` | `NotificationPanel` |
| Kolom kanan bawah | `CalendarCard` | `ActivityFeedPanel` | `CalendarCard` |

Aturan data:
- Teknisi hanya melihat logbook miliknya; Supervisor melihat logbook timnya; Admin melihat seluruh sistem. Pembatasan ini mengikuti Bagian 4 dan WAJIB diterapkan pada service/mock, bukan hanya di tampilan.
- Delta persentase pada StatCard dihitung terhadap periode sebelumnya yang sama panjang.
- Teks "Persetujuan per ..." menampilkan rasio `Approved` terhadap total pada kelompok tersebut (lihat 11.5.6).

### 11.7 Component Tree

```
<MainLayout>
├── <Sidebar>
│   ├── <Logo />
│   ├── <SidebarCollapseButton />
│   ├── <NavSection label="Menu"> <NavItem /> ×n (sesuai peran, 11.5.1) </NavSection>
│   ├── <NavSection label="Akun"> <NavItem to="/profil" /> </NavSection>
│   └── <SidebarProfile />
├── <Navbar>
│   ├── <PageHeader title subtitle />
│   ├── <RoleSwitcher />            (hanya mode pengembangan Tahap 1)
│   ├── <NotificationBell badge />
│   └── <UserMenu />
└── <RouterView>
    └── (Halaman Dashboard)
        ├── <MainColumn>
        │   ├── <StatCardRow> <StatCard /> ×3 (+ <MiniBarChart /> atau <ProgressBar />) </StatCardRow>
        │   ├── <StatisticsChartCard> <AreaChart /> + tooltip </StatisticsChartCard>
        │   ├── <SplitRow>
        │   │   ├── <StatusDonutCard> <DonutChart /> + legend </StatusDonutCard>
        │   │   └── <ProgressListCard> <ProgressBar /> ×n </ProgressListCard>
        │   └── <RecentTableCard> <Table /> + sort </RecentTableCard>
        └── <RightColumn>
            ├── <NotificationPanel />
            └── <CalendarCard /> atau <ActivityFeedPanel />
```

### 11.8 Ikon dan State Interaksi

**Ikon:** gaya outline, stroke ± 1.5 px, sudut membulat; ukuran nav 18 px, navbar 18 px, ikon kecil dalam input/dropdown 14-16 px. Warna default `ink`/`ink-2`; ikon item aktif putih. Pustaka: `lucide-vue-next`. Ikon custom hanya untuk logo.

State yang tampak pada gambar Referensi UI bersifat pasti; state bertanda (A) adalah default yang wajar.

| Komponen | State | Spesifikasi |
|---|---|---|
| NavItem | default | Teks/ikon `ink`, latar transparan |
| NavItem | active | Latar `primary`, teks/ikon putih |
| NavItem | hover (A) | Latar `muted` |
| NavItem | focus-visible (A) | Ring 2 px `primary` offset 2 px |
| Button primary | default / hover (A) / disabled (A) | `primary` / `#1D4ED8` / opasitas 0.5 + `cursor-not-allowed` |
| Input | focus | Border 1.5 px `primary` |
| Input | error (A) | Border `danger` + pesan bantuan 12 px `danger` |
| IconButton | hover (A) | Latar `muted` |
| Chart | hover | Tooltip dan kolom sorotan mengikuti bulan yang di-hover |
| Select / Dropdown | open (A) | Popover putih radius 8 `shadow-tooltip`, item hover `muted` |
| Kalender | hari ini | Outline `primary` |
| Kalender | dipilih (A) | Latar `primary`, teks putih |
| Panel notifikasi | belum dibaca (A) | Titik `primary` + latar `row-blue` |
| Semua kartu data | loading / empty | Skeleton / pesan kosong (Bagian 11.2 butir 4) |

Transisi bawaan: 150 ms `ease-out`.

### 11.9 Responsivitas dan Aksesibilitas

Gambar Referensi UI hanya memperlihatkan tampilan desktop; aturan di bawah adalah keputusan implementasi.

| Breakpoint | Lebar | Perilaku |
|---|---|---|
| `xl` | ≥ 1280 px | Persis seperti 11.4: sidebar 208 px + kolom utama + kolom kanan 288 px |
| `lg` | 1024-1279 px | Sidebar tetap; kolom kanan pindah di bawah kolom utama sebagai grid 2 kolom |
| `md` | 768-1023 px | Sidebar mode ikon (± 72 px) atau drawer; StatCard tetap 3 kolom; donut dan progress menjadi 1 kolom |
| `sm` | 640-767 px | Sidebar menjadi drawer off-canvas dengan hamburger pada navbar; StatCard 2 kolom |
| `base` | < 640 px | Semua 1 kolom; email pada `UserMenu` disembunyikan; `RoleSwitcher` berpindah ke dalam popover `UserMenu`; tabel dapat di-scroll horizontal (`overflow-x-auto`). Form Input Logbook WAJIB nyaman dipakai di lebar 360 px |

Aksesibilitas (WAJIB kecuali ditandai SEBAIKNYA):
1. Gunakan elemen semantik: `<nav aria-label="Menu utama">`, `<header>`, `<main>`, `<aside>`, `<table>` untuk tabel.
2. Item sidebar aktif memakai `aria-current="page"`.
3. Tombol ikon tanpa teks (lonceng, tutup, menu, logout, tiga titik) WAJIB punya `aria-label`.
4. Tombol lonceng: `aria-label="{n} notifikasi belum dibaca"`.
5. Setiap input punya `<label>` terhubung (`for`/`id`); pesan error memakai `aria-describedby`.
6. Grafik: `role="img"` dengan `aria-label` ringkasan, disertai tabel data tersembunyi visual (`sr-only`) sebagai alternatif.
7. Kontras: `ink-3` (`#9CA3AF`) di atas putih tidak memenuhi 4.5:1; hanya untuk placeholder, sumbu, dan teks tidak esensial. Status, donut, dan progress tidak boleh mengandalkan warna saja (label teks tetap tampil).
8. Fokus keyboard terlihat (ring 2 px `primary`) pada semua elemen interaktif.
9. Kalender: navigasi dengan tombol panah, `role="grid"`, sel `role="gridcell"`.
10. Hormati `prefers-reduced-motion` untuk animasi grafik.

### 11.10 Urutan Prioritas Implementasi UI

| Langkah | Tugas | Hasil yang diverifikasi |
|---|---|---|
| 1 | Pasang Inter, `lucide-vue-next`, Chart.js + `vue-chartjs`; buat `tokens.css` dan perbarui `tailwind.config.js` (11.3.5); hapus sisa token AdminCN | Token tersedia, tidak ada hex di komponen |
| 2 | Komponen umum (11.5.11) dan `Badge` status (11.3.2) | Semua variasi tampil benar |
| 3 | `MainLayout`, `Sidebar` (menu per peran, `constants/menu.js`), `Navbar` (termasuk `RoleSwitcher`) | Navigasi dan menu aktif sesuai rute dan peran |
| 4 | `StatCard` + `MiniBarChart` | 3 kartu per peran sesuai 11.6 |
| 5 | `StatisticsChartCard` | Area chart, tooltip, sorotan bulan |
| 6 | `StatusDonutCard` dan `ProgressListCard` | Donut, legend, progress |
| 7 | `RecentTableCard` (tiga varian per peran) | Tabel dengan sort, empty state, skeleton |
| 8 | `NotificationPanel`, `CalendarCard`, `ActivityFeedPanel` | Kolom kanan sesuai peran |
| 9 | Terapkan komponen dan token pada seluruh halaman non-dashboard (11.5.11) | Tampilan konsisten di semua rute pada Bagian 10 |
| 10 | State hover/focus/disabled/error, loading dan empty state | State pada 11.8 terpenuhi |
| 11 | Responsivitas dan aksesibilitas (11.9) | Lolos checklist |
| 12 | `npm run build` dan pemeriksaan acceptance criteria (11.11) | Semua kriteria terpenuhi |

### 11.11 Acceptance Criteria UI

Diuji pada viewport 1280-1440 px kecuali dinyatakan lain.

- [ ] UI-1: Sidebar 208 px (±4), tinggi penuh viewport, latar putih; Navbar 70 px (±4); kolom kanan dashboard 288 px (±4); gap antar kartu 16 px.
- [ ] UI-2: Menu sidebar sesuai tabel 11.5.1 untuk masing-masing dari 3 peran; item aktif berwarna `primary` dengan teks putih dan `aria-current="page"`; tidak ada item di luar tabel.
- [ ] UI-3: Navbar memuat `PageHeader`, `RoleSwitcher` (mode pengembangan), `NotificationBell` dengan badge jumlah belum dibaca, dan `UserMenu` dengan urutan tersebut.
- [ ] UI-4: Dashboard tiap peran menampilkan slot sesuai tabel 11.6, dengan urutan kartu: 3 StatCard → tren → (donut + progress) → tabel ringkas; kolom kanan sesuai peran.
- [ ] UI-5: Semua angka dashboard berasal dari mock/service dan berubah saat data mock berubah; tidak ada angka hardcode di komponen.
- [ ] UI-6: Grafik tren berupa area chart linear dengan gradien, grid putus-putus, 12 label bulan berbahasa Indonesia, sorotan dan tooltip pada bulan berjalan saat render pertama, dan tooltip berpindah saat hover.
- [ ] UI-7: Donut menampilkan 5 status dengan warna 11.3.2, label persen di segmen ≥ 8%, dan legend memuat seluruh 5 status.
- [ ] UI-8: Badge status pada seluruh halaman memakai warna dan label 11.3.2.
- [ ] UI-9: Tabel ringkas menampilkan maksimal 5 baris, sort pada header berfungsi, empty state dan skeleton tersedia, tombol "Lihat Semua" menuju rute yang benar (11.6).
- [ ] UI-10: Hak akses pada dashboard: Teknisi tidak melihat data pengguna lain, Supervisor tidak melihat `user_activities`, Admin melihat data sistem.
- [ ] UI-11: Kalender menampilkan bulan berjalan dengan minggu dimulai Senin, hari ini ter-outline, dan seluruh baris bulan tampil.
- [ ] UI-12: Seluruh warna/radius/shadow berasal dari token; pencarian `#` pada `src/components` dan `src/views` tidak menemukan hex di luar file token/konfigurasi grafik.
- [ ] UI-13: Font Inter terpakai; ukuran teks sesuai 11.3.3 (±1 px).
- [ ] UI-14: Tidak ada scroll horizontal halaman pada lebar 360, 768, 1024, 1440 px (kecuali tabel di dalam wadah scroll); perilaku tiap breakpoint sesuai 11.9; form Input Logbook dapat dipakai pada 360 px.
- [ ] UI-15: Seluruh poin aksesibilitas pada 11.9 terpenuhi; Lighthouse Accessibility ≥ 90.
- [ ] UI-16: Seluruh halaman pada Bagian 10 (termasuk `/403` dan `*`) memakai token dan komponen umum yang sama.
- [ ] UI-17: `npm run build` sukses tanpa error; logika, rute, model data, dan akun dummy tidak berubah dibanding versi 1.3.

### 11.12 Asumsi UI dan Elemen Referensi yang Tidak Diterapkan

**Asumsi (belum dapat dipastikan dari gambar atau dokumen):**

| ID | Asumsi | Tindakan agent |
|---|---|---|
| U-1 | Seluruh nilai px dan hex adalah estimasi dari gambar yang kemungkinan telah di-scale dan dikompresi | Gunakan token 11.3; boleh disesuaikan ±2 px selama kriteria 11.11 terpenuhi |
| U-2 | Referensi UI menampilkan merek "Saildo" dan "Taildo" yang tidak konsisten dan bukan merek proyek ini | Gunakan "Satoria" dan "Engineer Logbook". Logo berupa SVG placeholder; ganti dengan logo asli bila diberikan. Tanda titik berwarna pada logo tidak dipakai |
| U-3 | Warna status logbook tidak ada pada gambar | Gunakan nilai 11.3.2, minta konfirmasi bila Satoria memiliki palet resmi |
| U-4 | Pemetaan konten dashboard (11.6), terutama isi tiap StatCard, definisi persentase "Persetujuan per ...", dan dashboard Admin, adalah usulan karena Bagian 5 hanya menyebut cakupan umum | Implementasikan sesuai 11.6; tandai `TODO(konfirmasi)` pada kode |
| U-5 | Grafik pada Referensi UI memakai rentang Jan-Des; label rentang tanggal pada kartu tren bersifat statis pada Fase 1 | Interaktif bersifat OPSIONAL |
| U-6 | Library grafik pada Vue tidak ditentukan | Chart.js + `vue-chartjs`; boleh diganti (misal ApexCharts) selama tampilan sesuai 11.5 |
| U-7 | Tampilan responsif, transisi, dan state (A) tidak terlihat pada gambar statis | Ikuti 11.8 dan 11.9 |
| U-8 | Tata letak halaman non-dashboard (form, tabel penuh, modal) tidak ada pada Referensi UI | Ikuti pola 11.5.11; jangan menambah fitur di luar Bagian 5 |
| U-9 | Fitur "Pengaturan Sistem" (Bagian 5.3) tidak memiliki rute pada Bagian 10 | Tidak dimasukkan ke menu sampai rute ditetapkan |
| U-10 | Foto avatar dan thumbnail pada gambar adalah foto orang | Gunakan `photo_url` atau inisial; jangan memakai foto dari gambar |

**Elemen Referensi UI yang sengaja TIDAK diterapkan** (tidak memiliki padanan pada logika dokumen ini):

| Elemen referensi | Alasan |
|---|---|
| Kolom pencarian dengan pintasan "⌘ K" | Tidak ada fitur pencarian global di Bagian 5 |
| Tombol ikon "Heart" dan "Gift" pada navbar | Tidak ada fitur terkait |
| Submenu "Dashboards" dan "App Pages" serta halaman Analytics, Transaction, Message, Projects, Users (versi referensi), Support, FAQ | Rute proyek hanya yang ada di Bagian 10 |
| Kartu promo "New Features available" pada sidebar | Tidak ada fitur terkait |
| Kartu kredit, "Balance", "Quick Transfer", "Send Money", "Add Card" | Konten keuangan, di luar ruang lingkup (Bagian 3.2) |
| Seksi "Help" pada sidebar | Digantikan seksi "Akun" (Profil) |

---

## 12. Alur Kerja Pengembangan

### Fase 0 - Persiapan
- [x] Inisialisasi Repositori GitHub & Struktur Proyek Vue 3 + Vite + Tailwind CSS.
- [x] Dokumentasi `README.md` terpusat.

### Fase 1 - UI & Logika Frontend (Data Dummy) *(Selesai)*

- [x] **Layout & Navigasi**: Sidebar, Navbar dengan Quick Role Switcher, Mobile Drawer.
- [x] **Autentikasi Dummy**: Login preset 3 peran (Teknisi, Supervisor, Admin) via `authService.js`.
- [x] **Modul Teknisi**: Form Input Logbook dinamis (kalkulasi durasi otomatis & overnight), Riwayat & Status, Revisi Logbook Ditolak, Bulk Submit Draft.
- [x] **Modul Supervisor**: Dashboard Tim, Daftar Approval, Action Modal Approval/Reject dengan *mandatory notes*, Ekspor Laporan, Halaman Monitoring Aktivitas & Frekuensi Teknisi Tim (`/supervisor/teknisi`).
- [x] **Modul Admin**: Management User CRUD (soft delete/inaktif), Management Master Data (Plant, Shift, Machine, Group), View Audit Trail.
- [x] **Review UI Satoria**: Verifikasi oleh pemangku kepentingan (UI disetujui, lanjut Fase 2).

### Fase 2 - Backend REST API, Skema TiDB & Integrasi *(Selesai Dieksekusi)*

- [x] **Inisialisasi Backend**: Node.js (ES Module) + Express.js di folder `/backend`.
- [x] **Skema Database TiDB (MySQL-compatible)**: 11 tabel lengkap dengan relasi FK dan indeks menggunakan Prisma ORM (`backend/prisma/schema.prisma`).
- [x] **Database Seeding**: Skrip `backend/prisma/seed.js` untuk master data (Plant, Shift, Machine, Sub-Machine, Group, Role), akun dummy resmi, sample logbook, dan audit log.
- [x] **Autentikasi & Keamanan**: JSON Web Token (JWT) stateless, enkripsi kata sandi `bcryptjs`, dan middleware RBAC (`Teknisi`, `Supervisor`, `Admin`).
- [x] **REST API Endpoints v1**: Format standar JSON (`success`, `message`, `data`, `meta`) di `/api/v1` untuk auth, logbook CRUD, approval, master data, user management, ekspor laporan, notifikasi, dan audit log.
- [x] **Layanan Ekspor & Audit**: Generator file spreadsheet Excel (`ExcelJS`) dan pencatat aktivitas otomatis ke tabel `user_activities`.
- [x] **Layanan Notifikasi**: Modul email Nodemailer (SMTP) dan pencatatan In-App Notification.
- [x] **Automated Testing Suite**: 7 pengujian otomatis endpoint dan kalkulasi durasi (`npm test` di backend).

### Akun Dummy Resmi Sistem

| Peran | NIK / Email Dummy | Kata Sandi |
|---|---|---|
| Teknisi | `teknisi@satoria.co.id` | `password123` |
| Supervisor | `spv@satoria.co.id` | `password123` |
| Admin | `admin@satoria.co.id` | `password123` |

---

## 13. Rencana Backend & API

### 13.1 Konvensi REST API

- Base URL: `/api/v1`
- Format Respons Standardized:

```json
{
  "success": true,
  "message": "Pesan status",
  "data": {},
  "meta": { "page": 1, "limit": 10, "total": 0 }
}
```

### 13.2 Endpoint API Utama (Produksi / Aktif)

| Metode | Endpoint | Keterangan | Hak Akses |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Autentikasi JWT (NIK / Email & dev/real password) | Publik |
| GET | `/api/v1/auth/me` | Ambil Profil Pengguna Aktif & Data Peran | Terotentikasi (Semua Peran) |
| PUT | `/api/v1/auth/profile` | Perbarui Nama Lengkap & Email Profil Pribadi | Terotentikasi (Semua Peran) |
| POST | `/api/v1/auth/avatar` | Unggah Foto Profil (WebP Resize & Cloudflare R2 / Local Storage) | Terotentikasi (Semua Peran) |
| DELETE | `/api/v1/auth/avatar` | Hapus Foto Profil Pengguna | Terotentikasi (Semua Peran) |
| GET | `/api/v1/logbooks` | Ambil Daftar Logbook (Filter status/plant/tanggal/mesin/search) | Semua (Teknisi terisolasi per akun) |
| POST | `/api/v1/logbooks` | Buat Logbook Baru (`DRAFT` atau `PENDING`) | Teknisi, Admin |
| POST | `/api/v1/logbooks/submit-all-drafts` | Ajukan Seluruh Draft Logbook ke Supervisor Sekaligus | Teknisi |
| GET | `/api/v1/logbooks/:id` | Detail Logbook (Teknisi hanya akses catatan miliknya) | Semua (Teknisi terisolasi per akun) |
| PUT | `/api/v1/logbooks/:id` | Edit Logbook (Hanya milik sendiri & status Draft/Rejected) | Teknisi, Admin |
| DELETE | `/api/v1/logbooks/:id` | Hapus Logbook (Hanya milik sendiri & status Draft) | Teknisi, Admin |
| POST | `/api/v1/logbooks/:id/approval` | Action Approve / Reject Logbook (wajib catatan bila ditolak) | Supervisor, Admin |
| GET | `/api/v1/logbooks/:id/approvals` | Riwayat Persetujuan Logbook | Terotentikasi (Semua Peran) |
| GET | `/api/v1/master/:type` | Ambil Data Master (`plants`, `shifts`, `machines`, `sub-machines`, `groups`, `roles`) | Terotentikasi (Semua Peran) |
| POST | `/api/v1/master/:type` | Tambah Data Master Baru | Admin |
| PUT | `/api/v1/master/:type/:id` | Perbarui Data Master | Admin |
| DELETE | `/api/v1/master/:type/:id` | Nonaktifkan / Hapus Data Master | Admin |
| GET | `/api/v1/users` | Daftar Seluruh Pengguna Sistem | Admin |
| POST | `/api/v1/users` | Tambah Akun Pengguna Baru | Admin |
| PUT | `/api/v1/users/:id` | Edit Akun Pengguna & Toggle Status Aktif | Admin |
| GET | `/api/v1/supervisor/team-overview` | Metrik Frekuensi & Konsistensi Pengisian Tim Teknisi | Supervisor, Admin |
| GET | `/api/v1/reports/export` | Generasi & Unduh Berkas Spreadsheet Excel (.xlsx) | Supervisor, Admin |
| GET | `/api/v1/notifications` | Daftar Notifikasi In-App Pengguna (Paging) | Terotentikasi (Semua Peran) |
| GET | `/api/v1/notifications/unread-count` | Polling Cepat Jumlah Notifikasi Belum Dibaca | Terotentikasi (Semua Peran) |
| PATCH | `/api/v1/notifications/:id/read` | Tandai Notifikasi Telah Dibaca | Terotentikasi (Semua Peran) |
| PATCH | `/api/v1/notifications/read-all` | Tandai Semua Notifikasi Telah Dibaca | Terotentikasi (Semua Peran) |
| GET | `/api/v1/admin/audit-logs` | Catatan Audit Trail Aktivitas (`user_activities`) | Admin |

---

## 14. Rencana Deployment

1. **Frontend (Vercel)**:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Konfigurasi SPA Routing: `frontend/vercel.json` (rewrites `/(.*) -> /index.html` mencegah error 404 saat refresh)
   - Environment Variables:
     - `VITE_API_BASE_URL`: URL API Backend Vercel (contoh: `https://<nama-backend>.vercel.app/api/v1`)

2. **Backend (Vercel Serverless Function)**:
   - Root Directory: `backend`
   - Entry Point Serverless: `backend/api/index.js` (`export default app`)
   - Konfigurasi Routing Serverless: `backend/vercel.json` (rewrites `/(.*) -> /api/index.js`)
   - Otomatisasi Prisma: Script `"build": "prisma generate"` dan `"postinstall": "prisma generate"` pada `backend/package.json`
   - Environment Variables:
     - `DATABASE_URL`: TiDB Cloud connection string (`mysql://USER:PASSWORD@HOST:4000/DB?sslaccept=strict`)
     - `JWT_SECRET`: Kunci rahasia token JWT
     - `NODE_ENV`: `production`
     - `CORS_ORIGIN`: URL domain frontend di Vercel (contoh: `https://<nama-frontend>.vercel.app`)
     - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (Notifikasi Email)

3. **Database TiDB Cloud & Kebijakan Cadangan (Backup & Disaster Recovery)**:
   - **Kluster & Region**: TiDB Cloud Serverless (AliCloud `ap-southeast-1`, Singapore).
   - **Pemisahan Dev & Prod**:
     - Frontend development terhubung ke backend Express lokal (`http://localhost:3000`).
     - Backend development wajib menggunakan branch terpisah via **TiDB Cloud Serverless Branching** (misal branch `dev` dari cluster `main`) atau database katalog terpisah (`satoria_logbook_dev`), mencegah data development dan testing mencemari database produksi.
     - File kredensial `.env` dan variasinya diproteksi ketat pada `.gitignore` (root dan frontend).
   - **Kebijakan Cadangan TiDB Cloud Sesuai Tier**:
     - *Automated Daily Backups*: TiDB Cloud Serverless melakukan snapshot penuh (*full snapshot*) otomatis setiap hari tanpa mengganggu performa transaksi aktif.
     - *Point-In-Time Recovery (PITR)*: Retensi snapshot dan log perubahan transaksi memungkinkan pemulihan data ke detik tertentu (*point-in-time*) dalam jendela retensi tier aktif (1 hari untuk Free Tier Serverless, hingga 7–30 hari untuk Standard/Dedicated Tier).
     - *Ketahanan Multi-AZ (RPO = 0)*: TiDB mendistribusikan 3 replika data berbasis konsensus Raft lintas *Multiple Availability Zones* (Multi-AZ) menjamin ketahanan terhadap kegagalan perangkat keras tanpa kehilangan data.
     - *Zero-Copy Branching*: Database dapat di-branch dalam hitungan detik sebagai cadangan instan sebelum migrasi skema besar.

4. **Monitoring Galat (Sentry Error Monitoring)**:
   - **Paket**: `@sentry/node` terintegrasi pada Express backend (`src/config/sentry.js`) dan *Central Error Handler* (`src/middlewares/errorHandler.js`).
   - **Tier Gratis (Developer Tier)**:
     - 10.000 error events per bulan (bebas biaya selamanya).
     - 100.000 performance tracing spans per bulan.
     - Notifikasi instan via email saat terjadi error kritis (HTTP 500+).
   - **Aktivasi**: Pasang `SENTRY_DSN` pada environment variable Vercel dan `.env` server. Jika variabel tidak diisi, Sentry akan *bypass* secara aman tanpa mengganggu runtime.

---

## 15. Panduan Git, GitHub & Otomasi CI

### 15.1 Convention Branch & Commits

- Branching: `main` (Production), `feature/<nama-fitur>`, `fix/<nama-bug>`.
- Commit Messages:
  - `feat: tambah form logbook teknisi`
  - `fix: kalkulasi durasi shift melintasi tengah malam`
  - `test: tambah pengujian otorisasi RBAC`
  - `docs: update README spesifikasi Satoria`

### 15.2 Otomasi CI (GitHub Actions)

Alur kerja Continuous Integration terpasang pada `.github/workflows/ci.yml` dan dieksekusi otomatis pada setiap `push` dan `pull request`:
- **Backend Job**: Melakukan instalasi dependensi, `npx prisma generate`, dan menjalankan seluruh pengujian otomatis `npm test` (31 skenario uji mencakup utilitas, JWT, autentikasi, avatar, zona waktu WIB, dan matriks otorisasi RBAC).
- **Frontend Job**: Melakukan instalasi dependensi, pengujian unit Vitest `npm test` (kalkulasi kalender layout), dan build bundler produksi Vite `npm run build`.
- Menjamin tidak ada kode yang mengalami regresi atau galat sintaks/tipe data yang dapat masuk ke repositori utama tanpa terverifikasi.

---

## 16. Keamanan

- **Hashing**: Hashing bcrypt/argon2 untuk kata sandi.
- **Otorisasi API**: Verification Token JWT & Middleware Check Role pada setiap endpoint server.
- **Audit Logging**: Setiap transaksi pembuatan logbook, penolakan, dan perubahan user wajib tercatat di `user_activities`.
- **SQL Injection & XSS Protection**: Menggunakan Query Parameterized / ORM Prisma & Sanitasi Input Vue.js.

---

## 17. Standar Penulisan Kode

- Vue 3 `<script setup>` Syntax.
- Penamaan File & Komponen: `PascalCase` (`InputLogbookView.vue`).
- Penamaan Variabel / Fungsi: `camelCase` (`calculateDurationMinutes`).
- Seluruh antarmuka menggunakan **Bahasa Indonesia** baku operasional Satoria.

---

## 18. Pengujian

### 18.1 Automated Testing Suite

1. **Backend Test Suite (Node.js Test Runner - 31 Skenario Lulus 100%)**:
   - `test/authorization.test.js` (**Pengujian Otorisasi RBAC & Isolasi Data**):
     - Membuktikan Teknisi A ditolak (HTTP 403) saat mencoba membuka (`GET`), mengedit (`PUT`), atau menghapus (`DELETE`) logbook milik Teknisi B.
     - Membuktikan Teknisi B (pemilik sah), Supervisor, dan Admin diizinkan membuka detail logbook (HTTP 200).
     - Membuktikan Teknisi ditolak (HTTP 403) saat memanggil endpoint approval (`POST /logbooks/:id/approval`).
     - Membuktikan Supervisor ditolak (HTTP 403) saat mencoba menambah, mengedit, atau menghapus master data (`plants`, `shifts`, `machines`), namun diizinkan membaca (`GET`).
   - `test/timezone.test.js` (**Pengujian Zona Waktu WIB & Shift Malam**):
     - Memvalidasi presisi penanggalan WIB (UTC+7) di serverless Vercel (UTC).
     - Kalkulasi durasi shift lintas tengah malam (Shift 3 & Long Shift).
   - `test/image.test.js` & `test/upload.test.js` (**Pemrosesan Gambar & Upload Avatar**):
     - Konversi WebP 320x320 px, kompresi, dan validasi MIME type/token.
   - `test/api.test.js` (**Endpoint Dasar & Keamanan**):
     - Health check, 401 unauthenticated, 400 validation, dan 404 routing.

2. **Frontend Test Suite (Vitest & Vite Build - 9 Skenario Lulus 100%)**:
   - `src/utils/calendarLayout.test.js`: Validasi clustering kalender mingguan, snapping grid 15 menit, penanggalan WIB, dan segmentasi event lintas hari.
   - `npm run build`: Kompilasi produksi Vite bebas galat dengan dynamic code splitting (81.6 kB bundle).

### 18.2 UAT Checklist

- [x] Teknisi sukses menginput logbook dan durasi terhitung otomatis.
- [x] Logbook berstatus `Pending` memunculkan notifikasi supervisor.
- [x] Supervisor dapat me-reject logbook wajib beserta alasannya.
- [x] Admin dapat mengelola Master Data Plant & Shift tanpa error.
- [x] Ekspor laporan PDF/Excel menyajikan data sesuai filter.
- [x] Pengujian otorisasi RBAC mencegah kebocoran data antar-teknisi dan eskalasi hak akses.

---

## 19. Risiko & Asumsi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Shift melintasi tengah malam (misal 22:00 - 06:00) | Perhitungan durasi minus / salah | Utility kalkulator khusus memperhatikan `task_date` & pergantian hari |
| Kegagalan pengiriman Notifikasi Email | Supervisor tidak sadar ada pending approval | Menyediakan fallback **InApp Notification** di dashboard Supervisor |
| Data Mesin bertambah pesat | Dropdown UI lambat | Implementasi search/select async pagination pada dropdown Mesin |

---

## 20. Pertanyaan Terbuka & Catatan Penyempurnaan

1. **Relasi Mesin dan Plant**: Disarankan menambahkan `plant_id` pada tabel `machines` agar mesin terfilter otomatis sesuai plant teknisi.
2. **Batas Re-submit Logbook**: Menetapkan berapa kali teknisi dapat mengajukan ulang logbook yang ditolak.
3. **Pengaturan Mail Server**: Penentuan kredensial SMTP resmi Satoria untuk pengiriman notifikasi email.

---

## 21. Glosarium

- **Logbook**: Catatan pekerjaan harian teknisi.
- **Plant**: Lokasi/Fasilitas pabrik Satoria.
- **Shift**: Jadwal jam kerja operasional.
- **Sub-Machine**: Bagian spesifik/komponen dari mesin utama.
- **Approval**: Proses pemeriksaan dan persetujuan pengajuan logbook.
- **RBAC**: *Role-Based Access Control* (Pengaturan Hak Akses Berbasis Peran).

---

## 22. Panduan Menggunakan Dokumen Ini dengan Antigravity IDE

Dokumen ini adalah **sumber kebenaran tunggal (*Single Source of Truth*)** untuk seluruh proses pengembangan.

1. Simpan dokumen ini di root proyek sebagai `README.md`.
2. Saat memulai instruksi pengembangan ke AI Agent, rujuk dokumen ini:
   > *"Baca README.md sebagai acuan utama. Kita fokus pada Fase 1: Sempurnakan Form Input Logbook Teknisi dengan kalkulasi durasi otomatis."*

---

## Riwayat Versi Dokumen

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 16 Oktober 2026 | Penyusunan dokumen awal proyek. |
| 1.1 | 16 Oktober 2026 | Penyelesaian Fase 0 & Fase 1 (UI Lengkap Data Dummy). |
| 1.2 | 16 Oktober 2026 | **Penyelarasan Total Spesifikasi Satoria**:<br>- Pembaruan nama sistem menjadi **Engineer Logbook Satoria**.<br>- Pembaruan struktur ERD (11 Tabel termasuk `notifications` & `user_activities`).<br>- Penyesuaian hak akses RBAC (Admin, Supervisor, Teknisi).<br>- Penambahan alur Notifikasi Email & InApp serta Ekspor Laporan PDF/Excel. |
| 1.3 | 16 Oktober 2026 | **Implementasi AdminCN Design System & Dashboard Multi-Plant**:<br>- Overhaul UI dengan panduan AdminCN Design System (Font *Public Sans*, palet Teal `#00A76F`, Dark Slate action `#212B36`, canvas `#F4F6F8`, rounded 16px cards, border `#EDEFF1`).<br>- Redesain **Supervisor Dashboard** dengan monitoring 4 Plant operasional, mini chart batang aktivitas mingguan (7 hari), meteran kapasitas pengguna aktif, dan feed aktivitas real-time.<br>- Standardisasi komponen seluruh modul (Teknisi, Supervisor, Admin) dengan style token AdminCN.<br>- Pengujian build produksi Vite selesai tanpa error. |
| 1.4 | 17 Oktober 2026 | **Penerapan Spesifikasi UI Dashboard (referensi `UI-SPEC-dashboard-saildo.md`)**:<br>- Perubahan hanya pada aspek UI; logika, peran, RBAC, rute, model data, alur approval, API, deployment, dan akun dummy **tidak diubah**.<br>- **Bagian 11 (Panduan Desain UI)** diperluas menjadi 12 subbagian: aturan penggunaan untuk AI Agent, design token (warna, warna status logbook, tipografi Inter, spasi, radius, shadow, konfigurasi Tailwind), layout global (sidebar 208 px, navbar 70 px, kolom utama + kolom kanan 288 px), spesifikasi komponen, pemetaan konten dashboard per peran, component tree, ikon dan state interaksi, responsivitas dan aksesibilitas, urutan implementasi UI, 17 acceptance criteria UI, serta asumsi dan elemen referensi yang tidak diterapkan.<br>- Token AdminCN versi 1.3 digantikan token baru (Inter via `@fontsource/inter`, primer biru `#2563EB`, canvas `#F3F5F9`, kartu rounded 12 px, border `#E6E9F0`).<br>- **Eksekusi Komponen & Modul Selesai**:<br>  1. Dependensi font Inter (`@fontsource/inter`), `lucide-vue-next`, `chart.js`, `vue-chartjs` dipasang.<br>  2. `src/assets/tokens.css` dan `tailwind.config.js` dikonfigurasi secara presisi.<br>  3. Komponen umum di `components/common/` (`Card`, `Button`/`AppButton`, `Input`, `Select`, `Badge`/`AppBadge`, `IconButton`, `ProgressBar`, `Avatar`, `Table`, `Toast`, `Modal`/`AppModal`) dibangun.<br>  4. Layout global (`MainLayout`, `Sidebar` w-52 collapse-able, `Navbar`, `PageHeader`, `RoleSwitcher`, `NotificationBell`, `UserMenu`) diimplementasikan.<br>  5. Komponen grafik & dashboard (`MiniBarChart`, `AreaChart`, `DonutChart`, `StatCard`, `StatisticsChartCard`, `StatusDonutCard`, `ProgressListCard`, `RecentTableCard`, `NotificationPanel`, `CalendarCard`, `ActivityFeedPanel`) dibangun.<br>  6. Tiga dashboard peran (`TeknisiDashboard`, `SupervisorDashboard`, `AdminDashboard`) diselaraskan dengan tata letak 2 kolom (utama + kanan 288 px).<br>  7. Seluruh halaman non-dashboard (`LoginView`, `InputLogbookView`, `RiwayatLogbookView`, `ApprovalListView`, `LaporanTimView`, `UserManagementView`, `MasterDataView`, `AuditTrailView`, `ProfileView`, `ForbiddenView`, `NotFoundView`) distandardisasi.<br>  8. Verifikasi lolos 17 kriteria acceptance (UI-1 s.d. UI-17) dan build produksi Vite (`npm run build`) sukses tanpa error. |
| 1.5 | 17 Oktober 2026 | **Penerapan Spesifikasi UI Input Logbook Teknisi — Konsep Kalender Mingguan (`UI-SPEC-input-logbook-teknisi.md`)**:<br>- **Aspek UI & Interaksi Planner**:<br>  1. Menambahkan konstanta layout planner di `tokens.css` (`--planner-panel-width`, `--planner-toolbar-h`, `--planner-header-h`, `--planner-time-col-w`, `--planner-hour-h`, `--planner-chip-h`, dll).<br>  2. Membuat modul utilitas `utils/dateKeys.js` (penanggalan lokal WIB tanpa `toISOString`, kalkulasi awal minggu Senin, pemformat rentang tanggal dwibulan/dwi-tahun) dan `utils/calendarLayout.js` (konversi piksel-menit snap 15m, segmentasi lintas tengah malam, layout clustering tumpang tindih kolom, ringkasan chip harian).<br>  3. Menambahkan pengujian otomatis unit test Vitest `utils/calendarLayout.test.js` mencakup 9 kasus uji spesifikasi dengan hasil **100% lulus**.<br>  4. Menyempurnakan filter rentang `dateFrom`/`dateTo` dan alias `list()` di `logbookService.js`, serta menambahkan dataset dummy dinamis relatif terhadap hari ini di `mock/logbooks.js` (mencakup status Draft, Pending, Approved, Rejected dengan catatan, Cancelled, lintas tengah malam, tumpang tindih, dan log pendek).<br>  5. Mengekstrak form logbook terstandardisasi ke `components/logbook/LogbookForm.vue` dan mengaktifkan view `/logbook/edit/:id` (`views/teknisi/EditLogbookView.vue`) sesuai Bagian 10.<br>  6. Mengembangkan 15 komponen perencana di `components/logbook/` (`PlannerSidebarPanel`, `MiniCalendar`, `FilterGroup`, `FilterCheckbox`, `WeekCalendarCard`, `CalendarToolbar`, `WeekHeader`, `DayHeaderCell`, `DaySummaryRow`, `DaySummaryChip`, `TimeGrid`, `TimeAxis`, `DayColumn`, `LogbookEventBlock`, `NowIndicator`, `SelectionGhost`, `LogbookEventPopover`, `LogbookFormDrawer`, `FilterDrawer`, `FabCreate`).<br>  7. Merombak total `views/teknisi/InputLogbookView.vue` dengan navigasi tanggal interaktif, seleksi seret/klik slot waktu, popup ringkasan read-only, drawer form dengan dialog konfirmasi buang perubahan & kirim, filter status/shift real-time, dan FAB mobile.<br>  8. Memenuhi seluruh 21 kriteria acceptance (IL-1 s.d. IL-21), tanpa kode hex langsung di komponen/view, dan build produksi Vite (`npm run build`) sukses tanpa kendala. |
| 1.6 | 17 Oktober 2026 | **Implementasi Fitur "Overview Log Book Tim Mechanical" 4 Plant (`DASHBOARD_OVERVIEW_LOGBOOK.md`)**:<br>- **Hak Akses & Penempatan**:<br>  - Fitur diletakkan pada halaman Dashboard **di atas** konsep dashboard lama (khusus peran **Admin** dan **Supervisor**). Peran Teknisi tetap melihat tampilan dashboard lama.<br>- **Struktur Konten & Fitur**:<br>  1. **Header Overview (Bagian A):** Logo identitas Satoria, judul `Overview Log Book Tim Mechanical`, subjudul monitoring real-time, dan 3 KPI Card (`TOTAL LOG`, `AKTIVITAS HARI INI`, `USER AKTIF`) dengan kalkulasi otomatis tren persentase `vs. kemarin`.<br>  2. **Filter Dashboard (Bagian B):** Filter Bulan & Tahun (default bulan berjalan), Department / Work Group, Shift kerja, input pencarian kata kunci dengan debounce 300ms, dan tombol Reset Filter.<br>  3. **Grid 4 Kartu Plant (Bagian C):** Tata letak 2 kolom x 2 baris (desktop) / 1 kolom (mobile) untuk Plant 1 s.d. Plant 4, dengan token warna aksen terpusat (`--color-plant-1` s.d. `4`), status `OPERASIONAL`, 3 mini-stat, bar chart aktivitas 7 hari terakhir (angka di atas batang), 3 log terbaru dengan foto/inisial teknisi, serta panel User Aktif (rasio dan tautan modal "Lihat semua user").<br>  4. **Aktivitas Terbaru Seluruh Plant (Bagian D):** Tabel 5 baris terbaru lintas plant (Waktu, Badge Plant, Mesin/Aktivitas, Shift, Teknisi, dan aksi modal detail).<br>  5. **User Aktif per Plant (Bagian E):** Monitoring progress bar rasio user aktif per plant dan footer total user aktif sistem.<br>- **Arsitektur Kode & Data**:<br>  - Berkas baru: `src/components/dashboard/overview/` (`DashboardOverviewLogBook.vue`, `OverviewHeader.vue`, `OverviewFilter.vue`, `PlantCard.vue`, `RecentActivitiesTable.vue`, `UserActiveProgressCard.vue`, `ActiveUsersModal.vue`), `src/services/overviewLogbookService.js`.<br>  - Berkas dimodifikasi: `src/assets/tokens.css`, `tailwind.config.js`, `src/mock/masterData.js` (penambahan Plant 4 - Satoria Agro Industri), `src/services/masterService.js`, `src/mock/users.js` (teknisi multi-plant), `src/mock/logbooks.js` (logbook multi-plant), `src/views/supervisor/SupervisorDashboard.vue`, `src/views/admin/AdminDashboard.vue`.<br>- **Asumsi yang Diterapkan**:<br>  - Definisi *User Aktif*: Pengguna unik yang memiliki minimal 1 catatan logbook pada hari ini (tanggal lokal).<br>  - Polling interval: 35 detik, otomatis dihentikan saat tab tidak aktif via `visibilitychange`.<br>- Pengujian build produksi Vite (`npm run build`) dan Vitest lulus 100% tanpa error. |
| 1.7 | 17 Oktober 2026 | **Pemisahan Modul Master Data untuk Pengguna Admin**:<br>- **Latar Belakang & Pemisahan Menu**:<br>  - Menu `Master Data` tunggal dipecah menjadi 3 sub-modul independen dan terfokus pada sidebar navigasi Admin:<br>    1. **Master Plant** (`/admin/plants`): Halaman khusus manajemen data fasilitas dan plant operasional Satoria Group (`MasterPlantView.vue`). Dilengkapi kartu ringkasan KPI (Total Plant, Plant Aktif, Total Mesin Terhubung), pencarian teks, filter status, tabel interaktif dengan hitungan mesin terpasang, modal tambah/edit kode plant & nama plant, serta aksi toggle aktif/nonaktif.<br>    2. **Master Machine** (`/admin/machines`): Halaman terpadu manajemen **Mesin Utama** dan **Sub-Mesin (Bagian / Komponen)** (`MasterMachineView.vue`). Dilengkapi tab switcher, filter bertingkat berdasarkan lokasi Plant dan Mesin Induk, pencarian kode/nama mesin, pintasan langsung "Lihat Sub-Mesin Terkait" dari baris mesin, modal tambah/edit mesin utama (kode, nama, lokasi plant) dan modal sub-mesin (nama komponen, relasi mesin induk), serta aksi toggle aktif/nonaktif.<br>    3. **Master Group** (`/admin/groups`): Halaman terpadu manajemen **Shift Kerja** dan **Grup Kerja / Departemen** (`MasterGroupView.vue`). Dilengkapi tab switcher, tabel shift dengan informasi jam kerja, estimasi durasi dan penanda otomatis shift lintas hari (*overnight* `23:00 - 07:00`), tabel grup kerja dengan deskripsi lingkup tugas, modal tambah/edit, serta aksi toggle status operasional.<br>- **Arsitektur Rute & Navigasi**:<br>  - Berkas baru: `src/views/admin/MasterPlantView.vue`, `src/views/admin/MasterMachineView.vue`, `src/views/admin/MasterGroupView.vue`.<br>  - Berkas dimodifikasi: `src/constants/menu.js` (penambahan menu Master Plant, Master Mesin, Master Group), `src/components/layout/Sidebar.vue` (registrasi ikon Lucide `Building2`, `Cpu`, `Layers`), `src/router/index.js` (pendaftaran rute `/admin/plants`, `/admin/machines`, `/admin/groups` dan pengalihan otomatis `/admin/master` -> `/admin/plants` untuk kompatibilitas tautan lama).<br>- **Kepatuhan Desain & Pengujian**:<br>  - Mengikuti 100% token desain Satoria pada Bagian 11 (tanpa raw hex code), modal seragam `AppModal`, font Inter, status badge dengan dot indikator, dan styling tabel konsisten.<br>  - Pengujian build produksi Vite (`npm run build`) sukses tanpa error dan seluruh 9 unit test Vitest lulus 100%. |
| 1.8 | 17 Oktober 2026 | **Penyempurnaan Tipografi AreaChart Tren Aktivitas (Eliminasi Font Stretch)**:<br>- **Penyebab Masalah**:<br>  - Pada komponen `AreaChart.vue` (`StatisticsChartCard.vue`), teks label bulan sumbu X dan angka nilai sumbu Y sebelumnya dirender di dalam elemen `<svg>` dengan atribut `preserveAspectRatio="none"`. Saat kontainer dashboard melebar secara responsif di monitor desktop, mesin render SVG menerapkan penskalaan non-seragam sehingga glif huruf font Inter tampak tertarik/gepeng (*stretched*).<br>- **Solusi & Perubahan Arsitektur**:<br>  1. **Tipografi HTML Semantik**: Memindahkan seluruh teks label sumbu Y dan sumbu X keluar dari SVG menjadi elemen HTML (`div` dan `button`) dengan kelas font Inter (`font-sans text-[11px] text-ink-3`).<br>  2. **Sinkronisasi Presisi Persentase**: Posisi horizontal bulan dan posisi vertikal tick disinkronkan secara matematis menggunakan nilai persentase presisi tinggi (`percentX` dan `percentY`), sehingga label teks selalu lurus sempurna dengan titik data dan garis kisi (*gridlines*).<br>  3. **Bentuk Geometri Bulat Sempurna**: Titik sorot (*highlight dot*) dan pilar sorotan vertikal bulan aktif diubah menjadi elemen HTML dengan rasio 1:1, mencegah lingkaran menjadi lonjong/elips saat kontainer melebar.<br>  4. **Pemberian `vector-effect="non-scaling-stroke"`**: Garis stroke 2px kurva linear dan garis kisi putus-putus (*dashed gridlines*) di dalam SVG dijamin tetap memiliki ketebalan stroke seragam di segala resolusi.<br>- **Pengujian & Verifikasi**:<br>  - Build produksi Vite (`npm run build`) dan seluruh 9 pengujian unit test Vitest lulus 100% tanpa error. |
| 1.9 | 17 Oktober 2026 | **Restrukturisasi & Optimalisasi Dashboard (Admin dan Supervisor)**:<br>- **Penataan Tata Letak Kartu Plant (`PlantCard.vue`)**:<br>  1. **Reposisi Chart & Mini-Stat**: `Chart Aktivitas 7 Hari Terakhir` (SVG bar chart responsif) kini diletakkan di sebelah kanan `3 Mini-Stat: Total Log, Hari Ini, User Aktif` menggunakan grid 2-kolom seimbang.<br>  2. **Reposisi Log Terbaru**: Bagian `Log Terbaru (Plant n)` (3 entri terakhir) ditempatkan tepat di bawah baris gabungan Mini-Stat dan Chart 7 Hari Terakhir.<br>  3. **Leaderboard Teknisi Teraktif**: Menggantikan panel user aktif per plant dengan `Leaderboard (Plant n)` yang menyajikan daftar teknisi yang paling sering mengisi logbook pada plant tersebut, lengkap dengan lencana peringkat (#1 emas, #2 perak, #3 perunggu), avatar/foto, jumlah logbook, dan persentase kontribusi.<br>- **Penyempurnaan Section Distribusi Line Produksi (`TopLinesProgressCard.vue`)**:<br>  - Menggantikan `Section E: User Aktif per Plant` dengan `TopLinesProgressCard` yang menyajikan peringkat **% Line dengan Pengisian Logbook Terbanyak** (5 line/mesin teratas dengan bar persentase kontribusi aktivitas pemeliharaan, kode mesin, dan warna aksen plant).<br>- **Pembersihan Komponen Lama Dashboard (Admin & Supervisor)**:<br>  - Menghapus komponen `StatusDonutCard`, `ProgressListCard` (Persetujuan per Plant), `NotificationPanel`, dan `CalendarCard` pada `AdminDashboard.vue` dan `SupervisorDashboard.vue`, menghasilkan tampilan dashboard yang lebih bersih, fokus, dan lapang.<br>- **Pengujian & Verifikasi**:<br>  - Build produksi Vite (`npm run build`) sukses tanpa error dan seluruh 9 pengujian unit test Vitest lulus 100%. |
| 2.0 | 17 Oktober 2026 | **Pembersihan & Simplifikasi Dashboard Khusus Supervisor (`SupervisorDashboard.vue`)**:<br>- **Komponen yang Dihapus Sesuai Permintaan**:<br>  1. `RecentTableCard (Pengajuan Pending)`: Dihapus dari dashboard supervisor (akses pengajuan pending tetap terpusat di halaman `/approval`).<br>  2. `ActivityFeedPanel (Aktivitas Terbaru Tim)`: Dihapus dari kolom samping dashboard supervisor.<br>  3. `3 StatCards` di Baris 1: `StatCard 1: Pending (menunggu tinjauan)`, `StatCard 2: Approved`, dan `StatCard 3: Teknisi Aktif (Meter variant)` seluruhnya dihapus dari tampilan.<br>- **Struktur Halaman Supervisor yang Dipertahankan**:<br>  - `DashboardOverviewLogBook`: Monitoring multi-plant terpadu, KPI utama, filter shift/group/bulan, kartu 4 plant (dengan chart 7 hari & leaderboard teknisi), tabel aktivitas terbaru seluruh plant, dan progress bar distribusi % line teratas.<br>  - `StatisticsChartCard`: Menampilkan **Tren Aktivitas Tim** tahunan dengan kurva area chart yang telah disempurnakan tipografinya.<br>- **Pembersihan Kode & Kinerja**:<br>  - Seluruh impor dan kalkulasi data yang tidak lagi digunakan (`pendingLogs`, `teamActivities`, `stats`, `technicians`, `teknisiService`, `LOG_STATUS`, `RecentTableCard`, `ActivityFeedPanel`, `StatCard`) dibersihkan dari skrip.<br>- **Pengujian & Verifikasi**:<br>  - Build produksi Vite (`npm run build`) sukses tanpa error (`built in 4.06s`) dan seluruh 9 pengujian unit test Vitest lulus 100%. |
| 2.1 | 18 Oktober 2026 | **Restrukturisasi Kartu Plant & Pembersihan StatCard Dashboard (Admin dan Supervisor)**:<br>- **Relokasi 3 Mini-Stat ke Header Kartu Plant (`PlantCard.vue`)**:<br>  - `3 Mini-Stat: Total Log, Hari Ini, User Aktif` dipindahkan ke dalam Header Kartu bersebelahan dengan Ikon & Nama Plant untuk seluruh Line.<br>- **Reposisi Leaderboard ke Area Utama Kartu (`PlantCard.vue`)**:<br>  - Ruang kosong yang ditinggalkan oleh Mini-Stat kini diisi oleh `Leaderboard (Plant n)` yang menyajikan teknisi paling sering mengisi logbook pada plant tersebut, berdampingan langsung dengan `Chart Aktivitas 7 Hari Terakhir` di sebelah kanan.<br>  - Blok leaderboard lama di bagian bawah kartu dihapus agar layout tetap ringkas, seimbang, dan proporsional.<br>- **Penghapusan StatCard Pengguna & Logbook Sistem (`AdminDashboard.vue`)**:<br>  - Menghapus `StatCard 1: Total Pengguna`, `StatCard 2: Pengguna Aktif`, dan `StatCard 3: Total Logbook Sistem` beserta impor dan kalkulasi terkait pada dashboard Admin, sehingga kini seluruh peran (Admin dan Supervisor) bebas dari StatCard lama dan terfokus pada monitoring overview.<br>- **Penghapusan Badge Status Operasional (`PlantCard.vue`)**:<br>  - Menghapus badge status `<span class="... bg-status-approved-bg ...">OPERASIONAL</span>` pada seluruh Line kartu overview.<br>- **Pengujian & Verifikasi**:<br>  - Seluruh 9 pengujian unit test Vitest lulus 100% dan build produksi Vite (`npm run build`) sukses tanpa error. |
| 2.2 | 18 Oktober 2026 | **Perombakan Model Input Logbook Teknisi & Relokasi Kalender Mingguan ke Riwayat Logbook**:<br>- **Model Baru Input Logbook Teknisi (`InputLogbookView.vue`)**:<br>  1. **Tanggal Masuk Sistem (Otomatis)**: Menempatkan banner tanggal & waktu masuk otomatis dari sistem/server di bagian paling atas formulir.<br>  2. **Kalender Input Tanggal Tugas**: Menyediakan kalender visual interaktif di bagian teratas formulir untuk memilih tanggal tugas (`task_date`), lengkap dengan navigasi bulan, tombol pintas 'Hari Ini'/'Kemarin', dan ringkasan tanggal terpilih.<br>  3. **Pengaturan Shift, Group & Plant**: Menempatkan input shift kerja (dropdown) serta field Group/Departemen dan Lokasi Fasilitas Plant yang dikunci (locked/disabled) sesuai penugasan profil akun dari Admin.<br>  4. **Area Pekerjaan & Komponen Mesin**: Menempatkan dropdown pemilihan Mesin (terfilter otomatis sesuai plant), dropdown Sub-Mesin (terfilter sesuai mesin terpilih), dan input teks Spesifikasi Part / Suku Cadang.<br>  5. **Detail Aktivitas**: Menempatkan textarea uraian pekerjaan yang dilaksanakan secara lengkap.<br>  6. **Waktu Pelaksanaan & Durasi**: Menempatkan input Waktu Mulai, Waktu Selesai, dan durasi otomatis (mendukung kalkulasi otomatis lintas hari/tengah malam), serta tombol Simpan Draft dan Kirim Logbook (Ajukan Approval).<br>- **Relokasi UI Kalender Mingguan ke Halaman Riwayat Logbook (`RiwayatLogbookView.vue`)**:<br>  - Memindahkan UI Kalender Mingguan Teknisi (visual time-grid, planner sidebar panel, filter status/shift, dan popover kartu logbook) ke halaman Riwayat Logbook di bagian atas.<br>  - Mempertahankan seluruh UI tabel riwayat lama (filter status tabs, kolom pencarian, data table, detail modal, dan form revisi) tepat di bawah kalender mingguan.<br>- **Pengujian & Verifikasi**:<br>  - Seluruh 9 pengujian unit test Vitest lulus 100% dan build produksi Vite (`npm run build`) sukses tanpa error. |
| 2.3 | 18 Oktober 2026 | **Pembersihan Tombol Input Logbook pada Halaman Riwayat Logbook (`RiwayatLogbookView.vue`)**:<br>- **Komponen yang Dihapus Sesuai Permintaan**:<br>  1. Menghapus tautan/tombol `<a href="/logbook/input" ...>+ Input Logbook Baru</a>` dari header halaman Riwayat Logbook.<br>  2. Menghapus `<!-- Tombol Buat Logbook -->` dari panel samping kalender (`PlannerSidebarPanel.vue`) dan toolbar kalender (`CalendarToolbar.vue`).<br>- **Komponen yang Dipertahankan**:<br>  - `<!-- FAB Mobile -->` (`<FabCreate />`) tetap dipertahankan pada halaman Riwayat Logbook untuk kenyamanan akses pengguna perangkat mobile.<br>- **Pengujian & Verifikasi**:<br>  - Pengujian unit test Vitest lulus 100% (9/9 tests) dan build produksi Vite (`npm run build`) sukses tanpa kendala. |
| 2.4 | 18 Oktober 2026 | **Perbaikan Error Pemanggilan Service Input Logbook (`logbookService.create`)**:<br>- **Penyebab Masalah**:<br>  - Pada formulir input logbook teknisi (`InputLogbookView.vue`), pemanggilan `logbookService.create(payload, authStore.user)` memicu galat runtime `TypeError: logbookService.create is not a function` karena service `logbookService.js` sebelumnya hanya mengekspos method dengan nama `createLogbook(payload, user)`.<br>- **Solusi & Penyelarasan Service**:<br>  1. **Penambahan Alias Method**: Menambahkan method alias `create(payload, user)`, `update(id, payload, user)`, dan `getById(id)` pada `logbookService.js` untuk menjamin kompatibilitas pemanggilan.<br>  2. **Ketahanan Fungsi `createLogbook`**: Menambahkan fallback cerdas pada `createLogbook()` di `logbookService.js` untuk penanganan `payload.status`, `is_submit`, fallback identitas user/nama plant/shift/mesin, dan kalkulasi durasi.<br>  3. **Pengayaan Payload Form**: Memperbaiki fungsi `handleSubmit()` di `InputLogbookView.vue` agar secara eksplisit mengisi nama relasi (`plant_name`, `shift_name`, `machine_name`, `sub_machine_name`, `group_name`, `is_submit`) dari `masterStore`, serta menyelaraskan pemanggilan ke `logbookService.createLogbook(payload, authStore.user)`.<br>  4. **Penyelarasan Navigasi Edit**: Memperbarui redirect pasca simpan revisi/draft pada `EditLogbookView.vue` ke `/logbook/riwayat`.<br>- **Pengujian & Verifikasi**:<br>  - Seluruh 9 pengujian unit test Vitest lulus 100% dan build produksi Vite (`npm run build`) sukses tanpa error. |
| 2.5 | 18 Oktober 2026 | **Penyesuaian Aksi Tombol Simpan Draft & Kirim Logbook (Tanpa Pindah Halaman)**:<br>- **Latar Belakang & Kebutuhan**:<br>  - Mengubah perilaku tombol *Simpan sebagai Draft* dan *Kirim Logbook* pada form logbook teknisi agar hanya mengirimkan data ke sistem dan mempertahankan pengguna di halaman aktif tanpa pengalihan otomatis rute halaman (*no page navigation*).<br>- **Solusi & Perubahan Arsitektur**:<br>  1. **Form Input Logbook (`InputLogbookView.vue`)**: Menghapus `router.push('/logbook/riwayat')` setelah simpan draft dan kirim logbook. Umpan balik sukses tetap disajikan via komponen visual `Toast`. Khusus aksi kirim logbook berhasil, input uraian aktivitas dan suku cadang dikosongkan agar teknisi siap menginput aktivitas berikutnya tanpa berpindah halaman.<br>  2. **Form Edit & Revisi Logbook (`EditLogbookView.vue`)**: Menghapus `router.push('/logbook/riwayat')` pada `handleSaveDraft` dan `handleSaveApproval`, menambahkan komponen notifikasi `Toast`, serta memperbarui state `logbook` secara in-place agar badge status terupdate seketika.<br>  3. **Form Legacy (`InputLogView.vue`)**: Menghapus `router.push('/log/riwayat')` pada penyimpanan draft dan submit log.<br>- **Pengujian & Verifikasi**:<br>  - Pengujian unit test Vitest lulus 100% (9/9 tests) dan build produksi Vite (`npm run build`) sukses tanpa pesan error. |
| 2.6 | 18 Oktober 2026 | **Penambahan Card Penyimpanan Draft & Fitur Kirim Semua Draft untuk Approval (`InputLogbookView.vue`)**:<br>- **Latar Belakang & Fitur Baru**:<br>  - Menambahkan card baru tempat penyimpanan data draft logbook di bawah Card Waktu Mulai, Selesai & Durasi pada halaman Input Logbook Teknisi, lengkap dengan tombol untuk mengajukan seluruh draft logbook ke Supervisor secara bersamaan.<br>- **Struktur & Kemampuan Card Draft**:<br>  1. **Header & Status Counter**: Menampilkan icon folder arsip, judul seksi, lencana jumlah draft tersimpan, dan tombol aksi cepat *Kirim Semua Draft untuk Approval*.<br>  2. **Tampilan State Kosong (*Empty State*)**: Panduan visual saat belum ada draft tersimpan yang menginformasikan cara kerja tombol 'Simpan sebagai Draft'.<br>  3. **Sub-Toolbar Ringkasan Akumulasi**: Kalkulasi otomatis total durasi pengerjaan dari seluruh draft logbook yang terkumpul.<br>  4. **Daftar Rinci Item Draft**: Kartu interaktif untuk setiap draft yang menyajikan tanggal, shift, lokasi plant, jam mulai-selesai, durasi, mesin, sub-mesin, part, dan uraian aktivitas.<br>  5. **Aksi Per Item**: Tombol *Muat ke Form* (mengembalikan data draft ke form utama di atas), *Ajukan* (mengirim satuan draft), dan *Hapus* (menghapus draft).<br>  6. **Aksi Pengajuan Serentak (*Bulk Submit*)**: Tombol *Kirim Semua Draft untuk Approval* dengan status loading dan notifikasi Toast konfirmasi keberhasilan.<br>- **Penyelarasan Service & Komponen**:<br>  - `logbookService.js`: Menambahkan method `submitAllDrafts(userId, user)` dan `deleteLogbook(id, user)`.<br>  - `Toast.vue`: Mendukung prop `title` dan penataan deskripsi pesan yang lebih rapi.<br>- **Pengujian & Verifikasi**:<br>  - Pengujian unit test Vitest lulus 100% (9/9 tests) dan build produksi Vite (`npm run build`) sukses tanpa error. |
| 2.7 | 18 Oktober 2026 | **Pembaruan Konsep Dashboard Teknisi Berbasis Kesadaran Aktivitas Line (`TeknisiDashboard.vue`)**:<br>- **Latar Belakang & Goals Baru Dashboard Teknisi**:<br>  - Dashboard teknisi didesain ulang agar berfokus pada kesadaran (*notice*) aktivitas logbook di Line operasional teknisi yang bersangkutan. Teknisi dapat memantau riwayat log di line-nya, aktivitas rekan teknisi lain di line-nya, serta mesin dan area operasional line-nya secara real-time.<br>- **Implementasi Card Utama Sesuai Spesifikasi (`PlantCard.vue`)**:<br>  - Menambahkan card monitoring terpadu di bagian paling atas dashboard yang spesifik untuk Line user teknisi (`authStore.user.plant_id`), mencakup:<br>    1. `<!-- 1. Header Kartu: Ikon, Nama Plant, 3 Mini-Stat -->` (Total Log, Log Hari Ini, User Aktif).<br>    2. `<!-- Baris Gabungan: Kiri (Leaderboard Teknisi) & Kanan (Chart 7 Hari Terakhir) -->`.<br>    3. `<!-- 4. Log Terbaru (Plant n) - 3 Baris (Di bawah Leaderboard & Chart) -->` dengan aksi klik untuk membuka modal rincian logbook.<br>- **Fitur & Komponen Pendukung Kesadaran Line**:<br>  1. **Card Area & Mesin Operasional Line**: Ringkasan inventaris mesin pada line teknisi, jumlah komponen sub-mesin, status operasional, akumulasi logbook mesin, dan riwayat servis terakhir.<br>  2. **Tabel Riwayat & Aktivitas Logbook Line**: Tabel interaktif dengan tab switcher: *Semua Teknisi di Line* (melihat aktivitas rekan se-line) dan *Logbook Saya Saja* (fokus catatan pribadi), dilengkapi filter status, nama teknisi, shift, mesin, durasi, dan aksi lihat detail.<br>  3. **Sidebar Rekan Teknisi Line**: Panel daftar rekan teknisi yang ditugaskan pada line yang sama berserta peran dan status aktivitas.<br>  4. **Modal Detail Logbook (`AppModal`)**: Popup tampilan detail komprehensif saat logbook dipilih dari Log Terbaru PlantCard maupun tabel riwayat.<br>- **Penyelarasan Service (`overviewLogbookService.js`)**:<br>  - Menambahkan fungsi `getTechnicianLineOverview(currentUser)` untuk menghitung data plant card spesifik, mesin line, leaderboard teknisi, dan logbook line teknisi secara reaktif.<br>- **Pengujian & Verifikasi**:<br>  - Seluruh 9 pengujian unit test Vitest lulus 100% dan build produksi Vite (`npm run build`) sukses tanpa pesan error. |
| 2.8 | 18 Oktober 2026 | **Penyempurnaan Responsivitas Layout Global & Simplifikasi Dashboard Khusus Teknisi (`TeknisiDashboard.vue`)**:<br>- **Perbaikan Ukuran & Responsivitas Layout Global (`MainLayout.vue`, `Navbar.vue`, `Sidebar.vue`, `PageHeader.vue`)**:<br>  1. **`Main Content Wrapper` & `Page Content`**: Menetapkan batas kontainer `w-full min-w-0 max-w-full overflow-x-hidden` serta padding responsif `p-3.5 sm:p-5 lg:p-6` agar seluruh konten beradaptasi dinamis dan tidak menyusut (*shrink*) atau terdistorsi saat resolusi layar/dimensi jendela diubah.<br>  2. **`Navbar`**: Menambahkan fleksibilitas pada kontainer utama (`min-w-0 flex-1`), tipografi judul & subjudul adaptif pada `PageHeader` (`text-sm sm:text-base md:text-[18px]` dengan pemotongan teks aman `truncate`), serta penataan responsif item profil `UserMenu` untuk mencegah meluap (*overflow*) pada viewport tablet dan perangkat seluler.<br>  3. **`Sidebar`**: Menyempurnakan drawer off-canvas mobile dengan lebar nyaman (`w-64 max-w-[80vw]`) dan bayangan lembut, sembari mempertahankan lebar desktop tetap 208 px (`w-52`) dan mode ciut 72 px (`w-[72px]`).<br>- **Pembersihan & Eliminasi Komponen Lama pada Dashboard Teknisi (`TeknisiDashboard.vue`)**:<br>  1. Menghapus komponen `<!-- NotificationPanel -->` dan `<!-- CalendarCard -->` dari dashboard teknisi.<br>  2. Menghapus `<!-- Baris 1: 3 StatCards Line Kerja -->` (Total Logbook Line, Pending Approval Line, Ditolak / Perlu Revisi).<br>  3. Menghapus kartu Donut Chart status logbook line (`<!-- Status Logbook Line -->` / `StatusDonutCard`).<br>- **Penataan Ulang Tata Letak Dashboard Teknisi**:<br>  1. Mengubah struktur layout menjadi *fluid full-width single-column* yang lapang dan teratur: `PlantCard` (Monitoring Line Kerja) di bagian teratas, `Area & Mesin Operasional Line` (Grid Mesin Terdaftar), dan `Riwayat & Aktivitas Logbook Line` (Tabel Aktivitas Rekan & Pribadi).<br>  2. Menempatkan grafik tren tahunan line `StatisticsChartCard` berdampingan dengan panel `Teknisi di Line Ini` (`Rekan Teknisi di Line Saya`) dalam grid responsif `grid-cols-1 lg:grid-cols-[1.6fr_1fr]`.<br>  3. Membersihkan seluruh kode impor, komputasi, dan state yang tidak lagi digunakan (`StatCard`, `StatusDonutCard`, `NotificationPanel`, `CalendarCard`, `stats`, `statusCounts`, `getLast7DaysLineCounts`, `lineLogbookDates`, `selectedFilterDate`).<br>- **Penyempurnaan Responsivitas Kartu Plant (`PlantCard.vue`)**:<br>  - Menyesuaikan blok 3 Mini-Stat pada header kartu menjadi fluid dengan scroll horizontal otomatis jika layar sangat kecil, serta mengubah baris Leaderboard & Chart 7 Hari menjadi grid `grid-cols-1 md:grid-cols-2`.<br>- **Pengujian & Verifikasi**:<br>  - Build produksi Vite (`npm run build`) sukses tanpa error dan seluruh 9 pengujian unit test Vitest lulus 100%. |
| 2.9 | 18 Oktober 2026 | **Penambahan Halaman Monitoring Aktivitas & Frekuensi Pengisian Logbook Anggota Tim Teknisi Khusus Pengguna Supervisor (`/supervisor/teknisi`)**:<br>- **Latar Belakang & Tujuan**:<br>  - Menyediakan antarmuka monitoring terpusat bagi Supervisor untuk memantau seberapa sering dan konsisten setiap teknisi di bawah pimpinannya mengisi logbook kerja harian, performa jam kerja, status persetujuan, serta detail riwayat pekerjaan di lapangan secara transparan dan terukur.<br>- **Fitur Utama Halaman Aktivitas Teknisi (`TeknisiActivityView.vue`)**:<br>  1. **Header Supervisor & Identitas Tim**: Menampilkan profil supervisor aktif (`Ir. Hendra Gunawan`, Grup Mekanikal/Elektrikal, Lokasi Plant) beserta badge penanda anggota tim pimpinan langsung.<br>  2. **4 KPI StatCards Monitoring Tim**:<br>     - *Total Anggota Tim*: Jumlah total teknisi binaan langsung vs total teknisi pabrik.<br>     - *Aktif Hari Ini & % Partisipasi*: Jumlah dan rasio persentase teknisi yang telah mengisi logbook hari ini.<br>     - *Total Logbook Tim (Bulan Ini)*: Akumulasi seluruh catatan kerja tim pada bulan berjalan beserta rata-rata per teknisi.<br>     - *Rata-rata Frekuensi Tim*: Indikator rata-rata logbook harian tim dan skor keaktifan (*Sangat Rajin*, *Aktif Normal*, *Perlu Perhatian*).<br>  3. **Toolbar Kontrol & Filter Interaktif**:<br>     - *Tab Lingkup*: Pilihan cepat antara 'Tim Pimpinan Saya' (fokus teknisi grup supervisor) dan 'Seluruh Teknisi Pabrik'.<br>     - *Filter Status*: Semua Status, Aktif Hari Ini, Belum Ada Log Hari Ini, Sangat Rajin (≥ 20 log/bln), dan Perlu Perhatian (< 5 log/bln).<br>     - *Pencarian Cerdas*: Pencarian multi-kriteria berdasarkan nama teknisi, NIK/ID, dan mesin yang sering ditangani.<br>     - *Pengurutan Dinamis*: Paling Sering Mengisi, Logbook Terbanyak, Paling Jarang Mengisi, Nama A-Z, atau Aktivitas Terakhir.<br>     - *Mode Tampilan*: Beralih instan antara **Tampilan Kartu (Grid)** dan **Tampilan Tabel**.<br>  4. **Tampilan Kartu Teknisi (Card Grid)**:<br>     - Avatar, nama lengkap, NIK, grup, plant, dan badge 'Tim Pimpinan Saya'.<br>     - Titik pulsasi status hari ini ('Aktif Hari Ini' vs 'Belum Ada Log Hari Ini').<br>     - Lencana kategori frekuensi (*Sangat Rajin*, *Aktif Normal*, *Perlu Perhatian*).<br>     - Grafik mini bar interaktif 7 hari terakhir (*Interactive Sparkline*) dengan hitungan logbook per hari.<br>     - Metrik total log, log bulan ini, log minggu ini, akumulasi jam kerja, mesin terbanyak (*Top Machine*), dan mini breakdown status persetujuan (Approved, Pending, Rejected, Draft).<br>     - Tombol aksi 'Lihat Riwayat Logbook Lengkap'.<br>  5. **Tampilan Tabel Teknisi Alternatif**:<br>     - Format tabel komprehensif dengan kolom: Teknisi & NIK, Tim, Status Hari Ini, Tren 7 Hari Terakhir, Total Logbook (Bulan Ini / Total), Jam Kerja, Mesin Terbanyak, Rasio Approval, dan Aksi Cepat.<br>  6. **Modal Riwayat Aktivitas & Logbook Teknisi (`AppModal`)**:<br>     - Pop-up rincian riwayat lengkap teknisi terpilih dengan ringkasan KPI, filter status, tabel daftar seluruh logbook dengan status badge, mesin, durasi, uraian aktivitas, dan tautan pintas menuju halaman `/approval` bila ada logbook menunggu persetujuan.<br>- **Penyelarasan Service (`teknisiService.js`)**:<br>  - Menambahkan method `getSupervisorTeamOverview(supervisorUser)` yang secara otomatis mengagregasi data teknisi dari `MOCK_USERS` dan riwayat logbook dari `logbookService.getLogbooks()`, menghitung statistik frekuensi, sparkline 7 hari, total durasi, status persetujuan, mesin teratas, dan mendeteksi relasi tim langsung pimpinan supervisor.<br>- **Arsitektur Rute & Navigasi**:<br>  - Rute baru: `/supervisor/teknisi` (`src/views/supervisor/TeknisiActivityView.vue`) dengan hak akses `[ROLES.SUPERVISOR, ROLES.ADMIN]`.<br>  - Menu navigasi Sidebar: Menambahkan item menu `Aktivitas Teknisi` pada menu Supervisor (`src/constants/menu.js`) dengan ikon Lucide `Users`.<br>- **Pengujian & Verifikasi**:<br>  - Build produksi Vite (`npm run build`) sukses tanpa error dan seluruh 9 pengujian unit test Vitest lulus 100%. |
| 3.0 | 18 Oktober 2026 | **Penyempurnaan Modal Detail Aktivitas Teknisi: Integrasi Card Calendar Status Logbook & Metrik Total Log (`TeknisiActivityView.vue`)**:<br>- **Penggantian Komponen Sesuai Permintaan**:<br>  1. **Penggantian `<!-- Total Durasi Kerja -->`**: Dihapus dan diganti dengan kartu metrik **Total Log yang Sudah Teknisi Isi** (`selectedTech.totalLogs`), menyajikan angka akumulasi riil logbook terisi secara ringkas dan tegas pada header modal profil teknisi.<br>  2. **Penggantian `<!-- 4 Stat Mini Teknisi -->` dengan Card Calendar**: Blok 4 stat mini lama digantikan dengan **Card Calendar Aktivitas Logbook Teknisi** bulanan yang interaktif dan komprehensif.<br>- **Fitur & Mekanisme Card Calendar**:<br>  - **Pemberian Kode Warna Status (Color-Coded Status)**:<br>    - 🟢 **Warna Hijau (`Approved`)**: Hari di mana teknisi memiliki logbook yang telah disetujui supervisor.<br>    - 🟡 **Warna Kuning (`Pending`)**: Hari di mana terdapat logbook yang masih menunggu persetujuan / butuh diapprove supervisor.<br>    - 🔴 **Warna Merah (`Hari Tanpa Log`)**: Hari kerja/hari kalender yang telah berlalu di mana teknisi tidak mengisi logbook sama sekali.<br>    - ⚪ **Hari Mendatang (*Future*)**: Ditampilkan netral/abu-abu agar objektif dan tidak terhitung sebagai hari bolong sebelum tanggalnya tiba.<br>    - 🔵 **Sorotan Hari Ini (*Today*)**: Ditandai dengan outline/ring primer dan dot indikator hari ini.<br>  - **Navigasi & Interaktivitas Kalender**:<br>    - Navigasi bulan sebelumnya dan berikutnya (`prevModalMonth` / `nextModalMonth`) serta tombol pintas "Bulan Ini".<br>    - Keterangan legend status warna transparan dan jelas.<br>    - **Filter Interaktif Tanggal**: Mengklik tanggal pada kalender akan secara otomatis memfilter tabel daftar riwayat logbook di bawahnya hanya untuk tanggal yang dipilih, lengkap dengan tombol reset/hapus filter.<br>    - **Baris Ringkasan Bulanan**: Menghitung akumulasi hari disetujui, hari menunggu approval, hari tanpa log, dan total log terisi pada bulan terpilih.<br>- **Pengujian & Verifikasi**:<br>  - Build produksi Vite (`npm run build`) sukses tanpa error (`built in 3.47s`) dan seluruh 9 pengujian unit test Vitest lulus 100%. |
| 3.1 | 18 Oktober 2026 | **Optimalisasi Tata Letak Card Calendar Modal Aktivitas Teknisi (`TeknisiActivityView.vue`)**:<br>- **Relokasi & Restrukturisasi Komponen Card Calendar**:<br>  1. **Reposisi Ringkasan Akumulasi Keterisian**: `<!-- Ringkasan Akumulasi Keterisian Bulan Ini -->` dipindahkan ke atas grid `<!-- Cell Tanggal (7 Kolom) -->` tepat di bawah header bulan kalender, sehingga supervisor langsung melihat metrik ringkas (Hari Disetujui, Menunggu Approval, Hari Tanpa Log, Total Log Bulan Ini) sebelum melihat matriks tanggal.<br>  2. **Reposisi & Perapian Legend Keterangan Warna**: `<!-- Keterangan Legend Status Warna Sesuai Panduan -->` dipindahkan ke bawah `<!-- Cell Tanggal (7 Kolom) -->`. Desain disederhanakan dari blok kontainer tebal menjadi baris legend ramping dan kompak (*compact footer strip*) bergaris pemisah halus, menghemat ruang vertikal secara signifikan dan menjaga tampilan tetap rapi serta estetis.<br>- **Pengujian & Verifikasi**:<br>  - Build produksi Vite (`npm run build`) sukses tanpa kendala (`built in 2.83s`) dan seluruh 9 pengujian unit test Vitest lulus 100%. |
| 3.2 | 18 Oktober 2026 | **Eksekusi Fase 2: Pembangunan Backend REST API, Skema TiDB (Prisma ORM), dan Integrasi Sistem (`/backend`)**:<br>- **Latar Belakang & Gate Kelulusan**:<br>  - Seluruh pengujian antarmuka (UI) pada Fase 1 telah tuntas dan disetujui. Pengembangan proyek secara resmi dinaikkan ke **Fase 2 (Pembangunan Backend API)** sesuai acuan Bagian 7.2, 8, 9, dan 13.<br>- **Pembangunan Arsitektur Backend (`/backend`)**:<br>  1. **Runtime & Framework**: Inisialisasi arsitektur Node.js (ES Module) + Express.js dengan middleware CORS, JSON body parser (10MB), dan HTTP logger Morgan.<br>  2. **Perancangan Skema Database TiDB (Prisma ORM)** (`backend/prisma/schema.prisma`):<br>     - Mengimplementasikan seluruh **11 tabel utama** sesuai ERD Bagian 9: `roles`, `work_groups`, `plants`, `shifts`, `machines` (dengan relasi `plant_id` FK), `sub_machines`, `users`, `logbooks`, `logbook_approvals`, `notifications`, dan `user_activities`.<br>     - Dilengkapi konvensi tipe data presisi, indeks komputasi, enum status (`LogStatus`, `ApprovalStatus`, `NotificationChannel`), dan polyfill serialisasi JSON untuk tipe data `BigInt`.<br>  3. **Skrip Seeding Database Otomatis** (`backend/prisma/seed.js`):<br>     - Menyediakan seeding data awal untuk 4 plant, 3 shift kerja, 4 grup kerja, mesin & sub-mesin, serta akun dummy resmi (`teknisi@satoria.co.id`, `spv@satoria.co.id`, `admin@satoria.co.id`, dan teknisi tim lainnya) dengan hash kata sandi terenkripsi `bcryptjs` (`password123`), sample logbook multi-status, notifikasi in-app, dan audit log.<br>  4. **Autentikasi & Keamanan Ketat**:<br>     - Implementasi token stateless **JSON Web Token (JWT)** via `backend/src/utils/jwt.js` dan middleware `authenticate`.<br>     - Otorisasi ketat **Role-Based Access Control (RBAC)** via `backend/src/middlewares/rbac.js` (`Teknisi`, `Supervisor`, `Admin`) yang ditegakkan di level endpoint server.<br>     - Enkripsi kata sandi menggunakan `bcryptjs` (salt rounds 10).<br>  5. **Implementasi REST API Endpoints v1 Terstandarisasi** (`/api/v1`):<br>     - *Format Respons Baku* per Bagian 13.1: `{ "success": true, "message": "...", "data": {}, "meta": {} }`.<br>     - *Modul Autentikasi* (`/api/v1/auth`): Login NIK/Email, profil pengguna (`/me`), perbarui profil, dan ganti kata sandi.<br>     - *Modul Logbook* (`/api/v1/logbooks`): CRUD logbook harian, filter status/plant/tanggal, kalkulasi otomatis durasi shift normal maupun melintasi tengah malam (overnight shift), validasi kepemilikan data (Teknisi hanya akses catatan sendiri), aturan edit hanya untuk status Draft/Rejected, dan pengajuan serentak draft (`/submit-all-drafts`).<br>     - *Modul Approval* (`/api/v1/logbooks/:id/approval`): Pemrosesan persetujuan oleh Supervisor/Admin dengan catatan revisi wajib saat status Rejected, pencatatan otomatis riwayat persetujuan, dan pemicu notifikasi ke teknisi.<br>     - *Modul Master Data* (`/api/v1/master/:type`): Pengelolaan data referensi `plants`, `shifts`, `machines`, `sub-machines`, `groups`, dan `roles`.<br>     - *Modul Pengguna* (`/api/v1/users`): Manajemen akun pengguna oleh Admin (CRUD akun dan soft-delete/toggle status aktif).<br>     - *Modul Supervisor Kinerja Tim* (`/api/v1/supervisor/team-overview`): Agregasi frekuensi pengisian logbook tim teknisi binaan langsung vs seluruh teknisi pabrik, metrik hari ini, sparkline 7 hari, jam kerja, dan mesin teratas.<br>     - *Modul Ekspor Laporan* (`/api/v1/reports/export`): Pembuatan dan pengunduhan dokumen spreadsheet Excel `.xlsx` secara otomatis menggunakan engine `ExcelJS` dengan styling header dan kolom dinamis, serta format JSON.<br>     - *Modul Notifikasi* (`/api/v1/notifications`): Pengambilan notifikasi in-app dan penandaan status telah dibaca (*mark as read* / *read all*), serta modul pengiriman email Nodemailer (SMTP).<br>     - *Modul Audit Trail* (`/api/v1/admin/audit-logs`): Monitoring penelusuran seluruh aktivitas operasional dan aksi sensitif pengguna pada tabel `user_activities`.<br>  6. **Automated Testing Suite Backend** (`backend/test/api.test.js`):<br>     - 7 unit & integration test otomatis berbasis test runner Node.js (`npm test`), menguji kalkulasi durasi overnight, integritas JWT token, health check server, penolakan akses tanpa token (401), validasi login (400), dan penanganan rute tak terdaftar (404). Seluruh 7 pengujian lulus 100%. |
| 3.3 | 18 Oktober 2026 | **Perbaikan Dropdown Kosong Fasilitas Plant & Kelompok Kerja pada Manajemen Pengguna Admin (`UserManagementView.vue`)**:<br>- **Penyebab Masalah**:<br>  Pada modal tambah/edit akun pengguna (`UserManagementView.vue`), elemen dropdown `<select>` untuk *Fasilitas Plant* (`masterStore.plants`) dan *Kelompok Kerja (Work Group)* (`masterStore.workGroups`) tidak memunculkan data sama sekali (kosong) karena komponen tidak memanggil siklus hidup `onMounted` untuk memicu `masterStore.fetchAll()`, serta state awal store Pinia `master.js` sebelumnya diinisialisasi hanya dengan array kosong `[]`.<br>- **Solusi & Perbaikan Komprehensif**:<br>  1. **Inisialisasi Master Store (`frontend/src/stores/master.js`)**: Memberikan fallback nilai default dari dataset master (`MOCK_PLANTS`, `MOCK_WORK_GROUPS`, `MOCK_SHIFTS`, `MOCK_MACHINES`, `MOCK_SUB_MACHINES`) pada deklarasi state `ref` agar store tidak pernah berada dalam kondisi array kosong sebelum atau saat proses asynchronous `fetchAll()` berlangsung.<br>  2. **Lifecycle Hook & Integrasi (`UserManagementView.vue`)**: Mengimpor `onMounted` dari `vue` dan mengeksekusi `await masterStore.fetchAll()` saat komponen dimuat guna mengambil data master terbaru.<br>  3. **UX Dropdown Form**: Menambahkan opsi placeholder pemandu `-- Pilih Fasilitas Plant --` dan `-- Pilih Kelompok Kerja --` serta memastikan nilai default `plant_id` dan `group_id` terpilih secara presisi saat modal dibuka. |
| 3.4 | 18 Oktober 2026 | **Migrasi Total Frontend ke Database TiDB Cloud (Eliminasi Penuh Seluruh Data Mock)**:<br>- **Penghapusan Seluruh Data Mock (`src/mock/`)**:<br>  Menghapus total direktori `src/mock/` beserta seluruh 8 berkas mock di dalamnya (`users.js`, `masterData.js`, `logbooks.js`, `logs.js`, `teknisi.js`, `notifications.js`, `auditLogs.js`, `validasi.js`). Sistem kini 100% menggunakan data riil dari database TiDB.<br>- **Implementasi Centralized API Client (`src/services/api.js`)**:<br>  Membangun wrapper Fetch API terpusat dengan otentikasi otomatis Bearer JWT Token dari `localStorage`, penanganan header JSON/FormData/Blob, dan standardisasi error handling.<br>- **Penyelarasan Seluruh Service ke REST API Backend (`/api/v1`)**:<br>  1. `authService.js`: Login langsung ke `/api/v1/auth/login`, verifikasi hash bcrypt, token JWT, pembaruan profil `/auth/profile`, dan ganti sandi `/auth/change-password`.<br>  2. `masterService.js` & `masterStore.js`: Pengambilan data master plants, shifts, machines, sub-machines, groups, dan roles langsung dari endpoint `/api/v1/master/:type`.<br>  3. `logbookService.js`: CRUD logbook, submit draft tunggal & massal, serta proses approval/rejection langsung tersimpan ke database TiDB.<br>  4. `userService.js` & `UserManagementView.vue`: Manajemen data pengguna admin langsung mengelola akun di database.<br>  5. `teknisiService.js`: Mengambil agregasi kinerja tim supervisor langsung dari endpoint `/api/v1/supervisor/team-overview`.<br>  6. `notificationStore.js`: Monitoring notifikasi in-app real-time langsung ke tabel `notifications`.<br>  7. `auditService.js`: Monitoring audit trail aktivitas sistem langsung ke tabel `user_activities`.<br>- **Konfigurasi Vite Proxy (`vite.config.js`)**:<br>  Menambahkan reverse proxy `/api` yang meneruskan panggilan ke server backend di `http://localhost:3000`. |
| 3.5 | 18 Oktober 2026 | **Aktivasi Fitur Notifikasi Menyeluruh per Masing-Masing Pengguna (Teknisi, Supervisor, Admin)**:<br>- **Latar Belakang & Identifikasi Masalah**:<br>  Fitur notifikasi sebelumnya belum berfungsi di sisi pengguna karena: (1) Komponen `Navbar.vue` tidak pernah memicu pemanggilan `fetchNotifications()` saat halaman dimuat atau peran berganti, (2) Pengajuan logbook tunggal maupun serentak (`submitAllDrafts`) belum menyiarkan notifikasi ke semua pihak terkait (Teknisi pengaju, Supervisor, dan Admin), (3) Serialisasi endpoint notifikasi belum menyertakan `logbook_id` untuk navigasi rute.<br>- **Pembaruan Backend REST API & Trigger Notifikasi (`/backend`)**:<br>  1. `logbookController.js`:<br>     - Pada `createLogbook` (status `PENDING`): Mengirim notifikasi konfirmasi ke Teknisi pengaju (`LOGBOOK_SUBMITTED`), notifikasi antrean approval ke Supervisor plant terkait/seluruh supervisor aktif (`LOGBOOK_PENDING_APPROVAL`), dan notifikasi operasional sistem ke seluruh Administrator (`LOGBOOK_SUBMITTED`).<br>     - Pada `updateLogbook` (re-submit `PENDING`): Mengirim notifikasi pembaruan ke Teknisi, Supervisor, dan Admin.<br>     - Pada `submitAllDrafts`: Mengirim notifikasi pengajuan massal ke Teknisi (`DRAFTS_SUBMITTED`), Supervisor (`BULK_DRAFTS_SUBMITTED`), dan Admin.<br>  2. `approvalController.js`:<br>     - Pada `processApproval`: Selain notifikasi status hasil tinjauan ke Teknisi (`LOGBOOK_APPROVED` / `LOGBOOK_REJECTED`), kini juga mengirim notifikasi konfirmasi ke Supervisor yang mereview dan notifikasi audit status ke seluruh Admin sistem.<br>  3. `userController.js`:<br>     - Mengirim notifikasi selamat datang (`USER_CREATED`) saat Admin mendaftarkan pengguna baru dan notifikasi perubahan profil (`USER_UPDATED`).<br>  4. `notificationController.js`:<br>     - Menyertakan `logbook_id` pada respons serialisasi notifikasi untuk mendukung direct redirection ke detail logbook.<br>- **Penyempurnaan Frontend & Real-Time Monitoring (`frontend/src/components/layout/Navbar.vue`)**:<br>  1. Mengaktifkan pengambilan notifikasi otomatis pada siklus hidup `onMounted`, pemantauan perubahan pengguna aktif via `watch(() => authStore.user?.id)`, dan interval polling otomatis setiap 15 detik.<br>  2. Penyelarasan format label notifikasi (`formatType`) ke bahasa Indonesia yang ramah pengguna dan pemformatan tanggal waktu lokal WIB (`formatTime`).<br>  3. Interaktivitas klik notifikasi cerdas: Menandai notifikasi sebagai dibaca (`markAsRead`) dan mengarahkan rute sesuai peran (Teknisi diarahkan ke riwayat/form revisi, Supervisor ke antrean approval, Admin ke modul audit log/pengguna).<br>- **Pengujian & Verifikasi**:<br>  - Seluruh 8 pengujian otomatis backend Node.js (`npm test`), 9 unit test frontend Vitest (`npm test`), serta build produksi Vite (`npm run build`) sukses dan lulus 100%. |
| 3.6 | 19 Oktober 2026 | **Implementasi Enterprise Avatar Storage Engine (Zero Egress), Konversi Otomatis WebP & Fitur Upload Foto Profil Pengguna**:<br>- **Arsitektur Pemrosesan Citra Performa Tinggi (`backend/src/services/imageService.js`)**:<br>  - Mengintegrasikan library `sharp` berbasis C (`libvips`) di backend Node.js untuk menangani pemrosesan citra ultra-cepat.<br>  - Konversi otomatis dari format mentah kamera (JPG, PNG) menjadi format modern **WebP** dengan kualitas seimbang (`quality: 82`, `effort: 4`).<br>  - Pemotongan simetris persegi (320&times;320 px) dengan posisi `center-crop` dan rotasi orientasi otomatis (`.rotate()`) berdasarkan data EXIF foto ponsel.<br>  - Kompresi ukuran file drastis (menghemat 85%–98% ukuran file, dari beberapa MB menjadi hanya ~20–40 KB) untuk menghemat bandwidth pengguna di area pabrik.<br>- **Penyimpanan Berdaulat & Skalabel (`backend/src/services/storageService.js`)**:<br>  - Mendukung dual-storage mode: **Cloudflare R2 / S3 Object Storage** (bebas biaya egress transfer / *zero egress fee*) via `@aws-sdk/client-s3` bila kredensial `R2_*` terkonfigurasi di `.env`, dengan fallback otomatis ke **Local Static Uploads** (`/uploads/avatars/`) yang dilayani langsung oleh Express.js (`express.static`) untuk kemudahan pengembangan lokal & offline.<br>  - Pembersihan otomatis (*auto-cleanup*) berkas avatar lama saat pengguna mengunggah foto baru atau menghapus foto.<br>- **API Endpoint & Keamanan Backend (`/api/v1/auth`)**:<br>  - Middleware Multer in-memory (`backend/src/middlewares/upload.js`) dengan pembatasan ukuran file 10MB dan validasi MIME type ketat.<br>  - Endpoint `POST /api/v1/auth/avatar`: Mengunggah, memproses, menyimpan, memperbarui `photo_url` di database TiDB, mencatat audit log, dan mengembalikan metrik optimasi (`originalSize`, `processedSize`, `compressionRatio`).<br>  - Endpoint `DELETE /api/v1/auth/avatar`: Menghapus foto profil dan mengembalikan identitas ke inisial nama.<br>  - Endpoint alias `POST /api/v1/auth/change-password` untuk keselarasan layanan frontend.<br>- **Antarmuka Pengguna & Interaktivitas Halaman Profil (`ProfileView.vue`)**:<br>  - Penambahan Card Profil Pengguna yang dilengkapi avatar interaktif dengan overlay tombol kamera, tombol `Pilih Foto`, preview lokal instan sebelum simpan, dan tombol `Hapus Foto`.<br>  - Panel notifikasi hasil optimasi yang menampilkan format awal, format WebP, ukuran sebelum vs sesudah, dan persentase efisiensi bandwidth.<br>  - Panduan spesifikasi foto yang jelas dan feedback notifikasi Toast/Banner ramah pengguna.<br>- **Reaktivitas Global & Pembaruan Avatar (`Avatar.vue`, `authStore.js`, `vite.config.js`)**:<br>  - Menambahkan watcher reaktif pada komponen `Avatar.vue` (`watch(() => props.src)`) agar perubahan foto avatar langsung memicu re-render di seluruh header, navbar, sidebar, dashboard, dan modal tanpa perlu refresh halaman.<br>  - Menambahkan reverse proxy `/uploads` pada `vite.config.js` untuk menyalurkan berkas foto lokal ke server backend.<br>- **Pengujian & Verifikasi**:<br>  - Seluruh pengujian backend Node.js (`api.test.js`, `image.test.js`, `upload.test.js`), unit test frontend Vitest (9/9 tests), serta build produksi Vite (`npm run build`) sukses dan lulus 100%. |
| 3.7 | 20 Oktober 2026 | **Penyederhanaan Logika Login Tahap Pengembangan (Master Dev Password `password123`), Penonaktifan Sementara Ganti & Lupa Sandi, dan Konfigurasi Deployment Vercel Serverless**:<br>- **Penyederhanaan Autentikasi Pengguna (`backend/src/controllers/authController.js`)**:<br>  - Seluruh pengguna terdaftar dapat login menggunakan kata sandi terpusat: `password123` (melalui variabel `DEV_DEFAULT_PASSWORD`).<br>  - **Prinsip Keamanan Tetap Diutamakan**:<br>    1. Identitas akun (NIK atau Email) WAJIB telah terdaftar di database TiDB (tidak bisa sembarang input akun palsu).<br>    2. Status akun pengguna WAJIB aktif (`is_active === true`), akun yang dinonaktifkan Admin tetap ditolak (403).<br>    3. Kata sandi yang dimasukkan WAJIB cocok dengan master dev password atau hash asli bcrypt di database.<br>    4. Token JWT resmi tetap diterbitkan dengan penandatanganan `JWT_SECRET` dan masa berlaku.<br>    5. Setiap transaksi login pengguna tetap tercatat secara otomatis di tabel audit trail `user_activities`.<br>- **Penonaktifan Sementara Fitur Ganti & Lupa Kata Sandi**:<br>  - *Backend*: Endpoint `PUT /api/v1/auth/password` dan `POST /api/v1/auth/change-password` mengembalikan status 403 dengan pesan informatif tahap pengembangan. Seluruh logika asli pergantian kata sandi diproteksi dalam blok komentar yang siap diaktifkan kembali saat seluruh modul sistem rampung.<br>  - *Frontend*: Menonaktifkan teks/tombol *Lupa sandi?* pada form login (`LoginView.vue`) dan mengubah kartu *Ubah Kata Sandi* pada halaman profil pengguna (`ProfileView.vue`) menjadi panel notifikasi status pengembangan (form lama diproteksi dalam komentar).<br>- **Optimalisasi Konfigurasi Deployment Vercel Serverless**:<br>  - Backend: Pembuatan entrypoint Serverless Function `backend/api/index.js` (`export default app`) dan rewrites routing `backend/vercel.json` (`/(.*) -> /api/index.js`).<br>  - Backend Scripts: Penambahan script `"build": "prisma generate"` dan perbaikan `"postinstall": "prisma generate"` pada `backend/package.json` untuk menjamin Prisma Client ter-generate sempurna di runtime Vercel.<br>  - Frontend: Penambahan `frontend/vercel.json` dengan rewrites Single Page Application (`/(.*) -> /index.html`) agar routing tidak mengalami error 404 saat pengguna me-refresh halaman.<br>- **Pengujian & Verifikasi**:<br>  - Seluruh 11 pengujian otomatis backend Node.js (`npm test`) lulus 100% dan build produksi frontend Vite (`npm run build`) sukses tanpa pesan error. |
| 3.8 | 20 Oktober 2026 | **Penghapusan Komponen Akun Demo pada Halaman Login (`LoginView.vue`) & Penyelarasan Input Pengguna Riil**:<br>- Menghapus seluruh daftar akun demo preset (Teknisi, Supervisor, Admin) beserta pembatas "Pilihan Akun Demo Satoria (Fase 1)" dari template antarmuka `LoginView.vue`.<br>- Membersihkan state `demoAccounts`, fungsi `fillAndLogin`, dan referensi konstanta `ROLES` yang tidak lagi digunakan pada `<script setup>`.<br>- Mengosongkan nilai awal formulir input login (`form.identifier` dan `form.password`) agar pengguna memasukkan kredensial NIK/Email dan kata sandi secara mandiri.<br>- Pengujian build produksi frontend Vite (`npm run build`) sukses 100% tanpa error. |
| 3.9 | 20 Oktober 2026 | **Penyempurnaan Section E Overview Dashboard: Pemisahan Presisi "Line dengan Pengisian Log Terbanyak" dan "Mesin (dengan Keterangan Line) dengan Log Terbanyak" (`TopLinesProgressCard.vue` & `overviewLogbookService.js`)**:<br>- **Perbaikan Logika Agregasi Data (`overviewLogbookService.js`)**:<br>  - Sebelumnya Section E mengelompokkan data berdasarkan mesin namun diberi label 'Line'. Kini dilakukan pemisahan agregasi secara presisi:<br>    1. `summary.lines`: Menghitung akumulasi logbook per **Line/Plant** fasilitas operasional (`Line 1`, `Line 2`, `General`, `Line 3`, `Line 4`) diurutkan dari yang memiliki log terbanyak lengkap dengan persentase dan warna aksen line.<br>    2. `summary.machines`: Menghitung akumulasi logbook per **Mesin** dengan menyertakan keterangan relasi **Line** tempat mesin tersebut berada (misal: `AUTOCLAVE (Line 2)`, `OTHER (Line 1)`).<br>- **Penyempurnaan Antarmuka Kartu (`TopLinesProgressCard.vue`)**:<br>  - Mengatur tata letak berjenjang: Bagian atas menampilkan daftar **Line dengan Pengisian Log Terbanyak** (dengan progress bar dan persentase kontribusi), dan bagian bawah menampilkan daftar **Mesin (disertai keterangan Linenya) dengan Log Terbanyak** (dengan badge Line berwarna, progress bar, dan persentase kontribusi).<br>  - Footer kartu menyajikan metrik total logbook terdistribusi, *Line Teraktif*, serta *Mesin Terbanyak*.<br>- **Pengujian & Verifikasi**:<br>  - Seluruh 9 pengujian unit test Vitest (`npm test`) lulus 100% dan build produksi frontend Vite (`npm run build`) sukses tanpa pesan error. |
| 4.0 | 20 Oktober 2026 | **Peningkatan Performa Menyeluruh: Polling Cerdas, Fan-Out Notifikasi Single Query, Database Indexing TiDB, Agregasi Database groupBy, Lazy Loading Rute, dan Pengujian Presisi Zona Waktu WIB (UTC+7)**:<br>1. **Polling Notifikasi Cerdas & Endpoint Ringan**:<br>   - Interval polling dinaikkan dari 15 detik menjadi 60 detik di `Navbar.vue` guna menghemat bandwidth dan kapasitas serverless.<br>   - Integrasi Page Visibility API (`document.hidden` & `visibilitychange`): polling otomatis dihentikan saat pengguna beralih tab dan segera aktif kembali saat tab dibuka.<br>   - Pembuatan endpoint ringan `GET /api/v1/notifications/unread-count` untuk polling hitungan notifikasi belum dibaca tanpa memuat seluruh array data notifikasi.<br>2. **Fan-Out Notifikasi Single Query (`createMany`)**:<br>   - Pengajuan logbook, pembaruan, submit all drafts, dan approval kini mengompilasi notifikasi ke Teknisi, Supervisor, dan seluruh Admin dalam satu array dan mengeksekusinya dalam **1 query tunggal database** melalui `prisma.notification.createMany` via `sendBulkNotifications`, menggantikan perulangan *insert* individual (`sendNotification`).<br>3. **Penyempurnaan Indeks Majemuk Basis Data & Pagination**:<br>   - Menambahkan compound index pada skema database TiDB (`schema.prisma`):<br>     - `logbooks`: `@@index([user_id, task_date])` dan `@@index([status, plant_id, task_date])`.<br>     - `notifications`: `@@index([user_id, is_read, created_at])`.<br>   - Menerapkan parameter pagination baku (`page`, `limit`, `skip`, `meta`) pada seluruh endpoint daftar notifikasi dan logbook.<br>4. **Optimalisasi Ekspor Excel & Agregasi Database Supervisor**:<br>   - `supervisorController.js`: Menghilangkan penarikan seluruh baris logbook ke memori Node.js; kini seluruh ringkasan kinerja tim, durasi, status approval, aktivitas 7 hari, dan top machine dihitung langsung di database menggunakan Prisma `groupBy` (mempercepat respons dari ratusan MB memori menjadi kalkulasi instan ~1 detik).<br>   - `reportController.js`: Membatasi rentang tanggal ekspor Excel maksimal 93 hari (3 bulan) dan batas 3.000 entri per unduhan demi mencegah *Out-of-Memory* (OOM) pada runtime serverless Vercel.<br>5. **Optimasi Frontend (Lazy Loading, Tree-Shaking, Subset Font Inter)**:<br>   - Mengonversi seluruh definisi view pada `router/index.js` menjadi dynamic code-splitting: `component: () => import(...)`.<br>   - Membatasi impor `@fontsource/inter` di `main.js` hanya pada subset Latin dengan bobot 400, 500, dan 600, mengeliminasi puluhan file font Cyrillic/Greek/Vietnamese yang tidak terpakai.<br>   - Ukuran bundle utama frontend turun drastis dari **420 kB** menjadi hanya **81.6 kB** (gzip: 29.8 kB).<br>6. **Sinkronisasi Zona Waktu WIB (UTC+7 vs Vercel UTC) & Shift Lintas Tengah Malam**:<br>   - Pembuatan modul utility `backend/src/utils/date.js` yang memanfaatkan `Intl.DateTimeFormat` dengan timeZone `Asia/Jakarta`, memastikan tanggal acuan serverless Vercel (UTC) selalu menghasilkan penanggalan WIB yang tepat.<br>   - Penambahan suite pengujian otomatis `backend/test/timezone.test.js` (8 skenario uji): membuktikan bahwa logbook yang dibuat pukul 01:00 WIB (18:00 UTC kemarin) tetap tercatat di `task_date` tanggal baru, transisi 23:59 ke 00:05 WIB presisi, dan durasi shift malam (Shift 3: 23:00 - 07:00 durasi 480 menit, LongShift 19:00 - 07:00 durasi 720 menit) terhitung sempurna.<br>- **Pengujian & Verifikasi**:<br>   - Seluruh 19 unit & integration test backend Node.js (`npm test`) lulus 100%.<br>   - Seluruh 9 unit test frontend Vitest (`npm test`) lulus 100%.<br>   - Build produksi frontend Vite (`npm run build`) selesai dalam 7.6 detik tanpa error. |
| 4.1 | 21 Oktober 2026 | **Penguatan Keamanan & Reliabilitas: Pengujian Otorisasi RBAC Komprehensif, Otomasi CI Pipeline (GitHub Actions), Pemisahan Environment Dev/Prod, Eliminasi 7 View Yatim, Monitoring Galat Sentry, dan Kebijakan Cadangan TiDB Cloud**:<br>1. **Suite Pengujian Otorisasi RBAC Backend (`backend/test/authorization.test.js`)**:<br>   - Melakukan pengujian keamanan ketat pada area berisiko tinggi:<br>     a. *Isolasi Data Teknisi*: Membuktikan bahwa Teknisi A ditolak secara tegas (HTTP 403 Forbidden) saat mencoba membaca (`GET`), mengedit (`PUT`), maupun menghapus (`DELETE`) logbook milik Teknisi B. Sebaliknya, Teknisi B (pemilik sah), Supervisor, dan Admin sukses mengakses logbook tersebut (HTTP 200 OK).<br>     b. *Proteksi Endpoint Approval*: Membuktikan bahwa Teknisi ditolak secara mutlak (HTTP 403 Forbidden) saat memanggil endpoint persetujuan (`POST /api/v1/logbooks/:id/approval`). Sebaliknya, Supervisor dan Admin memiliki hak otorisasi penuh untuk memproses persetujuan.<br>     c. *Proteksi Master Data*: Membuktikan bahwa Supervisor ditolak (HTTP 403 Forbidden) saat mencoba memanipulasi master data (`POST`, `PUT`, `DELETE` pada `/api/v1/master/plants`, `/shifts`, `/machines`), namun tetap diizinkan membaca (`GET`) master data untuk kebutuhan monitoring.<br>   - Total pengujian backend Node.js kini bertambah menjadi **31 pengujian** dengan kelulusan **100%**.<br>2. **Implementasi Otomasi CI Pipeline (`.github/workflows/ci.yml`)**:<br>   - Memasang GitHub Actions otomatis yang dieksekusi pada setiap `push` dan `pull request`.<br>   - Memvalidasi backend (`npm ci`, `npx prisma generate`, `npm test`) dan frontend (`npm ci`, `npm test` Vitest, dan `npm run build` Vite) sebelum kode diizinkan masuk ke lingkungan produksi.<br>3. **Pemisahan Database Development dan Produksi**:<br>   - Memeriksa konektivitas frontend development (terhubung melalui server backend lokal `localhost:3000`, bukan langsung ke database TiDB Cloud).<br>   - Menetapkan isolasi database development menggunakan TiDB Cloud Serverless Branching (`dev` branch) atau database terpisah (`satoria_logbook_dev`).<br>   - Memastikan dan memverifikasi seluruh berkas `.env` dan variasinya (`.env*`) telah masuk dalam daftar `.gitignore` (root dan frontend).<br>4. **Pembersihan 7 Berkas View Yatim (*Orphan Views*)**:<br>   - Mengonfirmasi bahwa ketujuh file view legacy (`AdminSpvDashboard.vue`, `ApprovalView.vue`, `DataTeknisiView.vue`, `DataValidasiView.vue`, `MasterDataView.vue`, `InputLogView.vue`, `RiwayatLogView.vue`) sudah tercatat dan terlacak aman di riwayat Git commit.<br>   - Menghapus ketujuh file view yatim tersebut dari direktori `frontend/src/views/` sehingga struktur proyek bersih dan bebas redundansi.<br>5. **Pembaruan Dokumen Sumber Kebenaran (`README.md`)**:<br>   - Memperbarui Bagian 7.2 dari status awal "Tahap 1: data dummy" menjadi status aktual "Produksi & Stabil (Fase 1 & Fase 2 Selesai)".<br>   - Memperbarui Bagian 13.2 dari status "Draf" menjadi "Produksi / Aktif" dengan daftar endpoint v1 yang lengkap dan presisi.<br>6. **Monitoring Galat Sentry & Kebijakan Cadangan TiDB Cloud**:<br>   - Memasang paket `@sentry/node` terintegrasi pada Express backend (`src/config/sentry.js`) dan *Central Error Handler* (`src/middlewares/errorHandler.js`) memanfaatkan tier gratis developer (10.000 events/bulan).<br>   - Mendokumentasikan kebijakan cadangan TiDB Cloud Serverless: snapshot harian otomatis, point-in-time recovery (PITR), ketahanan 3-replika Raft Multi-AZ (RPO = 0), dan zero-copy branching. |
| 4.2 | 21 Oktober 2026 | **Implementasi Freeze / Sticky Header Navbar Penuh (`MainLayout.vue`, `Navbar.vue`, `main.css`)**:<br>- **Penyebab Masalah**: Sebelumnya, deklarasi `overflow-x-hidden` pada elemen pembungkus root `MainLayout.vue` (`min-h-screen`) menyebabkan browser menonaktifkan (*break*) konteks scrolling viewport window, sehingga `position: sticky; top: 0;` pada `<header>` tidak dapat menempel/terfreeze saat pengguna menggulir (*scroll*) halaman ke bawah.<br>- **Solusi & Penyempurnaan UI**:<br>  1. `MainLayout.vue`: Menghapus `overflow-x-hidden` dari wrapper root flex layout.<br>  2. `main.css`: Menambahkan properti CSS modern `overflow-x: clip` pada `@layer base` (`html, body`) untuk mengunci luapan horizontal tanpa membatalkan perilaku `position: sticky`.<br>  3. `Navbar.vue`: Menyempurnakan elemen header dengan kelas `sticky top-0 z-30 bg-surface/95 backdrop-blur-md shadow-xs transition-shadow`, memberikan efek translucent frosted glass yang elegan serta bayangan halus pemisah saat konten tabel/kartu melintas di bawah navbar yang terkunci.<br>- **Pengujian & Verifikasi**: Seluruh 9 pengujian Vitest dan build produksi Vite selesai 100% tanpa error. |
| 4.3 | 21 Oktober 2026 | **Implementasi Sticky Bottom Navbar untuk Perangkat Mobile (Smartphone) dan Tablet (`BottomNavbar.vue`, `MainLayout.vue`, `Sidebar.vue`)**:<br>- **Latar Belakang & Kebutuhan Ergonomi Lapangan**:<br>  - Teknisi dan Supervisor sering mengakses platform menggunakan tablet dan ponsel pintar di area operasional pabrik. Navigasi jempol (*thumb-driven navigation*) di bagian bawah layar jauh lebih cepat, ergonomis, dan nyaman dibanding harus meregangkan tangan ke tombol drawer atas.<br>- **Pembangunan Komponen Sticky Bottom Navbar (`BottomNavbar.vue`)**:<br>  1. *Desain & Posisi*: Diletakkan secara permanen di bagian bawah layar (`fixed bottom-0 inset-x-0 z-40 lg:hidden`) dengan ketinggian 64 px (`h-16`), material transparan elegan `bg-surface/95 backdrop-blur-md`, garis pemisah `border-t border-line`, bayangan lembut ke atas `shadow-[0_-2px_12px_rgba(0,0,0,0.06)]`, serta dukungan *safe area inset* iOS (`pb-[env(safe-area-inset-bottom)]`).<br>  2. *Navigasi Terkurasi per Peran*:<br>     - **Teknisi**: 4 item ergonomis (`Dashboard`, `Input Log`, `Riwayat`, `Profil`).<br>     - **Supervisor**: 5 item operasional (`Dashboard`, `Approval` dengan badge pending live, `Aktivitas`, `Laporan`, `Profil`).<br>     - **Admin**: 5 item manajerial (`Dashboard`, `Pengguna`, `Master` [Plant/Mesin/Group], `Audit`, `Profil`).<br>  3. *Indikator Status Aktif Visual*: Indikator batang aksen 2px di bagian atas tab aktif, latar belakang pil bulat aksen lembut `bg-primary/10`, ikon membesar dengan stroke 2.2px, dan label teks tebal `text-primary`.<br>- **Penyelarasan Layout Global & Komponen Terapung**:<br>  1. `MainLayout.vue`: Mengintegrasikan `BottomNavbar`, menambahkan padding bawah halaman `pb-24 sm:pb-24 lg:pb-6` pada `<main>` agar tidak ada konten yang tertutup navbar bawah, dan menyesuaikan breakpoint sidebar desktop ke `lg:pl-52` (sehingga tablet mendapatkan lebar layar penuh yang lapang tanpa terhimpit sidebar).<br>  2. `Sidebar.vue` & `Navbar.vue`: Menyesuaikan drawer sidebar menjadi off-canvas pada seluruh layar `< lg` (smartphone & tablet) dan mempertahankan hamburger tombol menu agar pengguna tablet tetap dapat mengakses menu lengkap kapan saja.<br>  3. `FabCreate.vue` & `Toast.vue`: Mengangkat posisi tombol FAB buat logbook dan notifikasi Toast ke `bottom-20` pada mobile dan tablet agar mengapung harmonis tepat di atas Sticky Bottom Navbar.<br>- **Pengujian & Verifikasi**: Seluruh 9 pengujian unit test Vitest lulus 100% dan build produksi Vite selesai dalam 3.2 detik tanpa error. |
| 4.4 | 21 Oktober 2026 | **Eksklusivitas Navigasi HP & Tablet: Penonaktifan Penuh Side Navbar & Sentralisasi Sticky Bottom Navbar (`Sidebar.vue`, `Navbar.vue`, `MainLayout.vue`)**:<br>- **Latar Belakang & Eliminasi Kebingungan Pengguna**:<br>  - Agar pengguna perangkat HP (Smartphone) dan Tablet tidak dibingungkan dengan adanya dua jalur navigasi sekaligus (sidebar drawer geser dan bottom navbar), sistem kini menonaktifkan side navbar secara penuh pada perangkat seluler dan tablet, menjadikan **Sticky Bottom Navbar** sebagai satu-satunya navigasi utama.<br>- **Implementasi Teknis & Pembersihan Komponen**:<br>  1. `Sidebar.vue`: Dikonfigurasi secara eksklusif hanya untuk layar Desktop (`hidden lg:flex fixed ...`). Seluruh kode backdrop mobile overlay (`isOpen`), tombol tutup (`X`), dan animasi geser mobile ditiadakan dari tampilan HP/tablet.<br>  2. `Navbar.vue`: Menghilangkan tombol toggle hamburger menu (`Menu`), menggantikannya dengan logo pintas Satoria yang bersih dan judul/subjudul halaman (`PageHeader.vue`) yang proporsional.<br>  3. `MainLayout.vue`: Menghilangkan state reaktif `sidebarOpen` dan event listener drawer, menyederhanakan arsitektur pembungkus layout menjadi murni reaktif terhadap breakpoint desktop vs seluler.<br>- **Pengujian & Verifikasi**:<br>  - Seluruh 9 pengujian unit test Vitest lulus 100% dan build produksi Vite (`npm run build`) selesai dalam 5.3 detik tanpa error. |
| 4.5 | 21 Oktober 2026 | **Perubahan Logika Approval: Transisi dari Persetujuan per Setiap Log menjadi Persetujuan per Setiap User (Teknisi) (`ApprovalListView.vue`, `approvalController.js`, `approvalRoutes.js`, `logbookService.js`, `logbook.js`)**:<br>- **Latar Belakang & Efisiensi Operasional Supervisor**:<br>  - Sebelumnya, Supervisor harus memeriksa dan menyetujui logbook satu per satu (*per-log basis*), yang memakan waktu lama saat seorang teknisi mengajukan banyak aktivitas dalam satu shift kerja. Pada logika baru, proses approval dilakukan **per setiap user (Teknisi)** sehingga saat Supervisor menyetujui seorang teknisi, seluruh catatan logbook yang diajukan oleh teknisi tersebut otomatis tersimpan ke database sebagai `APPROVED` dalam satu transaksi terpadu.<br>- **Pembaruan Backend REST API & Integritas Database Transaksional (`/backend`)**:<br>  1. **Endpoint Baru Approval Per Teknisi (`POST /api/v1/approvals/technician/:userId`)**:<br>     - Mengambil seluruh logbook berstatus `PENDING` milik teknisi yang bersangkutan (`user_id = userId`).<br>     - Mengeksekusi transaksi Prisma (`prisma.$transaction`): memperbarui status seluruh logbook pending teknisi menjadi `APPROVED` (atau `REJECTED`), serta membuat catatan riwayat persetujuan di tabel `logbook_approvals` untuk masing-masing logbook secara simultan.<br>     - Mencatat audit trail terpusat pada `user_activities`: `APPROVE_LOGBOOK_PER_TEKNISI` / `REJECT_LOGBOOK_PER_TEKNISI`.<br>     - Menyiarkan notifikasi fan-out sekali jalan (1 query `createMany`): notifikasi hasil approval ke Teknisi terkait, notifikasi rekapitulasi ke Supervisor, dan notifikasi audit ke Admin sistem.<br>  2. **Endpoint Agregasi Pengajuan Per Teknisi (`GET /api/v1/approvals/technicians`)**:<br>     - Mengelompokkan logbook pending berdasarkan teknisi, menyajikan data profil, nama plant, work group, akumulasi durasi pengerjaan, daftar mesin yang dikerjakan, dan array seluruh logbook pending.<br>  3. **Backward Compatibility**: Tetap mempertahankan endpoint individual `POST /logbooks/:id/approval` untuk kompatibilitas dan stabilitas pengujian lama.<br>- **Overhaul Antarmuka Pengguna Frontend (`ApprovalListView.vue`)**:<br>  1. **Tampilan Kartu Per Teknisi (Primary Mode)**:<br>     - Menampilkan kartu terstruktur untuk setiap teknisi yang memiliki pengajuan logbook: Avatar profil, Nama Teknisi, NIK, Plant, dan Grup/Departemen.<br>     - Ringkasan KPI: Total logbook yang diajukan, total akumulasi durasi pengerjaan (jam & menit), serta daftar mesin yang dikerjakan.<br>     - Tombol Aksi Utama: Tombol **"Setujui Semua Log (n)"** berwarna hijau yang langsung menyetujui seluruh logbook teknisi ke database, dan tombol **"Tolak dengan Catatan"** berwarna merah yang memunculkan modal catatan revisi wajib.<br>     - Accordion Rincian: Tombol *Lihat Rincian / Tutup Rincian* yang membuka tabel rincian seluruh logbook milik teknisi tersebut (tanggal, shift, mesin, sub-mesin, durasi, suku cadang, uraian pekerjaan, dan tombol Detail).<br>  2. **Tampilan Alternatif Mode Logbook**: Tetap menyediakan tombol beralih ke tabel *Semua Log* bagi supervisor yang ingin menginspeksi logbook secara mendatar (*flat view*).<br>  3. **Notifikasi Toast**: Memberikan feedback konfirmasi instan saat persetujuan per teknisi berhasil disimpan ke database TiDB.<br>- **Pengujian & Verifikasi**:<br>  - Suite pengujian otorisasi backend Node.js bertambah menjadi **34 pengujian otomatis** (`backend/test/authorization.test.js` mencakup pengujian RBAC endpoint approval per teknisi) dengan kelulusan **100%**.<br>  - Seluruh 9 pengujian unit test Vitest frontend lulus 100% (`npm test`).<br>  - Build produksi frontend Vite (`npm run build`) selesai dalam 2.54 detik tanpa galat. |
| 4.6 | 21 Oktober 2026 | **Penonaktifan RoleSwitcher Mode Pengembangan & Otomasi Indikator Posisi Pengguna (`Navbar.vue`)**:<br>- **Penyempurnaan Keamanan & Integritas Autentikasi**:<br>  - Mengubah elemen `RoleSwitcher` (yang sebelumnya merupakan dropdown `<select>` untuk simulasi pergantian peran pada Tahap 1) menjadi **Indikator Posisi / Peran Read-Only** yang terkunci secara permanen dan otomatis sinkron dengan akun aktif pengguna di database (`authStore.role` / `authStore.user`).<br>  - Menghilangkan elemen interaktif `<select>` beserta fungsi simulasi `handleRoleChange` baik pada header navbar desktop maupun menu popover profil mobile.<br>  - Menampilkan badge status posisi pengguna yang elegan dengan indikator dot warna tematik (Biru untuk Teknisi, Oranye untuk Supervisor, Hijau untuk Admin) tanpa dapat diubah secara manual oleh pengguna.<br>- **Pengujian & Verifikasi**:<br>  - Seluruh 9 pengujian unit test Vitest lulus 100% (`npm test`) dan build produksi Vite (`npm run build`) selesai dalam 4.67 detik tanpa error. |
| 4.7 | 21 Oktober 2026 | **Aktivasi & Perbaikan Fitur Kalender Mingguan Teknisi (`RiwayatLogbookView.vue`, `calendarLayout.js`, `LogbookEventBlock.vue`, `DayColumn.vue`, `LogbookEventPopover.vue`, `InputLogbookView.vue`)**:<br>- **Latar Belakang & Identifikasi Masalah/Bug**:<br>  Fitur `BAGIAN 1: Kalender Mingguan Teknisi (UI dari Input Logbook)` pada `RiwayatLogbookView.vue` sebelumnya tidak berfungsi secara aktif dan tidak merender balok event pekerjaan karena beberapa galat struktural dan ketidaksesuaian antarmuka props:<br>  1. *Pencocokan Kunci Tanggal Tidak Cocok*: Fungsi `splitLogbookToSegments` menghasilkan segmen berproperti `s.day`, sedangkan loop di view membandingkan `s.dateKey === dayDate` yang selalu bernilai `false`, berakibat array segmen harian selalu kosong.<br>  2. *Ketidaksesuaian Interface Komponen Grid*: Objek `calculatedDays` mengembalikan `{ dateKey, blocks, summary }`, sementara komponen anak (`TimeGrid.vue`, `WeekHeader.vue`, `DaySummaryRow.vue`, `DayColumn.vue`) membaca `dateStr`, `isToday`, `segments`, dan `summaryChips`.<br>  3. *Galat Parameter Ringkasan Harian*: Fungsi `computeDaySummary` menerima parameter `(dayDateStr, dayLogbooks = [])` namun dipanggil dengan argumen tunggal `daySegments`, sehingga chip ringkasan tidak terhitung.<br>  4. *Query Parameter Slot Klik/Seret*: `DayColumn.vue` memancarkan `task_date` dan `start_time`, sedangkan handler `handleCreateFromSlot` membaca `slot.date` dan `slot.time` sehingga navigasi form input membawa parameter `undefined`.<br>  5. *Bounding Rect Popover Hilang*: `LogbookEventBlock.vue` hanya memancarkan segmen tanpa bounding rect, sehingga popover ringkasan tidak memiliki posisi jangkar (*anchor rect*) akurat dan jatuh ke koordinat default pojok layar.<br>- **Solusi & Implementasi Komprehensif**:<br>  1. `calendarLayout.js`: Menambahkan properti ganda `day` dan `dateKey` pada setiap segmen logbook normal maupun lintas tengah malam.<br>  2. `RiwayatLogbookView.vue`: Mengaktifkan pencocokan `(s.day === dayDate || s.dateKey === dayDate)`, merestrukturisasi objek `calculatedDays` lengkap dengan `dateStr`, `dateKey`, `isToday`, `segments`, `blocks`, dan `summaryChips` dari hasil `computeDaySummary(dayDate, dayLogs)`, serta menyempurnakan `myLogs` dengan konversi numerik `Number(l.user_id) === Number(authStore.user?.id)`.<br>  3. `DayColumn.vue` & `LogbookEventBlock.vue`: Menghitung dan meneruskan element bounding rect secara presisi saat kartu logbook diklik, serta melengkapi payload `create-slot` dengan properti `date`, `task_date`, `time`, `start_time`, dan `end_time`.<br>  4. `LogbookEventPopover.vue`: Mengintegrasikan tombol interaktif 'Detail Lengkap' (membuka modal detail riwayat) dan tombol 'Edit' / 'Revisi' (membuka halaman edit untuk status Draft/Rejected).<br>  5. `InputLogbookView.vue`: Memasang watcher reaktif pada `route.query` agar saat slot waktu atau tombol kalender diklik, form input langsung otomatis terisi tanggal tugas (`task_date`) dan jam mulai (`start_time`) serta bulan kalender picker tersinkronisasi.<br>- **Pengujian & Verifikasi**:<br>  - Seluruh 9 pengujian unit test Vitest frontend lulus 100% (`npm test`).<br>  - Build produksi frontend Vite (`npm run build`) selesai tanpa galat (`built in 4.23s`).<br>  - Seluruh pengujian otorisasi dan fungsionalitas backend Node.js terverifikasi stabil. |
| 4.8 | 21 Oktober 2026 | **Integrasi Supabase Storage SDK (Metode 1) untuk Media & Avatar (`storageService.js`, `.env.example`)**:<br>- **Implementasi Supabase Storage SDK (`@supabase/supabase-js`)**:<br>  1. Memasang package `@supabase/supabase-js` pada backend Express.<br>  2. Mengimplementasikan modul adaptor Supabase pada `backend/src/services/storageService.js` (`saveAvatar`, `removeAvatar`, `isSupabaseConfigured`, `getSupabaseClient`).<br>  3. Mendukung direct public upload dengan buffer WebP teroptimasi, otomatis upsert, pembuatan public URL instan, serta pembersihan file lama (*cleanup deletion*).<br>  4. Menyediakan sistem fallback hierarkis cerdas: Supabase Storage -> S3/R2 Object Storage -> Local Disk Storage (development offline).<br>  5. Memperbarui `backend/.env.example` dengan variabel `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `SUPABASE_STORAGE_BUCKET`.<br>- **Pengujian & Verifikasi**:<br>  - Seluruh 34 unit & integration test backend Node.js (`npm test`) lulus 100%. |
| 4.9 | 6 November 2026 | **Perbaikan Bug Dashboard Overview & Stabilitas CI/CD**:<br>- **Perbaikan Bug Dashboard**: Menghapus filter `is_active` yang tidak valid pada query `prisma.plant.findMany` di `overviewController.js`. Error `Unknown argument 'is_active'` pada Dashboard Admin & Supervisor telah teratasi. Perubahan ini tidak mengubah struktur database (schema).<br>- **Perbaikan CI/CD Pipeline**: Memperbaiki perintah test di `backend/package.json` (`node --test test/`) agar kompatibel dengan lingkungan Linux (GitHub Actions). Menambahkan injeksi environment variable (`DATABASE_URL`, `JWT_SECRET`) pada `.github/workflows/ci.yml` untuk memastikan test backend berjalan lancar di server CI.<br>- **Dokumentasi**: Membuat file `CHANGELOG.md` untuk mencatat rilis dan perbaikan secara lebih terperinci ke depannya. |

---

*Engineer Logbook Satoria — Operational Excellence Through Digitalization.*

