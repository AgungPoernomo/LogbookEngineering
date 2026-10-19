# PROMPT EKSEKUSI: Perubahan UI Engineer Logbook Satoria (README v1.4)

> Salin seluruh isi di bawah garis ini ke AI Agent di Antigravity IDE. Pastikan `README.md` versi 1.4 sudah berada di root proyek sebelum prompt dijalankan.

---

## PERAN

Anda adalah AI coding agent senior (Vue 3 + Tailwind CSS) yang bertugas **mengubah tampilan (UI) saja** pada proyek *Engineer Logbook Satoria* agar sesuai dengan spesifikasi UI terbaru. Bekerjalah secara mandiri, berurutan, dan terverifikasi.

## SUMBER ACUAN

1. Baca **seluruh** `README.md` (versi dokumen 1.4) di root proyek sebelum menulis kode.
2. Acuan utama pekerjaan ini adalah **Bagian 11 (Panduan Desain UI, 11.1 s.d. 11.12)**. Bagian 7.1 dan Bagian 8 dibaca untuk stack dan struktur folder. Riwayat Versi 1.4 merangkum perubahan.
3. Dokumen `UI-SPEC-dashboard-saildo.md` sudah tergabung ke README dan **bukan** acuan terpisah. Jika konflik, README menang. Jika gambar referensi dashboard tersedia, gunakan hanya untuk pemeriksaan visual.

## ATURAN MUTLAK (WAJIB)

1. **Hanya UI yang diubah.** Dilarang mengubah logika bisnis, alur status logbook, perhitungan durasi (termasuk shift melintasi tengah malam), RBAC dan navigation guard, rute pada Bagian 10, struktur data pada `src/mock/`, kontrak fungsi pada `src/services/`, store Pinia, akun dummy, dan isi dokumen README. Jika perubahan UI menuntut menyentuh file tersebut, lakukan perubahan **seminimal mungkin**, jangan mengubah perilaku, dan catat di laporan akhir.
2. **Hierarki:** konten dan perilaku mengikuti Bagian 1-10 dan 12-22; tampilan mengikuti Bagian 11 (lihat 11.1 butir 2).
3. **Jangan menyalin konten keuangan** dari referensi (Earnings, Spend, Customer, kartu kredit, Balance, Quick Transfer, Send Money, Country, Order). Gunakan pemetaan konten Satoria pada 11.6.
4. **Seluruh teks UI berbahasa Indonesia baku** (Bagian 17).
5. **Tanpa hex di komponen.** Semua warna, radius, shadow, dan spasi lewat token (11.3). Konfigurasi grafik boleh membaca CSS variable dari `tokens.css`.
6. **Angka dashboard dihitung dari mock melalui service**, bukan hardcode.
7. **Jangan menambah fitur, halaman, rute, atau peran** di luar dokumen. Elemen yang tercantum di 11.12 sebagai "tidak diterapkan" harus tetap tidak dibuat.
8. Jangan mengarang detail. Hal yang tidak jelas: ikuti keputusan default di 11.12, beri komentar `TODO(konfirmasi): <pertanyaan>` pada kode, dan masukkan ke laporan akhir.
9. Jangan menjalankan `git commit`/`push` kecuali diminta pengguna.

## LANGKAH EKSEKUSI

Kerjakan **berurutan** sesuai tabel 11.10. Setelah tiap langkah, jalankan aplikasi (atau `npm run build`) dan pastikan tidak ada error sebelum lanjut. Buat daftar tugas dan tandai selesai per langkah.

