-- Hapus data cloud Presensi Siswa milik akun masa coba yang tidak berlangganan.
-- Syarat (semua harus terpenuhi):
--   * profiles.trial_mulai tercatat (akun pernah memakai cloud saat masa coba),
--   * masa coba 30 hari + tenggang 14 hari sudah lewat,
--   * TIDAK punya baris lisensi apa pun (Siswa maupun Guru, aktif atau kedaluwarsa),
--   * tidak memakai Presensi Guru (perangkat guru:, sekolah/akun guru di cloud),
--     karena cloud_schools/cloud_academic_years/cloud_calendar_entries dipakai bersama.
-- Profil & akun login tidak dihapus; data di HP pengguna tidak tersentuh.

create or replace function public.trial_siswa_kedaluwarsa()
returns table(profile_id uuid, auth_id uuid, email text)
language sql stable security definer set search_path = public as $$
  select p.id, p.auth_id, p.email
  from profiles p
  where p.trial_mulai is not null
    and p.trial_mulai + 44::bigint * 86400000 < (extract(epoch from now()) * 1000)::bigint
    and not exists (select 1 from licenses l where lower(l.email) = lower(p.email) and l.product in ('siswa', 'guru'))
    and not exists (select 1 from devices d where d.user_id = p.id and d.device_id like 'guru:%')
    and not exists (select 1 from cloud_guru_sekolah s where s.owner_user_id::text in (p.id::text, coalesce(p.auth_id::text, '')))
    and not exists (select 1 from cloud_guru_teachers t where t.user_id::text in (p.id::text, coalesce(p.auth_id::text, '')))
$$;

create or replace function public.hapus_cloud_trial_siswa()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  ids text[];
  n int := 0;
begin
  for r in select * from trial_siswa_kedaluwarsa() loop
    ids := array[r.profile_id::text, coalesce(r.auth_id::text, r.profile_id::text)];
    delete from cloud_attendance_records where user_id::text = any(ids);
    delete from cloud_attendance_sessions where user_id::text = any(ids);
    delete from cloud_students where user_id::text = any(ids);
    delete from cloud_classrooms where user_id::text = any(ids);
    delete from cloud_teachers where user_id::text = any(ids);
    delete from cloud_backups where user_id::text = any(ids);
    delete from cloud_tombstones where user_id::text = any(ids);
    delete from cloud_calendar_entries where user_id::text = any(ids);
    delete from cloud_academic_years where user_id::text = any(ids);
    delete from cloud_schools where user_id::text = any(ids);
    delete from devices where user_id = r.profile_id and device_id not like 'guru:%';
    n := n + 1;
  end loop;
  return n;
end $$;

-- Hanya untuk jadwal server, tidak bisa dipanggil dari aplikasi.
revoke all on function public.trial_siswa_kedaluwarsa() from public, anon, authenticated;
revoke all on function public.hapus_cloud_trial_siswa() from public, anon, authenticated;

select cron.schedule('hapus-cloud-trial-siswa', '41 19 * * *', 'SELECT public.hapus_cloud_trial_siswa();');
