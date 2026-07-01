# 04_Database.md

## Database Design Document — Bantu Guru Yuk | Presensi Siswa

> Dokumen ini mendeskripsikan struktur data secara konseptual (entitas, atribut, relasi, dan aturan sinkronisasi). Dokumen ini **tidak berisi kode** (tidak ada schema TypeScript/Dexie/Convex aktual) — hanya spesifikasi yang menjadi acuan saat implementasi dikerjakan secara terpisah.

---

## 1. Filosofi Desain Data

| Prinsip | Penjelasan |
|---|---|
| Local-first source of truth | Untuk tier FREE, IndexedDB (via Dexie) adalah satu-satunya sumber data. Tidak ada dependensi ke server. |
| Cloud sebagai cermin, bukan otoritas tunggal | Untuk tier PRO, Convex menyimpan salinan data yang disinkronkan dari/ke lokal — bukan menggantikan local-first, melainkan menambah lapisan sinkronisasi. |
| Setiap entitas memiliki identitas unik yang stabil | Agar sinkronisasi multi-device dapat mencocokkan record yang sama meski dibuat secara offline. |
| Soft-delete, bukan hard-delete, untuk data yang disinkronkan | Mencegah data terhapus permanen secara tidak sengaja saat konflik sinkronisasi. |
| Audit minimal: setiap record menyimpan kapan dibuat dan kapan terakhir diubah | Dibutuhkan untuk strategi resolusi konflik berbasis timestamp. |

---

## 2. Daftar Entitas Utama

| Entitas | Deskripsi |
|---|---|
| Sekolah (School) | Identitas sekolah tempat guru mengajar |
| Guru (Teacher/User) | Pengguna aplikasi, pemilik data |
| TahunAjaran (AcademicYear) | Periode tahun ajaran yang sedang aktif |
| Kelas (Classroom) | Satu rombongan belajar yang dikelola guru |
| Siswa (Student) | Data siswa dalam suatu kelas |
| SesiPresensi (AttendanceSession) | Representasi 1 hari presensi untuk 1 kelas |
| RecordPresensi (AttendanceRecord) | Status kehadiran 1 siswa pada 1 sesi presensi |
| KalenderAkademik (AcademicCalendarEntry) | Entri hari libur/hari efektif dalam tahun ajaran |
| Lisensi (License) | Status aktivasi PRO milik guru |
| BackupMeta (BackupRecord) | Metadata riwayat backup lokal/cloud |

---

## 3. Spesifikasi Entitas

### 3.1 Sekolah (School)

| Atribut | Tipe Data | Wajib | Deskripsi |
|---|---|---|---|
| id | Identifier unik | Ya | ID lokal sekolah |
| nama | Teks | Ya | Nama sekolah |
| jenjang | Enum (SD, SMP, SMA) | Ya | Jenjang sekolah |
| logoUrl / logoBlob | Referensi gambar | Tidak (PRO only) | Logo sekolah untuk laporan PRO |
| alamat | Teks | Tidak | Alamat sekolah (opsional, untuk kop laporan) |
| dibuatPada | Timestamp | Ya | Waktu data dibuat |
| diubahPada | Timestamp | Ya | Waktu data terakhir diubah |

### 3.2 Guru (Teacher/User)

| Atribut | Tipe Data | Wajib | Deskripsi |
|---|---|---|---|
| id | Identifier unik | Ya | ID lokal guru/pengguna |
| nama | Teks | Ya | Nama guru |
| email | Teks | Ya (untuk aktivasi PRO) | Digunakan sebagai identitas lisensi |
| sekolahId | Referensi ke Sekolah | Ya | Relasi ke entitas Sekolah |
| tier | Enum (FREE, PRO) | Ya | Status tier pengguna saat ini |
| dibuatPada | Timestamp | Ya | — |
| diubahPada | Timestamp | Ya | — |

### 3.3 TahunAjaran (AcademicYear)

