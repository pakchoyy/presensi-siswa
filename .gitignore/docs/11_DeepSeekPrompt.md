# 11_DeepSeekPrompt.md

## DeepSeek Prompt Template — Bantu Guru Yuk | Presensi Siswa

> Dokumen ini berisi template prompt yang dirancang untuk digunakan dengan AI lain (misalnya DeepSeek) sebagai **pembanding atau validator kedua** terhadap pekerjaan yang dihasilkan Claude. Tujuannya bukan menggantikan Claude, melainkan memberi Hai cara cepat memverifikasi konsistensi/kewajaran keputusan teknis dari sudut pandang model AI yang berbeda, tanpa harus menyalin ulang seluruh konteks proyek secara manual.

---

## 1. Kapan Dokumen Ini Dipakai

| Situasi | Tujuan Memakai Prompt Ini |
|---|---|
| Ingin validasi independen atas rancangan arsitektur dari Claude | Mengecek apakah ada blind spot yang terlewat |
| Ingin second opinion atas estimasi waktu/kompleksitas suatu fitur | Membandingkan perspektif sebelum memutuskan prioritas roadmap |
| Ingin audit konsistensi dokumentasi (00–13) | Memastikan tidak ada kontradiksi antar dokumen yang terlewat oleh satu model AI |
| Ingin review kode (jika nanti ditempel ke DeepSeek) | Mendapatkan review dari sudut pandang lain sebelum kode dianggap final |

**Catatan penting:** DeepSeek (atau AI lain) tidak memiliki memori atas percakapan sebelumnya dengan Claude. Maka template di bawah ini selalu menyertakan ringkasan konteks penuh secara eksplisit di awal prompt.

---

## 2. Template Prompt — Validasi Dokumentasi/Keputusan Produk

```
Kamu adalah Senior Software Architect independen yang diminta melakukan
review kedua (second opinion) atas sebuah proyek. Kamu TIDAK terlibat
dalam pembuatan dokumentasi sebelumnya, jadi bersikap kritis dan objektif.

KONTEKS PROYEK:
Nama produk: Bantu Guru Yuk | Presensi Siswa
Target pengguna: Guru SD, SMP, SMA di Indonesia
Tujuan utama: Aplikasi presensi sekolah yang sangat sederhana,
Offline First, Mobile First, dapat diisi 1 kelas dalam < 30 detik.

Tech stack: React, TypeScript, Vite, Tailwind CSS, shadcn/ui,
Dexie (IndexedDB), Convex, Repository Pattern, PWA.

Model bisnis:
- FREE: lokal, 1 kelas, import Excel, presensi, rekap bulanan/semester,
  export PDF/Excel, backup lokal.
- PRO (Rp10.000/tahun): unlimited kelas, cloud sync (Convex),
  multi device, kalender akademik dapat diedit, import update Excel,
  backup & restore cloud, logo sekolah.

Keputusan yang sudah final dan TIDAK BOLEH diusulkan ulang:
- Tidak ada QR Code, GPS, Fingerprint, Face Recognition.
- Tidak ada Jam Masuk, Jam Pulang, Status Terlambat.
- Semua siswa default Hadir; guru hanya mengubah status Sakit/Izin/Alpha.

[TEMPEL BAGIAN DOKUMEN YANG INGIN DIVALIDASI DI SINI]

TUGAS KAMU:
1. Identifikasi apakah ada inkonsistensi internal dalam dokumen yang
   ditempel di atas.
2. Identifikasi apakah ada risiko teknis atau bisnis yang belum
   disebutkan.
3. Berikan maksimal 5 poin kritik paling penting, urutkan dari yang
   paling kritis.
4. Untuk setiap kritik, jelaskan alasan dan dampaknya jika tidak
   diperbaiki.
5. JANGAN mengusulkan ulang fitur yang sudah dinyatakan final di atas
   (QR/GPS/Fingerprint/Face Recognition/Jam Masuk/Jam Pulang/Terlambat).

Jawab dalam Bahasa Indonesia, ringkas, dan langsung ke poin.
```

