# 12_ReviewChecklist.md

## Pre-Release Review Checklist — Bantu Guru Yuk | Presensi Siswa

> Dokumen ini adalah checklist QA (Quality Assurance) yang wajib diperiksa sebelum setiap rilis, baik rilis internal (MVP), rilis publik FREE, maupun rilis PRO. Checklist disusun berdasarkan seluruh prinsip dan requirement yang sudah didokumentasikan di dokumen 00–11.

---

## 1. Cara Menggunakan Checklist Ini

| Aturan | Penjelasan |
|---|---|
| Checklist wajib dijalankan sebelum setiap rilis | Tidak boleh ada rilis (bahkan internal) yang melewati checklist ini tanpa alasan yang dicatat. |
| Setiap item harus diberi status | Gunakan status: ✅ Lolos, ❌ Gagal, ⚠️ Perlu Perhatian (lolos dengan catatan). |
| Item yang Gagal memblokir rilis | Kecuali ada keputusan eksplisit dari Hai untuk merilis dengan pengecualian yang dicatat. |

---

## 2. Checklist Prinsip Inti

| # | Item Pemeriksaan | Acuan Dokumen |
|---|---|---|
| 1 | Presensi 1 kelas (±30 siswa) dapat diselesaikan dalam < 30 detik oleh pengguna yang familiar | `00_MasterContext.md` Bagian 2 |
| 2 | Seluruh fitur tier FREE berfungsi penuh tanpa koneksi internet | `00_MasterContext.md` Bagian 2 |
| 3 | Tidak ditemukan elemen UI/fitur QR Code, GPS, Fingerprint, atau Face Recognition di mana pun dalam aplikasi | `02_FrozenSummary.md` Bagian 3 |
| 4 | Tidak ditemukan field Jam Masuk, Jam Pulang, atau status Terlambat di mana pun dalam aplikasi | `02_FrozenSummary.md` Bagian 3 |
| 5 | Status default seluruh siswa saat sesi presensi dibuka adalah Hadir | `02_FrozenSummary.md` Bagian 4 |
| 6 | Hanya 4 status kehadiran yang tersedia: Hadir, Sakit, Izin, Alpha | `02_FrozenSummary.md` Bagian 4 |

---

## 3. Checklist Fungsional — Onboarding

| # | Item Pemeriksaan | Acuan Dokumen |
|---|---|---|
| 1 | Wizard Setup Tahun Ajaran muncul otomatis saat aplikasi dibuka pertama kali | `01_PRD.md` FR-01 |
| 2 | Wizard tidak dapat dilewati tanpa data minimum (sekolah, guru, tahun ajaran, 1 kelas, minimal 1 siswa) | `01_PRD.md` FR-01–FR-02 |
| 3 | Kalender Akademik bawaan otomatis terisi tanpa input manual | `01_PRD.md` FR-04 |
| 4 | Waktu penyelesaian wizard untuk pengguna baru < 3 menit (diuji dengan skenario nyata) | `01_PRD.md` FR-05 |

## 4. Checklist Fungsional — Manajemen Siswa & Kelas

| # | Item Pemeriksaan | Acuan Dokumen |
|---|---|---|
| 1 | Import Excel berhasil memetakan data sesuai format yang didukung | `01_PRD.md` FR-10 |
| 2 | Pesan error Import Excel jelas dan spesifik (bukan pesan generik) | `01_PRD.md` FR-11 |
| 3 | Pengguna FREE tidak dapat membuat kelas ke-2; muncul prompt upgrade, bukan error tanpa penjelasan | `01_PRD.md` FR-12, FR-52 |
| 4 | Pengguna PRO dapat membuat kelas tanpa batas | `01_PRD.md` FR-13 |
| 5 | Import Update Excel (PRO) tidak menduplikasi siswa yang sudah ada | `01_PRD.md` FR-14 |
| 6 | Tambah/edit/hapus siswa manual berfungsi tanpa Excel | `01_PRD.md` FR-15 |

