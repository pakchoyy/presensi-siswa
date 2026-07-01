# 06_DesignSystem.md

## Design System Document — Bantu Guru Yuk | Presensi Siswa

> Dokumen ini mendefinisikan sistem desain visual dan interaksi aplikasi. Berlaku sebagai acuan untuk konsistensi UI di seluruh halaman, tanpa menyertakan kode implementasi (Tailwind class, komponen React, dsb. didetailkan terpisah saat eksekusi teknis).

---

## 1. Filosofi Desain

| Prinsip | Penjelasan |
|---|---|
| Kejelasan di atas keindahan | Guru harus langsung mengerti apa yang harus dilakukan tanpa berpikir, bahkan saat lelah mengajar sepanjang hari. |
| Target ketuk besar (thumb-friendly) | Semua elemen interaktif dirancang untuk ditekan dengan satu jempol sambil berdiri/berjalan di kelas. |
| Warna sebagai bahasa status | Status kehadiran dikomunikasikan melalui warna yang konsisten, bukan hanya teks, agar dapat dipahami sekilas. |
| Minim teks, maksimal makna | Label singkat dan ikon yang jelas, menghindari istilah teknis/asing. |
| Konsisten dengan identitas BGY | Mewarisi nuansa visual berani dan hangat dari ekosistem Bantu Guru Yuk, namun tetap fungsional untuk konteks presensi yang serius. |

---

## 2. Palet Warna

### 2.1 Warna Status Kehadiran (Wajib Konsisten di Seluruh Aplikasi)

| Status | Warna Acuan | Alasan Pemilihan |
|---|---|---|
| Hadir (H) | Hijau | Hijau secara universal dipahami sebagai "baik/normal" di konteks Indonesia |
| Sakit (S) | Kuning/Oranye | Menandakan perhatian tanpa kesan negatif berat |
| Izin (I) | Biru | Netral, menandakan ketidakhadiran yang sah/terencana |
| Alpha (A) | Merah | Menandakan ketidakhadiran tanpa keterangan, perlu perhatian guru |

### 2.2 Warna Brand & Netral

| Peran | Deskripsi |
|---|---|
| Warna Primer Brand | Mengikuti identitas visual Bantu Guru Yuk yang sudah ada di tools lain (warna hangat, berani, mudah dikenali) |
| Warna Latar | Netral terang untuk kenyamanan baca di luar ruangan/cahaya kelas yang bervariasi |
| Warna Teks Utama | Kontras tinggi terhadap latar agar terbaca jelas di bawah sinar matahari pada layar HP |
| Warna Aksen PRO | Warna pembeda khusus (misalnya warna emas/ungu) untuk menandai fitur/badge PRO secara visual, agar guru FREE mudah mengenali fitur premium |

**Acceptance Criteria Warna:**
- Kontras warna teks terhadap latar harus memenuhi standar keterbacaan minimum (rasio kontras tinggi, mendekati pedoman WCAG AA).
- Warna status kehadiran tidak boleh berubah arti atau berganti warna di halaman berbeda (presensi, rekap, export) — harus identik di seluruh aplikasi.

---

## 3. Tipografi

| Elemen | Pedoman |
|---|---|
| Jenis Huruf | Sans-serif yang mendukung keterbacaan tinggi di layar kecil |
| Ukuran Teks Nama Siswa | Cukup besar untuk dibaca sekilas tanpa harus mendekatkan HP ke mata |
| Ukuran Teks Label Status | Lebih kecil dari nama siswa, namun tetap jelas terbaca |
| Hierarki Judul Halaman | Jelas dibedakan dari konten (misalnya "Presensi — Kelas 4B — Senin, 30 Juni 2026") |
| Bahasa | Seluruh teks UI menggunakan Bahasa Indonesia yang lugas, tanpa jargon teknis ("sync", "database" dihindari di UI yang dilihat guru; gunakan istilah seperti "Sinkronisasi", "Data Tersimpan") |

---

## 4. Komponen UI Inti

### 4.1 Kartu Siswa (Student Row)

| Atribut | Deskripsi |
|---|---|
| Elemen | Nama siswa + indikator status saat ini (warna + label singkat) |
| Area Ketuk | Seluruh baris dapat diketuk, bukan hanya ikon kecil, untuk memudahkan target sentuh |
| Status Default | Hadir, ditampilkan dengan warna hijau tanpa perlu interaksi tambahan |
| Interaksi | Sekali ketuk membuka pilihan status (Sakit/Izin/Alpha/Hadir); memilih salah satu langsung menutup pilihan dan menyimpan |

### 4.2 Selector Status Cepat

| Atribut | Deskripsi |
|---|---|
| Bentuk | Tombol pilihan besar dengan warna sesuai status, muncul setelah kartu siswa diketuk |
| Jumlah Opsi | Maksimal 4 (Hadir, Sakit, Izin, Alpha) agar tidak membingungkan |
| Aksesibilitas | Setiap opsi memiliki label teks, bukan hanya warna, untuk pengguna dengan keterbatasan penglihatan warna |

### 4.3 Ringkasan Sesi Presensi

