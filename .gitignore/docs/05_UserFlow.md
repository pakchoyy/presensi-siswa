# 05_UserFlow.md

## User Flow Document — Bantu Guru Yuk | Presensi Siswa

> Dokumen ini mendeskripsikan seluruh alur penggunaan aplikasi dari sudut pandang pengguna, end-to-end, dalam bentuk langkah-langkah naratif dan tabel. Tidak ada kode atau wireframe teknis — fokus pada urutan interaksi dan keputusan pengguna.

---

## 1. Peta Alur Tingkat Tinggi

```
[Buka Aplikasi Pertama Kali]
        │
        ▼
[Wizard Setup Tahun Ajaran] ── (sekali, atau saat tahun ajaran baru)
        │
        ▼
[Dashboard / Pilih Kelas]
        │
        ├──► [Presensi Harian] ◄── alur paling sering dipakai
        │
        ├──► [Manajemen Siswa]
        │
        ├──► [Rekap Bulanan / Semester]
        │
        ├──► [Export PDF/Excel]
        │
        ├──► [Backup / Restore]
        │
        └──► [Pengaturan & Lisensi PRO]
```

---

## 2. Alur 1 — Onboarding & Wizard Setup Tahun Ajaran

| Langkah | Aksi Pengguna | Respons Sistem |
|---|---|---|
| 1 | Membuka aplikasi untuk pertama kali (install PWA atau buka di browser) | Sistem mendeteksi belum ada data → menampilkan Wizard Setup |
| 2 | Mengisi nama sekolah dan jenjang (SD/SMP/SMA) | Sistem menyimpan sementara di state wizard |
| 3 | Mengisi nama guru dan email (email digunakan kelak untuk aktivasi PRO) | Sistem memvalidasi format email |
| 4 | Memilih/konfirmasi tahun ajaran (default: tahun ajaran berjalan berdasarkan tanggal hari ini) | Sistem otomatis mengisi Kalender Akademik bawaan untuk tahun ajaran tersebut |
| 5 | Mengisi nama kelas pertama (contoh: "Kelas 3A") | Sistem membuat entitas Kelas pertama |
| 6 | Memilih metode pengisian siswa: Import Excel atau Input Manual | Sistem menampilkan form sesuai pilihan |
| 6a | (Jika Import Excel) Mengunggah file Excel | Sistem memvalidasi format, menampilkan pratinjau daftar siswa untuk dikonfirmasi |
| 6b | (Jika Input Manual) Mengetik nama siswa satu per satu | Sistem menyimpan setiap nama yang ditambahkan |
| 7 | Menekan tombol "Selesai" | Sistem menyimpan seluruh data wizard dan mengarahkan ke Dashboard |

**Target Waktu Total:** < 3 menit untuk pengguna baru dengan ±30 siswa via Import Excel.

**Acceptance Criteria:**
- Wizard tidak dapat dilewati (skip) tanpa menyelesaikan minimal: 1 sekolah, 1 guru, 1 tahun ajaran, 1 kelas, minimal 1 siswa.
- Setelah wizard selesai, pengguna langsung diarahkan ke Dashboard, bukan ke halaman kosong.

---

## 3. Alur 2 — Presensi Harian (Alur Inti / Paling Sering Dipakai)

| Langkah | Aksi Pengguna | Respons Sistem | Estimasi Waktu |
|---|---|---|---|
| 1 | Membuka aplikasi (sudah dalam keadaan login/tersetup) | Sistem menampilkan Dashboard dengan kelas yang dikelola | < 2 detik |
| 2 | Memilih kelas (jika lebih dari 1 kelas / tier PRO) | Sistem membuka halaman Presensi untuk kelas tersebut | < 1 detik |
| 3 | Sistem otomatis menampilkan tanggal hari ini | Seluruh siswa dalam kelas tersebut ditampilkan dengan status default **Hadir** | Instan |
| 4 | Guru meninjau daftar siswa secara visual | — | 5–10 detik |
| 5 | Guru mengetuk nama siswa yang tidak hadir normal | Sistem menampilkan opsi status: Sakit / Izin / Alpha | < 1 detik per siswa |
| 6 | Guru memilih status yang sesuai | Sistem langsung menyimpan (auto-save), tidak ada tombol "Simpan" terpisah yang wajib ditekan | Instan |
| 7 | Mengulangi langkah 5–6 untuk siswa lain yang tidak hadir normal | — | Tergantung jumlah pengecualian |
| 8 | Presensi selesai — guru menutup aplikasi atau pindah ke kelas lain | Data tersimpan permanen secara lokal | — |

**Target Waktu Total:** < 30 detik untuk kelas ±30 siswa dengan 0–5 pengecualian.

