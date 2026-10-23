import { createClient } from "@supabase/supabase-js";

// Hubungkan perangkat ke cloud setelah email terbukti lewat kode OTP (Supabase Auth).
// Semua perubahan profiles/devices lewat sini (service role); klien hanya bisa membaca data miliknya (RLS).
const DEVICE_LIMIT = { PLUS: 1, PRO: 3 };

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

const clean = (v, n) => String(v || "").trim().slice(0, n);

async function activeLicense(supabase, email) {
  const { data, error } = await supabase
    .from("licenses")
    .select("tier, tanggal_berakhir")
    .eq("email", email)
    .eq("status", "digunakan")
    .eq("product", "siswa")
    .order("tanggal_berakhir", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data.tanggal_berakhir && data.tanggal_berakhir < Date.now())) return null;
  return { tier: data.tier === "PLUS" ? "PLUS" : "PRO", tanggalBerakhir: data.tanggal_berakhir };
}

// Cari profile milik user ini; tautkan profile lama (berdasarkan email) saat login pertama.
async function linkProfile(supabase, authId, email, tier) {
  let { data: profile } = await supabase.from("profiles").select("id, auth_id").eq("auth_id", authId).maybeSingle();
  if (!profile) {
    // Email di auth sudah terbukti lewat OTP, jadi profile dengan email itu milik user ini.
    const { data: byEmail } = await supabase.from("profiles").select("id, auth_id").eq("email", email).maybeSingle();
    if (byEmail) await supabase.from("profiles").update({ auth_id: authId }).eq("id", byEmail.id);
    profile = byEmail;
  }
  if (!profile) {
    const { data: inserted, error } = await supabase
      .from("profiles")
      .insert({ id: authId, auth_id: authId, email, name: email.split("@")[0], tier, updated_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) throw error;
    return inserted.id;
  }
  await supabase.from("profiles").update({ tier, updated_at: new Date().toISOString() }).eq("id", profile.id);
  return profile.id;
}

async function listDevices(supabase, profileId) {
  const { data } = await supabase
    .from("devices")
    .select("id, device_id, device_name, last_active_at")
    .eq("user_id", profileId)
    .order("last_active_at", { ascending: false });
  return data || [];
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Verifikasi email dulu" });

  try {
    const supabase = getSupabase();
    const { data: u, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !u?.user?.email) return res.status(401).json({ error: "Sesi verifikasi tidak valid. Minta kode baru." });
    const authId = u.user.id;
    const email = u.user.email.toLowerCase().trim();
    const body = req.body || {};
    const deviceId = clean(body.deviceId, 100);

    // Lepas perangkat ini (dipanggil saat Keluar).
    if (body.action === "release") {
      const { data: p } = await supabase.from("profiles").select("id").eq("auth_id", authId).maybeSingle();
      if (p && deviceId) await supabase.from("devices").delete().eq("user_id", p.id).eq("device_id", deviceId);
      return res.status(200).json({ ok: true });
    }

    const lic = await activeLicense(supabase, email);
    if (!lic) return res.status(403).json({ error: "Email ini belum punya paket PLUS/PRO yang aktif.", code: "NO_LICENSE" });

    const profileId = await linkProfile(supabase, authId, email, lic.tier);
    const limit = DEVICE_LIMIT[lic.tier];

    // Hapus perangkat lama (pemilik sudah terbukti lewat OTP).
    if (body.action === "remove_device") {
      const rowId = Number(body.rowId);
      if (Number.isFinite(rowId)) await supabase.from("devices").delete().eq("id", rowId).eq("user_id", profileId);
    }

    if (!deviceId) return res.status(400).json({ error: "Perangkat tidak dikenal" });
    let devices = await listDevices(supabase, profileId);
    const mine = devices.find((d) => d.device_id === deviceId);
    const now = Date.now();
    if (mine) {
      await supabase.from("devices").update({ last_active_at: now, device_name: clean(body.deviceName, 100) || mine.device_name }).eq("id", mine.id);
    } else if (devices.length >= limit) {
      return res.status(409).json({
        code: "DEVICE_LIMIT",
        tier: lic.tier,
        limit,
        error:
          lic.tier === "PLUS"
            ? `Email ini sudah dipakai di ${devices.length} perangkat lain (batas paket PLUS). Keluar dulu dari perangkat lama, atau upgrade ke PRO untuk 3 perangkat.`
            : `Email ini sudah dipakai di ${devices.length} perangkat lain (batas paket PRO). Keluar dulu dari salah satu perangkat lama.`,
        devices: devices.map((d) => ({ id: d.id, name: d.device_name, lastActiveAt: d.last_active_at })),
      });
    } else {
      await supabase.from("devices").insert({
        user_id: profileId,
        device_id: deviceId,
        device_name: clean(body.deviceName, 100) || "Perangkat",
        last_active_at: now,
        created_at: now,
        user_agent: clean(req.headers["user-agent"], 300),
      });
    }
    devices = await listDevices(supabase, profileId);
    return res.status(200).json({ ok: true, profileId, tier: lic.tier, tanggalBerakhir: lic.tanggalBerakhir, limit, deviceCount: devices.length });
  } catch (e) {
    console.error("cloud-login error:", e);
    return res.status(500).json({ error: "Gagal menghubungkan ke cloud. Coba lagi." });
  }
}