## 5. Checklist Fungsional — Presensi Harian

| # | Item Pemeriksaan | Acuan Dokumen |
|---|---|---|
| 1 | Mengubah status 1 siswa membutuhkan maksimal 2 ketukan | `01_PRD.md` FR-21 |
| 2 | Perubahan status tersimpan otomatis tanpa tombol "Simpan" wajib | `01_PRD.md` FR-22 |
| 3 | Presensi dapat diisi penuh dalam mode tanpa internet (diuji dengan mematikan koneksi device pengujian) | `01_PRD.md` FR-23 |
| 4 | Presensi hari-hari sebelumnya dalam tahun ajaran yang sama dapat dilihat dan diedit ulang | `01_PRD.md` FR-24 |
| 5 | Membuka kembali tanggal yang sudah diisi tidak mereset status ke Hadir default | `05_UserFlow.md` Bagian 3 |

## 6. Checklist Fungsional — Rekap & Export

| # | Item Pemeriksaan | Acuan Dokumen |
|---|---|---|
| 1 | Rekap Bulanan menghitung otomatis tanpa input ulang manual | `01_PRD.md` FR-30 |
| 2 | Rekap Semester menghitung sesuai rentang semester dari Kalender Akademik | `01_PRD.md` FR-31 |
| 3 | Export PDF berhasil dibuka tanpa korupsi format pada pembaca PDF umum | `01_PRD.md` FR-32 |
| 4 | Export Excel berhasil dibuka tanpa korupsi format pada Excel/Google Sheets | `01_PRD.md` FR-33 |
| 5 | Rekap menampilkan ringkasan Hadir/Sakit/Izin/Alpha per siswa dengan benar | `01_PRD.md` FR-34 |
| 6 | Logo Sekolah muncul di laporan PRO, dan tidak muncul opsi tersebut di tier FREE | `01_PRD.md` FR-35 |

## 7. Checklist Fungsional — Backup & Sinkronisasi

| # | Item Pemeriksaan | Acuan Dokumen |
|---|---|---|
| 1 | Backup Lokal (FREE & PRO) menghasilkan file yang dapat dipulihkan dengan data identik | `01_PRD.md` FR-40–FR-41 |
| 2 | Cloud Sync (PRO) berhasil menyinkronkan data antar dua device dengan email yang sama | `01_PRD.md` FR-42–FR-43 |
| 3 | Backup Cloud dan Restore Cloud (PRO) berfungsi sesuai skenario uji | `01_PRD.md` FR-44 |
| 4 | Konflik data antar device (skenario presensi sama, edit beda device) diselesaikan tanpa kehilangan data, sesuai strategi resolusi konflik | `04_Database.md` Bagian 6.2 |
| 5 | Indikator status sinkronisasi tampil sesuai kondisi nyata (Tersinkron/Menunggu koneksi/Menyinkronkan) | `06_DesignSystem.md` Bagian 4.4 |

## 8. Checklist Fungsional — Lisensi PRO

| # | Item Pemeriksaan | Acuan Dokumen |
|---|---|---|
| 1 | Aktivasi lisensi PRO berhasil mengubah status tier tanpa reinstall | `01_PRD.md` FR-50 |
| 2 | Status tier (FREE/PRO) ditampilkan jelas di pengaturan | `01_PRD.md` FR-51 |
| 3 | Prompt upgrade kontekstual muncul di setiap titik fitur terkunci, bukan error generik | `01_PRD.md` FR-52 |
| 4 | Halaman informasi harga & manfaat PRO tersedia dan akurat (Rp10.000/tahun) | `01_PRD.md` FR-53 |
| 5 | Lisensi kedaluwarsa menurunkan tier ke FREE tanpa menghapus data kelas tambahan (read-only, bukan terhapus) | `05_UserFlow.md` Bagian 9 |

## 9. Checklist Desain & Aksesibilitas

