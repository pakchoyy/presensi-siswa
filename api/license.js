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
  let referral = null;
  try { referral = await applyReferral(supabase, body.ref, email); } catch { /* referral tidak boleh menggagalkan aktivasi */ }
  return [200, { ok: true, tier, tanggalBerakhir, referral }];
}

// ── Referral: pemilik kode dapat +30 hari saat pembeli BARU aktivasi pakai kodenya ──
const REF_RE = /^PY-[A-Z0-9]{6}$/;
const REF_DAYS = 30;
const REF_MAX_PER_SEMESTER = 6;

async function activeLicense(supabase, email) {
  const { data } = await supabase
    .from("licenses")
    .select("id, tanggal_berakhir")
    .eq("email", email)
    .eq("status", "digunakan")
    .eq("product", "siswa")
    .order("tanggal_berakhir", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data && (!data.tanggal_berakhir || data.tanggal_berakhir > Date.now()) ? data : null;
}

async function applyReferral(supabase, rawCode, buyerEmail) {
  const code = String(rawCode || "").toUpperCase().trim();
  if (!code) return null;
  if (!REF_RE.test(code)) return "invalid";
  const { data: ref } = await supabase.from("referrals").select("owner_email").eq("code", code).maybeSingle();
  if (!ref) return "invalid";
  if (ref.owner_email === buyerEmail) return "self";
  // Hanya pembeli baru: email ini belum pernah punya lisensi lain.
  const { count } = await supabase.from("licenses").select("id", { count: "exact", head: true }).eq("email", buyerEmail).eq("status", "digunakan");
  if ((count || 0) > 1) return "not_new";
  const since = new Date(Date.now() - SEMESTER_MS).toISOString();
  const { count: given } = await supabase.from("referral_rewards").select("id", { count: "exact", head: true }).eq("owner_email", ref.owner_email).gte("created_at", since);
  if ((given || 0) >= REF_MAX_PER_SEMESTER) return "cap";
  const lic = await activeLicense(supabase, ref.owner_email);
  if (!lic) return "owner_inactive";
  // buyer_email unik: insert gagal bila pembeli ini sudah pernah dipakai referral.
  const { error: insErr } = await supabase.from("referral_rewards").insert({ code, owner_email: ref.owner_email, buyer_email: buyerEmail, days: REF_DAYS });
  if (insErr) return "used";
  await supabase.from("licenses").update({ tanggal_berakhir: Math.max(Date.now(), lic.tanggal_berakhir || 0) + REF_DAYS * 86400000 }).eq("id", lic.id);
  return "ok";
}

// Kode referral milik pengguna yang sudah verifikasi email (token OTP) dan punya lisensi aktif.
async function referral(supabase, body, req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return [401, { error: "Verifikasi email dulu" }];
  const { data: u, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !u?.user?.email) return [401, { error: "Sesi tidak valid" }];
  const email = normEmail(u.user.email);
  if (!(await activeLicense(supabase, email))) return [403, { error: "Kode ajak teman hanya untuk pelanggan PLUS/PRO aktif" }];
  let { data: row } = await supabase.from("referrals").select("code").eq("owner_email", email).maybeSingle();
  for (let i = 0; !row && i < 5; i++) {
    const code = "PY-" + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
    const { data: ins } = await supabase.from("referrals").insert({ code, owner_email: email }).select("code").maybeSingle();
    if (ins) row = ins;
    else ({ data: row } = await supabase.from("referrals").select("code").eq("owner_email", email).maybeSingle());
  }
  if (!row) return [500, { error: "Gagal membuat kode" }];
  const since = new Date(Date.now() - SEMESTER_MS).toISOString();
  const { count } = await supabase.from("referral_rewards").select("id", { count: "exact", head: true }).eq("owner_email", email).gte("created_at", since);
  return [200, { code: row.code, rewards: count || 0, max: REF_MAX_PER_SEMESTER, days: REF_DAYS }];
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
// Hanya untuk email yang sudah terverifikasi (kode OTP): email diambil dari token, bukan dari body.
async function status(supabase, body, req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return [401, { error: "Verifikasi email dulu" }];
  const { data: u, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !u?.user?.email) return [401, { error: "Sesi tidak valid" }];
  const email = normEmail(u.user.email);
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

const ACTIONS = { activate, renew, status, restore, referral };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store");
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 10 menit lagi." });
  const { action } = req.body || {};
  const fn = ACTIONS[action];
  if (!fn) return res.status(400).json({ error: "Action tidak dikenal" });
  try {
    const [code, payload] = await fn(getSupabase(), req.body, req);
    return res.status(code).json(payload);
  } catch {
    return res.status(500).json({ error: "Gagal memproses lisensi di server" });
  }
}
