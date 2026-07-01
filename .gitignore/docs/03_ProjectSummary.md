# 03_ProjectSummary.md

## Project Summary — Bantu Guru Yuk | Presensi Siswa

> Ringkasan eksekutif proyek untuk dibaca oleh stakeholder, calon kolaborator, atau pihak yang membutuhkan gambaran cepat tanpa membaca seluruh dokumentasi teknis.

---

## 1. Apa Itu Produk Ini

Bantu Guru Yuk | Presensi Siswa adalah aplikasi presensi sekolah berbasis web (PWA) yang dirancang khusus untuk guru SD, SMP, dan SMA di Indonesia. Aplikasi ini menyelesaikan satu masalah secara spesifik dan mendalam: mencatat kehadiran siswa setiap hari secepat dan semudah mungkin, bahkan tanpa koneksi internet.

## 2. Mengapa Produk Ini Dibuat

Guru-guru di Indonesia menghadapi dua ekstrem yang sama-sama bermasalah:

1. **Pencatatan manual** di buku — lambat, rawan hilang, sulit direkap.
2. **Aplikasi presensi modern** yang terlalu rumit — membutuhkan QR Code, GPS, atau Face Recognition yang tidak realistis untuk kondisi infrastruktur sekolah di banyak daerah Indonesia.

Bantu Guru Yuk | Presensi Siswa mengambil jalan tengah yang sengaja dibuat sangat sederhana: status default Hadir untuk semua siswa, guru hanya menandai pengecualian, dan semuanya berjalan offline.

## 3. Siapa yang Menggunakan

| Pengguna | Kebutuhan |
|---|---|
| Guru kelas SD | Presensi cepat, laporan bulanan untuk wali murid/kepala sekolah |
| Wali kelas SMP/SMA | Mengelola lebih dari satu kelas, laporan semester untuk dinas |
| Kepala sekolah/operator | Menerima laporan rapi dengan identitas sekolah (logo) |

## 4. Bagaimana Cara Kerjanya (Gambaran Singkat)

1. Guru melakukan setup awal melalui wizard (nama sekolah, tahun ajaran, kelas, import daftar siswa via Excel).
2. Setiap hari, guru membuka sesi presensi — seluruh siswa otomatis Hadir.
3. Guru menandai siswa yang Sakit, Izin, atau Alpha dengan beberapa ketukan saja.
4. Data tersimpan otomatis secara lokal di perangkat (offline first).
5. Di akhir bulan/semester, guru membuka menu Rekap dan mengekspor laporan ke PDF atau Excel.
6. Pengguna yang berlangganan PRO (Rp10.000/tahun) mendapatkan sinkronisasi cloud, multi-device, dan branding sekolah pada laporan.

## 5. Model Bisnis Singkat

| Tier | Harga | Inti Penawaran |
|---|---|---|
| FREE | Gratis | Solusi lengkap untuk 1 kelas, sepenuhnya offline |
| PRO | Rp10.000/tahun | Solusi untuk guru dengan banyak kelas, kebutuhan cloud, dan multi-device |

Filosofi harga: serendah mungkin agar menjadi keputusan mikro yang mudah diambil guru secara individu, bukan birokrasi pengadaan sekolah.

## 6. Apa yang Membuat Produk Ini Berbeda

| Diferensiasi | Penjelasan |
|---|---|
| Kesederhanaan radikal | Tidak ada QR, GPS, fingerprint, face recognition — interaksi presensi paling minimal yang mungkin dibuat |
| Offline-first sungguhan | Bukan sekadar "ada mode offline", tapi seluruh fitur FREE dirancang berjalan tanpa internet sama sekali |
| Harga mikro | Rp10.000/tahun menghilangkan friksi finansial dan birokrasi |
| Fokus sempit dan dalam | Tidak mencoba menjadi SIM Sekolah lengkap; hanya menyelesaikan presensi dengan sangat baik |
| Bagian dari ekosistem BGY | Terintegrasi secara filosofi dan branding dengan tools BGY lain yang sudah dipercaya komunitas guru |

## 7. Lingkup Rilis Pertama (High-Level)

**Termasuk:**
- Wizard setup tahun ajaran
- Manajemen 1 kelas (FREE) / unlimited kelas (PRO)
- Import Excel siswa
- Presensi harian offline
- Rekap bulanan & semester
- Export PDF & Excel
- Backup lokal (FREE) / backup-restore cloud (PRO)
- Kalender akademik bawaan (dapat diedit di PRO)
- Aktivasi lisensi PRO berbasis email

**Tidak termasuk (lihat `01_PRD.md` Bagian 10):**
- Notifikasi otomatis ke orang tua
- Dashboard analitik lintas sekolah/dinas
- Aplikasi native terpisah dari PWA

## 8. Tech Stack (Ringkasan Non-Teknis)

Aplikasi dibangun menggunakan teknologi web modern (React, TypeScript, Vite, Tailwind CSS, shadcn/ui) untuk antarmuka, dengan penyimpanan data lokal di perangkat (Dexie/IndexedDB) sebagai inti dari pengalaman offline, serta layanan cloud (Convex) khusus untuk kebutuhan sinkronisasi pengguna PRO. Pendekatan arsitektur (Repository Pattern) memastikan aplikasi dapat tumbuh dari mode lokal sederhana ke mode cloud tanpa membongkar ulang fondasi yang sudah ada.

## 9. Indikator Keberhasilan Proyek

| Indikator | Target |
|---|---|
| Waktu presensi 1 kelas | < 30 detik |
| Onboarding pengguna baru | < 3 menit |
| Ketergantungan pada internet untuk fitur inti | 0% (FREE harus 100% offline-capable) |
| Adopsi PRO | Dipantau pasca-rilis melalui jumlah lisensi aktif |

## 10. Acceptance Criteria — Dokumen Ini

- [x] Dapat dipahami oleh pembaca non-teknis dalam satu kali baca.
- [x] Menjawab apa, mengapa, untuk siapa, dan bagaimana cara kerja produk secara ringkas.
- [x] Konsisten dengan `00_MasterContext.md`, `01_PRD.md`, dan `02_FrozenSummary.md`.
- [x] Tidak menyertakan detail teknis implementasi (kode/skema database) — itu didetailkan di dokumen lain.

## 11. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Final |
| Dokumen Terkait | `00_MasterContext.md`, `01_PRD.md`, `02_FrozenSummary.md` |
| Dokumen Berikutnya | `04_Database.md` |
