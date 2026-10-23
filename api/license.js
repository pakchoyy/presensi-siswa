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
  try { referral = await applyReferral(supabase, body.ref, email, tier); } catch { /* referral tidak boleh menggagalkan aktivasi */ }
  return [200, { ok: true, tier, tanggalBerakhir, referral }];
}

// ── Program Affiliate (khusus PRO): pemilik kode dapat bonus hari + komisi saat pembeli BARU aktivasi pakai kodenya ──
const REF_RE = /^PY-[A-Z0-9]{6}$/;
const SETTING_DEFAULTS = {
  affiliate_commission_plus: 1000,
  affiliate_bonus_days_plus: 12,
  affiliate_commission_pro: 2500,
  affiliate_bonus_days_pro: 30,
  affiliate_min_withdraw: 20000,
  affiliate_cap_per_semester: 6,
};

export async function getSettings(supabase) {
  const out = { ...SETTING_DEFAULTS };
  const { data } = await supabase.from("app_settings").select("key, value").in("key", Object.keys(SETTING_DEFAULTS));
  for (const row of data || []) {
    const n = Number(row.value);
    if (Number.isFinite(n) && n >= 0) out[row.key] = n;
  }
  return out;
}

async function activeLicense(supabase, email) {
  const { data } = await supabase
    .from("licenses")
    .select("id, tier, tanggal_berakhir")
    .eq("email", email)
    .eq("status", "digunakan")
    .eq("product", "siswa")
    .order("tanggal_berakhir", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data && (!data.tanggal_berakhir || data.tanggal_berakhir > Date.now()) ? data : null;
}

const isPro = (lic) => !!lic && (lic.tier || "PRO") === "PRO";

async function applyReferral(supabase, rawCode, buyerEmail, buyerTier) {
  const code = String(rawCode || "").toUpperCase().trim();
  if (!code) return null;
  if (!REF_RE.test(code)) return "invalid";
  const { data: ref } = await supabase.from("referrals").select("owner_email").eq("code", code).maybeSingle();
  if (!ref) return "invalid";
  if (ref.owner_email === buyerEmail) return "self";
  // Hanya pembeli baru: email ini belum pernah punya lisensi lain.
  const { count } = await supabase.from("licenses").select("id", { count: "exact", head: true }).eq("email", buyerEmail).eq("status", "digunakan");
  if ((count || 0) > 1) return "not_new";
  const cfg = await getSettings(supabase);
  const since = new Date(Date.now() - SEMESTER_MS).toISOString();
  const { count: given } = await supabase.from("referral_rewards").select("id", { count: "exact", head: true }).eq("owner_email", ref.owner_email).gte("created_at", since);
  if ((given || 0) >= cfg.affiliate_cap_per_semester) return "cap";
  // Affiliate khusus PRO: kode milik pelanggan PLUS (lama) tidak lagi menghasilkan bonus.
  const lic = await activeLicense(supabase, ref.owner_email);
  if (!isPro(lic)) return "owner_not_pro";
  // buyer_email unik: insert gagal bila pembeli ini sudah pernah dipakai referral.
  // Besar bonus mengikuti paket yang dibeli pembeli.
  const isProBuy = buyerTier === "PRO";
  const days = isProBuy ? cfg.affiliate_bonus_days_pro : cfg.affiliate_bonus_days_plus;
  const commission = isProBuy ? cfg.affiliate_commission_pro : cfg.affiliate_commission_plus;
  const { error: insErr } = await supabase
    .from("referral_rewards")
    .insert({ code, owner_email: ref.owner_email, buyer_email: buyerEmail, days, buyer_tier: buyerTier });
  if (insErr) return "used";
  if (days > 0) {
    await supabase.from("licenses").update({ tanggal_berakhir: Math.max(Date.now(), lic.tanggal_berakhir || 0) + days * 86400000 }).eq("id", lic.id);
  }
  if (commission > 0) {
    await supabase.from("affiliate_ledger").insert({
      owner_email: ref.owner_email,
      type: "earn",
      amount: commission,
      status: "ok",
      buyer_email: buyerEmail,
      note: `Pembelian ${buyerTier} pakai kode ${code}`,
    });
  }
  return "ok";
}

async function sessionEmail(supabase, req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: u, error } = await supabase.auth.getUser(token);
  if (error || !u?.user?.email) return null;
  return normEmail(u.user.email);
}

export function balanceOf(rows) {
  let earned = 0, withdrawn = 0, pending = 0;
  for (const r of rows || []) {
    if (r.type === "earn" && r.status === "ok") earned += r.amount;
    if (r.type === "withdraw" && r.status === "paid") withdrawn += r.amount;
    if (r.type === "withdraw" && r.status === "pending") pending += r.amount;
  }
  return { earned, withdrawn, pending, saldo: earned - withdrawn - pending };
}

const maskEmail = (e) => {
  const [u, d] = String(e).split("@");
  return (u.length <= 2 ? u[0] + "*" : u.slice(0, 2) + "*".repeat(Math.min(u.length - 2, 5))) + "@" + (d || "");
};

