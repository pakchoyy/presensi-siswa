# 02_FrozenSummary.md

## Frozen Decisions Summary — Bantu Guru Yuk | Presensi Siswa

> Dokumen ini berisi **daftar tunggal seluruh keputusan yang sudah dibekukan (frozen)**. Tujuannya agar siapa pun (developer, AI assistant, reviewer) dapat membaca satu halaman ini dan langsung tahu apa yang **tidak boleh diubah, diusulkan ulang, atau didebat lagi** tanpa melalui proses resmi di `13_ChangeLog.md`. Jika ada usulan fitur baru yang bertentangan dengan daftar ini, usulan tersebut harus ditolak secara default.

---

## 1. Cara Membaca Dokumen Ini

Setiap baris di tabel memiliki status:

| Simbol | Arti |
|---|---|
| 🔒 FROZEN | Final, tidak dapat diubah tanpa proses revisi resmi |
| 🔒 FROZEN (PRO) | Final, khusus berlaku untuk tier PRO |
| 🔒 FROZEN (FREE) | Final, khusus berlaku untuk tier FREE |

---

## 2. Keputusan Filosofi Produk

| # | Keputusan | Status |
|---|---|---|
| 1 | Aplikasi harus Offline First — seluruh fitur FREE wajib berfungsi tanpa internet | 🔒 FROZEN |
| 2 | Aplikasi harus Mobile First — desain dan interaksi diprioritaskan untuk HP | 🔒 FROZEN |
| 3 | Target waktu pengisian presensi 1 kelas adalah di bawah 30 detik | 🔒 FROZEN |
| 4 | Semua siswa berstatus default Hadir saat sesi presensi dibuka | 🔒 FROZEN |
| 5 | Guru hanya mengubah status siswa yang menjadi pengecualian (Sakit/Izin/Alpha) | 🔒 FROZEN |

## 3. Fitur yang Ditolak Secara Permanen

| # | Fitur | Status |
|---|---|---|
| 1 | QR Code untuk presensi | 🔒 FROZEN — Ditolak |
| 2 | GPS / pelacakan lokasi | 🔒 FROZEN — Ditolak |
| 3 | Fingerprint | 🔒 FROZEN — Ditolak |
| 4 | Face Recognition | 🔒 FROZEN — Ditolak |
| 5 | Jam Masuk | 🔒 FROZEN — Ditolak |
| 6 | Jam Pulang | 🔒 FROZEN — Ditolak |
| 7 | Status Terlambat | 🔒 FROZEN — Ditolak |

> Alasan penolakan masing-masing fitur didetailkan di `00_MasterContext.md` Bagian 3.1. Tidak perlu diulang pembahasannya di tiket fitur baru manapun.

## 4. Status Kehadiran yang Sah

| # | Status | Status Dokumen |
|---|---|---|
| 1 | Hadir (H) — default | 🔒 FROZEN |
| 2 | Sakit (S) | 🔒 FROZEN |
| 3 | Izin (I) | 🔒 FROZEN |
| 4 | Alpha (A) | 🔒 FROZEN |

> Tidak ada status kelima (misalnya "Dispensasi" atau "Tugas Luar") di rilis pertama. Penambahan status baru harus melalui proses change log resmi karena akan memengaruhi struktur database dan rekap.

## 5. Batasan Tier FREE

| # | Batasan | Status |
|---|---|---|
| 1 | Maksimal 1 kelas | 🔒 FROZEN (FREE) |
| 2 | Penyimpanan hanya lokal (Dexie/IndexedDB), tidak ada cloud sync | 🔒 FROZEN (FREE) |
| 3 | Backup hanya manual/lokal, tidak ada backup cloud otomatis | 🔒 FROZEN (FREE) |
| 4 | Tidak ada fitur Logo Sekolah pada laporan | 🔒 FROZEN (FREE) |

## 6. Fitur Eksklusif Tier PRO