| Atribut | Deskripsi |
|---|---|
| Posisi | Bagian atas halaman presensi, selalu terlihat (sticky) |
| Isi | Jumlah Hadir / Sakit / Izin / Alpha hari itu, ter-update real-time saat guru mengubah status |
| Tujuan | Memberi konfirmasi visual cepat bahwa presensi sudah/belum lengkap |

### 4.4 Indikator Status Sinkronisasi (PRO)

| Atribut | Deskripsi |
|---|---|
| Posisi | Area kecil dan tidak mengganggu, misalnya di header |
| Status yang Ditampilkan | "Tersinkron", "Menunggu koneksi", "Menyinkronkan..." |
| Prinsip | Tidak boleh memblokir interaksi presensi meski status sinkronisasi gagal — presensi tetap dapat diisi secara lokal |

### 4.5 Badge Fitur PRO

| Atribut | Deskripsi |
|---|---|
| Penggunaan | Ditempatkan pada fitur yang terkunci untuk pengguna FREE (misalnya tombol "Tambah Kelas" kedua, "Logo Sekolah") |
| Interaksi | Mengetuk badge/fitur terkunci membuka halaman informasi upgrade, bukan dialog error kosong |

### 4.6 Wizard Setup

| Atribut | Deskripsi |
|---|---|
| Struktur | Langkah bertahap (step-by-step) dengan indikator progres jelas ("Langkah 2 dari 5") |
| Navigasi | Dapat kembali ke langkah sebelumnya tanpa kehilangan data yang sudah diisi |
| Tombol Aksi | Selalu terlihat di bagian bawah layar (mobile-friendly), tidak memerlukan scroll untuk menemukan tombol "Lanjut" |

### 4.7 Tabel Rekap

| Atribut | Deskripsi |
|---|---|
| Tampilan Mobile | Dapat di-scroll horizontal jika kolom terlalu banyak, dengan kolom nama siswa tetap terlihat (sticky column) |
| Ringkasan | Total per status ditampilkan jelas di akhir tabel/baris ringkasan |

---

## 5. Tata Letak (Layout) Mobile First

| Pedoman | Deskripsi |
|---|---|
| Navigasi Utama | Ditempatkan di bagian bawah layar (bottom navigation) agar mudah dijangkau jempol |
| Konten Utama | Satu kolom, tanpa sidebar, untuk seluruh halaman di mode mobile |
| Spacing | Jarak antar elemen interaktif cukup lebar untuk mencegah salah ketuk pada layar kecil |
| Mode Desktop/Tablet (Sekunder) | Layout dapat melebar dengan tambahan ruang kosong di samping konten utama, namun tidak ada redesain alur interaksi yang berbeda dari mobile |

---

## 6. Prinsip Interaksi & Feedback

| Prinsip | Deskripsi |
|---|---|
| Auto-save tanpa konfirmasi berlebihan | Setiap perubahan status langsung tersimpan; sistem hanya menampilkan indikator kecil ("Tersimpan") tanpa dialog konfirmasi yang mengganggu kecepatan |
| Undo cepat | Setelah mengubah status siswa, tersedia opsi singkat untuk membatalkan (misalnya snackbar "Status diubah — Batalkan") |
| Tidak ada loading spinner panjang untuk aksi lokal | Karena data lokal (Dexie), seluruh interaksi presensi harus terasa instan |
| Pesan error manusiawi | Pesan kesalahan (misal Import Excel gagal) ditulis dalam bahasa yang dipahami guru, bukan pesan teknis sistem |

---

## 7. Aksesibilitas

| Pedoman | Deskripsi |
|---|---|
| Ukuran target sentuh minimum | Cukup besar untuk ditekan dengan jempol tanpa salah pilih elemen di sebelahnya |
| Kontras warna | Memenuhi standar keterbacaan minimum (lihat Bagian 2.2) |
| Tidak hanya mengandalkan warna | Status kehadiran selalu disertai label teks, tidak hanya warna |
| Ukuran font dapat disesuaikan | Mengikuti pengaturan ukuran teks bawaan browser/perangkat pengguna sebisa mungkin |

---

## 8. Branding PRO (Logo Sekolah pada Laporan)

| Pedoman | Deskripsi |
|---|---|
| Penempatan Logo | Pojok kiri atas kop laporan PDF/Excel, sejajar dengan nama sekolah |
| Ukuran | Proporsional, tidak mendominasi laporan, fokus tetap pada data rekap |
| Fallback | Jika pengguna PRO belum mengunggah logo, kop laporan tetap rapi tanpa ruang kosong yang janggal |

---

## 9. Acceptance Criteria — Dokumen Ini

- [x] Filosofi desain dijelaskan dan selaras dengan prinsip Mobile First & kecepatan presensi.
- [x] Warna status kehadiran didefinisikan secara konsisten dan dijadikan acuan wajib di seluruh halaman.
- [x] Komponen UI inti (kartu siswa, selector status, ringkasan sesi, indikator sync, badge PRO, wizard, tabel rekap) didefinisikan dengan jelas.
- [x] Pedoman aksesibilitas dasar tercantum.
- [x] Tidak ada kode/markup teknis — seluruhnya bersifat pedoman desain konseptual.

---

## 10. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Final |
| Dokumen Terkait | `05_UserFlow.md`, `01_PRD.md` |
| Dokumen Berikutnya | `07_TechStack.md` |
