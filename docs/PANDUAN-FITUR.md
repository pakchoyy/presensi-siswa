# Panduan Fitur Presensi Yuk — untuk diadopsi ke web lain

Ringkasan semua yang dibangun di **Presensi Yuk | Siswa** (presiswa.bantuguruyuk.web.id), **Presensi Yuk | Guru** (preguru.bantuguruyuk.web.id), dan toko **Kreacy** (kreacy.my.id, repo `bgy-store`). Dipakai sebagai contekan saat memasang fitur serupa di web lain (bmedia, buatjadwal, bgy-buatsoal, dll).

Setiap bagian berisi: **Apa** · **Cara kerja** · **File kunci** · **Cocok untuk** · **Jebakan yang sudah kami alami**.

Teknologi dasar: Vite + React + TypeScript (PWA), data lokal di Dexie (IndexedDB), backend Supabase (Postgres + RLS + Auth), fungsi server di Vercel (`api/*.js`), email lewat Resend.

---

## 1. Paket langganan FREE / PLUS / PRO + masa coba

- **Apa:** FREE (1 kelas × 10 siswa), PLUS Rp17.000/semester (4 kelas × 25 siswa, 1 perangkat), PRO Rp32.000/semester (tanpa batas, 3 perangkat). Pengguna baru dapat **coba PRO 30 hari**, lalu otomatis FREE (tidak terkunci). Sekali ditawari "Coba PRO lagi 7 hari".
- **Cara kerja:** satu daftar fitur per paket, dicek dengan `canUse("nama_fitur", tier)`. `realTier` = paket asli dari lisensi; `tier` = paket efektif (termasuk masa coba). Fitur cloud selalu pakai `realTier`.
- **File kunci:** `src/lib/features.ts`, `src/contexts/AppContext.tsx`, `src/components/pro/UpgradePage.tsx` (tabel pembanding + copy "cuma Rp5.300 sebulan").
- **Cocok untuk:** semua web yang ingin versi gratis + berbayar.
- **Jebakan:** jangan cek `tier === "PRO"` tersebar di banyak file — selalu lewat `canUse`. Data di atas batas FREE tetap terlihat, hanya kelas pertama yang bisa diubah (lebih ramah daripada mengunci total).

## 2. Lisensi & klaim kode dari toko

- **Apa:** kode `BGY-PS-PLUS-XXXX` / `BGY-PS-PRO-XXXX`, berlaku 180 hari. Pembeli bayar di toko → buka link klaim → kode muncul → tombol "Aktifkan" membuka `/aktivasi?kode=` dengan kode terisi.
- **Cara kerja:** **satu pesanan = satu kode**. Toko menyisipkan `{order}` dan `{sig}` (HMAC rahasia) ke link file produk; server Presensi memverifikasi tanda tangan dan mengikat kode ke nomor pesanan (kolom unik), jadi link yang dibagikan orang lain tetap memberi kode yang sama. Aktivasi, perpanjang, dan pulihkan lewat `api/license.js`. Perpanjang pakai kode PLUS saat PRO masih aktif ditolak.
- **File kunci:** `api/c2l41mpr0.js`, `api/license.js`, `src/lib/aktivasi-link.ts`, `scripts/klaim-order.sql`; di toko: `bgy-store/lib/product-download.js`, `app/api/download/route.js`.
- **Cocok untuk:** produk digital berbayar apa pun yang dijual di Kreacy.
- **Jebakan:** link klaim dengan token tetap bisa dibuka berulang dan menguras stok — wajib diikat ke pesanan. Kolom `licenses.kode` harus unik. Samakan stok produk di toko dengan stok kode di database.

## 3. Login kode email (OTP) + batas perangkat

- **Apa:** masuk ke cloud cukup email → kode 8 angka dikirim ke email → sekali per perangkat. PLUS 1 perangkat, PRO 3; kalau penuh muncul daftar perangkat + tombol keluarkan.
- **Cara kerja:** server membuat kode via `supabase.auth.admin.generateLink` lalu mengirim sendiri lewat Resend (tidak memakai SMTP bawaan Supabase yang dibatasi). Setelah verifikasi, `api/cloud-login.js` mengecek lisensi, menautkan profil (`profiles.auth_id`), dan mendaftarkan perangkat. Perangkat yang dikeluarkan berhenti sinkron.
- **File kunci:** `api/otp.js`, `api/cloud-login.js`, `src/components/auth/OtpVerify.tsx`, `src/lib/device.ts`.
- **Cocok untuk:** web yang menyimpan data pengguna di cloud.
- **Jebakan:** saat menyalin API key, jangan sampai satu huruf terpotong. Pengirim pakai domain sendiri yang terverifikasi di Resend (DKIM/SPF di Cloudflare, mode DNS only). Tulis "Kode dari email", jangan "6 angka".

