# 08_CodingGuideline.md

## Coding Guideline Document — Bantu Guru Yuk | Presensi Siswa

> Dokumen ini berisi standar penulisan kode untuk tim developer (manusia maupun AI assistant) yang akan mengimplementasikan produk ini. Dokumen ini menjelaskan **aturan dan prinsip**, bukan contoh kode aktual — implementasi nyata dikerjakan terpisah di luar dokumentasi ini.

---

## 1. Prinsip Umum

| Prinsip | Penjelasan |
|---|---|
| Konsistensi di atas preferensi pribadi | Seluruh kode harus mengikuti konvensi yang disepakati di dokumen ini, terlepas dari preferensi gaya penulisan masing-masing developer. |
| Repository Pattern wajib di seluruh akses data | Tidak ada komponen UI yang boleh memanggil Dexie atau Convex secara langsung; semua akses data harus melalui lapisan repository. |
| Kode harus mudah dibaca oleh developer baru | Penamaan dan struktur harus jelas tanpa perlu penjelasan tambahan dari penulis aslinya. |
| Offline First diutamakan di setiap keputusan teknis | Setiap fungsi yang berinteraksi dengan data harus dirancang agar bekerja tanpa internet sebagai kondisi normal, bukan kondisi pengecualian. |
| Tidak ada logika bisnis di dalam komponen tampilan (UI) | Komponen UI hanya bertanggung jawab menampilkan data dan menangkap interaksi pengguna; logika bisnis (validasi, aturan tier, kalkulasi rekap) berada di lapisan terpisah. |

---

## 2. Struktur Lapisan Aplikasi (Layering)

| Lapisan | Tanggung Jawab |
|---|---|
| Lapisan Tampilan (UI Layer) | Komponen visual, menampilkan data, menangkap input pengguna |
| Lapisan Logika Bisnis (Domain/Service Layer) | Aturan bisnis seperti batas 1 kelas FREE, perhitungan rekap, validasi import Excel |
| Lapisan Repository (Data Access Layer) | Antarmuka tunggal untuk membaca/menulis data, menyembunyikan detail apakah data berasal dari Dexie atau Convex |
| Lapisan Penyimpanan (Storage Layer) | Implementasi aktual Dexie (lokal) dan Convex (cloud) |

**Aturan Arah Dependensi:** Lapisan Tampilan hanya boleh memanggil Lapisan Logika Bisnis. Lapisan Logika Bisnis hanya boleh memanggil Lapisan Repository. Lapisan Repository adalah satu-satunya lapisan yang mengetahui detail Dexie/Convex. Tidak boleh ada arah panggilan yang melompati urutan ini (misalnya UI memanggil Repository langsung).

---

## 3. Konvensi Penamaan

| Jenis | Konvensi | Contoh Konseptual |
|---|---|---|
| Entitas data | Kata benda tunggal, jelas | Siswa, SesiPresensi, RecordPresensi |
| Fungsi pengambilan data | Diawali kata yang menunjukkan aksi baca | "ambilDaftarSiswaPerKelas", "ambilRekapBulanan" |
| Fungsi penulisan data | Diawali kata yang menunjukkan aksi tulis | "simpanStatusPresensi", "buatSesiPresensiBaru" |
| Fungsi validasi | Diawali kata yang menunjukkan pengecekan | "validasiFormatExcel", "validasiBatasKelasFree" |
| Konstanta status | Nama eksplisit, tidak disingkat berlebihan dalam kode (singkatan H/S/I/A hanya untuk tampilan, bukan untuk nama variabel internal) | "STATUS_HADIR", "STATUS_SAKIT", "STATUS_IZIN", "STATUS_ALPHA" |

**Alasan:** Penamaan yang jelas dan konsisten mengurangi kebutuhan dokumentasi inline yang berlebihan dan mempercepat onboarding developer baru maupun AI assistant yang membantu pengembangan di sesi berikutnya.

---

## 4. Aturan Penanganan Data Offline-First

| Aturan | Penjelasan |
|---|---|
| Setiap operasi tulis data harus berhasil secara lokal terlebih dahulu | Operasi tulis tidak boleh menunggu konfirmasi dari Convex sebelum dianggap berhasil bagi pengguna. |
| Sinkronisasi ke Convex berjalan di latar belakang (background) | Pengguna tidak boleh diblokir oleh proses sinkronisasi yang sedang berjalan. |
| Kegagalan sinkronisasi tidak boleh menghasilkan error yang mengganggu alur presensi | Kegagalan hanya ditampilkan melalui indikator status sinkronisasi (lihat `06_DesignSystem.md` Bagian 4.4), bukan dialog blocking. |
| Setiap entitas yang disinkronkan harus memiliki identitas unik yang dibuat secara lokal (bukan bergantung pada ID yang diberikan server) | Mencegah konflik ID saat data dibuat secara offline di beberapa device sebelum tersinkron. |

