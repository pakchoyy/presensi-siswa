-- Pengumuman dari admin ke pengguna aplikasi. Sudah dijalankan di Supabase.
-- Hanya service role (api/admin.js & api/license.js) yang membaca/menulis.
create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null default '',
  target text not null default 'all' check (target in ('all','free','plus','pro')),
  level text not null default 'info' check (level in ('info','penting')),
  link_url text,
  link_label text,
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
revoke all on public.announcements from anon, authenticated;

-- Rollback:
-- drop table if exists public.announcements;