// Info program (publik, tanpa login): angka benefit untuk halaman Program Affiliate.
async function affiliateInfo(supabase) {
  const cfg = await getSettings(supabase);
  return [200, {
    rewards: {
      PLUS: { commission: cfg.affiliate_commission_plus, days: cfg.affiliate_bonus_days_plus },
      PRO: { commission: cfg.affiliate_commission_pro, days: cfg.affiliate_bonus_days_pro },
    },
    minWithdraw: cfg.affiliate_min_withdraw,
    capPerSemester: cfg.affiliate_cap_per_semester,
  }];
}

// Dashboard affiliate: hanya pelanggan PRO aktif yang sudah verifikasi email (sesi OTP).
async function affiliate(supabase, body, req) {
  const email = await sessionEmail(supabase, req);
  if (!email) return [401, { error: "Verifikasi email dulu", code: "NO_SESSION" }];
  if (!isPro(await activeLicense(supabase, email))) return [403, { error: "Program Affiliate khusus pelanggan PRO aktif", code: "NOT_PRO" }];
  let { data: row } = await supabase.from("referrals").select("code").eq("owner_email", email).maybeSingle();
  for (let i = 0; !row && i < 5; i++) {
    const code = "PY-" + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
    const { data: ins } = await supabase.from("referrals").insert({ code, owner_email: email }).select("code").maybeSingle();
    if (ins) row = ins;
    else ({ data: row } = await supabase.from("referrals").select("code").eq("owner_email", email).maybeSingle());
  }
  if (!row) return [500, { error: "Gagal membuat kode" }];
  const cfg = await getSettings(supabase);
  const since = new Date(Date.now() - SEMESTER_MS).toISOString();
  const [{ data: rewards }, { data: ledger }] = await Promise.all([
    supabase.from("referral_rewards").select("buyer_email, buyer_tier, days, created_at").eq("owner_email", email).order("created_at", { ascending: false }).limit(100),
    supabase.from("affiliate_ledger").select("type, amount, status, buyer_email, created_at").eq("owner_email", email).order("created_at", { ascending: false }).limit(500),
  ]);
  const bal = balanceOf(ledger);
  return [200, {
    code: row.code,
    email,
    referrals: (rewards || []).map((r) => {
      const earn = (ledger || []).find((l) => l.type === "earn" && l.buyer_email === r.buyer_email);
      return { email: maskEmail(r.buyer_email), tier: r.buyer_tier || null, at: r.created_at, days: r.days || 0, amount: earn?.amount || 0 };
    }),
    rewardsThisSemester: (rewards || []).filter((r) => r.created_at >= since).length,
    ...bal,
    hasPending: bal.pending > 0,
    rewards: {
      PLUS: { commission: cfg.affiliate_commission_plus, days: cfg.affiliate_bonus_days_plus },
      PRO: { commission: cfg.affiliate_commission_pro, days: cfg.affiliate_bonus_days_pro },
    },
    minWithdraw: cfg.affiliate_min_withdraw,
    capPerSemester: cfg.affiliate_cap_per_semester,
  }];
}

// Ajukan penarikan seluruh saldo; admin menandai dibayar/ditolak di halaman admin.
async function withdraw(supabase, body, req) {
  const email = await sessionEmail(supabase, req);
  if (!email) return [401, { error: "Verifikasi email dulu", code: "NO_SESSION" }];
  const nama = String(body.nama || "").trim().slice(0, 80);
  const tujuan = String(body.tujuan || "").trim().slice(0, 160);
  if (nama.length < 2 || tujuan.length < 5) return [400, { error: "Isi nama dan tujuan transfer (bank/e-wallet + nomor)" }];
  const cfg = await getSettings(supabase);
  const { data: ledger } = await supabase.from("affiliate_ledger").select("type, amount, status").eq("owner_email", email);
  const bal = balanceOf(ledger);
  if (bal.pending > 0) return [409, { error: "Masih ada penarikan yang sedang diproses" }];
  if (bal.saldo < cfg.affiliate_min_withdraw || bal.saldo <= 0) return [400, { error: `Saldo minimal Rp${cfg.affiliate_min_withdraw.toLocaleString("id-ID")} untuk ditarik` }];
  const { data: ins, error } = await supabase
    .from("affiliate_ledger")
    .insert({ owner_email: email, type: "withdraw", amount: bal.saldo, status: "pending", payout_info: `${nama} — ${tujuan}` })
    .select("id")
    .single();
  if (error) throw error;
  return [200, { ok: true, id: ins.id, amount: bal.saldo }];
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

const ACTIONS = { activate, renew, status, restore, affiliate, affiliate_info: affiliateInfo, withdraw };

// Pengumuman aktif untuk semua pengguna (tanpa login). Di-cache CDN 5 menit.
async function announcements(res) {
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from("announcements")
    .select("id, title, body, target, level, link_url, link_label, starts_at")
    .eq("active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("starts_at", { ascending: false })
    .limit(10);
  if (error) return res.status(500).json({ items: [] });
  res.setHeader("Vercel-CDN-Cache-Control", "max-age=300, stale-while-revalidate=60");
  return res.status(200).json({ items: data || [] });
}

export default async function handler(req, res) {
  if (req.method === "GET" && req.query?.action === "announcements") return announcements(res);
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
