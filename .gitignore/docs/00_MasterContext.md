# 00_MasterContext.md

## Bantu Guru Yuk | Presensi Siswa — Master Context Document

> Dokumen ini adalah **sumber kebenaran tertinggi (single source of truth)** untuk seluruh proses pengembangan produk "Bantu Guru Yuk | Presensi Siswa". Semua dokumen lain (PRD, Database, UserFlow, dst.) harus tunduk dan konsisten dengan dokumen ini. Jika terjadi konflik antar dokumen, dokumen ini yang menang.

---

## 1. Identitas Produk

| Atribut | Nilai |
|---|---|
| Nama Produk | Bantu Guru Yuk \| Presensi Siswa |
| Brand Induk | Bantu Guru Yuk (BGY) |
| Domain Brand | bantuguruyuk.web.id |
| Kategori Produk | Aplikasi presensi siswa sekolah |
| Target Pengguna | Guru SD, SMP, SMA di Indonesia |
| Platform | Web App, PWA (installable di Android/iOS/Desktop) |
| Bahasa Antarmuka | Bahasa Indonesia |
| Model Bisnis | Freemium (Free + PRO tahunan) |

### 1.1 Latar Belakang

Bantu Guru Yuk (BGY) adalah ekosistem alat bantu digital untuk guru Kurikulum Merdeka di Indonesia, terdiri dari berbagai tools seperti generator Modul Ajar, generator Tujuan Pembelajaran, generator soal, dan generator sertifikat. "Presensi Siswa" adalah produk baru dalam ekosistem ini, dengan fokus sempit dan dalam: menyelesaikan satu masalah harian guru — mencatat kehadiran siswa — dengan cara paling cepat dan paling sederhana yang mungkin dibuat.

### 1.2 Masalah yang Diselesaikan

Guru di Indonesia, terutama di SD, masih banyak yang:

1. Mencatat presensi manual di buku/kertas, lalu menyalin ulang ke rekap bulanan.
2. Menggunakan aplikasi presensi yang terlalu kompleks (QR Code, GPS, Face Recognition) yang membutuhkan koneksi internet stabil dan device yang mumpuni — tidak realistis untuk kondisi sekolah di banyak daerah Indonesia (sinyal lemah, device terbatas, waktu mengajar terbatas).
3. Membutuhkan waktu lama hanya untuk mengisi presensi satu kelas, padahal waktu mengajar sangat berharga.
4. Kesulitan membuat rekap bulanan/semester untuk laporan ke kepala sekolah atau wali murid.

### 1.3 Visi Produk

Menjadi aplikasi presensi sekolah paling sederhana dan paling cepat digunakan oleh guru di Indonesia, yang bisa dipakai **tanpa pelatihan**, **tanpa internet**, dan **dalam waktu kurang dari 30 detik per kelas**.

### 1.4 Misi Produk

1. Menghilangkan semua kerumitan teknis (QR, GPS, Face Recognition, Jam Masuk/Pulang) yang tidak relevan dengan kebutuhan riil presensi harian guru kelas.
2. Menjadikan aplikasi berjalan optimal secara offline, karena infrastruktur internet di banyak sekolah Indonesia tidak stabil.
3. Menyediakan rekap otomatis (bulanan dan semester) yang langsung bisa diekspor sebagai laporan resmi (PDF/Excel).
4. Memberikan jalur upgrade berbayar yang sangat murah (Rp10.000/tahun) sehingga terjangkau oleh guru individu, bukan hanya institusi.

---

## 2. Prinsip Inti Produk (Non-Negotiable Principles)

Prinsip-prinsip di bawah ini **tidak boleh dilanggar** oleh keputusan desain atau fitur apa pun di masa depan, kecuali melalui proses perubahan resmi yang didokumentasikan di `13_ChangeLog.md`.