## 4. Keamanan

- **Apa:** semua tabel data pengguna hanya bisa dibaca/diubah pemiliknya; paket tidak bisa dinaikkan sendiri dari browser.
- **Cara kerja:** RLS Supabase per pemilik (`my_profile_id()`), tabel sensitif hanya service role; batas percobaan (rate limit) disimpan di tabel `rate_hits` (berlaku untuk semua server); email admin dari env `ADMIN_EMAILS`; CORS hanya domain sendiri; header keamanan + cache di `vercel.json`.
- **File kunci:** `scripts/*.sql` (catatan RLS, rollback), `api/*.js`, `vercel.json`.
- **Cocok untuk:** semua web dengan Supabase.
- **Jebakan:** policy `USING (true)` di tabel `profiles` = siapa pun bisa baca semua email dan mengubah paket. Rate limit di memori fungsi serverless tidak bekerja (tiap instance punya memori sendiri). Saat mengunci RLS, ubah dulu aplikasinya, baru kunci database, dan cek data lama tidak terputus.

## 5. Sinkron cloud offline-first + pengaman data

- **Apa:** aplikasi jalan offline (data di HP), lalu sinkron ke Supabase untuk PLUS/PRO yang sudah verifikasi.
- **Cara kerja:** sinkron bertahap per perubahan; ambil data per 1.000 baris sampai habis; kalau ada error, cap waktu tidak dimajukan dan data hapusan tidak dibuang (dicoba lagi). **Status jujur:** "tersinkron/aman" hanya tampil kalau server benar-benar menerima. **Keluar selalu menyimpan backup** (file Download + salinan di HP) dan layar awal menawarkan "Pulihkan data sebelum keluar". Setelah tarik data, tampilan menyegarkan diri.
- **File kunci:** `src/services/sync.service.ts`, `src/services/backup.service.ts`, `src/hooks/useSyncStatus.ts`, `src/hooks/useSyncDebounce.ts`, `src/components/wizard/WizardSetup.tsx`.
- **Cocok untuk:** web yang dipakai di HP dan harus jalan tanpa internet.
- **Jebakan (pernah terjadi):** indikator bilang "tersinkron" padahal sinkron dijeda → pengguna menekan Keluar → data hilang. Jangan pernah menghapus data lokal tanpa backup. Jangan hapus database lokal otomatis saat Dexie "blocked". Data lama bisa "yatim" di profil tanpa email — cari lewat nama sekolah / email guru lalu pindahkan.

## 6. Super Admin

- **Apa:** halaman `/admin` (atau ketuk judul header 5× dalam 4 detik) → login kode email → hanya email admin yang diterima server.
- **Isi:** **Ringkasan** (pengguna, aktif/expired, penjualan bulan & semester, akan habis ≤14 hari), **Pengguna** (filter, cari, perpanjang, ubah paket, reset perangkat, ganti email, hapus dengan ketik HAPUS), **Kode** (stok, tambah sampai 1.000, kode cadangan untuk yang lupa), **Affiliate** (saldo, tarik dana: dibayar/tolak), **Atur** (komisi, bonus, minimum tarik, pengumuman). Navbar bawah.
- **File kunci:** `api/admin.js`, `src/components/admin/AdminPage.tsx`.
- **Cocok untuk:** setiap produk berbayar.
- **Jebakan:** pintu rahasia (ketuk 5×) bukan pengaman — pengamannya tetap cek server. Di HP, ketukan cepat bisa dianggap zoom: pakai `touch-action: manipulation` dan area ketuk lebar.

## 7. Program Affiliate (khusus PRO)

- **Apa:** pelanggan PRO punya kode; pembeli baru yang memakainya membuat pengajak dapat **Rp1.000 + 12 hari** (pembeli PLUS) atau **Rp2.500 + 30 hari** (pembeli PRO). Dashboard progres, daftar pengguna (email disamarkan), tarik dana minimal Rp20.000 lewat WA.
- **Cara kerja:** dihitung di server saat aktivasi dalam satu fungsi database (anti-dobel, batas per semester); penarikan "menunggu" hanya boleh satu per orang (indeks unik).
- **File kunci:** `api/license.js`, `src/components/pro/AffiliatePage.tsx`, `scripts/affiliate.sql`.
- **Cocok untuk:** produk yang menyebar lewat grup guru.
- **Jebakan:** baca–ubah–tulis saldo/hari bisa saling menimpa — lakukan atomik di database.

