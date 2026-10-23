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
const SETTING_KEYS = ["affiliate_commission_plus", "affiliate_bonus_days_plus", "affiliate_commission_pro", "affiliate_bonus_days_pro", "affiliate_min_withdraw", "affiliate_cap_per_semester"];

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
const SOON_MS = 14 * DAY;

async function allLicenses(supabase) {
  const { data, error } = await supabase
    .from("licenses")
    .select("email, kode, tier, tanggal_aktivasi, tanggal_berakhir")
    .eq("status", "digunakan")
    .eq("product", "siswa")
    .not("email", "is", null)
    .order("tanggal_aktivasi", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data || [];
}

// Satu baris per email: lisensi dengan masa berlaku terpanjang.
function groupByEmail(lics) {
  const byEmail = new Map();
  for (const l of lics) {
    const cur = byEmail.get(l.email);
    if (!cur) byEmail.set(l.email, { ...l, jumlahKode: 1, pertama: l.tanggal_aktivasi });
    else {
      cur.jumlahKode++;
      cur.pertama = Math.min(cur.pertama || Infinity, l.tanggal_aktivasi || Infinity);
      if ((l.tanggal_berakhir || 0) > (cur.tanggal_berakhir || 0)) Object.assign(cur, { tier: l.tier, tanggal_berakhir: l.tanggal_berakhir, tanggal_aktivasi: l.tanggal_aktivasi });
    }
  }
  return byEmail;
}

const isActive = (l, now) => !!l.tanggal_berakhir && l.tanggal_berakhir > now;

async function users(supabase, body) {
  const q = String(body.q || "").toLowerCase().trim().slice(0, 80);
  const filter = String(body.filter || "all");
  const now = Date.now();
  let rows = [...groupByEmail(await allLicenses(supabase)).values()];
  if (q) rows = rows.filter((l) => l.email.includes(q));
  rows = rows.filter((l) => {
    if (filter === "PRO" || filter === "PLUS") return (l.tier || "PRO") === filter;
    if (filter === "aktif") return isActive(l, now);
    if (filter === "expired") return !isActive(l, now);
    if (filter === "soon") return isActive(l, now) && l.tanggal_berakhir - now <= SOON_MS;
    return true;
  });
  if (filter === "soon") rows.sort((a, b) => a.tanggal_berakhir - b.tanggal_berakhir);
  else rows.sort((a, b) => (b.tanggal_aktivasi || 0) - (a.tanggal_aktivasi || 0));
  const total = rows.length;
  rows = rows.slice(0, 150);
  const emails = rows.map((l) => l.email);
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
  return [200, {
    total,
    users: rows.map((l) => ({
      email: l.email,
      tier: l.tier || "PRO",
      aktif: isActive(l, now),
      tanggalAktivasi: l.tanggal_aktivasi || null,
      tanggalBerakhir: l.tanggal_berakhir || null,
      jumlahKode: l.jumlahKode,
      perangkat: devCount.get(pidByEmail.get(l.email)) || 0,
    })),
  }];
}

// ── Ringkasan ──
const PRICE = { PLUS: 17000, PRO: 32000 };

async function summary(supabase) {
  const now = Date.now();
  const d = new Date();
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const semStart = new Date(d.getFullYear(), d.getMonth() < 6 ? 0 : 6, 1).getTime();
  const lics = await allLicenses(supabase);
  const users = [...groupByEmail(lics).values()];
  const aktif = { PLUS: 0, PRO: 0 };
  let expired = 0;
  const soon = [];
  for (const u of users) {
    if (isActive(u, now)) {
      aktif[u.tier === "PLUS" ? "PLUS" : "PRO"]++;
      if (u.tanggal_berakhir - now <= SOON_MS) soon.push({ email: u.email, tier: u.tier || "PRO", tanggalBerakhir: u.tanggal_berakhir });
    } else expired++;
  }
  soon.sort((a, b) => a.tanggalBerakhir - b.tanggalBerakhir);
  // Pembelian = kode yang diaktivasi pada periode itu (termasuk perpanjangan).
  const count = (from) => {
    const c = { PLUS: 0, PRO: 0 };
    for (const l of lics) if ((l.tanggal_aktivasi || 0) >= from && !String(l.kode || "").startsWith("AUTO")) c[l.tier === "PLUS" ? "PLUS" : "PRO"]++;
    return { ...c, pendapatan: c.PLUS * PRICE.PLUS + c.PRO * PRICE.PRO };
  };
  const [stockRes, { data: pend }] = await Promise.all([
    codeStock(supabase),
    supabase.from("affiliate_ledger").select("amount").eq("type", "withdraw").eq("status", "pending").limit(1000),
  ]);
  return [200, {
    totalPengguna: users.length,
    aktif,
    expired,
    akanHabis: soon.slice(0, 30),
    bulanIni: count(monthStart),
    semesterIni: count(semStart),
    stok: stockRes[1].stock,
    penarikanPending: { jumlah: (pend || []).length, total: (pend || []).reduce((s, r) => s + (r.amount || 0), 0) },
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
  const n = intIn(body.n ?? 1, 1, 1000);
  const email = normEmail(body.email);
  if (!TIERS.includes(tier) || !n) return [400, { error: "Paket atau jumlah tidak valid (1–1000)" }];
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

  const kodes = [...new Set(Array.from({ length: n }, () => newCode(tier)))];
  for (let i = 0; i < kodes.length; i += 200) {
    const rows = kodes.slice(i, i + 200).map((kode) => ({ kode, tier, product: "siswa", status: "tersedia" }));
    const { error } = await supabase.from("licenses").insert(rows);
    if (error) throw error;
  }
  return [200, { ok: true, count: kodes.length, codes: kodes.slice(0, 20), bound: false }];
}

// ── Ganti email & hapus pengguna ──
// Data cloud tertaut ke profiles.id, jadi cukup pindahkan email di profil/lisensi/affiliate.
// auth_id dilepas supaya email baru wajib verifikasi kode email sekali.
const CLOUD_TABLES = [
  "cloud_attendance_records", "cloud_attendance_sessions", "cloud_students", "cloud_classrooms",
  "cloud_calendar_entries", "cloud_academic_years", "cloud_teachers", "cloud_schools",
  "cloud_tombstones", "cloud_backups", "sync_metadata", "sync_queue", "devices",
];

async function hasCloudData(supabase, profileId) {
  for (const t of ["cloud_schools", "cloud_students", "cloud_attendance_records", "devices"]) {
    const { count } = await supabase.from(t).select("user_id", { count: "exact", head: true }).eq("user_id", profileId);
    if (count) return true;
  }
  return false;
}

async function changeEmail(supabase, body) {
  const from = normEmail(body.email);
  const to = normEmail(body.newEmail);
  if (!EMAIL_RE.test(from) || !EMAIL_RE.test(to) || from === to) return [400, { error: "Email lama/baru tidak valid" }];

  const { data: targetLic } = await supabase.from("licenses").select("id").eq("email", to).eq("status", "digunakan").limit(1);
  if (targetLic && targetLic.length) return [409, { error: `${to} sudah punya lisensi. Tidak bisa digabung otomatis.` }];
  const { data: target } = await supabase.from("profiles").select("id, tier").eq("email", to).maybeSingle();
  if (target) {
    // Profil kosong (mis. dibuat otomatis saat login admin) boleh diganti; yang berisi data ditolak.
    if (await hasCloudData(supabase, target.id)) return [409, { error: `${to} sudah punya data cloud. Tidak bisa digabung otomatis.` }];
    const { error } = await supabase.from("profiles").delete().eq("id", target.id);
    if (error) throw error;
  }

  const { data: prof } = await supabase.from("profiles").select("id").eq("email", from).maybeSingle();
  const now = new Date().toISOString();
  if (prof) {
    await supabase.from("devices").delete().eq("user_id", prof.id);
    const { error } = await supabase.from("profiles").update({ email: to, auth_id: null, updated_at: now }).eq("id", prof.id);
    if (error) throw error;
  }
  const moved = {};
  for (const [table, col] of [
    ["licenses", "email"], ["referrals", "owner_email"], ["referral_rewards", "owner_email"], ["referral_rewards", "buyer_email"],
    ["affiliate_ledger", "owner_email"], ["affiliate_ledger", "buyer_email"], ["teacher_settings", "email"],
  ]) {
    const { data, error } = await supabase.from(table).update({ [col]: to }).eq(col, from).select(col);
    if (error && !/column|relation/i.test(error.message)) throw error;
    if (data && data.length) moved[`${table}.${col}`] = data.length;
  }
  return [200, { ok: true, profile: !!prof, moved }];
}

async function deleteUser(supabase, body) {
  const email = normEmail(body.email);
  if (!EMAIL_RE.test(email)) return [400, { error: "Email tidak valid" }];
  if (adminList().includes(email)) return [400, { error: "Akun admin tidak bisa dihapus dari sini" }];
  const { data: prof } = await supabase.from("profiles").select("id, auth_id").eq("email", email).maybeSingle();
  const removed = {};
  if (prof) {
    for (const t of CLOUD_TABLES) {
      const { data, error } = await supabase.from(t).delete().eq("user_id", prof.id).select("user_id");
      if (error && !/column|relation/i.test(error.message)) throw error;
      if (data && data.length) removed[t] = data.length;
    }
  }
  const { data: lics } = await supabase.from("licenses").delete().eq("email", email).select("id");
  removed.licenses = (lics || []).length;
  await supabase.from("teacher_settings").delete().eq("email", email);
  await supabase.from("referrals").delete().eq("owner_email", email);
  // Riwayat affiliate disimpan tapi dianonimkan.
  const anon = "terhapus@" + (prof?.id || "pengguna").slice(0, 8);
  await supabase.from("referral_rewards").update({ owner_email: anon }).eq("owner_email", email);
  await supabase.from("referral_rewards").update({ buyer_email: anon }).eq("buyer_email", email);
  await supabase.from("affiliate_ledger").update({ owner_email: anon }).eq("owner_email", email);
  await supabase.from("affiliate_ledger").update({ buyer_email: anon }).eq("buyer_email", email);
  if (prof) {
    await supabase.from("profiles").delete().eq("id", prof.id);
    for (const uid of new Set([prof.auth_id, prof.id].filter(Boolean))) {
      await supabase.auth.admin.deleteUser(uid).catch(() => {});
    }
  }
  return [200, { ok: true, removed }];
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
    affiliate_commission_plus: [0, 1000000],
    affiliate_bonus_days_plus: [0, 365],
    affiliate_commission_pro: [0, 1000000],
    affiliate_bonus_days_pro: [0, 365],
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
  summary,
  users,
  extend,
  change_email: changeEmail,
  delete_user: deleteUser,
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
