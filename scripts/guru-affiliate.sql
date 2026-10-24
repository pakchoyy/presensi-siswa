-- Affiliate lintas produk (Siswa + Guru). Sudah dijalankan via Supabase MCP.
alter table referral_rewards add column if not exists product text not null default 'siswa';
alter table affiliate_ledger add column if not exists product text;
create unique index if not exists referral_rewards_buyer_product_key on referral_rewards(buyer_email, product);
alter table referral_rewards drop constraint if exists referral_rewards_buyer_email_key;

-- affiliate_credit dengan p_product (cap dihitung lintas produk; license_id boleh null).
-- Lihat definisi lengkap di database: \df+ affiliate_credit. Versi 8-argumen lama masih ada, tidak dipakai lagi.

insert into app_settings(key, value) values
  ('affiliate_commission_guru_plus','1500'),('affiliate_bonus_days_guru_plus','12'),
  ('affiliate_commission_guru_pro','3000'),('affiliate_bonus_days_guru_pro','30')
on conflict (key) do nothing;

-- Rollback:
-- delete from app_settings where key like 'affiliate_%_guru_%';
-- drop function if exists affiliate_credit(text,text,text,text,integer,integer,integer,bigint,text);
-- drop index if exists referral_rewards_buyer_product_key;
-- alter table referral_rewards add constraint referral_rewards_buyer_email_key unique (buyer_email);  -- gagal kalau sudah ada pembeli di 2 produk
-- alter table referral_rewards drop column product; alter table affiliate_ledger drop column product;