---

## 5. Aturan Validasi & Aturan Bisnis

| Aturan | Lapisan yang Bertanggung Jawab |
|---|---|
| Batas 1 kelas aktif untuk tier FREE | Lapisan Logika Bisnis, divalidasi sebelum memanggil Repository untuk membuat kelas baru |
| Keunikan kombinasi (kelasId, tanggal) pada SesiPresensi | Lapisan Logika Bisnis, dicek sebelum membuat sesi baru |
| Keunikan kombinasi (sesiId, siswaId) pada RecordPresensi | Lapisan Logika Bisnis |
| Validasi format file Excel saat import | Lapisan Logika Bisnis, dengan pesan error yang harus diteruskan dalam bahasa yang dipahami pengguna (lihat `06_DesignSystem.md` Bagian 6) |
| Validasi kode lisensi PRO | Lapisan Logika Bisnis, mengikuti mekanisme aktivasi BGY yang sudah ada |

**Aturan Umum:** Validasi aturan bisnis tidak boleh diduplikasi secara berbeda antara komponen UI yang berbeda. Setiap aturan bisnis hanya memiliki satu implementasi sumber kebenaran di Lapisan Logika Bisnis, dipanggil dari mana pun dibutuhkan.

---

## 6. Aturan Penanganan Error

| Aturan | Penjelasan |
|---|---|
| Setiap error yang berpotensi terlihat pengguna harus memiliki pesan dalam Bahasa Indonesia yang jelas | Tidak boleh menampilkan pesan error teknis mentah ke pengguna akhir. |
| Error teknis tetap dicatat secara internal (logging) untuk keperluan debugging | Detail teknis disembunyikan dari pengguna namun tetap tersedia bagi developer. |
| Kegagalan jaringan tidak boleh dianggap sebagai kegagalan aplikasi | Karena prinsip Offline First, kegagalan jaringan adalah kondisi yang diharapkan dan harus ditangani secara graceful, bukan sebagai exception yang menghentikan alur. |

---

## 7. Aturan Pengujian (Testing Principles)

| Area | Pedoman Pengujian |
|---|---|
| Lapisan Logika Bisnis | Harus diuji secara terisolasi tanpa bergantung pada implementasi nyata Dexie/Convex (menggunakan repository tiruan/mock) |
| Aturan bisnis kritis | Batas kelas FREE, keunikan sesi presensi, resolusi konflik sinkronisasi harus memiliki skenario uji eksplisit |
| Alur presensi inti | Harus diuji untuk memastikan target waktu pengisian (< 30 detik) tidak terdegradasi oleh penambahan fitur baru di masa depan |
| Mode offline | Setiap fitur tier FREE harus diuji dalam kondisi simulasi tanpa koneksi internet |

---

## 8. Aturan Penambahan Fitur Baru

| Aturan | Penjelasan |
|---|---|
| Fitur baru tidak boleh melanggar prinsip inti di `00_MasterContext.md` | Setiap usulan fitur harus dicek terhadap daftar frozen di `02_FrozenSummary.md` sebelum dikerjakan. |
| Fitur baru yang memengaruhi struktur data harus diperbarui dahulu di `04_Database.md` | Dokumentasi data harus selalu menjadi acuan sebelum implementasi, bukan sebaliknya. |
| Fitur baru yang memengaruhi tampilan harus mengikuti `06_DesignSystem.md` | Tidak boleh ada komponen baru yang menyimpang dari sistem warna status atau pola interaksi yang sudah ditetapkan. |
| Perubahan terhadap keputusan frozen harus dicatat di `13_ChangeLog.md` | Tidak ada perubahan diam-diam terhadap keputusan yang sudah dibekukan. |

---

## 9. Acceptance Criteria — Dokumen Ini

- [x] Struktur lapisan aplikasi (UI, Logika Bisnis, Repository, Storage) didefinisikan dengan arah dependensi yang jelas.
- [x] Konvensi penamaan dijelaskan secara konseptual tanpa contoh kode aktual.
- [x] Aturan offline-first, validasi, error handling, dan testing didokumentasikan secara eksplisit.
- [x] Aturan penambahan fitur baru terhubung secara jelas ke dokumen lain (MasterContext, FrozenSummary, Database, DesignSystem, ChangeLog).

---

## 10. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Final |
| Dokumen Terkait | `07_TechStack.md`, `04_Database.md`, `02_FrozenSummary.md` |
| Dokumen Berikutnya | `09_Roadmap.md` |