**Acceptance Criteria:**
- Tidak ada langkah wajib yang mengharuskan guru mengonfirmasi status Hadir satu per satu.
- Mengubah status 1 siswa membutuhkan maksimal 2 ketukan (tap nama → pilih status).
- Presensi tetap dapat diisi meski perangkat dalam mode pesawat/tanpa internet.
- Jika guru membuka kembali tanggal yang sama di hari yang sama, data yang sudah diisi sebelumnya tetap tampil (tidak ter-reset ke default Hadir lagi).

### 3.1 Sub-Alur — Mengedit Presensi Hari Sebelumnya

| Langkah | Aksi Pengguna | Respons Sistem |
|---|---|---|
| 1 | Guru memilih navigasi tanggal (mundur ke hari sebelumnya) dalam tahun ajaran yang sama | Sistem menampilkan data presensi tanggal tersebut sesuai yang tersimpan |
| 2 | Guru mengubah status salah satu siswa | Sistem menyimpan perubahan dan memperbarui rekap terkait secara otomatis |

---

## 4. Alur 3 — Manajemen Siswa & Kelas

### 4.1 Menambah Siswa Manual

| Langkah | Aksi Pengguna | Respons Sistem |
|---|---|---|
| 1 | Membuka menu "Kelola Siswa" pada kelas tertentu | Sistem menampilkan daftar siswa aktif |
| 2 | Menekan "Tambah Siswa" | Sistem menampilkan form nama (+ field opsional) |
| 3 | Mengisi nama dan menyimpan | Siswa baru langsung muncul di urutan presensi |

### 4.2 Import Excel (Setup Awal / Kelas Baru)

| Langkah | Aksi Pengguna | Respons Sistem |
|---|---|---|
| 1 | Menekan "Import Excel" | Sistem menampilkan opsi unduh template & unggah file |
| 2 | Mengunggah file Excel | Sistem memvalidasi format dan menampilkan pratinjau |
| 3 | Jika ada error format | Sistem menampilkan pesan spesifik (misal: "Baris 5 tidak memiliki nama siswa") |
| 4 | Mengonfirmasi pratinjau | Sistem menyimpan seluruh siswa ke kelas terkait |

### 4.3 Import Update Excel (PRO — Memperbarui Daftar Siswa)

| Langkah | Aksi Pengguna | Respons Sistem |
|---|---|---|
| 1 | Menekan "Import Update Excel" pada kelas yang sudah memiliki siswa | Sistem menampilkan opsi unggah file Excel baru |
| 2 | Mengunggah file Excel terbaru | Sistem mencocokkan data berdasarkan NISN/nama dan menampilkan ringkasan perbandingan: siswa baru, siswa yang cocok, siswa yang tidak ditemukan lagi |
| 3 | Meninjau ringkasan | Guru dapat memilih menandai siswa yang tidak ditemukan sebagai "Tidak Aktif" atau membiarkannya tetap aktif |
| 4 | Mengonfirmasi | Sistem menerapkan perubahan: menambah siswa baru, memperbarui data yang cocok, menonaktifkan yang dipilih |

### 4.4 Membuat Kelas Baru (PRO) / Mencoba Membuat Kelas Baru (FREE)

| Langkah | Aksi Pengguna | Respons Sistem (PRO) | Respons Sistem (FREE) |
|---|---|---|---|
| 1 | Menekan "Tambah Kelas" | Sistem menampilkan form kelas baru | Sistem menampilkan prompt upgrade PRO dengan penjelasan fitur, bukan error generik |

---

## 5. Alur 4 — Rekap & Export Laporan

| Langkah | Aksi Pengguna | Respons Sistem |
|---|---|---|
| 1 | Membuka menu "Rekap" | Sistem menampilkan pilihan: Rekap Bulanan atau Rekap Semester |
| 2 | Memilih Rekap Bulanan dan memilih bulan/kelas | Sistem menghitung otomatis dari data SesiPresensi & RecordPresensi bulan tersebut, menampilkan ringkasan per siswa (Hadir/Sakit/Izin/Alpha) |
| 3 | Memilih Rekap Semester | Sistem menghitung berdasarkan rentang semester aktif sesuai Kalender Akademik |
| 4 | Menekan "Export PDF" atau "Export Excel" | Sistem menghasilkan file sesuai format, menyertakan Logo Sekolah jika tier PRO |
| 5 | Mengunduh/membagikan file | Sistem menyediakan file melalui mekanisme unduh/share standar browser/PWA |

**Acceptance Criteria:**
- Rekap tidak memerlukan input manual ulang — seluruhnya dihitung dari data presensi harian yang sudah ada.
- Export tersedia tanpa koneksi internet (data lokal sudah cukup untuk menghasilkan PDF/Excel).

