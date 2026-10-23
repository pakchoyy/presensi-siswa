-- Program "Ajak teman" (sudah dijalankan di project Presensi BGY).
-- Hanya service role (api/license.js) yang membaca/menulis; RLS aktif tanpa policy = browser ditolak.
create table if not exists public.referrals (
  code text primary key,                 -- PY-XXXXXX
  owner_email text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.referral_rewards (
  id bigserial primary key,
  code text not null,
  owner_email text not null,
  buyer_email text not null unique,      -- satu pembeli hanya sekali memberi bonus
  days int not null default 30,
  created_at timestamptz not null default now()
);
create index if not exists referral_rewards_owner_idx on public.referral_rewards (owner_email, created_at);
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
revoke all on public.referrals from anon, authenticated;
revoke all on public.referral_rewards from anon, authenticated;

-- Aturan (api/license.js): pembeli BARU (belum pernah punya lisensi) + kode valid + bukan diri sendiri
-- + pemilik punya lisensi aktif + maks 6 bonus per 180 hari → lisensi pemilik +30 hari.
-- Cek riwayat: select * from referral_rewards order by created_at desc;
