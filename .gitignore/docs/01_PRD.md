# 01_PRD.md

## Product Requirements Document — Bantu Guru Yuk | Presensi Siswa

> Dokumen ini mengacu pada `00_MasterContext.md`. Semua requirement di sini wajib konsisten dengan prinsip inti dan keputusan yang sudah dibekukan di dokumen tersebut.

---

## 1. Ringkasan Eksekutif

Bantu Guru Yuk | Presensi Siswa adalah aplikasi web (PWA) untuk pencatatan kehadiran siswa harian oleh guru, dirancang dengan filosofi Offline First dan Mobile First. Aplikasi menghilangkan seluruh kerumitan teknis (QR, GPS, biometrik) yang umum ada di aplikasi presensi lain, dan menggantinya dengan interaksi paling sederhana: ketuk siswa yang tidak hadir normal, pilih status, selesai.

---

## 2. Tujuan Produk (Goals)

| Tujuan | Deskripsi |
|---|---|
| G1 | Memungkinkan guru mengisi presensi 1 kelas dalam < 30 detik |
| G2 | Memastikan aplikasi 100% berfungsi tanpa koneksi internet untuk fitur inti |
| G3 | Menyediakan rekap bulanan dan semester otomatis tanpa input ulang |
| G4 | Menyediakan jalur upgrade PRO yang murah dan mudah diaktifkan |
| G5 | Mendukung multi-device dan cloud backup bagi pengguna PRO tanpa mengorbankan kesederhanaan UX |

## 3. Non-Tujuan (Non-Goals)

| Non-Tujuan | Alasan |
|---|---|
| Tidak menjadi sistem manajemen sekolah lengkap (SIM Sekolah) | Fokus produk sengaja dipersempit hanya pada presensi, agar tetap sederhana dan cepat dikembangkan maupun dipelajari pengguna |
| Tidak menjadi sistem absensi karyawan/guru | Target pengguna adalah guru sebagai pencatat, bukan guru sebagai objek presensi |
| Tidak melakukan pelacakan waktu presisi (jam masuk/keluar) | Sudah diputuskan final di MasterContext Bagian 3.1 |
| Tidak menggunakan biometrik atau lokasi | Sudah diputuskan final di MasterContext Bagian 3.1 |

---

## 4. Persona Pengguna

### 4.1 Persona Utama — "Bu Sari, Guru Kelas SD"

| Atribut | Deskripsi |
|---|---|
| Peran | Guru kelas / wali kelas SD |
| Usia | 28–50 tahun |
| Perangkat | HP Android kelas menengah/low-end |
| Konektivitas | Wi-Fi sekolah tidak stabil, sering memakai kuota pribadi |
| Kebutuhan | Mengisi presensi secepat mungkin agar bisa fokus mengajar |
| Hambatan teknis | Tidak terlalu mahir teknologi, butuh UI yang sangat jelas dan tanpa istilah teknis |
| Tujuan saat memakai aplikasi | Presensi selesai sebelum siswa mulai ribut menunggu |

### 4.2 Persona Sekunder — "Pak Budi, Wali Kelas SMP/SMA dengan Multi-Mapel"

| Atribut | Deskripsi |
|---|---|
| Peran | Guru mapel yang juga menjadi wali kelas |
| Kebutuhan tambahan | Mengelola lebih dari satu kelas (kandidat upgrade PRO) |
| Kebutuhan laporan | Rekap semester untuk dilaporkan ke kepala sekolah/dinas |

### 4.3 Persona Tersier — "Kepala Sekolah / Operator Sekolah"

| Atribut | Deskripsi |
|---|---|
| Peran | Penerima laporan rekap, kadang menjadi pembeli lisensi PRO untuk beberapa guru |
| Kebutuhan | Laporan PDF/Excel yang rapi dan bisa dibawa branding logo sekolah (fitur PRO) |

---

## 5. Functional Requirements

Notasi prioritas: **MUST** (wajib ada di rilis), **SHOULD** (sangat diinginkan), **COULD** (nice-to-have, bisa ditunda).

### 5.1 Modul Setup & Onboarding

