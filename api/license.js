import { createClient } from "@supabase/supabase-js";

const SEMESTER_MS = 180 * 24 * 60 * 60 * 1000;
const VALID_TIERS = ["FREE", "PLUS", "PRO"];

function tierFromKode(kode) {
  // BGY-PS-PLUS-XXXXXXXX or BGY-PS-PRO-XXXXXXXX
  const upper = String(kode || "").toUpperCase();
  if (upper.includes("-PLUS-")) return "PLUS";
  if (upper.includes("-PRO-")) return "PRO";
  // Backward compat: legacy BGY-PS-XXXX treated as PRO
  return "PRO";
}

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key);
}

const normEmail = (e) => String(e || "").toLowerCase().trim().slice(0, 254);
const normKode = (k) => String(k || "").toUpperCase().trim().slice(0, 64);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KODE_RE = /^BGY-[A-Z0-9-]{4,60}$/;

// Rate limit sederhana per IP (best-effort: memori per instance serverless).
const HITS = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 20;
function rateLimited(ip) {
  const now = Date.now();
  const rec = HITS.get(ip);
  if (!rec || now - rec.start > WINDOW_MS) {
    HITS.set(ip, { start: now, n: 1 });
    if (HITS.size > 5000) HITS.clear();
    return false;
  }
  rec.n++;
  return rec.n > MAX_HITS;
}

async function markTier(supabase, email, tier) {
  if (!VALID_TIERS.includes(tier)) tier = "PRO";
  const { data: profile } = await supabase.from("profiles").select("id, tier").eq("email", email).maybeSingle();
  if (profile && profile.tier !== tier) {
    await supabase.from("profiles").update({ tier, updated_at: new Date().toISOString() }).eq("id", profile.id);
  }
}

// Klaim kode secara atomik: hanya berhasil kalau belum dipakai ('tersedia' atau sudah dikirim ke pembeli).
async function claimKode(supabase, kode, fields) {
  const { data, error } = await supabase
    .from("licenses")
    .update({ status: "digunakan", ...fields })
    .eq("kode", kode)
    .in("status", ["tersedia", "terkirim"])
    .select("id")
    .limit(1);
  if (error) throw error;
  return data && data.length > 0;
}

async function kodeError(supabase, kode) {
  const { data } = await supabase.from("licenses").select("status").eq("kode", kode).maybeSingle();
  if (!data) return "Kode lisensi tidak ditemukan";
  return "Kode lisensi sudah digunakan";
}

async function activate(supabase, body) {
  const email = normEmail(body.email);
  const kode = normKode(body.kode);
  if (!EMAIL_RE.test(email)) return [400, { error: "Email tidak valid" }];
  if (!KODE_RE.test(kode)) return [400, { error: "Format kode: BGY-PS-PLUS-XXXX atau BGY-PS-PRO-XXXX" }];

  const tier = tierFromKode(kode);
  const now = Date.now();
  const tanggalBerakhir = now + SEMESTER_MS;
  const ok = await claimKode(supabase, kode, {
    email,
    tier,
    guru_id: Number.isFinite(Number(body.guruId)) ? Number(body.guruId) : null,
    tanggal_aktivasi: now,
    tanggal_berakhir: tanggalBerakhir,
  });
  if (!ok) return [409, { error: await kodeError(supabase, kode) }];

  await markTier(supabase, email, tier);
  return [200, { ok: true, tier, tanggalBerakhir }];
}

async function renew(supabase, body) {
  const email = normEmail(body.email);
  const kode = normKode(body.kode);
  if (!EMAIL_RE.test(email)) return [400, { error: "Email tidak valid" }];
  if (!KODE_RE.test(kode)) return [400, { error: "Format kode: BGY-PS-PLUS-XXXX atau BGY-PS-PRO-XXXX" }];

  const tier = tierFromKode(kode);
  const { data: current } = await supabase
    .from("licenses")
    .select("id, tanggal_berakhir")
    .eq("email", email)
    .eq("status", "digunakan")
    .eq("product", "siswa")
    .order("tanggal_berakhir", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = Date.now();
  const base = current?.tanggal_berakhir ? Math.max(now, current.tanggal_berakhir) : now;
  const newExpiry = base + SEMESTER_MS;

  const ok = await claimKode(supabase, kode, { email, tier, tanggal_aktivasi: now, tanggal_berakhir: newExpiry });
  if (!ok) return [409, { error: "Kode perpanjangan tidak valid atau sudah digunakan" }];

  if (current) await supabase.from("licenses").update({ tanggal_berakhir: newExpiry, tier }).eq("id", current.id);
  await markTier(supabase, email, tier);
  return [200, { ok: true, tier, tanggalBerakhir: newExpiry }];
}

// Cek lisensi aktif milik sebuah email (menggantikan query langsung ke tabel dari browser).
async function status(supabase, body) {
  const email = normEmail(body.email);
  if (!EMAIL_RE.test(email)) return [400, { error: "Email tidak valid" }];
  const { data, error } = await supabase
    .from("licenses")
    .select("tanggal_berakhir, tier")
    .eq("email", email)
    .eq("status", "digunakan")
    .eq("product", "siswa")
    .order("tanggal_berakhir", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return [200, { found: !!data, tier: data?.tier ?? null, tanggalBerakhir: data?.tanggal_berakhir ?? null }];
}

// Pasang ulang lisensi di perangkat baru: butuh email + kode yang SAMA dengan saat aktivasi.
async function restore(supabase, body) {
  const email = normEmail(body.email);
  const kode = normKode(body.kode);
  if (!EMAIL_RE.test(email) || !KODE_RE.test(kode)) return [400, { error: "Email atau kode tidak valid" }];
  const { data, error } = await supabase
    .from("licenses")
    .select("tier, tanggal_berakhir")
    .eq("kode", kode)
    .eq("email", email)
    .eq("status", "digunakan")
    .maybeSingle();
  if (error) throw error;
  if (!data) return [404, { error: "Kode sudah dipakai email lain atau tidak ditemukan" }];
  if (data.tanggal_berakhir && data.tanggal_berakhir < Date.now()) return [410, { error: "Lisensi sudah berakhir" }];
  return [200, { ok: true, tier: data.tier || tierFromKode(kode), tanggalBerakhir: data.tanggal_berakhir }];
}

const ACTIONS = { activate, renew, status, restore };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store");
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 10 menit lagi." });
  const { action } = req.body || {};
  const fn = ACTIONS[action];
  if (!fn) return res.status(400).json({ error: "Action tidak dikenal" });
  try {
    const [code, payload] = await fn(getSupabase(), req.body);
    return res.status(code).json(payload);
  } catch {
    return res.status(500).json({ error: "Gagal memproses lisensi di server" });
  }
}
