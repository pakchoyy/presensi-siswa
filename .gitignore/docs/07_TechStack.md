# 07_TechStack.md

## Tech Stack Justification Document — Bantu Guru Yuk | Presensi Siswa

> Dokumen ini menjelaskan secara mendalam **mengapa** setiap teknologi dipilih, alternatif apa yang dipertimbangkan, dan trade-off yang diterima. Tidak ada kode di dokumen ini — fokus sepenuhnya pada justifikasi arsitektural.

---

## 1. Ringkasan Stack

| Layer | Teknologi |
|---|---|
| Bahasa & Framework UI | React + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Library Komponen | shadcn/ui |
| Penyimpanan Lokal | Dexie (IndexedDB) |
| Backend Cloud | Convex |
| Pola Arsitektur | Repository Pattern |
| Distribusi | PWA (Progressive Web App) |

---

## 2. Justifikasi per Komponen

### 2.1 React + TypeScript

**Alasan Dipilih:**
- React adalah library UI dengan ekosistem paling matang untuk membangun aplikasi web interaktif yang kompleks namun tetap dapat dirawat jangka panjang.
- TypeScript menambahkan type-safety yang sangat penting mengingat aplikasi ini akan memiliki banyak entitas data terstruktur (Kelas, Siswa, SesiPresensi, RecordPresensi) — kesalahan tipe data dapat dicegah sejak waktu development, bukan saat runtime di tangan guru.
- Komunitas dan dokumentasi React sangat luas, memudahkan onboarding developer baru di masa depan jika tim bertambah.

**Alternatif yang Dipertimbangkan:**

| Alternatif | Alasan Tidak Dipilih |
|---|---|
| Vue.js | Ekosistem lebih kecil untuk integrasi dengan Convex dan shadcn/ui dibanding React |
| Svelte | Lebih ringan, namun ekosistem komponen UI siap pakai (seperti shadcn/ui) tidak sekuat React |
| Vanilla JS tanpa framework | Akan memperlambat development jangka panjang untuk aplikasi dengan banyak state interaktif (presensi real-time per siswa) |

**Trade-off yang Diterima:** Ukuran bundle React relatif lebih besar dibanding Svelte, namun dianggap sepadan dengan kecepatan development dan kemudahan maintenance jangka panjang.

---

### 2.2 Vite

**Alasan Dipilih:**
- Build tool modern dengan waktu development server yang sangat cepat (hot module replacement instan), penting untuk iterasi cepat selama development.
- Dukungan bawaan yang baik untuk konfigurasi PWA melalui plugin resmi.
- Konfigurasi lebih sederhana dibanding bundler lama (seperti Webpack), mengurangi overhead maintenance konfigurasi build.

**Alternatif yang Dipertimbangkan:**

| Alternatif | Alasan Tidak Dipilih |
|---|---|
| Create React App (CRA) | Sudah tidak lagi menjadi rekomendasi standar di ekosistem React; performa build lebih lambat |
| Webpack manual | Kompleksitas konfigurasi tinggi tanpa manfaat tambahan yang signifikan untuk skala proyek ini |

---

### 2.3 Tailwind CSS

**Alasan Dipilih:**
- Memungkinkan konsistensi desain (lihat `06_DesignSystem.md`) diterapkan dengan cepat melalui utility class, tanpa perlu menulis dan merawat file CSS terpisah yang besar.
- Ukuran CSS akhir setelah proses purge sangat kecil, penting untuk performa aplikasi PWA pada device low-end dan koneksi lambat.
- Bekerja sangat baik berdampingan dengan shadcn/ui, yang juga dibangun di atas Tailwind.

**Alternatif yang Dipertimbangkan:**

| Alternatif | Alasan Tidak Dipilih |
|---|---|
| CSS Modules manual | Lebih lambat untuk iterasi desain dan rawan inkonsistensi antar komponen |
| Styled Components / CSS-in-JS | Menambah overhead runtime yang tidak dibutuhkan untuk aplikasi yang mengutamakan performa di device low-end |

---

### 2.4 shadcn/ui

