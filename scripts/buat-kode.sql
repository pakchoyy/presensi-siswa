-- TEMPLATE: buat kode lisensi Presensi Siswa. Jalankan manual di Supabase SQL Editor.
-- Ganti angka di generate_series untuk jumlah kode. Masa aktif (180 hari) dihitung saat aktivasi.

-- 10 kode PLUS (Rp17.000/semester)
insert into licenses (kode, tier, product, status)
select 'BGY-PS-PLUS-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)), 'PLUS', 'siswa', 'tersedia'
from generate_series(1, 10);

-- 10 kode PRO (Rp32.000/semester)
insert into licenses (kode, tier, product, status)
select 'BGY-PS-PRO-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)), 'PRO', 'siswa', 'tersedia'
from generate_series(1, 10);

-- Lihat stok kode yang belum terpakai
select tier, kode from licenses where status = 'tersedia' and product = 'siswa' order by tier, kode;