| Atribut | Tipe Data | Wajib | Deskripsi |
|---|---|---|---|
| id | Identifier unik | Ya | — |
| label | Teks | Ya | Contoh: "2026/2027" |
| tanggalMulai | Tanggal | Ya | Awal tahun ajaran |
| tanggalSelesai | Tanggal | Ya | Akhir tahun ajaran |
| semesterAktif | Enum (Ganjil, Genap) | Ya | Semester yang sedang berjalan |
| guruId | Referensi ke Guru | Ya | Pemilik data |

### 3.4 Kelas (Classroom)

| Atribut | Tipe Data | Wajib | Deskripsi |
|---|---|---|---|
| id | Identifier unik | Ya | — |
| nama | Teks | Ya | Contoh: "Kelas 4B" |
| tahunAjaranId | Referensi ke TahunAjaran | Ya | — |
| guruId | Referensi ke Guru | Ya | Pemilik/pengelola kelas |
| dibuatPada | Timestamp | Ya | — |
| diubahPada | Timestamp | Ya | — |
| statusAktif | Boolean | Ya | Menandai kelas masih aktif/diarsipkan |

**Aturan Bisnis:** Jumlah Kelas dengan `statusAktif = true` milik 1 Guru dengan `tier = FREE` dibatasi maksimal 1. Validasi ini dilakukan di layer Repository, bukan di layer database mentah.

### 3.5 Siswa (Student)

| Atribut | Tipe Data | Wajib | Deskripsi |
|---|---|---|---|
| id | Identifier unik | Ya | — |
| kelasId | Referensi ke Kelas | Ya | — |
| nama | Teks | Ya | Nama lengkap siswa |
| nisn | Teks | Tidak | Nomor Induk Siswa Nasional (opsional, untuk pencocokan saat Import Update Excel) |
| jenisKelamin | Enum (L, P) | Tidak | Opsional |
| urutan | Angka | Ya | Urutan tampil di daftar presensi (mengikuti urutan absen) |
| statusAktif | Boolean | Ya | Soft-delete: siswa pindah/keluar diset false, bukan dihapus permanen |
| dibuatPada | Timestamp | Ya | — |
| diubahPada | Timestamp | Ya | — |

### 3.6 SesiPresensi (AttendanceSession)

| Atribut | Tipe Data | Wajib | Deskripsi |
|---|---|---|---|
| id | Identifier unik | Ya | — |
| kelasId | Referensi ke Kelas | Ya | — |
| tanggal | Tanggal | Ya | Tanggal sesi presensi (unik per kelas per tanggal) |
| dibuatPada | Timestamp | Ya | — |
| diubahPada | Timestamp | Ya | Diperbarui setiap kali ada perubahan record presensi di dalamnya |

**Aturan Bisnis:** Kombinasi (`kelasId`, `tanggal`) harus unik. Saat guru membuka tanggal yang belum punya sesi, sistem otomatis membuat SesiPresensi baru beserta RecordPresensi untuk seluruh siswa aktif berstatus Hadir.

### 3.7 RecordPresensi (AttendanceRecord)

| Atribut | Tipe Data | Wajib | Deskripsi |
|---|---|---|---|
| id | Identifier unik | Ya | — |
| sesiId | Referensi ke SesiPresensi | Ya | — |
| siswaId | Referensi ke Siswa | Ya | — |
| status | Enum (H, S, I, A) | Ya | Status kehadiran; default H |
| catatan | Teks | Tidak | Catatan opsional (misal alasan izin) |
| diubahPada | Timestamp | Ya | Dipakai untuk resolusi konflik sinkronisasi |

**Aturan Bisnis:** Kombinasi (`sesiId`, `siswaId`) harus unik — satu siswa hanya punya satu status per sesi presensi.

### 3.8 KalenderAkademik (AcademicCalendarEntry)