| ID | Requirement | Prioritas |
|---|---|---|
| FR-01 | Sistem harus menyediakan Wizard Setup Tahun Ajaran saat pertama kali aplikasi dijalankan | MUST |
| FR-02 | Wizard harus meminta input: nama sekolah, nama guru, tahun ajaran, dan kelas pertama yang dikelola | MUST |
| FR-03 | Wizard harus menyediakan opsi Import Excel daftar siswa pada saat setup kelas pertama | MUST |
| FR-04 | Sistem harus menyertakan Kalender Akademik bawaan (hari libur nasional, hari efektif) yang otomatis terisi tanpa input manual | MUST |
| FR-05 | Wizard harus dapat diselesaikan dalam waktu kurang dari 3 menit oleh pengguna baru | SHOULD |

**Acceptance Criteria FR-01 s.d. FR-05:**
- Pengguna baru tidak dapat mengakses halaman presensi sebelum wizard setup selesai.
- Setelah wizard selesai, minimal 1 kelas dengan minimal 1 siswa harus sudah tercatat di database lokal.
- Kalender akademik bawaan harus sudah berisi data hari libur nasional Indonesia tahun ajaran berjalan.

### 5.2 Modul Manajemen Siswa & Kelas

| ID | Requirement | Prioritas |
|---|---|---|
| FR-10 | Sistem harus mendukung Import Excel untuk menambahkan daftar siswa ke dalam kelas | MUST |
| FR-11 | Sistem harus memvalidasi format Excel dan menampilkan pesan error yang jelas jika format tidak sesuai | MUST |
| FR-12 | Pengguna FREE hanya dapat membuat dan mengelola 1 kelas | MUST |
| FR-13 | Pengguna PRO dapat membuat kelas tanpa batas (unlimited) | MUST |
| FR-14 | Sistem harus mendukung Import Update Excel (PRO) untuk memperbarui daftar siswa tanpa menduplikasi data siswa yang sudah ada | MUST (PRO only) |
| FR-15 | Sistem harus dapat menambah, mengedit, dan menghapus data siswa secara manual tanpa Excel | MUST |

**Acceptance Criteria FR-10 s.d. FR-15:**
- Import Excel berhasil memetakan minimal kolom: Nama Siswa, NIS/NISN (opsional), Jenis Kelamin (opsional).
- Saat pengguna FREE mencoba membuat kelas ke-2, sistem menampilkan prompt upgrade ke PRO, bukan error tanpa penjelasan.
- Import Update Excel mendeteksi siswa yang sudah ada (berdasarkan nama dan/atau NISN) dan tidak membuat entri ganda.

### 5.3 Modul Presensi Harian (Fitur Inti)

| ID | Requirement | Prioritas |
|---|---|---|
| FR-20 | Saat sesi presensi harian dibuka, seluruh siswa otomatis berstatus Hadir | MUST |
| FR-21 | Guru dapat mengubah status siswa menjadi Sakit, Izin, atau Alpha dengan maksimal 2 ketukan (tap) per siswa | MUST |
| FR-22 | Sistem harus menyimpan presensi secara otomatis (auto-save) setiap kali status siswa diubah, tanpa tombol "Simpan" terpisah yang wajib ditekan | MUST |
| FR-23 | Sistem harus mendukung pengisian presensi secara penuh offline, tersimpan di local database (Dexie) | MUST |
| FR-24 | Guru harus dapat melihat dan mengedit ulang presensi hari-hari sebelumnya dalam tahun ajaran yang sama | MUST |
| FR-25 | Sistem tidak boleh menyertakan field Jam Masuk, Jam Pulang, atau status Terlambat di mana pun dalam alur presensi | MUST |
| FR-26 | Waktu total dari membuka sesi presensi hingga menyimpan presensi 1 kelas (±30 siswa) harus dapat diselesaikan dalam < 30 detik oleh pengguna yang sudah familiar | MUST |

**Acceptance Criteria FR-20 s.d. FR-26:**
- Dapat diuji: membuka aplikasi → memilih kelas → memilih tanggal hari ini → seluruh siswa berstatus Hadir tanpa input apa pun.
- Mengubah status 1 siswa tidak memerlukan navigasi keluar dari halaman presensi.
- Mematikan koneksi internet pada device pengujian tidak menyebabkan kegagalan fungsi presensi.
- Tidak ditemukan elemen UI apa pun yang merujuk pada jam masuk/jam pulang/terlambat di seluruh alur presensi.

