# 13_ChangeLog.md

## Change Log — Bantu Guru Yuk | Presensi Siswa

> Dokumen ini mencatat seluruh perubahan resmi terhadap keputusan produk, terutama perubahan terhadap apa pun yang sebelumnya dinyatakan "Frozen" di `02_FrozenSummary.md`. Tidak ada keputusan frozen yang boleh berubah secara diam-diam — setiap perubahan harus tercatat di sini dengan alasan dan dampaknya.

---

## 1. Aturan Pencatatan Change Log

| Aturan | Penjelasan |
|---|---|
| Setiap entri wajib memiliki tanggal | Untuk melacak kronologi keputusan. |
| Setiap entri wajib menyebutkan dokumen yang terdampak | Agar dokumen terkait dapat diperbarui secara konsisten. |
| Setiap entri wajib menyertakan alasan perubahan | Bukan hanya "apa yang berubah", tetapi "mengapa berubah". |
| Perubahan terhadap keputusan Frozen wajib menyertakan persetujuan eksplisit dari Hai (Product Owner) | Mencegah perubahan sepihak oleh siapa pun termasuk AI assistant. |
| Status entri | Gunakan label: `[DITERIMA]`, `[DITOLAK]`, `[DITUNDA]` untuk setiap usulan perubahan yang dicatat, termasuk usulan yang akhirnya tidak diterapkan. |

---

## 2. Format Entri

Setiap entri perubahan dicatat dengan format berikut:

```
### [Tanggal] — [Judul Singkat Perubahan]

Status: [DITERIMA / DITOLAK / DITUNDA]
Dokumen Terdampak: [daftar dokumen, contoh: 02_FrozenSummary.md, 04_Database.md]
Diusulkan Oleh: [Hai / Claude / DeepSeek / Tim]

Deskripsi Perubahan:
[Penjelasan apa yang diusulkan untuk berubah]

Alasan:
[Mengapa perubahan ini diusulkan/diterima/ditolak]

Dampak:
[Apa yang terpengaruh akibat perubahan ini — fitur lain, jadwal roadmap,
struktur data, dsb.]
```

---

## 3. Riwayat Perubahan

### 30 Juni 2026 — Inisialisasi Dokumentasi Proyek

Status: DITERIMA
Dokumen Terdampak: 00–13 (seluruh dokumentasi awal)
Diusulkan Oleh: Hai

**Deskripsi Perubahan:**
Penyusunan seluruh dokumentasi awal proyek "Bantu Guru Yuk | Presensi Siswa" (dokumen 00 sampai 13) berdasarkan brief awal Hai, mencakup Master Context, PRD, Frozen Summary, Project Summary, Database, User Flow, Design System, Tech Stack, Coding Guideline, Roadmap, Claude Sprint Guide, DeepSeek Prompt Template, dan Review Checklist.

**Alasan:**
Memberikan fondasi dokumentasi lengkap sebelum proses implementasi teknis dimulai, agar seluruh keputusan produk (termasuk fitur yang ditolak secara sengaja: QR/GPS/Fingerprint/Face Recognition/Jam Masuk/Jam Pulang/Terlambat) terekam secara resmi dan tidak diusulkan ulang tanpa proses sadar di masa depan.

**Dampak:**
Seluruh pengembangan teknis selanjutnya wajib mengacu pada baseline dokumentasi ini. Setiap penyimpangan dari dokumen ini terhadap implementasi nyata harus dicatat sebagai entri baru di change log ini.

---

> *Entri-entri berikutnya akan ditambahkan di bagian ini seiring perkembangan proyek. Setiap entri baru ditambahkan di bawah entri sebelumnya secara kronologis (urutan menaik berdasarkan tanggal).*

---

## 4. Daftar Usulan yang Pernah Ditolak (Rejected Proposals Log)

Bagian ini secara khusus mencatat usulan-usulan yang **secara sadar ditolak**, agar di masa depan tidak ada pihak (termasuk AI assistant di sesi yang berbeda) yang mengusulkan ulang hal yang sama tanpa menyadari bahwa hal tersebut sudah pernah dipertimbangkan dan ditolak.

| Tanggal | Usulan yang Ditolak | Alasan Penolakan |
|---|---|---|
| (Brief Awal) | QR Code untuk presensi | Menambah friksi teknis, rawan gagal scan, tidak cocok untuk presensi cepat satu kelas — lihat `00_MasterContext.md` Bagian 3.1 |
| (Brief Awal) | GPS / lokasi | Sinyal GPS tidak stabil di dalam ruangan, isu privasi anak, tidak relevan untuk presensi kelas — lihat `00_MasterContext.md` Bagian 3.1 |
| (Brief Awal) | Fingerprint | Membutuhkan hardware tambahan yang tidak tersedia di sekolah berbudget terbatas — lihat `00_MasterContext.md` Bagian 3.1 |
| (Brief Awal) | Face Recognition | Membutuhkan kamera & model AI berat, isu privasi data biometrik anak — lihat `00_MasterContext.md` Bagian 3.1 |
| (Brief Awal) | Jam Masuk | Bukan tujuan aplikasi; aplikasi fokus status kehadiran harian, bukan time-tracking presisi — lihat `00_MasterContext.md` Bagian 3.1 |
| (Brief Awal) | Jam Pulang | Sama seperti Jam Masuk — lihat `00_MasterContext.md` Bagian 3.1 |
| (Brief Awal) | Status Terlambat | Menambah kompleksitas keputusan guru (threshold keterlambatan) tanpa nilai tambah signifikan — lihat `00_MasterContext.md` Bagian 3.1 |

---

## 5. Acceptance Criteria — Dokumen Ini

- [x] Format entri perubahan terstandardisasi dan dapat diisi konsisten di masa depan.
- [x] Entri inisialisasi dokumentasi proyek tercatat sebagai baseline pertama.
- [x] Daftar usulan yang pernah ditolak tercatat secara terpusat agar tidak diusulkan ulang tanpa kesadaran penuh.
- [x] Aturan persetujuan eksplisit dari Product Owner untuk perubahan keputusan frozen dinyatakan jelas.

---

## 6. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Aktif — akan terus diperbarui sepanjang umur proyek |
| Dokumen Terkait | Seluruh dokumen 00–12 |
| Dokumen Berikutnya | Tidak ada — ini adalah dokumen penutup dari rangkaian 00–13 |