| Atribut | Tipe Data | Wajib | Deskripsi |
|---|---|---|---|
| id | Identifier unik | Ya | — |
| tahunAjaranId | Referensi ke TahunAjaran | Ya | — |
| tanggal | Tanggal | Ya | — |
| jenis | Enum (HariLibur, HariEfektif) | Ya | Menentukan apakah tanggal dihitung dalam rekap |
| keterangan | Teks | Tidak | Contoh: "Libur Hari Raya" |
| sumber | Enum (Bawaan, Kustom) | Ya | Bawaan = diisi otomatis sistem; Kustom = diedit guru (PRO) |

**Aturan Bisnis:** Entri dengan `sumber = Bawaan` dapat dilihat oleh semua tier, tetapi hanya dapat diedit/ditambah/dihapus oleh pengguna dengan `tier = PRO`.

### 3.9 Lisensi (License)

| Atribut | Tipe Data | Wajib | Deskripsi |
|---|---|---|---|
| id | Identifier unik | Ya | — |
| guruId | Referensi ke Guru | Ya | — |
| emailAktivasi | Teks | Ya | Email yang digunakan untuk aktivasi |
| kodeLisensi | Teks | Ya | Kode lisensi PRO |
| tanggalAktivasi | Timestamp | Ya | — |
| tanggalBerakhir | Timestamp | Ya | tanggalAktivasi + 1 tahun |
| statusLisensi | Enum (Aktif, Kedaluwarsa, Dibatalkan) | Ya | — |

### 3.10 BackupMeta (BackupRecord)

| Atribut | Tipe Data | Wajib | Deskripsi |
|---|---|---|---|
| id | Identifier unik | Ya | — |
| guruId | Referensi ke Guru | Ya | — |
| jenis | Enum (Lokal, Cloud) | Ya | — |
| dibuatPada | Timestamp | Ya | — |
| ukuranData | Angka (opsional) | Tidak | Untuk informasi ke pengguna |

---

## 4. Diagram Relasi (Deskripsi Tekstual)

```
Sekolah (1) ──── (N) Guru
Guru (1) ──── (N) TahunAjaran
TahunAjaran (1) ──── (N) Kelas
Guru (1) ──── (N) Kelas
Kelas (1) ──── (N) Siswa
Kelas (1) ──── (N) SesiPresensi
SesiPresensi (1) ──── (N) RecordPresensi
Siswa (1) ──── (N) RecordPresensi
TahunAjaran (1) ──── (N) KalenderAkademik
Guru (1) ──── (1) Lisensi (aktif pada satu waktu)
Guru (1) ──── (N) BackupMeta
```

---

## 5. Strategi Penyimpanan per Tier

| Tier | Lokasi Penyimpanan |
|---|---|
| FREE | Dexie (IndexedDB) di perangkat — satu-satunya penyimpanan, tidak ada salinan di cloud |
| PRO | Dexie (IndexedDB) sebagai cache lokal utama + Convex sebagai penyimpanan cloud yang disinkronkan dua arah |

**Alasan pendekatan ini:** Pengguna PRO tetap harus bisa bekerja offline (misalnya saat sinyal hilang di kelas), sehingga Dexie tetap menjadi lapisan kerja utama bahkan untuk PRO. Convex hanya berperan sebagai lapisan sinkronisasi dan backup, bukan satu-satunya tempat data hidup. Ini menjaga konsistensi dengan prinsip Offline First yang berlaku untuk semua tier.

---

## 6. Strategi Sinkronisasi & Resolusi Konflik (PRO)

### 6.1 Mekanisme Sinkronisasi

1. Setiap perubahan pada entitas yang disinkronkan (Kelas, Siswa, SesiPresensi, RecordPresensi, KalenderAkademik kustom) mencatat `diubahPada` (timestamp) secara lokal.
2. Saat device PRO kembali online, seluruh perubahan dengan `diubahPada` lebih baru dari `lastSyncedAt` lokal dikirim ke Convex.
3. Convex mengembalikan perubahan dari device lain yang belum ada di lokal.

