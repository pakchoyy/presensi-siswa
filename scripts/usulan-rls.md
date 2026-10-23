# Usulan pengetatan RLS Supabase — SUDAH DIJALANKAN 23 Okt 2026 (lihat scripts/rls-lock.sql; versi akhir pakai login kode email, bukan login senyap)

Status per 23 Okt 2026 (project `ikemxrcimsqsbbnuhkld`), dicek read-only:

| Tabel | Policy sekarang | Risiko |
|---|---|---|
| `profiles` | SELECT/INSERT/UPDATE `true` | Siapa pun dengan anon key (ada di JS aplikasi) bisa membaca **semua email**, dan mengubah `tier` akun mana pun jadi PRO. |
| `cloud_students`, `cloud_classrooms`, `cloud_attendance_*`, `cloud_teachers`, `cloud_schools`, `cloud_backups`, `cloud_calendar_entries`, `cloud_academic_years`, `cloud_tombstones` | ALL `true` | **Nama, NISN, dan presensi semua siswa semua pelanggan bisa dibaca, diubah, dihapus** oleh siapa pun. Ini paling serius (data anak). |
| `students`, `classrooms`, `attendance_*`, `teachers`, `schools`, `backups`, `devices`, `sync_*`, `calendar_entries`, `academic_years` (tabel lama) | ALL `true` | Sama seperti di atas. |
| `licenses` | RLS aktif, tanpa policy | Aman (hanya lewat `api/license.js` dengan service role). |
| `cloud_guru_*` | `user_id = auth.uid()` | Sudah benar. |

## Akar masalah

Cloud sync mengenali pengguna dari **email** (`profiles.email` → `user_id`) tanpa login Supabase.
Selama itu, RLS tidak bisa membedakan pemilik data karena `auth.uid()` kosong.

## Rencana (bertahap, tanpa memutus pelanggan)

### Tahap 1 — login senyap per email (aplikasi)
Pak Choy ingin pemulihan cukup dengan email. Tetap bisa, dengan cara:
1. Saat pengguna PLUS/PRO menghubungkan cloud, aplikasi memanggil endpoint baru
   `api/cloud-session.js` (service role): cek lisensi aktif untuk email itu (+ batas perangkat
   di tabel `devices`), lalu buat/ambil user Supabase Auth untuk email tersebut dan kembalikan
   session (`auth.admin.generateLink({type:'magiclink'})` → `verifyOtp` di server, atau
   `auth.admin.createUser` + token khusus). Pengguna tidak perlu cek email.
2. Klien menyimpan session (`supabase.auth.setSession`) → semua query cloud membawa JWT.
3. `profiles.id` disamakan dengan `auth.users.id` (migrasi: buat auth user untuk tiap profile
   lama dengan id yang sama; `auth.admin.createUser({ id, email, email_confirm: true })`).
4. Ganti `getUserIdByEmail()` di `sync.service.ts`, `backup.service.ts`, `CloudAuthContext.tsx`
   dengan `(await supabase.auth.getUser()).data.user.id`.
5. Pindahkan semua perubahan `profiles.tier` dari klien (PengaturanPage) ke `api/license.js`
   (sudah melakukan `markTier`), hapus update tier dari browser.

### Tahap 2 — kunci RLS (SQL, jalankan setelah Tahap 1 terpasang ≥1 minggu)
```sql
-- profiles: hanya baris sendiri, tier tidak bisa diubah dari klien
drop policy if exists pol_profiles_select on public.profiles;
drop policy if exists pol_profiles_update on public.profiles;
drop policy if exists pol_profiles_insert on public.profiles;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
create policy profiles_update_own on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and tier = (select tier from public.profiles p where p.id = auth.uid()));
-- insert profile hanya lewat server (service role) → tidak ada policy insert.

-- tabel cloud_*: pola sama untuk tiap tabel
do $$ declare t text; begin
  foreach t in array array['cloud_students','cloud_classrooms','cloud_attendance_sessions',
    'cloud_attendance_records','cloud_teachers','cloud_schools','cloud_backups',
    'cloud_calendar_entries','cloud_academic_years','cloud_tombstones'] loop
    execute format('drop policy if exists %I on public.%I', 'pol_'||t, t);
    execute format('create policy %I on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t||'_own', t);
  end loop; end $$;
-- catatan: nama policy lama berbeda di beberapa tabel (pol_cloud_att_records, pol_cloud_att_sessions,
-- pol_cloud_calendar) → drop manual juga.

-- tabel lama non-cloud (students, classrooms, attendance_*, teachers, schools, backups,
-- devices, sync_*, calendar_entries, academic_years): cek dulu masih dipakai atau tidak.
-- api/absen.js memakai service role sehingga tidak terpengaruh RLS.
-- Jika tidak dipakai klien: hapus semua policy → hanya service role yang bisa akses.
```

### Dampak
- Absen mandiri (`api/absen.js`) dan lisensi (`api/license.js`) memakai service role → tidak terpengaruh.
- Pelanggan lama: setelah update aplikasi, cloud sync pertama kali otomatis membuat session dari
  email (Tahap 1), jadi tidak ada langkah tambahan bagi guru.
- Pelanggan yang belum update aplikasi saat Tahap 2 dijalankan: sync gagal sampai PWA ter-update
  (biasanya otomatis saat dibuka). Karena itu Tahap 2 ditunda ≥1 minggu.
- Risiko sisa: siapa pun yang tahu email pelanggan PLUS/PRO bisa "memulihkan" lisensinya
  (keputusan Pak Choy: restore cukup email). Dibatasi oleh limit perangkat di Tahap 1.
