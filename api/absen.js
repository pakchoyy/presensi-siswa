import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key);
}

// Sama persis dengan hashString/sessionIdFrom/recordIdFrom di src/lib/utils.ts:
// aplikasi guru dan link siswa memakai local_id yang sama, jadi upsert tidak membuat sesi dobel.
function hashString(value) {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
export const sessionIdFrom = (kelasId, tanggal) => hashString(`session:${kelasId}:${tanggal}`);
export const recordIdFrom = (sesiId, siswaId) => hashString(`record:${sesiId}:${siswaId}`);

function todayStr() {
  // WIB (UTC+7), supaya sebelum jam 07.00 tidak dianggap kemarin
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function isAllowedStatus(s) {
  return ["H", "S", "I", "A", "T"].includes(s);
}

// status yang diisi guru (izin/sakit/alfa) tidak boleh ditimpa lewat link siswa
function isLockedStatus(s) {
  return ["S", "I", "A"].includes(s);
}

const LOCKED_MSG = "Status presensi hari ini sudah diisi dan tidak bisa diubah. Hubungi wali kelas.";

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
  // Hanya situs sendiri yang boleh memanggil dari browser.
  const origin = req.headers.origin;
  if (origin && origin !== "https://presiswa.bantuguruyuk.web.id" && !/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) && !/^http:\/\/localhost(:\d+)?$/.test(origin)) {
    return res.status(403).json({ error: "Origin tidak diizinkan" });
  }
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const supabase = getSupabase();

  if (req.method === "GET") {
    const token = String(req.query.token || "").trim();
    if (!token || token.length > 128) return res.status(400).json({ error: "Token wajib" });

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
      const { data: sesiList } = await supabase.from("cloud_attendance_sessions").select("local_id").eq("user_id", student.userId).eq("kelas_id", student.kelasId).eq("tanggal", today);
      const sesiIds = (sesiList || []).map((x) => x.local_id);
      if (sesiIds.length) {
        const { data: recs } = await supabase.from("cloud_attendance_records").select("status").eq("user_id", student.userId).in("sesi_id", sesiIds).eq("siswa_id", student.id).order("diubah_pada", { ascending: false }).limit(1);
        if (recs && recs[0]) existingStatus = recs[0].status;
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
    if (typeof token !== "string" || !token || token.length > 128 || !status) return res.status(400).json({ error: "token & status wajib" });
    if (!isAllowedStatus(status)) return res.status(400).json({ error: "Status tidak valid" });

    const student = await findStudentByToken(supabase, token);
    if (!student) return res.status(404).json({ error: "Link tidak valid" });

    const kelas = await getKelas(supabase, student);
    if (!kelas || !kelas.allow) return res.status(403).json({ error: "Absen mandiri belum diaktifkan" });

    const today = todayStr();
    // cek hari libur dari kalender guru (cloud); siswa non-cloud pakai tabel lama
    const { data: libur } = student.isCloud
      ? await supabase.from("cloud_calendar_entries").select("id").eq("user_id", student.userId).eq("tanggal", today).eq("jenis", "HariLibur").limit(1)
      : await supabase.from("calendar_entries").select("id").eq("tanggal", today).eq("jenis", "HariLibur").limit(1);
    if (libur && libur.length > 0) return res.status(403).json({ error: "Hari libur, tidak ada presensi" });

    // upsert sesi & record
    if (student.isCloud) {
      const userId = student.userId;
      // Pakai sesi hari ini yang sudah ada (bisa dari versi lama dengan id acak), kalau tidak ada
      // buat dengan id deterministik — request bersamaan menghasilkan baris yang sama.
      const { data: sesiList } = await supabase.from("cloud_attendance_sessions").select("local_id").eq("user_id", userId).eq("kelas_id", student.kelasId).eq("tanggal", today).order("id").limit(1);
      let sesiLocalId = sesiList?.[0]?.local_id;
      if (!sesiLocalId) {
        sesiLocalId = sessionIdFrom(student.kelasId, today);
        const now = Date.now();
        const { error: insErr } = await supabase.from("cloud_attendance_sessions").upsert({
          user_id: userId, local_id: sesiLocalId, kelas_id: student.kelasId, tanggal: today,
          dibuat_pada: now, diubah_pada: now, last_synced_at: now, version: 1
        }, { onConflict: "user_id,local_id", ignoreDuplicates: true });
        if (insErr) return res.status(500).json({ error: "Gagal menyimpan presensi. Coba lagi." });
      }
      const { data: recList } = await supabase.from("cloud_attendance_records").select("id, status").eq("user_id", userId).eq("sesi_id", sesiLocalId).eq("siswa_id", student.id).order("diubah_pada", { ascending: false }).limit(1);
      const existingRec = recList?.[0];
      if (existingRec) {
        if (isLockedStatus(existingRec.status)) return res.status(409).json({ error: LOCKED_MSG });
        const { error: updErr } = await supabase.from("cloud_attendance_records").update({ status, diubah_pada: Date.now(), last_synced_at: Date.now() }).eq("id", existingRec.id);
        if (updErr) return res.status(500).json({ error: "Gagal menyimpan presensi. Coba lagi." });
      } else {
        const now = Date.now();
        const { error: insErr } = await supabase.from("cloud_attendance_records").upsert({
          user_id: userId, local_id: recordIdFrom(sesiLocalId, student.id), sesi_id: sesiLocalId, siswa_id: student.id,
          status, diubah_pada: now, last_synced_at: now, version: 1
        }, { onConflict: "user_id,local_id" });
        if (insErr) return res.status(500).json({ error: "Gagal menyimpan presensi. Coba lagi." });
      }
    } else {
      let sesiId;
      const { data: sesi } = await supabase.from("attendance_sessions").select("id").eq("kelas_id", kelas.id).eq("tanggal", today).maybeSingle();
      if (sesi) sesiId = sesi.id;
      else {
        const { data: ins, error: insErr } = await supabase.from("attendance_sessions").insert({ kelas_id: kelas.id, tanggal: today, dibuat_pada: Date.now(), diubah_pada: Date.now() }).select("id").single();
        if (insErr) return res.status(500).json({ error: "Gagal menyimpan presensi. Coba lagi." });
        sesiId = ins.id;
      }
      const { data: existingPub } = await supabase.from("attendance_records").select("id, status").eq("sesi_id", sesiId).eq("siswa_id", student.id).maybeSingle();
      if (existingPub) {
        if (isLockedStatus(existingPub.status)) return res.status(409).json({ error: LOCKED_MSG });
        const { error: updErr } = await supabase.from("attendance_records").update({ status, diubah_pada: Date.now() }).eq("id", existingPub.id);
        if (updErr) return res.status(500).json({ error: "Gagal menyimpan presensi. Coba lagi." });
      } else {
        const { error: insErr } = await supabase.from("attendance_records").insert({ sesi_id: sesiId, siswa_id: student.id, status, diubah_pada: Date.now() });
        if (insErr) return res.status(500).json({ error: "Gagal menyimpan presensi. Coba lagi." });
      }
    }

    return res.status(200).json({ ok: true, tanggal: today, status });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