### 6.2 Aturan Resolusi Konflik

| Skenario Konflik | Strategi Resolusi | Alasan |
|---|---|---|
| Dua device mengubah status RecordPresensi yang sama pada siswa & tanggal yang sama | Last-Write-Wins berdasarkan `diubahPada` terbaru | Presensi adalah status sesaat; perubahan terakhir paling mungkin mencerminkan kondisi sebenarnya |
| Satu device menambah siswa baru, device lain mengedit siswa lama secara bersamaan | Merge non-destruktif — kedua perubahan disimpan karena menyentuh record berbeda | Tidak ada konflik nyata pada level data |
| Satu device menghapus (soft-delete) siswa, device lain menambahkan RecordPresensi untuk siswa tersebut | RecordPresensi tetap disimpan sebagai data historis; status siswa tetap soft-deleted untuk tampilan ke depan | Mencegah kehilangan riwayat presensi historis |
| Konflik pada KalenderAkademik kustom (entri yang sama diedit beda device) | Last-Write-Wins berdasarkan `diubahPada` | Konsisten dengan pendekatan umum di atas, karena dampaknya kecil dan jarang terjadi |

### 6.3 Indikator ke Pengguna

Sistem harus menampilkan indikator status sinkronisasi sederhana (misalnya: "Tersinkron", "Menunggu koneksi", "Menyinkronkan...") agar guru tidak bingung apakah data sudah aman di cloud atau belum.

---

## 7. Aturan Import & Update Excel

| Aturan | Deskripsi |
|---|---|
| Kolom wajib | Nama siswa |
| Kolom opsional | NISN, Jenis Kelamin, Urutan absen |
| Pencocokan saat Import Update (PRO) | Diutamakan berdasarkan NISN jika tersedia; jika tidak tersedia, dicocokkan berdasarkan kombinasi nama persis sama dalam kelas yang sama |
| Siswa baru hasil Import Update | Ditambahkan sebagai entri baru dengan `statusAktif = true` |
| Siswa yang tidak ditemukan lagi di file Excel baru | Tidak otomatis dihapus — sistem menampilkan daftar perbandingan dan meminta konfirmasi guru sebelum mengubah status menjadi tidak aktif |

---

## 8. Aturan Backup

| Jenis Backup | Isi | Format |
|---|---|---|
| Backup Lokal (FREE & PRO) | Seluruh data milik guru yang login (Sekolah, TahunAjaran, Kelas, Siswa, SesiPresensi, RecordPresensi, KalenderAkademik kustom) | Satu file backup terenkapsulasi yang dapat dipulihkan kembali ke aplikasi |
| Backup Cloud (PRO) | Sama seperti Backup Lokal, namun disimpan otomatis di Convex dan dapat dipulihkan dari device manapun setelah login dengan email yang sama |

**Acceptance Criteria Backup:**
- Restore dari Backup Lokal harus menghasilkan data yang identik dengan kondisi saat backup dibuat.
- Restore dari Backup Cloud harus tersedia meski dilakukan dari device yang berbeda dari device pembuat backup, sepanjang menggunakan akun/email yang sama.

---

## 9. Acceptance Criteria — Dokumen Ini

- [x] Seluruh entitas utama didefinisikan dengan atribut, tipe data konseptual, dan relasi.
- [x] Aturan bisnis kunci (batas 1 kelas FREE, keunikan sesi presensi, dsb.) didokumentasikan di level data.
- [x] Strategi sinkronisasi dan resolusi konflik untuk PRO didefinisikan secara eksplisit.
- [x] Aturan import/update Excel dan backup didokumentasikan agar konsisten dengan PRD.
- [x] Tidak ada kode/schema teknis aktual — seluruhnya bersifat spesifikasi konseptual.

---

## 10. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Final |
| Dokumen Terkait | `01_PRD.md`, `00_MasterContext.md`, `07_TechStack.md` |
| Dokumen Berikutnya | `05_UserFlow.md` |