---

## 3. Template Prompt — Review Kode (Saat Fase Implementasi)

```
Kamu adalah Senior Code Reviewer independen. Review kode berikut
berdasarkan prinsip arsitektur proyek ini:

PRINSIP ARSITEKTUR WAJIB:
- Repository Pattern: komponen UI tidak boleh mengakses Dexie/Convex
  secara langsung.
- Offline First: setiap operasi tulis harus berhasil secara lokal
  dahulu, sinkronisasi cloud berjalan di latar belakang.
- Tidak ada logika bisnis di dalam komponen tampilan.

[TEMPEL KODE YANG INGIN DIREVIEW DI SINI]

TUGAS KAMU:
1. Periksa apakah kode di atas melanggar prinsip arsitektur di atas.
2. Periksa potensi bug terkait penanganan offline/online.
3. Periksa konsistensi penamaan dengan konvensi: fungsi baca data
   diawali kata pengambilan, fungsi tulis data diawali kata penyimpanan,
   konstanta status ditulis eksplisit (bukan singkatan H/S/I/A di
   level kode).
4. Berikan saran perbaikan konkret, bukan hanya kritik umum.

Jawab dalam Bahasa Indonesia, ringkas, dan langsung ke poin.
```

---

## 4. Template Prompt — Audit Konsistensi Antar Dokumen

```
Kamu diminta melakukan audit konsistensi atas serangkaian dokumen
produk untuk aplikasi "Bantu Guru Yuk | Presensi Siswa" (presensi
sekolah, Offline First, Mobile First, target Indonesia).

[TEMPEL ISI BEBERAPA DOKUMEN YANG INGIN DICEK SEKALIGUS DI SINI,
CONTOH: 00_MasterContext.md DAN 04_Database.md]

TUGAS KAMU:
1. Cari kontradiksi langsung antar dokumen di atas (misalnya aturan
   bisnis yang disebutkan berbeda antara dua dokumen).
2. Cari celah (gap): hal yang disebutkan perlu ada di satu dokumen
   namun tidak pernah didetailkan di dokumen lain yang seharusnya
   menjelaskannya.
3. Laporkan dalam bentuk tabel: [Dokumen A] vs [Dokumen B] vs
   [Deskripsi Inkonsistensi/Gap] vs [Saran Perbaikan].

Jawab dalam Bahasa Indonesia.
```

---

## 5. Prinsip Penggunaan Output dari AI Pembanding

| Prinsip | Penjelasan |
|---|---|
| Output DeepSeek/AI lain bersifat saran, bukan keputusan otomatis | Hai tetap pemegang keputusan akhir; saran AI pembanding hanya menjadi bahan pertimbangan tambahan. |
| Kritik yang bertentangan dengan keputusan frozen tidak otomatis diterima | Jika AI pembanding mengusulkan kembali fitur yang sudah ditolak (QR/GPS/dst.), usulan tersebut harus ditolak kecuali Hai secara sadar memutuskan membuka kembali diskusi tersebut melalui proses `13_ChangeLog.md`. |
| Hasil validasi yang relevan dicatat | Jika kritik dari AI pembanding diterima dan menghasilkan perubahan, perubahan tersebut harus dicatat di `13_ChangeLog.md` agar tetap terlacak. |

---

## 6. Acceptance Criteria — Dokumen Ini

- [x] Tersedia template prompt yang dapat langsung dipakai untuk validasi dokumentasi.
- [x] Tersedia template prompt untuk review kode pada fase implementasi.
- [x] Tersedia template prompt untuk audit konsistensi antar dokumen.
- [x] Setiap template menyertakan konteks proyek secara mandiri agar tidak bergantung pada memori percakapan sebelumnya.
- [x] Prinsip penggunaan output AI pembanding dijelaskan agar tidak membuka kembali keputusan yang sudah final secara tidak sengaja.

---

## 7. Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Status | Final |
| Dokumen Terkait | `10_ClaudeSprint.md`, `02_FrozenSummary.md` |
| Dokumen Berikutnya | `12_ReviewChecklist.md` |