### 5.4 Modul Rekap & Laporan

| ID | Requirement | Prioritas |
|---|---|---|
| FR-30 | Sistem harus menghasilkan Rekap Bulanan otomatis berdasarkan data presensi harian dalam bulan tersebut | MUST |
| FR-31 | Sistem harus menghasilkan Rekap Semester otomatis berdasarkan data presensi harian dalam rentang semester (mengacu Kalender Akademik) | MUST |
| FR-32 | Sistem harus dapat mengekspor rekap (bulanan dan semester) ke format PDF | MUST |
| FR-33 | Sistem harus dapat mengekspor rekap (bulanan dan semester) ke format Excel | MUST |
| FR-34 | Rekap harus menampilkan ringkasan jumlah Hadir, Sakit, Izin, Alpha per siswa | MUST |
| FR-35 | Export PDF untuk pengguna PRO harus menyertakan Logo Sekolah pada bagian kop laporan | MUST (PRO only) |

**Acceptance Criteria FR-30 s.d. FR-35:**
- Rekap bulanan menghitung ulang otomatis tanpa perlu input manual ketika ada perubahan data presensi pada bulan tersebut.
- File PDF dan Excel hasil export dapat dibuka dengan aplikasi pembaca umum (Adobe Reader, Microsoft Excel/Google Sheets) tanpa korupsi format.
- Pengguna FREE tidak menemukan opsi logo sekolah di pengaturan export.

### 5.5 Modul Backup & Sinkronisasi

| ID | Requirement | Prioritas |
|---|---|---|
| FR-40 | Pengguna FREE harus dapat membuat Backup Lokal (file backup yang dapat disimpan manual oleh pengguna, misalnya ke penyimpanan HP/Google Drive secara manual) | MUST |
| FR-41 | Pengguna FREE harus dapat memulihkan data dari file Backup Lokal | MUST |
| FR-42 | Pengguna PRO harus dapat mengaktifkan Cloud Sync melalui Convex | MUST (PRO only) |
| FR-43 | Pengguna PRO harus dapat mengakses data yang sama dari lebih dari satu device (Multi Device) | MUST (PRO only) |
| FR-44 | Pengguna PRO harus dapat melakukan Backup Cloud dan Restore Cloud | MUST (PRO only) |
| FR-45 | Sinkronisasi cloud tidak boleh menyebabkan kehilangan data presensi yang sudah tersimpan secara lokal saat terjadi konflik data | MUST |

**Acceptance Criteria FR-40 s.d. FR-45:**
- Backup Lokal menghasilkan satu file yang dapat dipindahkan ke device lain dan dipulihkan dengan hasil data identik.
- Saat dua device PRO yang sama mengisi presensi pada tanggal yang sama secara offline lalu online kembali, sistem harus menyelesaikan konflik tanpa kehilangan data (strategi resolusi konflik didetailkan di `04_Database.md`).

### 5.6 Modul Lisensi & Monetisasi

| ID | Requirement | Prioritas |
|---|---|---|
| FR-50 | Sistem harus menyediakan mekanisme aktivasi lisensi PRO melalui kode/email sesuai pola BGY yang sudah ada | MUST |
| FR-51 | Sistem harus menampilkan status tier pengguna (FREE/PRO) secara jelas di pengaturan | MUST |
| FR-52 | Sistem harus menampilkan prompt upgrade yang kontekstual saat pengguna FREE mencoba mengakses fitur PRO (bukan blokir tanpa penjelasan) | MUST |
| FR-53 | Sistem harus menyediakan halaman informasi harga dan manfaat PRO yang jelas | SHOULD |

**Acceptance Criteria FR-50 s.d. FR-53:**
- Aktivasi lisensi berhasil mengubah status tier pengguna tanpa perlu reinstall aplikasi.
- Prompt upgrade menyertakan penjelasan fitur spesifik yang terkunci, bukan pesan generik.

---

## 6. Non-Functional Requirements