| Langkah | Pekerjaan | Rujukan README |
|---|---|---|
| 0 | Audit awal: petakan komponen, view, dan style yang ada. Temukan seluruh sisa token AdminCN (Public Sans, `#00A76F`, `#212B36`, `#F4F6F8`, `#EDEFF1`, radius 16 px) dan daftar hex yang tertulis langsung di komponen. Catat, belum mengubah apa pun | 11.1, 11.3 |
| 1 | Pasang dependensi: `@fontsource/inter`, `lucide-vue-next`, `chart.js`, `vue-chartjs`. Buat `src/assets/tokens.css` dan perbarui `tailwind.config.js` persis seperti 11.3.5. Impor Inter. Hapus token AdminCN | 7.1, 11.3 |
| 2 | Bangun/rapikan komponen umum di `components/common/`: `Card`, `Button`, `Input`, `Select`, `Badge` (status 11.3.2), `IconButton`, `ProgressBar`, `Avatar`, `Table`, `Modal`, `Toast` | 11.5.11 |
| 3 | `MainLayout`, `Sidebar` (menu per peran dari `constants/menu.js`, tanpa submenu), `Navbar` (`PageHeader`, `RoleSwitcher` mode dev, `NotificationBell`, `UserMenu`), `SidebarProfile`, mode collapse, drawer mobile. **Pertahankan** perilaku Quick Role Switcher yang sudah ada | 11.4, 11.5.1, 11.5.2 |
| 4 | `StatCard` + `MiniBarChart` (7 bar) dan varian meter | 11.5.3 |
| 5 | `StatisticsChartCard` (area chart linear, gradien, grid dashed, sorotan, tooltip, 12 bulan berbahasa Indonesia) | 11.5.4 |
| 6 | `StatusDonutCard` (5 status) dan `ProgressListCard` | 11.5.5, 11.5.6 |
| 7 | `RecentTableCard` dengan tiga varian per peran (sort, empty state, skeleton) | 11.5.7, 11.6 |
| 8 | `NotificationPanel`, `CalendarCard`, `ActivityFeedPanel`; susun `/dashboard` untuk tiap peran sesuai tabel 11.6 | 11.5.8-11.5.10, 11.6 |
| 9 | Terapkan token dan komponen umum pada **semua** halaman: Login, Input Logbook, Riwayat, Edit Logbook, Approval (list dan detail), Laporan, Manajemen Akun, Master Data, Audit Trail, Profil, 403, 404. Hanya mengganti tampilan, tidak mengubah isi form, validasi, atau alur | 11.5.11, 11.4 |
| 10 | State interaksi (hover, focus-visible, disabled, error), loading skeleton, empty state, toast, modal konfirmasi | 11.8, 11.2 |
| 11 | Responsivitas (breakpoint `xl`/`lg`/`md`/`sm`/`base`) dan aksesibilitas | 11.9 |
| 12 | Verifikasi akhir (bagian di bawah) | 11.11 |

## VERIFIKASI AKHIR

1. Jalankan `npm run build` dan unit test yang ada (Vitest); semuanya harus lulus seperti sebelum perubahan.
2. Telusuri **ketiga peran** melalui `RoleSwitcher`/login dummy (`teknisi@satoria.co.id`, `spv@satoria.co.id`, `admin@satoria.co.id`, kata sandi `password123`) dan kunjungi setiap rute pada Bagian 10. Pastikan menu, dashboard, dan hak akses benar.
3. Periksa pada lebar 360, 768, 1024, dan 1440 px: tidak ada scroll horizontal halaman.
4. Cari `#` hex pada `src/components` dan `src/views`; tidak boleh ada di luar file token dan konfigurasi grafik. Cari sisa AdminCN (`Public Sans`, `#00A76F`, `#212B36`, `#F4F6F8`, `#EDEFF1`); harus tidak ada.
5. Centang satu per satu **UI-1 s.d. UI-17** pada 11.11 dan sertakan hasilnya.
6. Bandingkan `git diff`/daftar file berubah dan pastikan tidak ada perubahan perilaku pada `services/`, `stores/`, `router/guards.js`, dan `mock/` selain yang dicatat.

## FORMAT LAPORAN AKHIR

Kirim laporan ringkas berisi:

1. **Ringkasan** (maksimal 5 kalimat) apa yang selesai.
2. **Daftar file** baru dan file berubah, dikelompokkan: token/konfigurasi, layout, komponen, view.
3. **Hasil UI-1 s.d. UI-17** (lulus / gagal + alasan).
4. **Sentuhan di luar UI**: file non-UI yang disentuh beserta alasannya (idealnya kosong).
5. **Daftar `TODO(konfirmasi)`** yang membutuhkan keputusan pengguna, minimal mencakup U-2 (logo), U-3 (warna status), U-4 (pemetaan konten dashboard).
6. **Masalah/risiko** yang ditemukan.

Jangan menuliskan ulang langkah-langkah yang sudah dikerjakan secara naratif.

## KRITERIA SELESAI

Pekerjaan dinyatakan selesai hanya jika: build sukses, UI-1 s.d. UI-17 terpenuhi, tidak ada perubahan perilaku non-UI, dan laporan akhir sudah dikirim.
