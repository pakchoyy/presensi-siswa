# 09_Roadmap.md

## Product Roadmap — Bantu Guru Yuk | Presensi Siswa

> Dokumen ini memetakan urutan rilis produk dari fondasi hingga fitur lanjutan. Roadmap disusun berdasarkan prinsip: fitur inti yang mendukung kecepatan presensi < 30 detik harus selesai dan stabil sebelum fitur pendukung (rekap, export, PRO) dikerjakan.

---

## 1. Filosofi Penyusunan Roadmap

| Prinsip | Penjelasan |
|---|---|
| Inti dulu, pelengkap belakangan | Presensi harian offline adalah jantung produk; tanpa ini stabil, fitur lain tidak ada artinya. |
| Tier FREE harus lengkap dan solid sebelum tier PRO dibangun | PRO adalah lapisan tambahan di atas fondasi FREE yang sudah berfungsi penuh, bukan dikembangkan paralel sejak awal. |
| Setiap fase memiliki definisi "selesai" yang jelas | Mencegah scope creep dan memastikan setiap fase benar-benar dapat dirilis/diuji. |

---

## 2. Fase 0 — Fondasi Teknis & Dokumentasi

| Item | Status |
|---|---|
| Penyusunan dokumentasi produk lengkap (dokumen 00–13) | Sedang berjalan (dokumen ini bagian darinya) |
| Penetapan tech stack final | Selesai — lihat `07_TechStack.md` |
| Penetapan skema data konseptual | Selesai — lihat `04_Database.md` |
| Penetapan sistem desain | Selesai — lihat `06_DesignSystem.md` |

**Definisi Selesai Fase 0:** Seluruh 14 dokumen (00–13) telah dibuat, ditinjau, dan disetujui sebagai acuan pengembangan.

---

## 3. Fase 1 — MVP Tier FREE (Inti Produk)

Fokus: membuktikan bahwa alur presensi inti dapat diselesaikan dalam < 30 detik, sepenuhnya offline.

| # | Fitur | Prioritas |
|---|---|---|
| 1.1 | Wizard Setup Tahun Ajaran (sekolah, guru, tahun ajaran, 1 kelas) | MUST |
| 1.2 | Kalender Akademik bawaan (read-only di FREE) | MUST |
| 1.3 | Import Excel daftar siswa (setup awal) | MUST |
| 1.4 | Input manual tambah/edit/hapus siswa | MUST |
| 1.5 | Presensi harian dengan default Hadir + pengecualian Sakit/Izin/Alpha | MUST |
| 1.6 | Penyimpanan lokal penuh via Dexie | MUST |
| 1.7 | Navigasi melihat/mengedit presensi hari sebelumnya | MUST |

**Definisi Selesai Fase 1:** Pengguna baru dapat menyelesaikan wizard setup dan mengisi presensi harian untuk 1 kelas tanpa koneksi internet, dalam waktu sesuai target (< 3 menit onboarding, < 30 detik presensi harian).

---

## 4. Fase 2 — Rekap, Export, dan Backup Lokal (Pelengkap Tier FREE)

Fokus: melengkapi nilai tier FREE agar menjadi produk yang utuh dan dapat dirilis ke publik sebagai versi gratis penuh.

| # | Fitur | Prioritas |
|---|---|---|
| 2.1 | Rekap Bulanan otomatis | MUST |
| 2.2 | Rekap Semester otomatis | MUST |
| 2.3 | Export PDF | MUST |
| 2.4 | Export Excel | MUST |
| 2.5 | Backup Lokal (buat file backup) | MUST |
| 2.6 | Restore dari Backup Lokal | MUST |

**Definisi Selesai Fase 2:** Tier FREE dapat dirilis ke publik sebagai produk yang lengkap dan berdiri sendiri — guru dapat menjalankan satu tahun ajaran penuh hanya dengan fitur FREE tanpa kebutuhan teknis tambahan.

> **Milestone Penting:** Akhir Fase 2 adalah titik **Rilis Publik Pertama (v1.0 FREE)**.

---

## 5. Fase 3 — Infrastruktur Lisensi PRO

Fokus: membangun mekanisme bisnis sebelum membangun fitur PRO itu sendiri, agar monetisasi dapat diuji lebih awal.

| # | Fitur | Prioritas |
|---|---|---|
| 3.1 | Mekanisme aktivasi lisensi PRO berbasis email (mengikuti pola BGY yang sudah ada) | MUST |
| 3.2 | Halaman informasi harga & manfaat PRO | MUST |
| 3.3 | Prompt upgrade kontekstual di titik-titik fitur terkunci | MUST |
| 3.4 | Penyimpanan status tier pengguna dan masa berlaku lisensi | MUST |

