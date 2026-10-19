# SPESIFIKASI UI: Halaman Input Logbook (Teknisi), Konsep Kalender Mingguan

> Dokumen ini adalah instruksi kerja untuk AI coding agent (Antigravity IDE).
> Berlaku untuk rute `/logbook/input` (peran **Teknisi**) pada proyek *Engineer Logbook Satoria*.
> Sumber konsep: satu gambar referensi tampilan kalender mingguan (panel kiri berisi tombol Buat, kalender mini, dan daftar filter; area utama berupa grid 7 hari × 24 jam dengan baris ringkasan harian dan garis waktu sekarang). **Hanya konsep konten dan interaksinya yang diambil.** Tampilan visual memakai tema UI proyek saat ini (README v1.4, Bagian 11).
> Semua nilai px dan warna bersifat **estimasi/keputusan implementasi**. Hal yang tidak terlihat atau tidak ditentukan dicatat di [Bagian 14](#14-asumsi-pertanyaan-terbuka-dan-elemen-referensi-yang-tidak-diterapkan).

---

## 0. Aturan Membaca Dokumen untuk AI Agent

1. **WAJIB** = harus dipenuhi. **SEBAIKNYA** = rekomendasi. **OPSIONAL** = boleh dilewati.
2. **Hierarki sumber kebenaran:**
   - Logika, peran, RBAC, rute, model data (`logbooks`, `shifts`, `machines`, `sub_machines`, `plants`), status logbook, alur approval, dan istilah bisnis mengikuti `README.md` Bagian 1-10 dan 12-22.
   - Token dan gaya visual mengikuti `README.md` Bagian 11 (11.3 token, 11.5.11 komponen umum, 11.8 state, 11.9 responsif/a11y).
   - Dokumen ini hanya menambah **tata letak dan perilaku halaman Input Logbook**. Jika bertentangan dengan README, README menang untuk logika dan token.
3. **Dilarang mengubah logika yang sudah ada:** kalkulator durasi (termasuk shift melintasi tengah malam), validator, kontrak `logbookService`/`masterService`, store Pinia, navigation guard, rute, struktur mock yang ada. Form yang sudah ada dipakai ulang (lihat 5.11), bukan ditulis ulang.
4. Jangan menyalin fitur kalender umum yang tidak tercantum di Bagian 2 (mis. tampilan Bulan/Tahun, kalender orang lain, undangan, rapat, halaman janji temu).
5. Seluruh teks UI berbahasa Indonesia baku. Tidak ada kode hex di komponen; gunakan token (3).
6. Data berasal dari service/mock, bukan hardcode di komponen.
7. Hal yang tidak jelas: ikuti default di Bagian 14, beri komentar `TODO(konfirmasi): <pertanyaan>` di kode, dan laporkan di akhir pekerjaan.

**Cara memakai (ringkas):** *"Baca README.md (v1.4) dan UI-SPEC-input-logbook-teknisi.md. Terapkan spesifikasi ini pada halaman `/logbook/input` untuk Teknisi sesuai urutan di Bagian 12 dan verifikasi dengan Bagian 13. Jangan mengubah logika yang ada."*

---

## 1. Ringkasan dan Cakupan

| Item | Nilai |
|---|---|
| Halaman | Input Logbook (`/logbook/input`), file `src/views/teknisi/InputLogbookView.vue` |
| Peran | Teknisi (akses peran lain ditolak oleh guard yang sudah ada, tidak diubah) |
| Tujuan halaman | Teknisi mencatat aktivitas kerja harian dengan memilih tanggal dan rentang jam langsung pada kalender mingguan, lalu mengisi form logbook |
| Pola layout | Panel kiri (tombol buat, kalender mini, filter) + kartu kalender mingguan; form logbook muncul sebagai drawer |
| Data yang ditampilkan | Logbook milik teknisi yang sedang login (semua status) pada rentang yang tampil |
| Aksi utama | Buat logbook (Simpan Draft / Kirim Logbook), buka logbook Draft/Rejected untuk diperbaiki, lihat ringkasan logbook lain |
| Rute lain terkait | `/logbook/edit/:id` (edit Draft/Rejected) dan `/logbook/riwayat` (riwayat) tetap sesuai README Bagian 10; tidak ada rute baru |

---

## 2. Pemetaan Konsep Referensi ke Konten Satoria

| Elemen pada referensi | Padanan pada Input Logbook | Status |
|---|---|---|
| Tombol "Buat" (dengan ikon plus) | Tombol "Buat Logbook" (membuka drawer form) | Diterapkan |
| Kalender mini bulan (navigasi tanggal, hari ini terisi, tanggal terpilih terisi lembut) | `MiniCalendar` untuk berpindah minggu | Diterapkan |
| Daftar "Kalender saya" dengan kotak centang berwarna | Filter "Status Logbook" (5 status, kotak centang berwarna sesuai status) | Diterapkan |
| Daftar "Kalender lainnya" | Filter "Shift" (data master shift) | Diterapkan (SEBAIKNYA) |
| Header hari (singkatan hari + angka tanggal, hari ini dalam lingkaran berwarna) | `WeekHeader` | Diterapkan |
| Label zona waktu "GMT+07" | Label "WIB (GMT+7)" di sudut kiri atas grid | Diterapkan |
| Baris acara sepanjang hari (chip berwarna di bawah header) | `DaySummaryRow`: chip ringkasan harian (jumlah logbook dan total durasi, jumlah perlu revisi, jumlah draft) | Diterapkan (dengan pemaknaan baru, lihat 5.5) |
| Chip abu-abu "1 tugas tertunda" | Chip "n perlu revisi" (status `Rejected`) dan "n draft" (status `Draft`) | Diterapkan |
| Grid waktu 1 jam = 60 px dengan garis horizontal dan vertikal | `TimeGrid` 24 jam | Diterapkan |
| Garis merah penanda waktu sekarang dengan titik di kolom hari ini | `NowIndicator` | Diterapkan |
| Scroll vertikal pada grid | Scroll vertikal dengan header lengket | Diterapkan |
| Acara berupa blok pada grid | `LogbookEventBlock` (blok logbook pada rentang jam) | Diterapkan |
| Klik slot kosong atau seret rentang untuk membuat acara | Klik/seret slot untuk membuat logbook dengan tanggal dan jam terisi | Diterapkan |
| "Telusuri orang", "Halaman pembuatan janji temu", kalender lain milik orang lain, tautan "Persyaratan/Privasi" | Tidak ada padanan | **Tidak diterapkan** |
| Pengalih tampilan (Hari/Minggu/Bulan/Tahun), bilah pencarian, pengaturan, aplikasi Google | Tidak ada padanan | **Tidak diterapkan** |

Catatan: bilah atas kalender (tombol "Hari ini", panah, judul rentang) tidak terlihat pada gambar referensi. Elemen tersebut ditambahkan sebagai kebutuhan navigasi dasar (Asumsi I-2).

---

## 3. Token dan Tema

Seluruh token mengikuti `README.md` Bagian 11.3 (warna, tipografi Inter, spasi, radius, shadow). **Tidak ada palet baru.** Tambahan khusus halaman ini:

### 3.1 Penambahan pada `tailwind.config.js`

Tambahkan key `dot` pada token status (nilainya sama dengan kolom "warna segmen donut / titik legend" pada README 11.3.2) untuk garis tepi kiri blok logbook dan kotak centang filter:

```js
// gabungkan ke theme.extend.colors.status pada README 11.3.5
status: {
  draft:     { bg: '#F3F4F6', fg: '#4B5563', dot: '#9CA3AF' },
  pending:   { bg: '#FEF3C7', fg: '#B45309', dot: '#EAB308' },
  approved:  { bg: '#DCFCE7', fg: '#15803D', dot: '#22A55B' },
  rejected:  { bg: '#FEE2E2', fg: '#B91C1C', dot: '#EF4444' },
  cancelled: { bg: '#1F2937', fg: '#FFFFFF', dot: '#374151' },
},
```

### 3.2 Pemakaian token pada halaman ini

| Elemen | Token |
|---|---|
| Canvas halaman | `app` |
| Kartu kalender dan panel | `surface`, radius `lg` (12 px), `shadow-card` |
| Garis grid (horizontal dan vertikal) | `line`, 1 px |
| Label jam dan label zona waktu | `ink-2`, 11 px (`caption`) |
| Singkatan hari (SEN, SEL, ...) | `ink-2`, 11 px, bobot 500, huruf kapital, letter-spacing 0.08em; untuk hari ini memakai `primary` |
| Angka tanggal pada header | `ink`, 22 px, bobot 400; hari ini: lingkaran 40 px berlatar `primary`, teks putih, bobot 500 |
| Tanggal terpilih pada kalender mini | Latar `primary-soft`, teks `primary` |
| Hari ini pada kalender mini | Latar `primary`, teks putih |
| Garis waktu sekarang | `danger`, 2 px; titik 8 px |
| Blok logbook | Latar `status.<x>.bg`, teks `status.<x>.fg`, garis tepi kiri 3 px `status.<x>.dot` |
| Bayangan ghost seleksi | Latar `primary-soft`, border 1.5 px putus-putus `primary` |
| Fokus keyboard | Ring 2 px `primary` offset 2 px |

### 3.3 Konstanta Layout Halaman

```css
/* src/assets/tokens.css (tambahan khusus halaman Input Logbook) */
:root {
  --planner-panel-width: 248px;
  --planner-gap: 16px;
  --planner-toolbar-h: 56px;
  --planner-header-h: 72px;
  --planner-time-col-w: 64px;     /* 48px pada < 640px */
  --planner-hour-h: 60px;         /* 24 jam = 1440px */
  --planner-chip-h: 22px;
  --planner-event-min-h: 22px;
  --planner-event-inset: 4px;     /* jarak kanan blok terhadap tepi kolom */
}
```

---

## 4. Layout Halaman

Halaman berada di dalam `MainLayout` (Sidebar dan Navbar global dari README 11.4 tidak diubah). Kolom kanan 288 px khusus dashboard **tidak dipakai** di halaman ini.

```
+--------------------------------------------------------------------------+
| NAVBAR global (judul: "Input Logbook", subjudul: "Catat aktivitas kerja")|
+------------------+-------------------------------------------------------+
| PANEL KIRI 248px | KARTU KALENDER MINGGUAN (fleksibel)                   |
|  [Buat Logbook]  |  Toolbar: [Hari ini] [<] [>]  11 - 17 Oktober 2026    |
|  Kalender mini   |  +-----+----+----+----+----+----+----+----+           |
|  Status Logbook  |  |WIB  |SEN |SEL |RAB |KAM |JUM |SAB |MIN |  header   |
|   [x] Draft      |  |     | 12 | 13 | 14 | 15 | 16 | 17 | 18 |           |
|   [x] Pending    |  |     |chip|chip|    |    |    |chip|    |  ringkasan|
|   [x] Approved   |  +-----+----+----+----+----+----+----+----+           |
|   [x] Rejected   |  |01:00|    |    |    |    |    |    |    |  grid     |
|   [x] Cancelled  |  |02:00|    |blok|    |    |    |    |    |  (scroll) |
|  Shift           |  | ... |    |    |    |    |----o (sekarang)|           |
|   [x] ...        |  +-----+----+----+----+----+----+----+----+           |
+------------------+-------------------------------------------------------+
```

| Properti | Nilai |
|---|---|
| Susunan | `flex`, gap 16 px; panel kiri lebar tetap, kartu kalender `flex-1 min-w-0` |
| Tinggi kartu kalender | `calc(100vh - 70px - 32px)`, minimal 520 px; isi `flex-col`, `overflow-hidden` |
| Area scroll | Hanya grid waktu (di bawah header dan baris ringkasan); header dan baris ringkasan bersifat lengket (tidak ikut scroll) |
| Panel kiri | Tampil inline hanya pada ≥ 1280 px (`xl`); di bawahnya menjadi drawer filter (lihat Bagian 10) |
| Jumlah hari tampil | 7 hari pada ≥ 1024 px, 3 hari pada 768-1023 px, 1 hari pada < 768 px |
| Awal minggu | Senin (selaras dengan README 11.5.10); dibuat sebagai konstanta `WEEK_START = 1` |

---

## 5. Spesifikasi Komponen

### 5.1 `PlannerSidebarPanel` (panel kiri)

| Elemen | Spesifikasi |
|---|---|
| Wadah | Lebar 248 px, latar `surface`, radius 12, padding 16 px, `shadow-card`, tinggi mengikuti konten (scroll internal jika melebihi viewport) |
| Tombol "Buat Logbook" | Tombol primary lebar penuh, tinggi 40 px, radius 8, ikon `Plus` 18 px + teks "Buat Logbook" (`button`). Tanpa tanda panah dropdown |
| Jarak antar blok | 16 px (tombol → kalender mini → grup filter) |

### 5.2 `MiniCalendar`

| Elemen | Spesifikasi |
|---|---|
| Header | Teks "Oktober 2026" (nama bulan + tahun, 14 px, bobot 500) kiri; dua `IconButton` kecil 28 px (`ChevronLeft`, `ChevronRight`) kanan untuk pindah bulan |
| Baris hari | Inisial `S S R K J S M` (Senin..Minggu), 11 px, `ink-2` |
| Sel tanggal | Grid 7 kolom × 6 baris, sel 28 × 28 px, angka 12 px, rata tengah, bentuk bulat |
| Tanggal bulan lain | `ink-3` |
| Hari ini | Lingkaran `primary`, teks putih |
| Tanggal terpilih (jangkar minggu) | Lingkaran `primary-soft`, teks `primary` (jika sama dengan hari ini, tampil gaya "hari ini") |
| Klik tanggal | Mengubah `selectedDate`; kalender utama menampilkan minggu (atau 3 hari / 1 hari) yang memuat tanggal itu |
| Indikator ada logbook | Titik 4 px `primary` di bawah angka (OPSIONAL; membutuhkan data bulan) |

### 5.3 `FilterGroup` dan `FilterCheckbox`

| Elemen | Spesifikasi |
|---|---|
| Judul grup | "Status Logbook" dan "Shift"; 14 px bobot 500; chevron `ChevronUp`/`ChevronDown` di kanan untuk melipat/membuka grup (bawaan terbuka) |
| Baris | Tinggi 32 px: kotak centang 18 px (radius 4) + label 14 px `ink` |
| Warna kotak centang status | Terisi `status.<x>.dot` dengan tanda centang putih saat aktif; saat nonaktif hanya border 1.5 px `line` |
| Isi grup "Status Logbook" | `Draft`, `Pending`, `Approved`, `Rejected`, `Cancelled` (urutan ini) |
| Isi grup "Shift" | Seluruh shift dari data master (`shifts`): label nama shift + keterangan jam (`caption`, `ink-2`), contoh "Shift 3 · 22:00-06:00"; kotak centang berwarna `primary` |
| Nilai bawaan | Semua dicentang |
| Perilaku | Mencentang/menghapus centang menampilkan/menyembunyikan blok pada kalender secara langsung (filter sisi klien atas data minggu yang sudah dimuat). Chip ringkasan harian mengikuti filter |
| Seluruh filter nonaktif | Kalender kosong dengan teks bantuan "Semua status disembunyikan. Aktifkan filter untuk melihat logbook." |

### 5.4 `CalendarToolbar`

| Elemen | Spesifikasi |
|---|---|
| Tinggi | 56 px, padding horizontal 16 px, garis bawah 1 px `line` |
| Kiri | Tombol sekunder "Hari ini" (tinggi 32 px), dua `IconButton` panah (32 px) untuk mundur/maju sejauh jumlah hari tampil, lalu judul rentang (`card-title-lg`) |
| Format judul | Satu bulan: "11 - 17 Oktober 2026". Beda bulan: "28 Sep - 4 Okt 2026". Beda tahun: "28 Des 2026 - 3 Jan 2027". Tampilan 1 hari: "Sabtu, 17 Oktober 2026". Gunakan `Intl.DateTimeFormat('id-ID')` (tanpa dependensi baru) |
| Kanan (< 1280 px) | `IconButton` "Filter" (ikon `SlidersHorizontal`) membuka drawer filter; tombol "Buat Logbook" (primary, 32 px) pada 768-1279 px |
| Pada < 768 px | Tombol "Buat Logbook" diganti FAB (5.13) |

### 5.5 `WeekHeader` dan `DaySummaryRow`

**`WeekHeader`:** sel kosong di kiri selebar kolom waktu berisi label "WIB (GMT+7)" (`caption`, `ink-2`, rata kanan, sejajar dengan baris angka tanggal), lalu satu `DayHeaderCell` per hari.

| Elemen | Spesifikasi |
|---|---|
| Tinggi header | 72 px |
| Isi sel | Singkatan hari (SEN, SEL, RAB, KAM, JUM, SAB, MIN) di atas, angka tanggal di bawah, rata tengah |
| Hari ini | Singkatan berwarna `primary`; angka dalam lingkaran 40 px `primary` berteks putih |
| Garis pemisah | Garis vertikal 1 px `line` antar kolom (selaras dengan grid di bawahnya) |

**`DaySummaryRow`** (padanan baris acara sepanjang hari pada referensi):

| Elemen | Spesifikasi |
|---|---|
| Lokasi | Tepat di bawah `WeekHeader`, di atas grid; lengket bersama header |
| Chip | Tinggi 22 px, radius 6, teks 12 px bobot 500, padding horizontal 8 px, ikon 14 px di kiri, teks terpotong dengan elipsis; atribut `title` berisi teks lengkap |
| Susunan | Chip ditumpuk vertikal dengan gap 4 px; maksimal 3 chip per hari |
| Chip A (`primary`, teks putih) | Ikon `Clock`, teks "{n} logbook · {Xj Ym}" (jumlah logbook dan total `duration_minutes` pada hari itu). Tampil bila n > 0. Pada kolom sempit tampil "{n} logbook" saja |
| Chip B (`status.rejected`) | Ikon `AlertCircle`, teks "{n} perlu revisi". Tampil bila ada logbook `Rejected` pada hari itu. Klik membuka `/logbook/edit/:id` logbook `Rejected` pertama |
| Chip C (`status.draft`) | Ikon `FilePen`, teks "{n} draft". Tampil bila ada logbook `Draft`. Klik membuka `/logbook/edit/:id` draft pertama |
| Hari tanpa logbook | Baris tanpa chip; tinggi minimal baris 30 px agar grid tidak melompat |
| Logbook melewati tengah malam | Dihitung pada `task_date` (hari mulai), bukan pada hari lanjutan |

### 5.6 `TimeGrid`, `TimeAxis`, `DayColumn`

| Elemen | Spesifikasi |
|---|---|
| Tinggi total | 24 × 60 = 1440 px; 1 jam = 60 px |
| Kolom waktu (`TimeAxis`) | Lebar 64 px (48 px pada < 640 px). Label "01:00" ... "23:00" format 24 jam, `caption`, `ink-2`, rata kanan, dipusatkan vertikal pada garis jamnya; label "00:00" tidak ditampilkan |
| Garis | Horizontal tiap jam, 1 px `line`; vertikal antar hari, 1 px `line` |
| `DayColumn` | Lebar = (lebar grid - 64 px) ÷ jumlah hari; posisi relatif untuk blok absolut |
| Scroll awal | Bila minggu yang tampil memuat hari ini: gulir sehingga jam sekarang berada ± 1/3 dari atas area terlihat. Selain itu: gulir ke 06:00 |
| Kursor | `cursor: crosshair` hanya pada slot kosong (perangkat pointer halus) |

### 5.7 `LogbookEventBlock`

| Elemen | Spesifikasi |
|---|---|
| Posisi | `top = startMin ÷ 60 × 60 px`, `height = (endMin - startMin) ÷ 60 × 60 px`, minimal 22 px |
| Gaya | Radius 6, latar `status.<x>.bg`, teks `status.<x>.fg`, garis tepi kiri 3 px `status.<x>.dot`, padding 4 × 8 px, jarak kanan 4 px dari tepi kolom |
| Status `Draft` | Tambahan border 1 px putus-putus `status.draft.dot` (penanda belum terkirim) |
| Isi | Tinggi < 30 px: satu baris "HH:mm Mesin". 30-59 px: baris 1 nama mesin (12 px, bobot 600), baris 2 rentang jam "HH:mm - HH:mm". ≥ 60 px: nama mesin, sub-mesin (bila ada), rentang jam |
| Segmen lanjutan | Potongan di hari berikutnya untuk logbook melewati tengah malam diberi ikon `CornerDownRight` kecil dan teks "(lanjutan)" |
| Tumpang tindih | Blok berdampingan sesuai algoritma 7.3 |
| Hover | `shadow-tooltip`, naik ke atas (`z-index`) |
| Terpilih | Ring 2 px `primary` selama popover terbuka |
| Klik | Lihat tabel perilaku 6.2 |
| Elemen HTML | `<button>` dengan `aria-label` (lihat Bagian 11) |

### 5.8 `NowIndicator`

| Elemen | Spesifikasi |
|---|---|
| Tampil | Hanya jika hari ini berada pada rentang yang tampil, di kolom hari ini |
| Bentuk | Garis 2 px `danger` selebar kolom hari ini + titik 8 px `danger` di tepi kiri kolom |
| Pembaruan | Posisi dihitung ulang tiap 60 detik (`setInterval`, dibersihkan saat komponen dilepas) |
| Interaksi | `pointer-events: none` |

### 5.9 `SelectionGhost` (seleksi rentang)

| Elemen | Spesifikasi |
|---|---|
| Pemicu | Tekan dan seret pada slot kosong dalam **satu kolom hari** |
| Bentuk | Blok bayangan `primary-soft` dengan border 1.5 px putus-putus `primary`, radius 6; label "HH:mm - HH:mm" di dalamnya |
| Snap | Kelipatan 15 menit; rentang minimal 15 menit |
| Lepas | Membuka drawer form dengan tanggal, jam mulai, dan jam selesai terisi |
| Batal | Tombol `Esc` atau melepas di luar grid membatalkan seleksi |
| Perangkat sentuh | Seret tidak didukung; ketuk slot kosong membuka form dengan jam mulai tersnap dan durasi bawaan 60 menit |

### 5.10 `LogbookEventPopover` (ringkasan logbook)

| Elemen | Spesifikasi |
|---|---|
| Kapan tampil | Klik blok berstatus `Pending`, `Approved`, atau `Cancelled` (logbook yang tidak dapat diedit) |
| Bentuk | Popover lebar 300 px, latar `surface`, radius 12, `shadow-tooltip`, padding 16 px, tertambat ke blok (sisi kanan; pindah ke kiri bila tidak muat); tombol tutup `X` di kanan atas |
| Isi | Badge status; nama mesin + sub-mesin; tanggal dan rentang jam (+ keterangan "melewati tengah malam" bila berlaku); durasi; plant; shift; suku cadang; deskripsi (maksimal 3 baris, elipsis); "Catatan Supervisor" bila ada (dari riwayat approval pada data mock) |
| Aksi | Tautan "Lihat di Riwayat" menuju `/logbook/riwayat` |
| Menutup | `Esc`, klik di luar, atau gulir grid |

### 5.11 `LogbookFormDrawer` dan `LogbookForm`

**Aturan penting:** form dan logikanya sudah ada pada implementasi sebelumnya (kalkulasi durasi otomatis, validasi, pemanggilan service). **Gunakan ulang**; jika masih menyatu di `InputLogbookView.vue`, ekstrak menjadi `components/logbook/LogbookForm.vue` **tanpa mengubah logika**. Komponen yang sama boleh dipakai oleh halaman `/logbook/edit/:id`; perilaku halaman edit tidak diubah.

| Elemen | Spesifikasi |
|---|---|
| Drawer | Muncul dari kanan, lebar 440 px (≥ 1024 px), 100% lebar viewport pada < 768 px (layar penuh). Latar `surface`, `shadow-tooltip`, overlay `ink` opasitas 0.3. Animasi 200 ms `ease-out` (dimatikan bila `prefers-reduced-motion`) |
| Header drawer | Judul "Logbook Baru" (`card-title-lg`), tombol tutup `X` (`IconButton`) |
| Footer drawer | Lengket di bawah: tombol teks "Batal", tombol sekunder "Simpan Draft", tombol primary "Kirim Logbook" |
| Fokus | Fokus masuk ke kolom pertama yang belum terisi saat dibuka; fokus terperangkap (focus trap) di dalam drawer; kembali ke elemen pemicu saat ditutup |

Urutan kolom (mengikuti urutan fitur README 5.1, ditambah Tanggal):

| No | Kolom | Kontrol | Keterangan |
|---|---|---|---|
| 1 | Tanggal (`task_date`) | `<input type="date">` | Terisi dari slot yang diklik, atau tanggal terpilih |
| 2 | Plant | `Select` | Bawaan = plant milik teknisi (`users.plant_id`) bila ada |
| 3 | Shift | `Select` | Opsi menampilkan nama + jam shift |
| 4 | Mesin | `Select` dengan pencarian | Mengikuti mitigasi risiko README Bagian 19 (dropdown dengan pencarian/pagination bila data banyak) |
| 5 | Sub-mesin | `Select` | Nonaktif sampai Mesin dipilih; opsi mengikuti relasi `machine_id` |
| 6 | Jam Mulai | `<input type="time">` | Terisi dari slot/seleksi |
| 7 | Jam Selesai | `<input type="time">` | Terisi dari slot/seleksi (bawaan: jam mulai + 60 menit) |
| 8 | Durasi | Teks baca-saja (chip `muted`) | Otomatis dari util durasi yang ada, format "2 jam 30 menit"; bila melewati tengah malam tambahkan keterangan "(melewati tengah malam)" |
| 9 | Suku Cadang | `<input type="text">` | Teks bebas (`sparepart`), opsional |
| 10 | Deskripsi Aktivitas | `<textarea>` 4 baris | `activity_description` |

Perilaku aksi:

| Aksi | Hasil |
|---|---|
| Simpan Draft | Memanggil service yang sudah ada dengan status `DRAFT`; toast sukses "Draft logbook tersimpan"; drawer menutup; blok muncul pada kalender berstatus `Draft` |
| Kirim Logbook | Membuka modal konfirmasi (lihat 5.12). Setelah dikonfirmasi: status `PENDING`; toast sukses "Logbook dikirim untuk ditinjau Supervisor"; drawer menutup; blok berstatus `Pending` |
| Batal / tutup (X, `Esc`, klik overlay) | Jika form berubah: modal "Buang perubahan?" (5.12). Jika tidak: langsung menutup |
| Validasi | Real-time per kolom; pesan galat di bawah kolom (12 px, `danger`). Gunakan validator yang sudah ada; aturan pada 14.3 hanya berlaku bila validator belum ada |

### 5.12 Modal dan Toast

| Komponen | Isi |
|---|---|
| Konfirmasi kirim | Judul "Kirim logbook?", isi "Setelah dikirim, logbook tidak dapat diubah sampai ditinjau Supervisor.", tombol "Periksa Lagi" (sekunder) dan "Kirim" (primary) |
| Buang perubahan | Judul "Buang perubahan?", isi "Data yang belum disimpan akan hilang.", tombol "Lanjut Mengisi" (sekunder) dan "Buang" (primary, varian `danger` sebagai latar `danger`) |
| Toast | Posisi kanan atas, otomatis hilang 4 detik; sukses dan galat memakai komponen `Toast` umum |

### 5.13 `FabCreate` (hanya < 768 px)

Tombol bulat 56 px, latar `primary`, ikon `Plus` putih 24 px, `shadow-tooltip`, posisi tetap kanan-bawah (jarak 16 px dari tepi, memperhitungkan *safe area*), `aria-label="Buat Logbook"`.

### 5.14 Kondisi Tampilan

| Kondisi | Tampilan |
|---|---|
| Loading minggu | Grid dan header tetap tampil; di atas grid muncul 3-5 blok skeleton (`muted`, berdenyut) dan chip ringkasan skeleton |
| Kosong (minggu tanpa logbook) | Grid tampil normal; di tengah area terlihat teks bantuan `ink-2` "Belum ada logbook pada rentang ini. Klik slot waktu atau tombol Buat Logbook untuk mencatat." (`pointer-events: none`) |
| Galat memuat | Toast galat + banner kecil di atas grid dengan tombol "Coba Lagi" |
| Filter menyembunyikan semua | Teks bantuan pada 5.3 |

---

## 6. Perilaku dan Interaksi

### 6.1 Membuat logbook

| Pemicu | Hasil |
|---|---|
| Klik "Buat Logbook" / FAB | Drawer terbuka; Tanggal = `selectedDate`; Jam Mulai = jam sekarang dibulatkan ke 15 menit berikutnya bila hari ini, selain itu 08:00; Jam Selesai = Jam Mulai + 60 menit (nilai bawaan ini bersifat OPSIONAL, boleh dikosongkan) |
| Klik slot kosong | Drawer terbuka; Tanggal = kolom yang diklik; Jam Mulai = posisi klik tersnap 15 menit; Jam Selesai = +60 menit |
| Seret pada slot kosong | Drawer terbuka; Tanggal = kolom; Jam Mulai/Selesai = rentang seleksi |
| Klik slot yang tertutup blok | Dianggap klik blok (6.2), bukan membuat baru |

### 6.2 Membuka logbook yang ada

| Status blok | Klik |
|---|---|
| `Draft` | Menuju `/logbook/edit/:id` |
| `Rejected` | Menuju `/logbook/edit/:id` (halaman edit yang sudah ada menampilkan catatan Supervisor) |
| `Pending`, `Approved`, `Cancelled` | Membuka `LogbookEventPopover` (baca-saja) |

Tidak ada seret-pindah atau ubah-ukuran blok (di luar cakupan, lihat Bagian 15).

### 6.3 Navigasi tanggal

| Aksi | Hasil |
|---|---|
| Panah toolbar | Mundur/maju sejauh jumlah hari tampil (7 / 3 / 1) |
| "Hari ini" | `selectedDate` = hari ini dan grid tergulir ke jam sekarang |
| Klik tanggal pada kalender mini | `selectedDate` = tanggal itu |
| Panah kalender mini | Pindah bulan tampilan kalender mini (tidak mengubah minggu pada grid) |
| Tautan/penyegaran | `selectedDate` disimpan pada query `?date=YYYY-MM-DD` (SEBAIKNYA). Nilai tidak valid atau kosong = hari ini. Ini bukan rute baru |

### 6.4 Filter

Lihat 5.3. Filter bersifat sesi (state komponen); penyimpanan permanen OPSIONAL.

---

## 7. Aturan Data dan Logika Tampilan

### 7.1 Pengambilan data

- Muat logbook **milik teknisi yang sedang login** untuk rentang `[awalTampil - 1 hari, akhirTampil]` (satu hari sebelum awal rentang agar lanjutan dari logbook yang melewati tengah malam ikut tampil).
- Gunakan fungsi service yang sudah ada. Jika belum ada fungsi dengan filter rentang tanggal, tambahkan `logbookService.list({ dateFrom, dateTo })` pada `logbookService.js` yang menyaring data mock berdasarkan `user_id` dan `task_date` (selaras dengan `GET /logbooks` dengan filter tanggal pada README 13.2). Jangan mengubah fungsi lain.
- Pembatasan data per pengguna WAJIB di service/mock, bukan hanya di tampilan (README Bagian 4).
- Muat ulang saat minggu berganti dan setelah simpan/kirim berhasil.

### 7.2 Segmentasi blok (logbook melewati tengah malam)

Gunakan util durasi yang sudah ada sebagai satu-satunya sumber aturan durasi. Untuk penempatan blok, buat util murni `src/utils/calendarLayout.js`:

```js
// menit dari 00:00; 'HH:mm' -> number
export const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

// Satu logbook -> 1 atau 2 segmen
export function splitLogbookToSegments(lb) {
  const start = toMinutes(lb.start_time)
  const end = toMinutes(lb.end_time)
  if (end > start) {
    return [{ logbookId: lb.id, day: lb.task_date, startMin: start, endMin: end, isContinuation: false }]
  }
  // melewati tengah malam (end <= start, sesuai README Bagian 19)
  return [
    { logbookId: lb.id, day: lb.task_date, startMin: start, endMin: 1440, isContinuation: false, continues: true },
    { logbookId: lb.id, day: addDays(lb.task_date, 1), startMin: 0, endMin: end, isContinuation: true },
  ]
}
```

Catatan: tanggal berupa string lokal `YYYY-MM-DD`. **Dilarang** memakai `toISOString()` untuk kunci hari (rentan bergeser hari akibat zona waktu WIB). Gunakan komponen tahun/bulan/tanggal lokal.

### 7.3 Tata letak tumpang tindih

Algoritma (per `DayColumn`, standar kalender):

1. Urutkan segmen menurut `startMin` naik, lalu `endMin` turun.
2. Kelompokkan menjadi *cluster*: segmen berada dalam cluster yang sama bila rentangnya tumpang tindih (transitif).
3. Dalam tiap cluster, tempatkan segmen pada kolom pertama yang bebas (`startMin` ≥ `endMin` segmen terakhir pada kolom itu); jumlah kolom cluster = kolom terbanyak yang terpakai.
4. `left = (indeksKolom ÷ jumlahKolomCluster) × 100%`, `width = 100% ÷ jumlahKolomCluster` dikurangi jarak kanan 4 px.

### 7.4 Konversi piksel ke menit

```js
export const PX_PER_HOUR = 60
export const SNAP = 15
export const pxToMinutes = (y) =>
  Math.min(1440, Math.max(0, Math.round((y / PX_PER_HOUR) * 60 / SNAP) * SNAP))
export const minutesToPx = (min) => (min / 60) * PX_PER_HOUR
```

### 7.5 Kasus uji untuk Vitest (`src/utils/calendarLayout.test.js`)

| No | Kasus | Hasil yang diharapkan |
|---|---|---|
| 1 | Logbook 08:00-10:30 pada 2026-10-14 | 1 segmen pada 2026-10-14, 480-630 |
| 2 | Logbook 22:00-06:00 pada 2026-10-14 | 2 segmen: 2026-10-14 1320-1440 (`continues`), 2026-10-15 0-360 (`isContinuation`) |
| 3 | Logbook 22:00-06:00 pada hari terakhir rentang tampil | Segmen kedua jatuh di luar rentang, tidak dirender; segmen pertama tetap tampil |
| 4 | A 08:00-10:00 dan B 09:00-11:00 | Dua kolom, masing-masing lebar 50% |
| 5 | A 08:00-10:00, B 09:00-11:00, C 10:30-11:30 | A dan B dua kolom; C pada kolom 1 (setelah A selesai) dalam cluster yang sama |
| 6 | `pxToMinutes(0)`, `(7)`, `(8)`, `(14)`, `(1500)` | 0, 0, 15, 15, 1440 |
| 7 | Awal minggu (Senin) untuk 2026-10-17 (Sabtu) | 2026-10-12 |
| 8 | Judul rentang 12-18 Okt 2026; 28 Sep-4 Okt 2026; 28 Des 2026-3 Jan 2027 | "12 - 18 Oktober 2026"; "28 Sep - 4 Okt 2026"; "28 Des 2026 - 3 Jan 2027" |
| 9 | Ringkasan harian: 2 logbook (90 dan 60 menit), 1 `Rejected`, 1 `Draft` | Chip A "2 logbook · 2j 30m", chip B "1 perlu revisi", chip C "1 draft" |

### 7.6 Data uji minimum pada mock

Agar halaman dapat diuji tanpa data tambahan, **tambahkan** (jangan ubah entri lama) data mock untuk teknisi dummy (`teknisi@satoria.co.id`) dengan tanggal **relatif terhadap hari ini** (dibangkitkan saat modul dimuat):

| Kebutuhan | Contoh |
|---|---|
| Satu logbook tiap status | `Draft`, `Pending`, `Approved`, `Rejected` (dengan catatan Supervisor), `Cancelled` |
| Satu logbook melewati tengah malam | 22:00-06:00 |
| Dua logbook tumpang tindih | 09:00-11:00 dan 10:00-12:00 pada hari yang sama |
| Satu logbook pendek | 15-20 menit |
| Satu hari berisi ≥ 3 logbook | Untuk menguji 3 chip ringkasan |

---

## 8. Component Tree dan Struktur File

```
<InputLogbookView>                       views/teknisi/InputLogbookView.vue
├── <PlannerSidebarPanel>                components/logbook/ (tampil ≥ 1280 px; < 1280 px di dalam <FilterDrawer>)
│   ├── <Button>Buat Logbook</Button>
│   ├── <MiniCalendar />
│   ├── <FilterGroup title="Status Logbook"> <FilterCheckbox /> ×5 </FilterGroup>
│   └── <FilterGroup title="Shift"> <FilterCheckbox /> ×n </FilterGroup>
├── <WeekCalendarCard>
│   ├── <CalendarToolbar />
│   ├── <WeekHeader> <DayHeaderCell /> ×n </WeekHeader>
│   ├── <DaySummaryRow> <DaySummaryChip /> ×(0..3 per hari) </DaySummaryRow>
│   └── <TimeGrid>                       (area scroll)
│       ├── <TimeAxis />
│       ├── <DayColumn> <LogbookEventBlock /> ×m + <SelectionGhost /> </DayColumn> ×n
│       └── <NowIndicator />
├── <LogbookEventPopover />
├── <LogbookFormDrawer> <LogbookForm /> </LogbookFormDrawer>
├── <ConfirmModal />                     components/common/Modal (kirim, buang perubahan)
├── <FilterDrawer />                     (< 1280 px)
└── <FabCreate />                        (< 768 px)
```

Berkas baru yang disarankan:

```
src/
├─ components/logbook/   PlannerSidebarPanel, MiniCalendar, FilterGroup, FilterCheckbox,
│                        WeekCalendarCard, CalendarToolbar, WeekHeader, DayHeaderCell,
│                        DaySummaryRow, DaySummaryChip, TimeGrid, TimeAxis, DayColumn,
│                        LogbookEventBlock, NowIndicator, SelectionGhost,
│                        LogbookEventPopover, LogbookFormDrawer, LogbookForm, FilterDrawer, FabCreate
├─ utils/                calendarLayout.js (+ calendarLayout.test.js), dateKeys.js (util tanggal lokal, bila belum ada)
└─ views/teknisi/        InputLogbookView.vue (dirombak menjadi komposisi komponen di atas)
```

README Bagian 8 saat ini belum mencantumkan `components/logbook/`; tambahkan baris tersebut ke README bila dokumen ini disetujui (bukan bagian tugas agent kecuali diminta).

---

## 9. State Interaksi

| Komponen | State | Spesifikasi |
|---|---|---|
| Blok logbook | default / hover / terpilih / fokus | Lihat 5.7; fokus keyboard memakai ring 2 px `primary` |
| Slot kosong | hover (A) | Latar `muted` pada slot 15 menit yang dilewati kursor (SEBAIKNYA, hanya perangkat pointer halus) |
| Kalender mini | hover tanggal (A) | Latar `muted` bulat |
| Kotak centang filter | aktif / nonaktif / fokus | Lihat 5.3; fokus ring 2 px |
| Tombol "Buat Logbook" | default / hover (A) / disabled | `primary` / `#1D4ED8` / opasitas 0.5 (nonaktif saat drawer sedang menyimpan) |
| Drawer | membuka / menutup | Animasi 200 ms; tidak ada animasi bila `prefers-reduced-motion` |
| Tombol Simpan/Kirim | menyimpan | Disabled + indikator putar kecil; mencegah klik ganda |
| Input | fokus / error | Border 1.5 px `primary` / border `danger` + pesan 12 px |

State bertanda (A) adalah default yang wajar, bukan hasil pengamatan gambar.

---

## 10. Responsivitas

Gambar referensi hanya menampilkan desktop. Aturan berikut adalah keputusan implementasi (I-5).

| Breakpoint | Lebar | Perilaku |
|---|---|---|
| `xl` | ≥ 1280 px | Panel kiri inline 248 px + kalender 7 hari |
| `lg` | 1024-1279 px | Panel kiri disembunyikan; tombol "Filter" pada toolbar membuka `FilterDrawer` (isi: kalender mini + filter); kalender 7 hari; form drawer 440 px |
| `md` | 768-1023 px | Kalender **3 hari**; sidebar global mode ikon/drawer sesuai README 11.9; form drawer 440 px |
| `sm` | 640-767 px | Kalender **1 hari**; FAB menggantikan tombol Buat; form drawer layar penuh |
| `base` | < 640 px | Seperti `sm`; kolom waktu 48 px; teks header lebih kecil; formulir 1 kolom dengan footer lengket. Wajib nyaman dipakai pada lebar **360 px** (README 11.2 butir 2) |

Aturan tambahan: tidak ada scroll horizontal halaman; kolom hari minimal 96 px pada tampilan 7 hari (bila tidak muat, otomatis turun ke 3 hari); target sentuh minimal 44 × 44 px untuk tombol dan baris filter pada < 768 px; pada tampilan 1 hari OPSIONAL menyediakan geser kiri/kanan untuk pindah hari.

---

## 11. Aksesibilitas

WAJIB kecuali ditandai SEBAIKNYA.

1. Kartu kalender memakai `role="grid"` dengan `aria-label="Kalender logbook, {judul rentang}"`; header hari `role="columnheader"`.
2. Setiap blok logbook adalah `<button>` dengan `aria-label` berbentuk: "Logbook {mesin}, {hari}, {tanggal}, {jam mulai} sampai {jam selesai}, status {status}".
3. **Jalur tanpa mouse:** seleksi slot dan seret hanya untuk pointer. Pembuatan logbook lewat keyboard tersedia melalui tombol "Buat Logbook" dan form (kolom Tanggal dan Jam). Tombol tersebut WAJIB dapat dijangkau dengan Tab.
4. Tombol ikon (panah, filter, tutup, FAB) punya `aria-label`: "Minggu sebelumnya", "Minggu berikutnya", "Buka filter", "Tutup", "Buat Logbook".
5. Garis waktu sekarang dan blok ghost ditandai `aria-hidden="true"`.
6. Drawer dan modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` ke judul, focus trap, `Esc` menutup, fokus kembali ke pemicu.
7. Kotak centang filter memakai `<input type="checkbox">` asli (atau `role="checkbox"` + `aria-checked`) dengan label terhubung.
8. Warna bukan satu-satunya pembeda: status selalu ada sebagai teks pada popover dan `aria-label`; blok `Draft` ber-border putus-putus; chip ringkasan memuat teks.
9. Kontras: teks pada blok memakai pasangan `fg`/`bg` pada 11.3.2 (≥ 4.5:1). `ink-3` hanya untuk elemen tidak esensial (tanggal bulan lain pada kalender mini).
10. Galat validasi dihubungkan dengan `aria-describedby`; kolom wajib ditandai `aria-required="true"`.
11. Hormati `prefers-reduced-motion` untuk animasi drawer dan skeleton.
12. SEBAIKNYA: pengumuman perubahan minggu melalui `aria-live="polite"` ("Menampilkan 12 sampai 18 Oktober 2026").

---

## 12. Urutan Prioritas Implementasi

| Langkah | Tugas | Hasil yang diverifikasi |
|---|---|---|
| 1 | Tambahkan token `dot` (3.1) dan konstanta layout (3.3) | Token tersedia, tanpa hex di komponen |
| 2 | `utils/calendarLayout.js` dan `dateKeys.js` beserta tes Vitest (7.5) | Semua tes lulus |
| 3 | Tambah/pastikan `logbookService.list({ dateFrom, dateTo })` dan data uji mock (7.1, 7.6) | Data minggu termuat sesuai peran |
| 4 | Ekstrak `LogbookForm` dari form yang ada tanpa mengubah logika | Perilaku form identik dengan sebelum perubahan |
| 5 | `WeekCalendarCard`: `CalendarToolbar`, `WeekHeader`, `TimeGrid`, `TimeAxis`, `DayColumn`, `NowIndicator` | Grid 24 jam, scroll, garis waktu |
| 6 | `LogbookEventBlock` + tata letak tumpang tindih + segmen tengah malam | Blok benar untuk kasus uji 1-5 |
| 7 | `DaySummaryRow` dan chip | Kasus uji 9 |
| 8 | `PlannerSidebarPanel`: tombol Buat, `MiniCalendar`, filter | Navigasi tanggal dan filter berfungsi |
| 9 | `LogbookFormDrawer` + interaksi klik slot/seret (`SelectionGhost`) + modal konfirmasi + toast | Alur membuat logbook dari kalender |
| 10 | `LogbookEventPopover` dan aturan klik per status (6.2) | Draft/Rejected ke halaman edit, lainnya popover |
| 11 | Kondisi loading/kosong/galat, state (Bagian 9) | Semua kondisi tampil |
| 12 | Responsif (Bagian 10), `FilterDrawer`, `FabCreate`, aksesibilitas (Bagian 11) | Lolos checklist |
| 13 | `npm run build`, uji manual alur teknisi, pemeriksaan acceptance criteria | Semua kriteria terpenuhi |

---

## 13. Acceptance Criteria

Diuji sebagai pengguna Teknisi pada 1280-1440 px kecuali dinyatakan lain.

**Layout dan tema**
- [ ] IL-1: Panel kiri 248 px, jarak ke kartu kalender 16 px; kartu kalender memakai `surface`, radius 12 px; canvas `app`. Tidak ada kode hex di komponen halaman ini.
- [ ] IL-2: Header menampilkan singkatan hari dan angka tanggal; hari ini ditandai lingkaran `primary`; label "WIB (GMT+7)" tampil di kiri header.
- [ ] IL-3: Grid berisi 24 jam (1 jam = 60 px), label "01:00" sampai "23:00" format 24 jam, garis horizontal dan vertikal `line`; hanya grid yang menggulir, header dan ringkasan tetap.
- [ ] IL-4: Garis waktu sekarang (`danger`) tampil pada kolom hari ini saat minggu berjalan ditampilkan, dan bergeser tiap menit.

**Data dan tata letak blok**
- [ ] IL-5: Hanya logbook milik teknisi yang login yang tampil.
- [ ] IL-6: Blok berwarna sesuai status (bg/fg/garis kiri) dan `Draft` ber-border putus-putus.
- [ ] IL-7: Logbook 22:00-06:00 tampil sebagai dua segmen (akhir hari mulai dan awal hari berikutnya bertanda "(lanjutan)"); lulus kasus uji 2 dan 3.
- [ ] IL-8: Dua logbook yang tumpang tindih tampil berdampingan tanpa saling menutup (kasus uji 4 dan 5).
- [ ] IL-9: Baris ringkasan harian menampilkan chip sesuai 5.5 dan mengikuti filter; klik chip "perlu revisi"/"draft" menuju `/logbook/edit/:id` yang benar.

**Navigasi dan filter**
- [ ] IL-10: Panah toolbar, "Hari ini", dan klik tanggal kalender mini menggeser tampilan dengan benar; judul rentang sesuai format 5.4 (kasus uji 8); awal minggu Senin.
- [ ] IL-11: Mencentang/menghapus centang status atau shift menampilkan/menyembunyikan blok secara langsung; filter nonaktif semua menampilkan teks bantuan.

**Pembuatan dan pembukaan logbook**
- [ ] IL-12: Klik slot kosong membuka drawer dengan Tanggal, Jam Mulai (tersnap 15 menit), dan Jam Selesai (+60 menit) terisi; seret rentang mengisi jam sesuai seleksi.
- [ ] IL-13: Klik "Buat Logbook" membuka drawer dengan Tanggal = tanggal terpilih.
- [ ] IL-14: Form memuat kolom sesuai urutan 5.11; Sub-mesin nonaktif sampai Mesin dipilih; Durasi terhitung otomatis memakai util yang sudah ada, termasuk kasus melewati tengah malam.
- [ ] IL-15: "Simpan Draft" menghasilkan blok `Draft` pada kalender; "Kirim Logbook" meminta konfirmasi lalu menghasilkan blok `Pending`; keduanya menampilkan toast dan menutup drawer.
- [ ] IL-16: Menutup drawer saat ada perubahan menampilkan konfirmasi "Buang perubahan?".
- [ ] IL-17: Klik blok `Draft`/`Rejected` menuju `/logbook/edit/:id`; klik blok `Pending`/`Approved`/`Cancelled` membuka popover baca-saja dengan tautan ke `/logbook/riwayat`.

**Responsif dan aksesibilitas**
- [ ] IL-18: Perilaku breakpoint sesuai Bagian 10: 7 hari (≥ 1024), 3 hari (768-1023), 1 hari (< 768); panel kiri menjadi drawer di bawah 1280 px; FAB tampil di bawah 768 px; tidak ada scroll horizontal pada 360, 768, 1024, 1440 px.
- [ ] IL-19: Form dapat diisi dan dikirim pada lebar 360 px (drawer layar penuh, footer lengket).
- [ ] IL-20: Seluruh poin Bagian 11 yang berstatus WAJIB terpenuhi; pembuatan logbook dapat diselesaikan hanya dengan keyboard (tanpa seret/klik slot).

**Non-regresi**
- [ ] IL-21: Rute, guard, kontrak service, kalkulator durasi, validator, dan perilaku halaman `/logbook/edit/:id` dan `/logbook/riwayat` tidak berubah; `npm run build` dan seluruh tes Vitest lulus.

---

## 14. Asumsi, Pertanyaan Terbuka, dan Elemen Referensi yang Tidak Diterapkan

### 14.1 Asumsi

| ID | Asumsi | Tindakan agent |
|---|---|---|
| I-1 | Ukuran dan warna pada gambar referensi bukan dari file desain; hanya proporsi umum (1 jam ≈ 60 px, header ≈ 72 px, chip ≈ 22 px) yang dipakai | Gunakan nilai pada Bagian 3-5; boleh disesuaikan ±2 px selama kriteria terpenuhi |
| I-2 | Bilah atas kalender (tombol hari ini, panah, judul rentang) tidak terlihat pada gambar | Dibuat sesuai 5.4 sebagai navigasi dasar |
| I-3 | Referensi memulai minggu pada Minggu; README (11.5.10) memakai Senin | Gunakan Senin; konstanta `WEEK_START` agar mudah diubah |
| I-4 | Baris acara sepanjang hari pada referensi tidak punya padanan langsung di Satoria | Dimaknai sebagai ringkasan harian (5.5); jumlah dan isi chip adalah usulan |
| I-5 | Perilaku responsif, animasi, dan state (A) tidak terlihat pada gambar | Ikuti Bagian 9-10 |
| I-6 | Aturan tabrakan jadwal tidak ada di README | Logbook yang tumpang tindih **diizinkan** dan ditampilkan berdampingan; tanpa pemblokiran |
| I-7 | Tidak ada batas tanggal (mundur/maju) untuk pengisian di README | Semua tanggal boleh dipilih; lihat 14.2 |
| I-8 | Pengisian awal Plant dari profil teknisi dan nilai bawaan Jam Selesai (+60 menit) adalah kemudahan UI | Bersifat SEBAIKNYA/OPSIONAL; tidak mengubah logika penyimpanan |
| I-9 | Mock yang ada mungkin bertanggal tetap sehingga kalender minggu berjalan kosong | Tambahkan data uji relatif (7.6) tanpa mengubah data lama |
| I-10 | Mulai pengambilan data satu hari sebelum rentang untuk menampilkan lanjutan tengah malam | Ikuti 7.1 |

### 14.2 Pertanyaan terbuka (untuk dikonfirmasi pengguna)

1. Apakah logbook yang jamnya **tumpang tindih** boleh dibuat (default saat ini: boleh)?
2. Apakah ada **batas tanggal** pengisian (mis. tidak boleh mundur lebih dari N hari atau maju ke depan)?
3. Apakah **Sub-mesin** wajib dipilih saat mesin memiliki sub-mesin?
4. Apakah awal minggu sebaiknya **Senin** (default) atau Minggu seperti referensi?
5. Apakah teknisi perlu aksi **membatalkan** logbook (status `Cancelled`)? README mencantumkan statusnya tetapi tidak mendefinisikan aksinya; dokumen ini tidak menambahkannya.

### 14.3 Aturan validasi cadangan (hanya bila validator yang ada belum tersedia)

| Kolom | Simpan Draft | Kirim Logbook |
|---|---|---|
| Tanggal, Jam Mulai, Jam Selesai | Wajib | Wajib |
| Jam Selesai ≠ Jam Mulai | Wajib | Wajib |
| Plant, Shift, Mesin, Deskripsi | Opsional | Wajib |
| Sub-mesin | Opsional | Opsional (lihat pertanyaan 3) |
| Suku Cadang | Opsional | Opsional |

Pesan galat contoh: "Jam selesai tidak boleh sama dengan jam mulai", "Pilih mesin terlebih dahulu", "Deskripsi aktivitas wajib diisi".

---

## 15. Di Luar Cakupan

- Tampilan Bulan, Tahun, Agenda, dan pengalih tampilan.
- Seret-pindah dan ubah-ukuran blok logbook pada kalender.
- Kalender atau data milik pengguna lain, undangan, rapat, halaman janji temu, "Telusuri orang".
- Logbook berulang (recurring), pengingat, dan sinkronisasi dengan kalender eksternal.
- Perubahan pada halaman `/logbook/riwayat`, `/logbook/edit/:id`, Dashboard, dan modul Supervisor/Admin.
- Perubahan logika bisnis, model data, RBAC, API, dan notifikasi.

---

## 16. Checklist Akhir untuk Agent Sebelum Menyatakan Selesai

1. Seluruh IL-1 s.d. IL-21 dicentang (lampirkan hasilnya).
2. Tes Vitest `calendarLayout` (7.5) lulus; `npm run build` sukses.
3. Tidak ada kode hex di `src/components/logbook/` dan `src/views/teknisi/InputLogbookView.vue`.
4. Daftar file non-UI yang disentuh (idealnya hanya `logbookService.js` untuk fungsi `list` dan data uji mock) dilaporkan beserta alasannya.
5. Daftar `TODO(konfirmasi)` dan jawaban atas pertanyaan terbuka 14.2 dilaporkan kepada pengguna.