| # | Item Pemeriksaan | Acuan Dokumen |
|---|---|---|
| 1 | Warna status kehadiran konsisten di seluruh halaman (presensi, rekap, export) | `06_DesignSystem.md` Bagian 2.1 |
| 2 | Setiap status kehadiran disertai label teks, tidak hanya warna | `06_DesignSystem.md` Bagian 7 |
| 3 | Ukuran target sentuh memadai untuk digunakan dengan satu jempol | `06_DesignSystem.md` Bagian 7 |
| 4 | Navigasi utama dapat dijangkau dengan mudah pada layar mobile (bottom navigation) | `06_DesignSystem.md` Bagian 5 |
| 5 | Tidak ada istilah teknis (database, sync mentah, dsb.) yang muncul langsung ke pengguna tanpa diterjemahkan ke Bahasa Indonesia yang lugas | `06_DesignSystem.md` Bagian 3 |

## 10. Checklist Performa & Teknis

| # | Item Pemeriksaan | Acuan Dokumen |
|---|---|---|
| 1 | Waktu render halaman presensi kelas ±40 siswa < 1 detik pada device low-end | `01_PRD.md` NFR-01 |
| 2 | Tidak ada kehilangan data akibat force-close/restart sebelum auto-save selesai | `01_PRD.md` NFR-05 |
| 3 | Aplikasi dapat di-install sebagai PWA di Android dan iOS | `01_PRD.md` NFR-03 |
| 4 | Seluruh akses data melalui Repository Pattern (tidak ada akses Dexie/Convex langsung dari komponen UI) | `08_CodingGuideline.md` Bagian 2 |
| 5 | Data yang disinkronkan ke cloud (PRO) terenkripsi saat transit | `01_PRD.md` NFR-07 |

## 11. Checklist Konsistensi Dokumentasi

| # | Item Pemeriksaan |
|---|---|
| 1 | Fitur yang diimplementasikan sesuai dengan yang tercantum di `01_PRD.md`, tidak ada fitur "siluman" di luar dokumentasi |
| 2 | Tidak ada keputusan frozen di `02_FrozenSummary.md` yang dilanggar oleh implementasi |
| 3 | Jika ada perubahan keputusan selama development, sudah dicatat di `13_ChangeLog.md` |
| 4 | Skema data aktual konsisten dengan entitas yang didefinisikan di `04_Database.md` |

---

## 12. Ringkasan Hasil Review (Template)

| Kategori | Jumlah Lolos | Jumlah Gagal | Jumlah Perlu Perhatian |
|---|---|---|---|
| Prinsip Inti | | | |
| Onboarding | | | |
| Manajemen Siswa & Kelas | | | |
| Presensi Harian | | | |
| Rekap & Export | | | |
| Backup & Sinkronisasi | | | |
| Lisensi PRO | | | |
| Desain & Aksesibilitas | | | |
| Performa & Teknis | | | |
| Konsistensi Dokumentasi | | | |

**Keputusan Rilis:** [ ] Disetujui untuk rilis &nbsp;&nbsp; [ ] Ditahan, perlu perbaikan &nbsp;&nbsp; [ ] Disetujui dengan pengecualian (dicatat di bawah)

**Catatan Pengecualian (jika ada):**

---

## 13. Acceptance Criteria — Dokumen Ini

- [x] Checklist mencakup seluruh kategori fungsional dan non-fungsional dari `01_PRD.md`.
- [x] Setiap item checklist merujuk kembali ke dokumen sumber requirement yang relevan.
- [x] Tersedia template ringkasan hasil review yang dapat diisi langsung sebelum keputusan rilis.
- [x] Checklist mencegah rilis yang melanggar prinsip inti atau keputusan frozen.

---

## 14. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Final |
| Dokumen Terkait | `01_PRD.md`, `02_FrozenSummary.md`, `09_Roadmap.md` |
| Dokumen Berikutnya | `13_ChangeLog.md` |
