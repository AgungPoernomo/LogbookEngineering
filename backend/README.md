# Backend REST API — Engineer Logbook Satoria

Platform backend REST API untuk sistem Engineer Logbook Satoria menggunakan **Node.js + Express** dengan database **TiDB (MySQL-compatible)** dan ORM **Prisma**.

---

## 1. Arsitektur & Teknologi

- **Runtime**: Node.js (ES Module)
- **Framework**: Express.js
- **Database**: TiDB Cloud / MySQL Server (Distributed SQL)
- **ORM**: Prisma v5.22.0
- **Autentikasi**: JWT (JSON Web Token) stateless + bcryptjs
- **Export Engine**: ExcelJS (XLSX Workbook)
- **Notifikasi**: Nodemailer (SMTP) + In-App DB tracking
- **Standar API**: REST API v1 (`/api/v1`) dengan format respons seragam:
  ```json
  {
    "success": true,
    "message": "Pesan status",
    "data": {},
    "meta": { "page": 1, "limit": 10, "total": 0 }
  }
  ```

---

## 2. Struktur Direktori

```text
backend/
├── .env.example
├── .env
├── package.json
├── prisma/
│   ├── schema.prisma       # 11 Tabel sesuai ERD Bagian 9 README
│   └── seed.js             # Seeding master data, user dummy, & sample logbook
├── src/
│   ├── app.js              # Setup Express app, routing, & error handling
│   ├── server.js           # Server listener & graceful shutdown
│   ├── config/
│   │   └── prisma.js       # Prisma client singleton & BigInt JSON handler
│   ├── controllers/        # auth, logbook, approval, master, user, report, audit, notification, supervisor
│   ├── middlewares/        # auth (JWT), rbac (Role Check), errorHandler
│   ├── routes/             # authRoutes, logbookRoutes, approvalRoutes, masterRoutes, userRoutes, reportRoutes, auditRoutes, notificationRoutes, supervisorRoutes
│   ├── services/           # mailerService (SMTP/In-App), auditService (user_activities)
│   └── utils/              # response.js, jwt.js, duration.js
└── test/
    └── api.test.js         # Automated testing endpoint & utility
```

---

## 3. Langkah Menjalankan Backend

### 3.1 Install Dependensi
```bash
npm install
```

### 3.2 Konfigurasi Environment (`.env`)
Salin file `.env.example` ke `.env`:
```env
PORT=3000
DATABASE_URL="mysql://USER:PASSWORD@HOST:4000/satoria_logbook?sslaccept=strict"
JWT_SECRET="satoria-engineering-super-secret-jwt-key-2026"
CORS_ORIGIN="http://localhost:5173,http://localhost:5174"
```

### 3.3 Generate Prisma & Migrasi Database
```bash
npx prisma generate
npx prisma db push       # Atau: npx prisma migrate dev
npx prisma db seed       # Menjalankan prisma/seed.js
```

### 3.4 Menjalankan Server
```bash
# Mode Development (Auto-reload):
npm run dev

# Mode Production:
npm start

# Menjalankan Automated Tests:
npm test
```

---

## 4. Ringkasan Endpoint API (`/api/v1`)

| Metode | Endpoint | Hak Akses | Keterangan |
|---|---|---|---|
| GET | `/health` | Publik | Health check server status |
| POST | `/api/v1/auth/login` | Publik | Login NIK/Email + password, return JWT |
| GET | `/api/v1/auth/me` | Autentikasi | Ambil profil user login |
| PUT | `/api/v1/auth/profile` | Autentikasi | Perbarui profil |
| PUT | `/api/v1/auth/password` | Autentikasi | Ganti kata sandi |
| GET | `/api/v1/logbooks` | Semua | Daftar logbook (Teknisi hanya miliknya, SPV/Admin filter plant) |
| POST | `/api/v1/logbooks` | Teknisi, Admin | Buat logbook baru (Draft/Pending) |
| GET | `/api/v1/logbooks/:id` | Semua | Detail lengkap logbook |
| PUT | `/api/v1/logbooks/:id` | Teknisi, Admin | Edit logbook (Hanya Draft / Rejected) |
| DELETE | `/api/v1/logbooks/:id` | Teknisi, Admin | Hapus draft logbook |
| POST | `/api/v1/logbooks/submit-all-drafts` | Teknisi | Ajukan seluruh draft ke status Pending |
| POST | `/api/v1/logbooks/:id/approval` | Supervisor, Admin | Approve / Reject logbook (+ catatan wajib jika reject) |
| GET | `/api/v1/master/:type` | Semua | Ambil data master (plants, shifts, machines, sub-machines, groups, roles) |
| POST | `/api/v1/master/:type` | Admin | Tambah data master |
| PUT | `/api/v1/master/:type/:id` | Admin | Edit data master |
| DELETE | `/api/v1/master/:type/:id` | Admin | Hapus data master |
| GET | `/api/v1/users` | Admin | Daftar seluruh pengguna sistem |
| POST | `/api/v1/users` | Admin | Buat pengguna baru |
| PUT | `/api/v1/users/:id` | Admin | Edit pengguna |
| DELETE | `/api/v1/users/:id` | Admin | Toggle aktif / nonaktif akun (soft delete) |
| GET | `/api/v1/supervisor/team-overview` | Supervisor, Admin | Ringkasan frekuensi & aktivitas teknisi tim |
| GET | `/api/v1/reports/export` | Supervisor, Admin | Ekspor laporan tim (.xlsx / json) |
| GET | `/api/v1/admin/audit-logs` | Admin | Ambil rekam jejak aktivitas (`user_activities`) |
| GET | `/api/v1/notifications` | Semua | Ambil notifikasi in-app user |
| PUT | `/api/v1/notifications/:id/read` | Semua | Tandai notifikasi telah dibaca |
