-- Perbaikan audit 8-16 (sudah dijalankan di Supabase ikemxrcimsqsbbnuhkld).

-- #13 kode lisensi unik
create unique index if not exists licenses_kode_uniq on public.licenses(kode);

-- #9 rate limit bersama semua instance serverless
create table if not exists public.rate_hits (key text not null, at timestamptz not null default now());
create index if not exists rate_hits_key_at on public.rate_hits(key, at);
alter table public.rate_hits enable row level security;
revoke all on public.rate_hits from anon, authenticated;

create or replace function public.rate_hit(p_key text, p_max int, p_window_s int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if random() < 0.01 then delete from rate_hits where at < now() - interval '1 day'; end if;
  select count(*) into n from rate_hits where key = p_key and at > now() - make_interval(secs => p_window_s);
  if n >= p_max then return true; end if;
  insert into rate_hits(key) values (p_key);
  return false;
end $$;
revoke all on function public.rate_hit(text,int,int) from public, anon, authenticated;

-- #11 bonus affiliate atomik (cap + tambah hari + komisi dalam satu transaksi per pemilik)
create or replace function public.affiliate_credit(p_code text, p_owner text, p_buyer text, p_tier text, p_days int, p_commission int, p_cap int, p_license_id bigint)
returns text language plpgsql security definer set search_path = public as $$
declare given int;
begin
  perform pg_advisory_xact_lock(hashtext('aff:' || p_owner));
  select count(*) into given from referral_rewards where owner_email = p_owner and created_at > now() - interval '180 days';
  if given >= p_cap then return 'cap'; end if;
  begin
    insert into referral_rewards(code, owner_email, buyer_email, days, buyer_tier) values (p_code, p_owner, p_buyer, p_days, p_tier);
  exception when unique_violation then return 'used';
  end;
  if p_days > 0 then
    update licenses set tanggal_berakhir = greatest((extract(epoch from now())*1000)::bigint, coalesce(tanggal_berakhir,0)) + p_days::bigint * 86400000 where id = p_license_id;
  end if;
  if p_commission > 0 then
    insert into affiliate_ledger(owner_email, type, amount, status, buyer_email, note)
    values (p_owner, 'earn', p_commission, 'ok', p_buyer, 'Pembelian ' || p_tier || ' pakai kode ' || p_code);
  end if;
  return 'ok';
end $$;
revoke all on function public.affiliate_credit(text,text,text,text,int,int,int,bigint) from public, anon, authenticated;

-- Self-check (dijalankan dalam transaksi lalu rollback; hasil: ok, used, cap, false, true):
-- begin;
-- select affiliate_credit('PY-TEST01','zz-owner@test.invalid','zz-buyer@test.invalid','PLUS',12,1000,6,-1); -- ok
-- select affiliate_credit('PY-TEST01','zz-owner@test.invalid','zz-buyer@test.invalid','PLUS',12,1000,6,-1); -- used
-- select affiliate_credit('PY-TEST01','zz-owner@test.invalid','zz-b2@test.invalid','PLUS',12,1000,1,-1);   -- cap
-- select rate_hit('test:x',1,60); -- false
-- select rate_hit('test:x',1,60); -- true
-- rollback;

-- Rollback:
-- drop function if exists public.affiliate_credit(text,text,text,text,int,int,int,bigint);
-- drop function if exists public.rate_hit(text,int,int); drop table if exists public.rate_hits;
-- drop index if exists licenses_kode_uniq;
