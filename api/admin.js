import { createClient } from "@supabase/supabase-js";
import { getSettings, balanceOf } from "./license.js";

// Halaman super admin. Semua aksi diverifikasi di server: token sesi OTP (Supabase Auth)
// + email harus ada di daftar admin. Tidak ada pengecekan yang hanya di browser.
const DEFAULT_ADMINS = ["pulsachoy@gmail.com", "choiruddin2410@gmail.com", "admin@bantuguruyuk.web.id"];
const ADMINS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const adminList = () => (ADMINS.length ? ADMINS : DEFAULT_ADMINS);

const DAY = 86400000;
const TIERS = ["PLUS", "PRO"];
const SETTING_KEYS = ["affiliate_commission", "affiliate_bonus_days", "affiliate_min_withdraw", "affiliate_cap_per_semester"];

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

const normEmail = (e) => String(e || "").toLowerCase().trim().slice(0, 254);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const intIn = (v, min, max) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

function newCode(tier) {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `BGY-PS-${tier}-${hex}`;
}

async function latestLicense(supabase, email) {
  const { data } = await supabase
    .from("licenses")
    .select("id, kode, tier, tanggal_aktivasi, tanggal_berakhir")
    .eq("email", email)
    .eq("status", "digunakan")
    .eq("product", "siswa")
    .order("tanggal_berakhir", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// ── Pengguna ──
async function users(supabase, body) {
  const q = String(body.q || "").toLowerCase().trim().replace(/[%_,()]/g, "").slice(0, 80);
  let query = supabase
    .from("licenses")
    .select("email, kode, tier, tanggal_aktivasi, tanggal_berakhir")
    .eq("status", "digunakan")
    .eq("product", "siswa")
    .not("email", "is", null)
    .order("tanggal_aktivasi", { ascending: false })
    .limit(300);
  if (q) query = query.ilike("email", `%${q}%`);
  const { data: lics, error } = await query;
  if (error) throw error;
  // Satu baris per email: lisensi dengan masa berlaku terpanjang.
  const byEmail = new Map();
  for (const l of lics || []) {
    const cur = byEmail.get(l.email);
    if (!cur || (l.tanggal_berakhir || 0) > (cur.tanggal_berakhir || 0)) byEmail.set(l.email, { ...l, jumlahKode: (cur?.jumlahKode || 0) + 1 });
    else cur.jumlahKode++;
  }
  const emails = [...byEmail.keys()].slice(0, 60);
  const { data: profiles } = emails.length
    ? await supabase.from("profiles").select("id, email").in("email", emails)
    : { data: [] };
  const profileIds = (profiles || []).map((p) => p.id);
  const { data: devices } = profileIds.length
    ? await supabase.from("devices").select("user_id").in("user_id", profileIds)
    : { data: [] };
  const devCount = new Map();
  for (const d of devices || []) devCount.set(d.user_id, (devCount.get(d.user_id) || 0) + 1);
  const pidByEmail = new Map((profiles || []).map((p) => [p.email, p.id]));
  const now = Date.now();
  return [200, {
    users: emails.map((e) => {
      const l = byEmail.get(e);
      return {
        email: e,
        tier: l.tier || "PRO",
        aktif: !l.tanggal_berakhir || l.tanggal_berakhir > now,
        tanggalAktivasi: l.tanggal_aktivasi,
        tanggalBerakhir: l.tanggal_berakhir,
        jumlahKode: l.jumlahKode,
        perangkat: devCount.get(pidByEmail.get(e)) || 0,
      };
    }),
  }];
}

async function extend(supabase, body) {
  const email = normEmail(body.email);
  const days = intIn(body.days, 1, 400);
  if (!EMAIL_RE.test(email) || !days) return [400, { error: "Email atau jumlah hari tidak valid (1–400)" }];
  const lic = await latestLicense(supabase, email);
  if (!lic) return [404, { error: "Email ini belum punya lisensi. Buat kode cadangan untuknya." }];
  const tanggalBerakhir = Math.max(Date.now(), lic.tanggal_berakhir || 0) + days * DAY;
  await supabase.from("licenses").update({ tanggal_berakhir: tanggalBerakhir }).eq("id", lic.id);
  return [200, { ok: true, tanggalBerakhir }];
}

async function setTier(supabase, body) {
  const email = normEmail(body.email);
  const tier = String(body.tier || "").toUpperCase();
  if (!EMAIL_RE.test(email) || !TIERS.includes(tier)) return [400, { error: "Email atau paket tidak valid" }];
  const lic = await latestLicense(supabase, email);
  if (!lic) return [404, { error: "Email ini belum punya lisensi" }];
  await supabase.from("licenses").update({ tier }).eq("id", lic.id);
  await supabase.from("profiles").update({ tier, updated_at: new Date().toISOString() }).eq("email", email);
  return [200, { ok: true, tier }];
}

async function resetDevices(supabase, body) {
  const email = normEmail(body.email);
  if (!EMAIL_RE.test(email)) return [400, { error: "Email tidak valid" }];
  const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!profile) return [200, { ok: true, removed: 0 }];
  const { data } = await supabase.from("devices").delete().eq("user_id", profile.id).select("id");
  return [200, { ok: true, removed: (data || []).length }];
}

// ── Kode ──
async function codeStock(supabase) {
  const counts = {};
  for (const tier of TIERS) {
    const { count } = await supabase
      .from("licenses")
      .select("id", { count: "exact", head: true })
      .eq("status", "tersedia")
      .eq("product", "siswa")
      .eq("tier", tier);
    counts[tier] = count || 0;
  }
  return [200, { stock: counts }];
}

// Kode cadangan: bila email diisi dan punya lisensi aktif, kode baru langsung terikat ke email itu
// dengan masa berlaku yang SAMA (bisa dipakai di Pulihkan). Tanpa email → masuk stok biasa.
async function generateCodes(supabase, body) {
  const tier = String(body.tier || "").toUpperCase();
  const n = intIn(body.n ?? 1, 1, 100);
  const email = normEmail(body.email);
  if (!TIERS.includes(tier) || !n) return [400, { error: "Paket atau jumlah tidak valid (1–100)" }];
  if (email && !EMAIL_RE.test(email)) return [400, { error: "Email tidak valid" }];

  if (email) {
    const lic = await latestLicense(supabase, email);
    const active = lic && (!lic.tanggal_berakhir || lic.tanggal_berakhir > Date.now());
    const kode = newCode(tier);
    const row = active
      ? { kode, tier, product: "siswa", status: "digunakan", email, tanggal_aktivasi: Date.now(), tanggal_berakhir: lic.tanggal_berakhir }
      : { kode, tier, product: "siswa", status: "tersedia" };
    const { error } = await supabase.from("licenses").insert(row);
    if (error) throw error;
    return [200, { ok: true, codes: [kode], bound: !!active, tanggalBerakhir: active ? lic.tanggal_berakhir : null }];
  }

  const rows = Array.from({ length: n }, () => ({ kode: newCode(tier), tier, product: "siswa", status: "tersedia" }));
  const { error } = await supabase.from("licenses").insert(rows);
  if (error) throw error;
  return [200, { ok: true, codes: rows.map((r) => r.kode), bound: false }];
}

// ── Affiliate ──
async function affiliates(supabase) {
  const [{ data: refs }, { data: rewards }, { data: ledger }] = await Promise.all([
    supabase.from("referrals").select("code, owner_email, created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("referral_rewards").select("owner_email").limit(5000),
    supabase.from("affiliate_ledger").select("owner_email, type, amount, status").limit(10000),
  ]);
  const refCount = new Map();
  for (const r of rewards || []) refCount.set(r.owner_email, (refCount.get(r.owner_email) || 0) + 1);
  const ledgerBy = new Map();
  for (const l of ledger || []) {
    if (!ledgerBy.has(l.owner_email)) ledgerBy.set(l.owner_email, []);
    ledgerBy.get(l.owner_email).push(l);
  }
  return [200, {
    affiliates: (refs || []).map((r) => {
      const b = balanceOf(ledgerBy.get(r.owner_email));
      return { code: r.code, email: r.owner_email, referrals: refCount.get(r.owner_email) || 0, saldo: b.saldo, pending: b.pending, dicairkan: b.withdrawn };
    }),
  }];
}

async function withdrawals(supabase, body) {
  const status = ["pending", "paid", "rejected"].includes(body.status) ? body.status : "pending";
  const { data, error } = await supabase
    .from("affiliate_ledger")
    .select("id, owner_email, amount, status, payout_info, created_at, updated_at")
    .eq("type", "withdraw")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return [200, { withdrawals: data || [] }];
}

// Ditolak = saldo kembali otomatis (saldo dihitung dari baris "pending"/"paid" saja).
async function updateWithdrawal(supabase, body) {
  const id = intIn(body.id, 1, Number.MAX_SAFE_INTEGER);
  const status = body.status === "paid" || body.status === "rejected" ? body.status : null;
  if (!id || !status) return [400, { error: "Data tidak valid" }];
  const { data } = await supabase
    .from("affiliate_ledger")
    .update({ status, updated_at: new Date().toISOString(), note: String(body.note || "").slice(0, 200) || null })
    .eq("id", id)
    .eq("type", "withdraw")
    .eq("status", "pending")
    .select("id");
  if (!data || !data.length) return [409, { error: "Penarikan tidak ditemukan atau sudah diproses" }];
  return [200, { ok: true }];
}

// ── Pengaturan ──
async function settingsGet(supabase) {
  return [200, { settings: await getSettings(supabase) }];
}

async function settingsSet(supabase, body) {
  const input = body.settings || {};
  const limits = {
    affiliate_commission: [0, 1000000],
    affiliate_bonus_days: [0, 365],
    affiliate_min_withdraw: [0, 10000000],
    affiliate_cap_per_semester: [0, 1000],
  };
  const rows = [];
  for (const key of SETTING_KEYS) {
    if (input[key] === undefined) continue;
    const v = intIn(input[key], limits[key][0], limits[key][1]);
    if (v === null) return [400, { error: `Nilai ${key} tidak valid` }];
    rows.push({ key, value: v, updated_at: new Date().toISOString() });
  }
  if (rows.length) {
    const { error } = await supabase.from("app_settings").upsert(rows);
    if (error) throw error;
  }
  return [200, { ok: true, settings: await getSettings(supabase) }];
}

const ACTIONS = {
  me: async () => [200, { ok: true }],
  users,
  extend,
  set_tier: setTier,
  reset_devices: resetDevices,
  code_stock: codeStock,
  generate_codes: generateCodes,
  affiliates,
  withdrawals,
  update_withdrawal: updateWithdrawal,
  settings_get: settingsGet,
  settings_set: settingsSet,
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Masuk dengan kode email dulu" });
  try {
    const supabase = getSupabase();
    const { data: u, error } = await supabase.auth.getUser(token);
    const email = normEmail(u?.user?.email);
    if (error || !email) return res.status(401).json({ error: "Sesi tidak valid, masuk lagi" });
    if (!adminList().includes(email)) return res.status(403).json({ error: "Akun ini bukan admin" });
    const fn = ACTIONS[(req.body || {}).action];
    if (!fn) return res.status(400).json({ error: "Action tidak dikenal" });
    const [code, payload] = await fn(supabase, req.body || {});
    return res.status(code).json(payload);
  } catch (e) {
    console.error("admin error:", e);
    return res.status(500).json({ error: "Gagal memproses di server" });
  }
}