## 8. Pengumuman

- **Apa:** admin menulis pengumuman per paket (semua/FREE/PLUS/PRO), level **info** (kartu di halaman utama) atau **penting** (pop-up sekali, hanya tutup lewat tombol "Saya mengerti", lalu tetap jadi kartu).
- **File kunci:** `api/admin.js`, `api/license.js?action=announcements`, `src/components/shared/AnnouncementCard.tsx`.
- **Cocok untuk:** semua web.

## 9. Tampilan & PWA

- **Nama & ikon seragam:** "Presensi Yuk | Siswa" / "| Guru"; ikon dengan nama file berversi (`py-*-v3.png`) agar cache aman; `manifest.json` selalu dicek ulang; `apple-mobile-web-app-title`. Android memperbarui ikon terpasang sendiri (≤1 hari), iPhone harus pasang ulang.
- **Ajakan install:** kartu di tengah layar setiap kunjungan di browser (Android tombol Install, iPhone petunjuk Bagikan → Tambahkan ke Layar Utama); "Nanti saja" hanya untuk sesi itu.
- **Navbar bawah** dengan tombol tengah besar (Presensi ↔ Scan QR saat Mode QR aktif).
- **Teks info** di atas navbar: satu pesan bergantian (fade), tiap pesan punya link ke alat BGY; PRO bebas iklan.
- **Toast modern** (atas tengah, ikon per jenis, geser untuk tutup).
- **Data contoh** di wizard + pita "Mode Contoh".
- **Pengaturan berkelompok** dengan label dan aksen warna per kelompok.
- **File kunci:** `src/components/layout/*`, `src/components/shared/InstallPrompt.tsx`, `src/components/shared/Toast.tsx`, `public/manifest.json`, `index.html`.
- **Jebakan:** teks panjang terpotong di HP 360px — selalu cek. `overflow-x: hidden` pada pembungkus membuat header sticky tidak menempel (pakai `clip`).

## 10. Hemat biaya (Supabase gratis)

- Batas paket gratis: database 500 MB, transfer 5 GB/bulan, 200 koneksi realtime bersamaan, 50.000 pengguna login/bulan, project dijeda kalau 7 hari tidak dipakai.
- Satu catatan absen ±340 byte → ±2 MB per guru per tahun → muat ±200 guru aktif/tahun.
- Yang sudah dihemat: logo dikompres ≤256px WebP (<25 KB), backup cloud maksimal 3 per akun, realtime hanya saat aplikasi tampil, sinkron hanya data yang berubah, library berat (PDF/Excel/QR) dimuat saat dipakai.
- Naik ke Supabase Pro (±Rp400rb/bulan) saat pelanggan PRO aktif >150.

---

## Checklist mengadopsi ke web lain

1. **Tentukan paket & fitur** → salin pola `features.ts` (`canUse`, `LIMITS`, masa coba).
2. **Supabase:** tabel `profiles` (dengan `auth_id`), `licenses`, `devices`, tabel data dengan `user_id`; RLS per pemilik sejak awal; tabel `rate_hits`, `app_settings`, `announcements`.
3. **Fungsi server Vercel:** salin `api/otp.js`, `api/cloud-login.js`, `api/license.js`, `api/admin.js`, `api/c2l41mpr0.js` lalu sesuaikan nama produk.
4. **Toko Kreacy:** produk baru, link file pakai `?t=TOKEN&order={order}&sig={sig}`, isi stok sama dengan stok kode.
5. **Email:** domain pengirim di Resend (DNS di Cloudflare), API key khusus kirim.
6. **Data lokal + sinkron + backup saat Keluar** (kalau aplikasi offline-first).
7. **PWA:** manifest, ikon berversi, ajakan install, `vercel.json` (cache + header keamanan).
8. **Uji sebelum rilis:** beli sekali (harga sementara Rp1.000), login di 2 HP, Keluar → pulihkan, pengumuman uji.

### Pengaturan Vercel (env) yang dibutuhkan — nama saja

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `OTP_FROM_EMAIL`, `KLAIM_TOKEN_PLUS`, `KLAIM_TOKEN_PRO`, `KLAIM_HMAC_SECRET` (sama di toko), `ADMIN_EMAILS`.

### Pelajaran terpenting

1. Jangan pernah menampilkan "aman/tersinkron" tanpa bukti dari server.
2. Jangan pernah menghapus data pengguna tanpa backup.
3. Semua aturan uang, paket, dan admin dicek di server, bukan di aplikasi.
4. Tiap perubahan database: catat SQL + rollback di `scripts/`.
5. Uji di HP kecil (360px) dan mode gelap sebelum rilis.