**Alasan Dipilih:**
- Menyediakan komponen UI dasar (dialog, tombol, form, dsb.) yang accessible secara default, mengurangi risiko masalah aksesibilitas yang dibangun manual dari nol.
- Berbeda dari library komponen tertutup, shadcn/ui memberikan kode komponen yang dapat dikustomisasi penuh, sehingga komponen seperti Kartu Siswa dan Selector Status (lihat `06_DesignSystem.md`) dapat disesuaikan tanpa terbatas oleh API library pihak ketiga yang kaku.
- Tidak menambah dependency runtime yang berat karena komponennya "dimiliki" langsung oleh proyek, bukan diimpor sebagai paket besar.

**Alternatif yang Dipertimbangkan:**

| Alternatif | Alasan Tidak Dipilih |
|---|---|
| Material UI (MUI) | Bundle lebih berat, gaya visual default kurang sesuai dengan identitas visual BGY yang khas dan berani |
| Ant Design | Diarahkan untuk aplikasi dashboard kompleks, terasa berlebihan untuk UI presensi yang harus sangat sederhana |
| Membangun komponen dari nol | Memperlambat development dan berisiko mengulang kesalahan aksesibilitas umum |

---

### 2.5 Dexie (IndexedDB)

**Alasan Dipilih:**
- IndexedDB adalah satu-satunya mekanisme penyimpanan persisten berkapasitas besar yang tersedia secara native di browser modern, cocok untuk prinsip Offline First.
- Dexie menyederhanakan API IndexedDB yang secara native cukup rumit, mempercepat development sekaligus mengurangi risiko bug terkait transaksi data.
- Mendukung query yang cukup ekspresif untuk kebutuhan aplikasi ini (mencari siswa per kelas, sesi presensi per tanggal, dsb.) tanpa perlu server.

**Alternatif yang Dipertimbangkan:**

| Alternatif | Alasan Tidak Dipilih |
|---|---|
| LocalStorage murni | Terbatas kapasitas (~5–10MB) dan hanya mendukung penyimpanan string sederhana, tidak cocok untuk data relasional presensi berskala besar (banyak kelas/siswa/histori harian) |
| WebSQL | Sudah deprecated dan tidak didukung browser modern |
| PouchDB | Lebih berat dan menyertakan asumsi sinkronisasi CouchDB yang tidak sejalan dengan pilihan backend Convex |

---

### 2.6 Convex

**Alasan Dipilih:**
- Convex menyediakan backend reaktif yang menyederhanakan sinkronisasi data multi-device secara signifikan dibanding membangun backend custom dari nol (REST API + WebSocket manual).
- Model data Convex yang berbasis fungsi (query/mutation) cocok dengan kebutuhan aplikasi ini yang relatif terbatas dan jelas: sinkronisasi entitas presensi antar device PRO.
- Mengurangi beban operasional infrastruktur (tidak perlu mengelola server database sendiri), penting karena tim pengembang kecil/indie.

**Alternatif yang Dipertimbangkan:**

| Alternatif | Alasan Tidak Dipilih |
|---|---|
| Firebase Firestore | Juga viable, namun Convex dipilih karena model fungsi backend-nya lebih cocok dengan pola Repository Pattern dan memberikan kontrol logika sinkronisasi yang lebih eksplisit |
| Supabase | Sudah digunakan di beberapa tools BGY lain (berbasis Postgres + REST), namun untuk kasus sinkronisasi real-time multi-device pada produk ini, model reaktif Convex dinilai lebih sesuai dan lebih sedikit boilerplate |
| Backend custom (Node.js + database sendiri) | Menambah beban maintenance infrastruktur yang signifikan tanpa manfaat tambahan dibanding solusi managed seperti Convex |

**Catatan:** Pemilihan Convex tidak menggantikan pola yang sudah dipakai di tools BGY lain (Supabase); keduanya dapat hidup berdampingan di ekosistem BGY sesuai kebutuhan masing-masing produk.

---

### 2.7 Repository Pattern

**Alasan Dipilih:**
- Memisahkan logika akses data dari logika bisnis dan tampilan, sehingga kode yang berinteraksi dengan Dexie atau Convex tidak tersebar di banyak komponen UI.
- Memungkinkan aplikasi berjalan sepenuhnya dengan Dexie saja (tier FREE) tanpa mengetahui detail Convex, dan baru "menyalakan" lapisan sinkronisasi Convex saat pengguna upgrade ke PRO — tanpa membongkar ulang logika bisnis yang sudah ada.
- Mempermudah pengujian (testing) karena logika bisnis dapat diuji terlepas dari implementasi penyimpanan data yang sebenarnya.