| # | Prinsip | Alasan |
|---|---|---|
| 1 | **Offline First** | Banyak sekolah di Indonesia memiliki koneksi internet yang tidak stabil atau tidak ada sama sekali di dalam kelas. Aplikasi harus 100% bisa dipakai tanpa internet untuk semua fitur inti (presensi, rekap, export). |
| 2 | **Mobile First** | Guru mengisi presensi sambil berdiri di depan kelas, biasanya menggunakan HP, bukan laptop. Desain harus dioptimalkan untuk layar kecil dan interaksi satu tangan. |
| 3 | **Kecepatan Input < 30 detik per kelas** | Waktu guru di kelas sangat terbatas. Setiap detik yang dihabiskan untuk administrasi adalah waktu yang hilang dari mengajar. Ini adalah metrik keberhasilan utama produk. |
| 4 | **Default Hadir** | Secara statistik, mayoritas siswa hadir setiap hari. Guru seharusnya hanya perlu menandai pengecualian (Sakit, Izin, Alpha), bukan menandai satu per satu siswa yang hadir. |
| 5 | **Tidak ada fitur yang menambah friksi teknis** | QR Code, GPS, Fingerprint, dan Face Recognition ditolak secara sadar (lihat Bagian 3) karena menambah kompleksitas teknis, biaya hardware, dan titik kegagalan, tanpa menambah nilai inti bagi kasus penggunaan guru kelas. |
| 6 | **Repository Pattern di seluruh akses data** | Memungkinkan aplikasi berpindah mulus antara mode lokal (Dexie/IndexedDB) dan mode cloud (Convex) tanpa mengubah logika bisnis maupun UI. |
| 7 | **Tidak melacak waktu kedatangan** | Tidak ada Jam Masuk, Jam Pulang, atau status Terlambat. Presensi ini murni status kehadiran harian (Hadir/Sakit/Izin/Alpha), bukan sistem time-tracking. |

---

## 3. Keputusan Produk yang Sudah Final (Frozen Decisions)

Bagian ini mendokumentasikan keputusan yang **sudah diputuskan dan tidak dapat diubah** tanpa proses revisi resmi.

### 3.1 Fitur yang DITOLAK (Explicitly Rejected Features)

| Fitur yang Ditolak | Alasan Penolakan |
|---|---|
| QR Code Scan | Membutuhkan kamera aktif tiap presensi, rawan gagal scan, menambah waktu input per siswa, tidak cocok untuk presensi cepat satu kelas sekaligus. |
| GPS / Lokasi | Banyak sekolah tidak memiliki sinyal GPS stabil di dalam ruangan; juga menimbulkan masalah privasi dan tidak relevan untuk presensi kelas (guru sudah tahu siswa hadir di kelas secara visual). |
| Fingerprint | Membutuhkan hardware tambahan yang tidak tersedia di sekolah-sekolah dengan anggaran terbatas; tidak praktis untuk anak SD. |
| Face Recognition | Membutuhkan kamera, pencahayaan baik, dan model AI yang berat; tidak cocok untuk perangkat low-end yang umum dipakai guru; juga isu privasi data biometrik anak. |
| Jam Masuk | Bukan tujuan aplikasi ini; aplikasi fokus pada status kehadiran harian, bukan pencatatan waktu presisi. |
| Jam Pulang | Sama seperti di atas; tidak relevan dengan masalah yang ingin diselesaikan. |
| Status Terlambat | Menambah kompleksitas keputusan bagi guru (harus menentukan threshold keterlambatan) tanpa nilai tambah yang signifikan untuk laporan bulanan/semester. |

### 3.2 Model Interaksi Presensi yang DIPILIH

| Keputusan | Penjelasan |
|---|---|
| Semua siswa default **Hadir** | Saat membuka sesi presensi harian, seluruh siswa di kelas otomatis berstatus Hadir. |
| Guru hanya mengubah status **pengecualian** | Guru cukup mengetuk siswa yang **tidak** hadir normal, lalu memilih Sakit / Izin / Alpha. Ini meminimalkan jumlah ketukan (tap) yang dibutuhkan. |
| Tidak ada status "Belum Diisi" yang mengganggu alur | Status awal langsung definitif (Hadir), bukan status netral yang memaksa guru mengisi satu per satu. |

### 3.3 Status Kehadiran yang Didukung

| Kode | Label | Default? |
|---|---|---|
| H | Hadir | Ya (default seluruh siswa) |
| S | Sakit | Tidak (dipilih manual oleh guru) |
| I | Izin | Tidak (dipilih manual oleh guru) |
| A | Alpha | Tidak (dipilih manual oleh guru) |

### 3.4 Model Bisnis Final

| Tier | Harga | Lingkup |
|---|---|---|
| FREE | Rp0 | Penggunaan lokal, 1 kelas, fitur inti lengkap (lihat Bagian 4) |
| PRO | Rp10.000 / tahun / lisensi | Unlimited kelas, sinkronisasi cloud via Convex, multi-device, fitur kalender akademik dan branding sekolah |

**Alasan harga Rp10.000/tahun:** Harga ditetapkan sangat rendah secara sengaja agar menjadi micro-transaction yang mudah diputuskan oleh guru individu tanpa perlu persetujuan anggaran sekolah/dinas. Filosofinya mengikuti model BGY lainnya: volume tinggi, harga sangat rendah, akses luas.

---

## 4. Ringkasan Fitur per Tier

### 4.1 FREE

- Penyimpanan lokal (Dexie/IndexedDB)
- 1 kelas
- Import Excel (daftar siswa)
- Presensi harian
- Rekap Bulanan
- Rekap Semester
- Export PDF
- Export Excel
- Backup Lokal (file backup manual)

