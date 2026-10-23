-- Program Affiliate (khusus PRO) + pengaturan admin. SUDAH dijalankan di project Presensi BGY.
-- Semua tabel: RLS aktif tanpa policy + revoke anon/authenticated → hanya service role (api/license.js, api/admin.js).

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_ledger (
  id bigserial primary key,
  owner_email text not null,
  type text not null check (type in ('earn','withdraw')),
  amount integer not null check (amount > 0),
  status text not null check (status in ('ok','pending','paid','rejected')),
  buyer_email text,
  note text,
  payout_info text,             -- "Nama — DANA 0812..." dari form Tarik Dana
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists affiliate_ledger_owner_idx on public.affiliate_ledger (owner_email, created_at);
create index if not exists affiliate_ledger_status_idx on public.affiliate_ledger (type, status);

alter table public.app_settings enable row level security;
alter table public.affiliate_ledger enable row level security;
revoke all on public.app_settings from anon, authenticated;
revoke all on public.affiliate_ledger from anon, authenticated;
revoke all on sequence public.affiliate_ledger_id_seq from anon, authenticated;

alter table public.referral_rewards add column if not exists buyer_tier text;

insert into public.app_settings (key, value) values
  ('affiliate_commission', '2000'::jsonb),
  ('affiliate_bonus_days', '30'::jsonb),
  ('affiliate_min_withdraw', '20000'::jsonb),
  ('affiliate_cap_per_semester', '6'::jsonb)
on conflict (key) do nothing;

-- Saldo = earn(ok) − withdraw(pending + paid). Ditolak (rejected) otomatis mengembalikan saldo.
-- Cek: select owner_email, type, status, sum(amount) from affiliate_ledger group by 1,2,3;

-- ROLLBACK (hati-hati, menghapus riwayat komisi):
-- drop table if exists public.affiliate_ledger;
-- drop table if exists public.app_settings;
-- alter table public.referral_rewards drop column if exists buyer_tier;