**Definisi Selesai Fase 3:** Pengguna FREE dapat melihat dengan jelas apa yang akan didapat dari PRO, dan proses aktivasi lisensi berfungsi end-to-end (meski fitur PRO sesungguhnya belum aktif sepenuhnya).

---

## 6. Fase 4 — Fitur Inti Tier PRO

Fokus: membangun nilai tambah nyata bagi pengguna berbayar.

| # | Fitur | Prioritas |
|---|---|---|
| 4.1 | Unlimited kelas | MUST |
| 4.2 | Integrasi Convex untuk Cloud Sync | MUST |
| 4.3 | Dukungan Multi Device | MUST |
| 4.4 | Strategi resolusi konflik sinkronisasi (sesuai `04_Database.md` Bagian 6) | MUST |
| 4.5 | Indikator status sinkronisasi di UI | MUST |

**Definisi Selesai Fase 4:** Pengguna PRO dapat menggunakan lebih dari satu kelas dan mengakses data yang sama dari lebih dari satu device tanpa kehilangan data.

> **Milestone Penting:** Akhir Fase 4 adalah titik **Rilis PRO Pertama (v1.0 PRO)**.

---

## 7. Fase 5 — Penyempurnaan Fitur PRO

Fokus: fitur PRO lanjutan yang menambah kenyamanan namun tidak menjadi syarat fungsi inti PRO.

| # | Fitur | Prioritas |
|---|---|---|
| 5.1 | Kalender Akademik dapat diedit (PRO) | SHOULD |
| 5.2 | Import Update Excel (update massal tanpa duplikasi) | SHOULD |
| 5.3 | Backup Cloud manual & Restore Cloud | SHOULD |
| 5.4 | Logo Sekolah pada laporan PDF/Excel | SHOULD |

**Definisi Selesai Fase 5:** Seluruh fitur yang dijanjikan dalam daftar PRO di `00_MasterContext.md` Bagian 4.2 telah tersedia dan diuji.

---

## 8. Fase 6 — Penyempurnaan Lintas Tier

Fokus: peningkatan kualitas berdasarkan feedback nyata dari pengguna setelah rilis.

| # | Area | Contoh Aktivitas |
|---|---|---|
| 6.1 | Performa | Optimasi waktu render untuk kelas dengan jumlah siswa besar |
| 6.2 | Aksesibilitas | Audit kontras warna dan ukuran target sentuh berdasarkan feedback pengguna nyata |
| 6.3 | UX Wizard | Penyederhanaan langkah onboarding berdasarkan data drop-off pengguna baru |
| 6.4 | Stabilitas Sinkronisasi | Penanganan edge case tambahan dari data sinkronisasi PRO di lapangan |

---

## 9. Item yang Sengaja Ditunda (Belum Ada di Roadmap Manapun)

Sesuai `01_PRD.md` Bagian 10, item berikut belum dijadwalkan dalam fase manapun di atas dan baru akan dipertimbangkan setelah Fase 6 stabil:

| Item | Alasan Penundaan |
|---|---|
| Notifikasi WhatsApp/SMS ke orang tua | Membutuhkan integrasi pihak ketiga dan model biaya tambahan yang belum dianalisis |
| Dashboard analitik lintas sekolah/dinas | Target pengguna saat ini adalah guru individu, bukan institusi |
| Aplikasi native terpisah dari PWA | Belum ada indikasi kebutuhan yang cukup kuat untuk membenarkan biaya tambahan |

---

## 10. Ringkasan Urutan Milestone

| Milestone | Mencakup Fase |
|---|---|
| Dokumentasi & Fondasi Selesai | Fase 0 |
| MVP Internal (alur presensi inti berfungsi) | Fase 1 |
| **Rilis Publik v1.0 FREE** | Fase 1 + Fase 2 |
| Infrastruktur lisensi siap | Fase 3 |
| **Rilis v1.0 PRO** | Fase 3 + Fase 4 |
| PRO Lengkap Sesuai Janji Produk | Fase 5 |
| Iterasi Berkelanjutan | Fase 6 dan seterusnya |

---

## 11. Acceptance Criteria — Dokumen Ini

- [x] Setiap fase memiliki daftar fitur dengan prioritas dan definisi selesai yang jelas.
- [x] Urutan fase secara logis mendahulukan fondasi inti (presensi offline) sebelum fitur pendukung dan PRO.
- [x] Milestone rilis publik (FREE) dan rilis PRO dipisahkan secara eksplisit.
- [x] Item yang sengaja ditunda dirujuk kembali ke `01_PRD.md` agar konsisten.

---

## 12. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Final |
| Dokumen Terkait | `01_PRD.md`, `02_FrozenSummary.md`, `10_ClaudeSprint.md` |
| Dokumen Berikutnya | `10_ClaudeSprint.md` |