| ID | Kategori | Requirement |
|---|---|---|
| NFR-01 | Performa | Waktu render halaman presensi untuk 1 kelas (±40 siswa) harus < 1 detik pada device low-end |
| NFR-02 | Offline Capability | Seluruh fitur tier FREE harus berfungsi penuh tanpa koneksi internet |
| NFR-03 | Kompatibilitas | Aplikasi harus berjalan baik di browser mobile umum (Chrome Android, Safari iOS) dan dapat di-install sebagai PWA |
| NFR-04 | Ukuran Aplikasi | Bundle aplikasi harus dioptimalkan agar instalasi PWA cepat bahkan pada koneksi lambat |
| NFR-05 | Keandalan Data | Tidak boleh ada kehilangan data presensi akibat aplikasi force-close atau device restart sebelum auto-save selesai |
| NFR-06 | Aksesibilitas | Ukuran tombol dan kontras warna harus memenuhi standar keterbacaan untuk pengguna segala usia, termasuk guru senior |
| NFR-07 | Keamanan Data | Data siswa (nama, status kehadiran) yang disinkronkan ke cloud (PRO) harus terenkripsi saat transit |
| NFR-08 | Skalabilitas | Sistem cloud (Convex) harus mampu menangani pertumbuhan jumlah pengguna PRO tanpa degradasi performa signifikan |
| NFR-09 | Maintainability | Seluruh akses data harus melalui Repository Pattern agar perubahan backend tidak memengaruhi logika UI |

---

## 7. Asumsi (Assumptions)

| # | Asumsi |
|---|---|
| 1 | Mayoritas pengguna mengakses aplikasi melalui browser HP, bukan desktop. |
| 2 | Mayoritas sekolah memiliki minimal satu momen koneksi internet per hari (untuk sinkronisasi PRO), meski tidak stabil sepanjang hari. |
| 3 | Guru sudah familiar dengan konsep dasar Excel untuk keperluan import daftar siswa. |
| 4 | Lisensi PRO dibeli secara individual oleh guru, bukan melalui prosedur pengadaan sekolah formal. |

## 8. Batasan (Constraints)

| # | Batasan |
|---|---|
| 1 | Tidak ada anggaran untuk hardware tambahan (scanner QR, sensor fingerprint, kamera khusus). |
| 2 | Harga lisensi PRO harus tetap sangat rendah (Rp10.000/tahun) sesuai keputusan final di MasterContext. |
| 3 | Tidak ada tim support 24/7; UX harus cukup jelas sehingga minim kebutuhan bantuan manual. |

## 9. Risiko (Risks)

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Konflik data saat sinkronisasi multi-device PRO | Kehilangan/duplikasi data presensi | Strategi resolusi konflik berbasis timestamp & merge per-siswa, didetailkan di `04_Database.md` |
| Guru kurang familiar dengan format Excel yang diharapkan sistem | Import gagal, frustrasi pengguna | Menyediakan template Excel unduhan dan pesan error yang spesifik |
| Harga PRO terlalu murah untuk menutup biaya infrastruktur Convex pada skala besar | Keberlanjutan bisnis jangka panjang | Dipantau melalui roadmap dan dapat direvisi melalui proses change log resmi |

---

## 10. Out of Scope (Rilis Pertama)

| Item | Alasan |
|---|---|
| Notifikasi WhatsApp/SMS ke orang tua | Menambah kompleksitas integrasi pihak ketiga, tidak termasuk prinsip inti rilis pertama |
| Dashboard analitik lintas sekolah | Target pengguna individu guru, bukan dinas/yayasan, untuk rilis pertama |
| Aplikasi native iOS/Android terpisah dari PWA | PWA dianggap cukup memenuhi kebutuhan distribusi tanpa biaya app store |

---

## 11. Acceptance Criteria — Dokumen Ini

- [x] Seluruh functional requirement dipetakan dengan ID unik dan prioritas.
- [x] Setiap kelompok requirement memiliki acceptance criteria yang dapat diuji.
- [x] Non-functional requirement mencakup performa, offline capability, keamanan, dan maintainability.
- [x] Asumsi, batasan, dan risiko didokumentasikan secara eksplisit.
- [x] Cakupan di luar rilis pertama (out of scope) dinyatakan jelas untuk menghindari scope creep.

---

## 12. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Final — siap dijadikan acuan pengembangan |
| Dokumen Terkait | `00_MasterContext.md`, `04_Database.md`, `05_UserFlow.md` |
| Dokumen Berikutnya | `02_FrozenSummary.md` |
