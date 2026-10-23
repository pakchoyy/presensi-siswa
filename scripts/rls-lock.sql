-- Kunci RLS (SUDAH DIJALANKAN 23 Okt 2026 di project ikemxrcimsqsbbnuhkld).
-- Data cloud hanya bisa diakses pemiliknya setelah login kode email (OTP).
-- Nama policy lama dipertahankan; ekspresinya diubah dengan ALTER POLICY.
-- Server (api/*.js, service role) tidak terpengaruh RLS.

-- Prasyarat
alter table public.profiles add column if not exists auth_id uuid;
create unique index if not exists profiles_auth_id_key on public.profiles(auth_id);
create or replace function public.my_profile_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_id = auth.uid() limit 1
$$;
revoke all on function public.my_profile_id() from public;
grant execute on function public.my_profile_id() to authenticated;

-- profiles: baca baris sendiri; insert/update hanya lewat server (tier tidak bisa diubah dari browser)
alter policy pol_profiles_select on public.profiles using (auth_id = auth.uid());
alter policy pol_profiles_update on public.profiles using (false) with check (false);
alter policy pol_profiles_insert on public.profiles with check (false);
create policy profiles_select_own on public.profiles for select to authenticated using (auth_id = auth.uid());

-- devices: lihat & keluarkan perangkat sendiri; daftar perangkat baru hanya lewat api/cloud-login
alter policy pol_devices on public.devices using (user_id = public.my_profile_id()) with check (false);

-- teacher_settings: per email yang sedang login
create policy teacher_settings_own on public.teacher_settings for all to authenticated
  using (lower(email) = lower(auth.email())) with check (lower(email) = lower(auth.email()));

-- tabel cloud_*
alter policy pol_cloud_students on public.cloud_students using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_classrooms on public.cloud_classrooms using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_att_sessions on public.cloud_attendance_sessions using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_att_records on public.cloud_attendance_records using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_teachers on public.cloud_teachers using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_schools on public.cloud_schools using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_backups on public.cloud_backups using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_calendar on public.cloud_calendar_entries using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_academic_years on public.cloud_academic_years using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_tombstones on public.cloud_tombstones using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());

-- tabel lama (tidak dipakai browser; api/absen.js memakai service role): tutup akses publik
alter policy pol_academic_years on public.academic_years using (false) with check (false);
alter policy pol_attendance_records on public.attendance_records using (false) with check (false);
alter policy pol_attendance_sessions on public.attendance_sessions using (false) with check (false);
alter policy pol_backups on public.backups using (false) with check (false);
alter policy pol_calendar_entries on public.calendar_entries using (false) with check (false);
alter policy pol_classrooms on public.classrooms using (false) with check (false);
alter policy pol_schools on public.schools using (false) with check (false);
alter policy pol_students on public.students using (false) with check (false);
alter policy pol_teachers on public.teachers using (false) with check (false);
alter policy pol_sync_metadata on public.sync_metadata using (false) with check (false);
alter policy pol_sync_queue on public.sync_queue using (false) with check (false);