**Trade-off yang Diterima:** Menambah satu lapisan abstraksi yang sedikit meningkatkan jumlah kode dibanding mengakses Dexie/Convex langsung dari komponen UI — diterima karena manfaat maintainability jangka panjang lebih besar dibanding biaya kompleksitas awal ini.

---

### 2.8 PWA (Progressive Web App)

**Alasan Dipilih:**
- Memungkinkan aplikasi di-install langsung ke home screen HP guru tanpa proses publikasi ke Google Play Store/App Store, yang akan menambah biaya, waktu review, dan kompleksitas distribusi.
- Mendukung fungsi offline secara native melalui service worker, selaras langsung dengan prinsip Offline First.
- Update aplikasi dapat didistribusikan secara instan (seperti website) tanpa menunggu proses approval store.

**Alternatif yang Dipertimbangkan:**

| Alternatif | Alasan Tidak Dipilih |
|---|---|
| Aplikasi native (Android/iOS terpisah) | Biaya development dan maintenance dua codebase terpisah tidak sepadan untuk skala awal produk ini |
| React Native / Flutter (cross-platform native) | Menambah kompleksitas toolchain tanpa manfaat signifikan dibanding PWA untuk kasus penggunaan yang sebagian besar berbasis form dan list sederhana |

---

## 3. Bagaimana Stack Ini Mendukung Prinsip Inti Produk

| Prinsip Inti (dari `00_MasterContext.md`) | Dukungan dari Stack |
|---|---|
| Offline First | Dexie sebagai penyimpanan utama; PWA dengan service worker memastikan aplikasi tetap dapat dibuka tanpa internet |
| Mobile First | Tailwind + shadcn/ui memudahkan implementasi UI mobile-first yang konsisten; PWA dapat di-install seperti aplikasi native di HP |
| Kecepatan Input < 30 detik | React dengan state management lokal yang cepat (tanpa round-trip ke server untuk tier FREE) memastikan interaksi presensi instan |
| Repository Pattern wajib | Eksplisit dipilih sebagai pola arsitektur, memisahkan Dexie (lokal) dan Convex (cloud) di balik antarmuka yang sama |
| Harga PRO murah berkelanjutan | Convex sebagai managed backend mengurangi biaya operasional dibanding membangun infrastruktur sendiri, mendukung keberlanjutan model harga Rp10.000/tahun |

---

## 4. Batasan Teknis yang Disadari

| Batasan | Penjelasan |
|---|---|
| Kapasitas penyimpanan browser tidak tak terbatas | IndexedDB memiliki kuota tergantung perangkat dan browser; dianggap cukup untuk skala data presensi tahunan per guru, namun perlu dipantau pada implementasi |
| PWA di iOS memiliki dukungan service worker yang historisnya lebih terbatas dibanding Android | Perlu pengujian khusus pada Safari/iOS saat implementasi untuk memastikan fitur offline berjalan baik |
| Convex sebagai layanan pihak ketiga | Menimbulkan dependensi pada keberlangsungan layanan tersebut; risiko ini diterima karena manfaat operasional yang signifikan |

---

## 5. Acceptance Criteria — Dokumen Ini

- [x] Setiap teknologi dalam stack memiliki alasan pemilihan yang eksplisit.
- [x] Alternatif yang dipertimbangkan dan alasan tidak dipilih didokumentasikan untuk setiap layer.
- [x] Trade-off yang diterima dinyatakan secara jujur, bukan disembunyikan.
- [x] Keterkaitan setiap teknologi terhadap prinsip inti produk dijelaskan secara langsung.
- [x] Batasan teknis yang disadari dicantumkan agar tidak menjadi kejutan saat implementasi.

---

## 6. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Final |
| Dokumen Terkait | `00_MasterContext.md`, `04_Database.md`, `08_CodingGuideline.md` |
| Dokumen Berikutnya | `08_CodingGuideline.md` |