---

## 6. Alur 5 — Backup & Restore

### 6.1 Backup Lokal (FREE & PRO)

| Langkah | Aksi Pengguna | Respons Sistem |
|---|---|---|
| 1 | Membuka menu "Backup & Restore" | Sistem menampilkan opsi "Buat Backup Lokal" |
| 2 | Menekan "Buat Backup Lokal" | Sistem menghasilkan file backup dan memicu unduhan/share file melalui browser |
| 3 | (Di waktu lain) Menekan "Restore dari Backup Lokal" dan memilih file | Sistem memvalidasi file, menampilkan konfirmasi sebelum menimpa data yang ada, lalu memulihkan data |

### 6.2 Backup & Sync Cloud (PRO)

| Langkah | Aksi Pengguna | Respons Sistem |
|---|---|---|
| 1 | Mengaktifkan "Cloud Sync" di pengaturan | Sistem mulai menyinkronkan data lokal ke Convex menggunakan email akun PRO |
| 2 | Login di device kedua dengan email yang sama | Sistem menarik data dari Convex dan menggabungkannya dengan data lokal device kedua (jika ada) |
| 3 | Menekan "Backup Cloud" secara manual (opsional, di luar sync otomatis) | Sistem menyimpan snapshot tambahan ke Convex |
| 4 | Menekan "Restore Cloud" | Sistem menampilkan daftar snapshot/backup tersedia dan memulihkan sesuai pilihan |

---

## 7. Alur 6 — Aktivasi Lisensi PRO

| Langkah | Aksi Pengguna | Respons Sistem |
|---|---|---|
| 1 | Mengetuk prompt upgrade atau membuka menu "Upgrade ke PRO" | Sistem menampilkan halaman informasi harga (Rp10.000/tahun) dan manfaat |
| 2 | Melakukan pembayaran melalui kanal yang disediakan (di luar lingkup teknis aplikasi ini) | Guru menerima kode lisensi melalui email |
| 3 | Memasukkan kode lisensi & email di aplikasi | Sistem memvalidasi kode (lokal/online sesuai mekanisme BGY yang sudah ada) |
| 4 | Validasi berhasil | Sistem mengubah status tier pengguna menjadi PRO dan membuka seluruh fitur PRO secara langsung tanpa perlu reinstall |

---

## 8. Alur 7 — Pengaturan Kalender Akademik

| Langkah | Aksi Pengguna | Respons Sistem (FREE) | Respons Sistem (PRO) |
|---|---|---|---|
| 1 | Membuka menu "Kalender Akademik" | Menampilkan kalender bawaan, hanya bisa dilihat | Menampilkan kalender bawaan, dapat diedit |
| 2 | Mencoba menambah/mengedit hari libur kustom | Menampilkan prompt upgrade PRO | Sistem menyimpan entri baru/perubahan ke KalenderAkademik |

---

## 9. Skenario Edge Case Penting

| Skenario | Perilaku yang Diharapkan |
|---|---|
| Guru membuka aplikasi tanpa internet sama sekali sejak instalasi (PRO, belum pernah sync) | Aplikasi tetap berfungsi penuh menggunakan data lokal; status sync menampilkan "Menunggu koneksi" |
| Guru FREE mencoba Import Excel dengan file kosong/format salah | Sistem menampilkan pesan error spesifik tanpa menghapus data yang sudah ada |
| Guru PRO menghapus siswa di satu device saat device lain offline sedang mengisi presensi siswa tersebut | RecordPresensi yang sudah dibuat tetap tersimpan sebagai data historis; siswa ditandai tidak aktif setelah sinkronisasi (lihat `04_Database.md` Bagian 6.2) |
| Lisensi PRO kedaluwarsa | Sistem mengubah tier kembali ke FREE, namun data kelas lebih dari 1 yang sudah ada tetap tersimpan dan dapat dilihat (read-only untuk kelas ke-2 dst.) sampai guru memperpanjang lisensi |

---

## 10. Acceptance Criteria — Dokumen Ini

- [x] Seluruh alur utama (onboarding, presensi, manajemen siswa, rekap, backup, lisensi, kalender) terdokumentasi langkah demi langkah.
- [x] Setiap alur inti menyertakan estimasi waktu atau acceptance criteria yang dapat diuji.
- [x] Perbedaan perilaku FREE vs PRO dijelaskan secara eksplisit pada setiap alur yang relevan.
- [x] Skenario edge case penting (offline, error, kedaluwarsa lisensi) didokumentasikan.

---

## 11. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Final |
| Dokumen Terkait | `01_PRD.md`, `04_Database.md`, `06_DesignSystem.md` |
| Dokumen Berikutnya | `06_DesignSystem.md` |
