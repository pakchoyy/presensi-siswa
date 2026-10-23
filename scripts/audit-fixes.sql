-- Audit #2: satu penarikan "pending" per affiliate (klik ganda / request paralel ditolak DB).
-- Sudah dijalankan di Supabase (ikemxrcimsqsbbnuhkld).
create unique index if not exists affiliate_ledger_one_pending_withdraw
  on affiliate_ledger(owner_email) where type = 'withdraw' and status = 'pending';
-- rollback: drop index if exists affiliate_ledger_one_pending_withdraw;

-- Audit #7: TIDAK membuat unique (user_id,kelas_id,tanggal) dan TIDAK menghapus sesi dobel lama.
-- Alasan: HP guru masih menyimpan sesi dobel lama (id acak dari versi lama). Kalau salah satunya
-- diedit lalu diupload, index itu akan menolak upload terus-menerus dan sinkron macet.
-- Pencegahan sesi dobel baru: api/absen.js kini memakai local_id deterministik yang sama dengan
-- aplikasi (sessionIdFrom/recordIdFrom) + upsert on (user_id,local_id) yang sudah unik.
-- Cek sisa dobel lama:
-- select user_id,kelas_id,tanggal,count(*) from cloud_attendance_sessions group by 1,2,3 having count(*)>1;
