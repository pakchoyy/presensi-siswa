import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isAllowedStatus(s) {
  return ["H", "S", "I", "A", "T"].includes(s);
}

async function findStudentByToken(supabase, token) {
  // cek cloud_students dulu (hasil sync), lalu fallback ke public.students
  const { data: cs } = await supabase.from("cloud_students").select("id, user_id, local_id, kelas_id, nama, nisn, absen_token").eq("absen_token", token).maybeSingle();
  if (cs) return { id: cs.local_id, cloudId: cs.id, userId: cs.user_id, kelasId: cs.kelas_id, nama: cs.nama, nisn: cs.nisn, isCloud: true };
  const { data: s } = await supabase.from("students").select("id, nama, kelas_id, nisn, absen_token").eq("absen_token", token).maybeSingle();
  if (s) return { id: s.id, kelasId: s.kelas_id, nama: s.nama, nisn: s.nisn, isCloud: false };
  return null;
}

async function getKelas(supabase, student) {
  if (student.isCloud) {
    const { data } = await supabase.from("cloud_classrooms").select("local_id, nama, allow_siswa_absen_mandiri").eq("user_id", student.userId).eq("local_id", student.kelasId).maybeSingle();
    if (data) return { id: data.local_id, nama: data.nama, allow: !!data.allow_siswa_absen_mandiri, userId: student.userId, isCloud: true };
  }
  const { data } = await supabase.from("classrooms").select("id, nama, allow_siswa_absen_mandiri").eq("id", student.kelasId).maybeSingle();
  if (data) return { id: data.id, nama: data.nama, allow: !!data.allow_siswa_absen_mandiri, isCloud: false };
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const supabase = getSupabase();

  if (req.method === "GET") {
    const token = (req.query.token || "").trim();
    if (!token) return res.status(400).json({ error: "Token wajib" });

    const student = await findStudentByToken(supabase, token);
    if (!student) return res.status(404).json({ error: "Link tidak valid — token tidak ditemukan. Coba generate ulang link di menu Siswa." });

    const kelas = await getKelas(supabase, student);
    if (!kelas || !kelas.allow) {
      return res.status(403).json({ error: "Absen mandiri belum diaktifkan kelas ini. Hubungi wali kelas." });
    }

    const today = todayStr();
    let existingStatus = null;
    // cek sesi & record (cloud atau public sesuai student)
    if (student.isCloud) {
      const { data: sesi } = await supabase.from("cloud_attendance_sessions").select("id, local_id").eq("user_id", student.userId).eq("kelas_id", student.kelasId).eq("tanggal", today).maybeSingle();
      if (sesi) {
        const { data: rec } = await supabase.from("cloud_attendance_records").select("status").eq("user_id", student.userId).eq("sesi_id", sesi.local_id).eq("siswa_id", student.id).maybeSingle();
        if (rec) existingStatus = rec.status;
      }
    } else {
      const { data: sesi } = await supabase.from("attendance_sessions").select("id").eq("kelas_id", kelas.id).eq("tanggal", today).maybeSingle();
      if (sesi) {
        const { data: rec } = await supabase.from("attendance_records").select("status").eq("sesi_id", sesi.id).eq("siswa_id", student.id).maybeSingle();
        if (rec) existingStatus = rec.status;
      }
    }

    return res.status(200).json({
      student: { id: student.id, nama: student.nama, nisn: student.nisn },
      kelas: { id: kelas.id, nama: kelas.nama },
      tanggal: today,
      existingStatus,
    });
  }

  if (req.method === "POST") {
    const { token, status } = req.body || {};
    if (!token || !status) return res.status(400).json({ error: "token & status wajib" });
    if (!isAllowedStatus(status)) return res.status(400).json({ error: "Status tidak valid" });

    const student = await findStudentByToken(supabase, token);
    if (!student) return res.status(404).json({ error: "Link tidak valid" });

    const kelas = await getKelas(supabase, student);
    if (!kelas || !kelas.allow) return res.status(403).json({ error: "Absen mandiri belum diaktifkan" });

    const today = todayStr();
    // cek hari libur (cloud atau public)
    const { data: libur } = await supabase.from("calendar_entries").select("id").eq("tanggal", today).eq("jenis", "HariLibur").limit(1);
    if (libur && libur.length > 0) return res.status(403).json({ error: "Hari libur, tidak ada presensi" });

    // upsert sesi & record
    if (student.isCloud) {
      const userId = student.userId;
      let sesiLocalId;
      const { data: sesi } = await supabase.from("cloud_attendance_sessions").select("id, local_id").eq("user_id", userId).eq("kelas_id", student.kelasId).eq("tanggal", today).maybeSingle();
      if (sesi) {
        sesiLocalId = sesi.local_id;
      } else {
        // buat local_id deterministik sederhana: Date.now() (cukup unik per kelas+tanggal)
        const localId = Date.now() + Math.floor(Math.random() * 1000);
        const { error: insErr } = await supabase.from("cloud_attendance_sessions").insert({
          user_id: userId, local_id: localId, kelas_id: student.kelasId, tanggal: today,
          dibuat_pada: Date.now(), diubah_pada: Date.now(), last_synced_at: Date.now(), version: 1
        });
        if (insErr) return res.status(500).json({ error: insErr.message });
        sesiLocalId = localId;
      }
      const { error: recErr } = await supabase.from("cloud_attendance_records").upsert({
        user_id: userId, local_id: Date.now(), sesi_id: sesiLocalId, siswa_id: student.id,
        status, diubah_pada: Date.now(), last_synced_at: Date.now(), version: 1
      }, { onConflict: "user_id,sesi_id,siswa_id" });
      // fallback: coba tanpa local_id jika constraint beda
      if (recErr) {
        const { error: recErr2 } = await supabase.from("cloud_attendance_records").upsert({
          user_id: userId, sesi_id: sesiLocalId, siswa_id: student.id, status, diubah_pada: Date.now(), last_synced_at: Date.now(), version: 1
        }, { onConflict: "user_id,sesi_id,siswa_id" });
        if (recErr2) return res.status(500).json({ error: recErr2.message });
      }
    } else {
      let sesiId;
      const { data: sesi } = await supabase.from("attendance_sessions").select("id").eq("kelas_id", kelas.id).eq("tanggal", today).maybeSingle();
      if (sesi) sesiId = sesi.id;
      else {
        const { data: ins, error: insErr } = await supabase.from("attendance_sessions").insert({ kelas_id: kelas.id, tanggal: today, dibuat_pada: Date.now(), diubah_pada: Date.now() }).select("id").single();
        if (insErr) return res.status(500).json({ error: insErr.message });
        sesiId = ins.id;
      }
      const { error: recErr } = await supabase.from("attendance_records").upsert({ sesi_id: sesiId, siswa_id: student.id, status, diubah_pada: Date.now() }, { onConflict: "sesi_id,siswa_id" });
      if (recErr) return res.status(500).json({ error: recErr.message });
    }

    return res.status(200).json({ ok: true, tanggal: today, status });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