| # | Fitur | Status |
|---|---|---|
| 1 | Unlimited kelas | 🔒 FROZEN (PRO) |
| 2 | Cloud Sync via Convex | 🔒 FROZEN (PRO) |
| 3 | Multi Device | 🔒 FROZEN (PRO) |
| 4 | Kalender Akademik dapat diedit (versi FREE hanya bisa dilihat) | 🔒 FROZEN (PRO) |
| 5 | Import Update Excel (update massal tanpa duplikasi) | 🔒 FROZEN (PRO) |
| 6 | Backup Cloud & Restore Cloud | 🔒 FROZEN (PRO) |
| 7 | Logo Sekolah pada laporan PDF/Excel | 🔒 FROZEN (PRO) |

## 7. Keputusan Harga

| # | Keputusan | Status |
|---|---|---|
| 1 | Harga lisensi PRO adalah Rp10.000 per tahun | 🔒 FROZEN |
| 2 | Model lisensi mengikuti pola BGY yang sudah ada (aktivasi berbasis email) | 🔒 FROZEN |
| 3 | Tidak ada tier berbayar lain (misalnya bulanan, lifetime) di rilis pertama | 🔒 FROZEN |

## 8. Keputusan Teknis Fundamental

| # | Keputusan | Status |
|---|---|---|
| 1 | Stack: React + TypeScript + Vite + Tailwind + shadcn/ui | 🔒 FROZEN |
| 2 | Local storage: Dexie (IndexedDB) | 🔒 FROZEN |
| 3 | Cloud backend: Convex | 🔒 FROZEN |
| 4 | Akses data wajib melalui Repository Pattern | 🔒 FROZEN |
| 5 | Distribusi sebagai PWA, bukan aplikasi native app store | 🔒 FROZEN |
| 6 | Bahasa antarmuka: Bahasa Indonesia | 🔒 FROZEN |

## 9. Keputusan Cakupan (Scope)

| # | Keputusan | Status |
|---|---|---|
| 1 | Wizard Setup Tahun Ajaran wajib ada di onboarding | 🔒 FROZEN |
| 2 | Kalender akademik bawaan harus tersedia tanpa input manual awal | 🔒 FROZEN |
| 3 | Rekap yang didukung hanya Bulanan dan Semester (tidak ada rekap mingguan/harian sebagai laporan resmi) | 🔒 FROZEN |
| 4 | Export hanya mendukung PDF dan Excel (tidak ada format lain seperti CSV terpisah, JSON, dst., di rilis pertama) | 🔒 FROZEN |

---

## 10. Apa yang BOLEH Berubah Tanpa Proses Revisi Berat

Untuk menghindari kesalahpahaman bahwa semuanya "dibekukan total", berikut hal-hal yang masih fleksibel dan boleh disesuaikan oleh tim desain/dev tanpa perlu mengubah dokumen frozen:

| # | Hal yang Fleksibel |
|---|---|
| 1 | Detail visual UI (warna, tipografi spesifik, ikon) — diatur lebih lanjut di `06_DesignSystem.md` |
| 2 | Urutan langkah mikro dalam wizard setup (selama total waktu tetap < 3 menit) |
| 3 | Struktur internal kode (selama tetap mengikuti Repository Pattern) |
| 4 | Copywriting/teks UI dalam Bahasa Indonesia (selama makna dan istilah status kehadiran tetap konsisten) |

---

## 11. Acceptance Criteria — Dokumen Ini

- [x] Semua keputusan frozen dari brief awal tercantum tanpa terlewat satu pun.
- [x] Setiap keputusan memiliki status kategori yang jelas (umum/FREE/PRO).
- [x] Daftar fitur yang ditolak permanen tercantum lengkap dengan rujukan alasan.
- [x] Dipisahkan secara jelas antara hal yang frozen dan hal yang masih fleksibel.

---

## 12. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Final |
| Dokumen Terkait | `00_MasterContext.md`, `01_PRD.md`, `13_ChangeLog.md` |
| Dokumen Berikutnya | `03_ProjectSummary.md` |