### 4.2 PRO (Rp10.000/tahun)

- Semua fitur FREE, ditambah:
- Unlimited kelas
- Cloud Sync (Convex)
- Multi Device (akses dari beberapa HP/perangkat dengan akun yang sama)
- Kalender Akademik (bawaan, dapat diedit)
- Import Update Excel (memperbarui daftar siswa tanpa duplikasi)
- Backup Cloud
- Restore Cloud
- Logo Sekolah (branding pada laporan PDF/Excel)

---

## 5. Tech Stack (Ringkasan — detail di `07_TechStack.md`)

| Layer | Teknologi | Alasan Singkat |
|---|---|---|
| Frontend Framework | React + TypeScript | Ekosistem matang, type-safety, mudah dirawat jangka panjang |
| Build Tool | Vite | Build cepat, dev experience ringan, cocok untuk PWA |
| Styling | Tailwind CSS | Konsistensi desain cepat, ukuran bundle kecil setelah purge |
| Komponen UI | shadcn/ui | Komponen accessible, dapat dikustomisasi penuh tanpa dependency berat |
| Local Database | Dexie (IndexedDB) | Penyimpanan offline-first yang andal di browser |
| Cloud Backend | Convex | Backend reaktif yang menyederhanakan sinkronisasi multi-device untuk tier PRO |
| Pola Arsitektur Data | Repository Pattern | Memisahkan logika akses data dari logika bisnis dan UI, memudahkan transisi Free (lokal) ke PRO (cloud) |
| Distribusi | PWA | Dapat di-install di HP guru seperti aplikasi native, berjalan offline, tanpa perlu app store |

> **Catatan eksplisit:** Dokumentasi ini TIDAK berisi kode, contoh React, atau contoh TypeScript. Implementasi teknis akan dikerjakan secara terpisah berdasarkan dokumen ini sebagai acuan.

---

## 6. Definisi Kesuksesan Produk (Success Metrics)

| Metrik | Target |
|---|---|
| Waktu pengisian presensi 1 kelas (±30 siswa) | < 30 detik |
| Waktu onboarding guru baru (wizard setup tahun ajaran) | < 3 menit |
| Tingkat keberhasilan penggunaan tanpa internet | 100% untuk fitur tier FREE |
| Tingkat konversi Free → PRO | Ditentukan kemudian, dipantau melalui jumlah lisensi terjual |
| Kepuasan pengguna terhadap kesederhanaan UI | Diukur melalui feedback kualitatif dari komunitas guru BGY |

---

## 7. Struktur Dokumentasi Proyek

| No | Nama File | Fungsi |
|---|---|---|
| 00 | MasterContext.md | Sumber kebenaran tertinggi proyek (dokumen ini) |
| 01 | PRD.md | Product Requirements Document lengkap |
| 02 | FrozenSummary.md | Ringkasan keputusan yang dibekukan/final |
| 03 | ProjectSummary.md | Ringkasan eksekutif proyek untuk stakeholder |
| 04 | Database.md | Skema data Dexie & Convex |
| 05 | UserFlow.md | Alur penggunaan aplikasi end-to-end |
| 06 | DesignSystem.md | Sistem desain visual & interaksi |
| 07 | TechStack.md | Justifikasi teknis mendalam |
| 08 | CodingGuideline.md | Standar penulisan kode untuk tim dev |
| 09 | Roadmap.md | Peta jalan rilis produk |
| 10 | ClaudeSprint.md | Panduan sprint kerja bersama AI (Claude) |
| 11 | DeepSeekPrompt.md | Template prompt untuk AI lain (DeepSeek) sebagai pembanding/validator |
| 12 | ReviewChecklist.md | Checklist QA sebelum rilis |
| 13 | ChangeLog.md | Riwayat perubahan keputusan produk |

---

## 8. Acceptance Criteria — Dokumen Ini

- [x] Mendefinisikan identitas produk secara lengkap.
- [x] Mendefinisikan masalah yang diselesaikan beserta justifikasinya.
- [x] Mendokumentasikan seluruh prinsip inti yang bersifat non-negotiable.
- [x] Mendokumentasikan seluruh fitur yang ditolak beserta alasannya.
- [x] Mendokumentasikan model bisnis final beserta alasan harga.
- [x] Memberikan ringkasan fitur per tier yang konsisten dengan brief awal.
- [x] Memberikan ringkasan tech stack tanpa kode.
- [x] Mendefinisikan metrik keberhasilan produk.
- [x] Memetakan struktur seluruh dokumentasi proyek.

---

## 9. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Final — Disetujui sebagai baseline proyek |
| Tanggal Dibuat | 30 Juni 2026 |
| Dokumen Berikutnya | `01_PRD.md` |
