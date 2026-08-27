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

export default async function handler(req, res) {
  // CORS untuk PWA
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const supabase = getSupabase();

  // GET ?token=xxx -> info siswa (untuk halaman /s/:token)
  if (req.method === "GET") {
    const token = (req.query.token || "").trim();
    if (!token) return res.status(400).json({ error: "Token wajib" });

    const { data: student, error } = await supabase
      .from("students")
      .select("id, nama, kelas_id, nisn, absen_token")
      .eq("absen_token", token)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!student) return res.status(404).json({ error: "Link tidak valid" });

    const { data: kelas } = await supabase
      .from("classrooms")
      .select("id, nama, allow_siswa_absen_mandiri")
      .eq("id", student.kelas_id)
      .maybeSingle();

    if (!kelas || !kelas.allow_siswa_absen_mandiri) {
      return res.status(403).json({ error: "Absen mandiri belum diaktifkan kelas ini" });
    }

    // cek sudah absen hari ini?
    const today = todayStr();
    const { data: sesi } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("kelas_id", kelas.id)
      .eq("tanggal", today)
      .maybeSingle();

    let existingStatus = null;
    if (sesi) {
      const { data: rec } = await supabase
        .from("attendance_records")
        .select("status")
        .eq("sesi_id", sesi.id)
        .eq("siswa_id", student.id)
        .maybeSingle();
      if (rec) existingStatus = rec.status;
    }

    return res.status(200).json({
      student: { id: student.id, nama: student.nama, nisn: student.nisn },
      kelas: { id: kelas.id, nama: kelas.nama },
      tanggal: today,
      existingStatus,
    });
  }

  // POST {token, status}
  if (req.method === "POST") {
    const { token, status } = req.body || {};
    if (!token || !status) return res.status(400).json({ error: "token & status wajib" });
    if (!isAllowedStatus(status)) return res.status(400).json({ error: "Status tidak valid" });

    const { data: student, error: sErr } = await supabase
      .from("students")
      .select("id, kelas_id")
      .eq("absen_token", token)
      .maybeSingle();

    if (sErr) return res.status(500).json({ error: sErr.message });
    if (!student) return res.status(404).json({ error: "Link tidak valid" });

    const { data: kelas } = await supabase
      .from("classrooms")
      .select("id, allow_siswa_absen_mandiri")
      .eq("id", student.kelas_id)
      .maybeSingle();

    if (!kelas || !kelas.allow_siswa_absen_mandiri) {
      return res.status(403).json({ error: "Absen mandiri belum diaktifkan" });
    }

    // cek hari libur
    const today = todayStr();
    const { data: libur } = await supabase
      .from("calendar_entries")
      .select("id")
      .eq("tanggal", today)
      .eq("jenis", "HariLibur")
      .limit(1);
    if (libur && libur.length > 0) {
      return res.status(403).json({ error: "Hari libur, tidak ada presensi" });
    }

    // upsert sesi
    let sesiId;
    const { data: sesi } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("kelas_id", kelas.id)
      .eq("tanggal", today)
      .maybeSingle();

    if (sesi) {
      sesiId = sesi.id;
    } else {
      // id deterministik tidak dipakai di cloud (auto increment), pakai insert biasa
      const { data: ins, error: insErr } = await supabase
        .from("attendance_sessions")
        .insert({ kelas_id: kelas.id, tanggal: today, dibuat_pada: Date.now(), diubah_pada: Date.now() })
        .select("id")
        .single();
      if (insErr) return res.status(500).json({ error: insErr.message });
      sesiId = ins.id;
    }

    // upsert record (sesi_id + siswa_id unique)
    const { error: recErr } = await supabase
      .from("attendance_records")
      .upsert(
        { sesi_id: sesiId, siswa_id: student.id, status, diubah_pada: Date.now() },
        { onConflict: "sesi_id,siswa_id" }
      );

    if (recErr) return res.status(500).json({ error: recErr.message });

    return res.status(200).json({ ok: true, tanggal: today, status });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
