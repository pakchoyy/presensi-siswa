-- Tanggal mulai trial (ms epoch) dari HP pengguna, dicatat saat percobaan sambung cloud.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_mulai bigint;
