-- Satu pesanan toko = satu kode lisensi (dipakai api/c2l41mpr0.js). Sudah dijalankan di Supabase.
alter table public.licenses add column if not exists klaim_order text;
create unique index if not exists licenses_klaim_order_uq on public.licenses(klaim_order) where klaim_order is not null;
-- Rollback: drop index licenses_klaim_order_uq; alter table public.licenses drop column klaim_order;
-- Status 'terkirim' (kode sudah diberikan ke pembeli, belum diaktivasi) belum diizinkan check lama.
alter table public.licenses drop constraint licenses_status_check, add constraint licenses_status_check check (status = any (array['tersedia','terkirim','digunakan','kadaluarsa']));
