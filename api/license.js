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
// Hanya kode Presensi Siswa; kode Guru (BGY-PG-) dipakai di aplikasi Guru.
const KODE_RE = /^BGY-PS-[A-Z0-9-]{4,60}$/;

// Rate limit bersama semua instance (tabel rate_hits lewat fungsi rate_hit). Gagal cek = tidak membatasi.
async function rateLimited(supabase, key, max, windowS) {
  const { data, error } = await supabase.rpc("rate_hit", { p_key: key, p_max: max, p_window_s: windowS });
  return !error && data === true;
}
// Hanya aksi yang mengubah/menebak lisensi yang dibatasi; status, info & affiliate bebas.
const LIMITED_ACTIONS = new Set(["activate", "renew", "restore", "withdraw", "add_ref"]);

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
    .eq("product", "siswa")
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

  // Sudah punya lisensi aktif: perlakukan sebagai perpanjangan (hari ditumpuk, PRO tidak turun ke PLUS).
  if (await activeLicense(supabase, email)) return renew(supabase, body);

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

// ── Program Affiliate (khusus PRO): pemilik kode dapat bonus hari + komisi saat pembeli BARU aktivasi pakai kodenya;
//    pembeli dapat setengah komisi itu sebagai saldo ──
const REF_RE = /^PY-[A-Z0-9]{6}$/;
const SETTING_DEFAULTS = {
  affiliate_commission_plus: 1000,
  affiliate_bonus_days_plus: 12,
  affiliate_commission_pro: 2500,
  affiliate_bonus_days_pro: 30,
  affiliate_commission_guru_plus: 1500,
  affiliate_bonus_days_guru_plus: 12,
  affiliate_commission_guru_pro: 3000,
  affiliate_bonus_days_guru_pro: 30,
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

async function activeLicense(supabase, email, product = "siswa") {
  const { data } = await supabase
    .from("licenses")
    .select("id, tier, tanggal_berakhir")
    .eq("email", email)
    .eq("status", "digunakan")
    .eq("product", product)
    .order("tanggal_berakhir", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data && (!data.tanggal_berakhir || data.tanggal_berakhir > Date.now()) ? data : null;
}

const isPro = (lic) => !!lic && (lic.tier || "PRO") === "PRO";

// Affiliate berlaku lintas produk: pemilik kode cukup PRO aktif di Siswa ATAU Guru.
async function ownerIsPro(supabase, email) {
  const [s, g] = await Promise.all([activeLicense(supabase, email, "siswa"), activeLicense(supabase, email, "guru")]);
  return isPro(s) || isPro(g);
}

/** Nilai bonus per produk & paket pembeli (dipakai juga oleh Presensi Guru). */
export function rewardTable(cfg) {
  return {
    PLUS: { commission: cfg.affiliate_commission_plus, days: cfg.affiliate_bonus_days_plus },
    PRO: { commission: cfg.affiliate_commission_pro, days: cfg.affiliate_bonus_days_pro },
    GURU_PLUS: { commission: cfg.affiliate_commission_guru_plus, days: cfg.affiliate_bonus_days_guru_plus },
    GURU_PRO: { commission: cfg.affiliate_commission_guru_pro, days: cfg.affiliate_bonus_days_guru_pro },
  };
}

async function applyReferral(supabase, rawCode, buyerEmail, buyerTier) {
  const code = String(rawCode || "").toUpperCase().trim();
  if (!code) return null;
  if (!REF_RE.test(code)) return "invalid";
  const { data: ref } = await supabase.from("referrals").select("owner_email").eq("code", code).maybeSingle();
  if (!ref) return "invalid";
  if (ref.owner_email === buyerEmail) return "self";
  // Hanya pembeli baru di produk ini: email ini belum pernah punya lisensi Siswa lain.
  const { count } = await supabase.from("licenses").select("id", { count: "exact", head: true }).eq("email", buyerEmail).eq("status", "digunakan").eq("product", "siswa");
  if ((count || 0) > 1) return "not_new";
  const cfg = await getSettings(supabase);
  // Affiliate khusus PRO (Siswa atau Guru). Bonus hari ke lisensi Siswa pemilik, kalau tidak ada ke lisensi Guru-nya.
  if (!(await ownerIsPro(supabase, ref.owner_email))) return "owner_not_pro";
  const lic = (await activeLicense(supabase, ref.owner_email, "siswa")) || (await activeLicense(supabase, ref.owner_email, "guru"));
  // Besar bonus mengikuti paket pembeli. Cap, tambah hari & komisi dikerjakan atomik di DB (affiliate_credit).
  const isProBuy = buyerTier === "PRO";
  const { data, error } = await supabase.rpc("affiliate_credit", {
    p_code: code,
    p_owner: ref.owner_email,
    p_buyer: buyerEmail,
    p_tier: buyerTier,
    p_days: isProBuy ? cfg.affiliate_bonus_days_pro : cfg.affiliate_bonus_days_plus,
    p_commission: isProBuy ? cfg.affiliate_commission_pro : cfg.affiliate_commission_plus,
    p_cap: cfg.affiliate_cap_per_semester,
    p_license_id: lic?.id ?? null,
    p_product: "siswa",
  });
  if (error) throw error;
  if (data === "ok") await creditBuyer(supabase, buyerEmail, code, buyerTier, isProBuy ? cfg.affiliate_commission_pro : cfg.affiliate_commission_plus, "siswa");
  return data;
}

/** Bonus uang untuk pembeli yang memakai kode teman: setengah komisi pengajak, dibulatkan ke bawah ke Rp100. */
export const buyerShare = (commission) => Math.floor(Math.max(0, Number(commission) || 0) / 2 / 100) * 100;

// Dipanggil hanya setelah affiliate_credit = 'ok' (sekali per pembeli per produk), jadi tidak dobel.
// shortcut: bukan satu transaksi dengan affiliate_credit; kalau insert ini gagal, bonus pembeli dicatat manual oleh admin.
export async function creditBuyer(supabase, buyerEmail, code, tier, commission, product) {
  const amount = buyerShare(commission);
  if (amount <= 0) return;
  await supabase.from("affiliate_ledger").insert({
    owner_email: buyerEmail, type: "earn", amount, status: "ok", buyer_email: buyerEmail, product,
    note: `Bonus pembeli ${tier} ${product} pakai kode ${code}`,
  });
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
    rewards: rewardTable(cfg),
    minWithdraw: cfg.affiliate_min_withdraw,
    capPerSemester: cfg.affiliate_cap_per_semester,
  }];
}

// Dashboard affiliate: hanya pelanggan PRO aktif yang sudah verifikasi email (sesi OTP).
async function affiliate(supabase, body, req) {
  const email = await sessionEmail(supabase, req);
  if (!email) return [401, { error: "Verifikasi email dulu", code: "NO_SESSION" }];
  if (!(await ownerIsPro(supabase, email))) return [403, { error: "Program Affiliate khusus pelanggan PRO aktif", code: "NOT_PRO" }];
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
    supabase.from("referral_rewards").select("buyer_email, buyer_tier, days, created_at, product").eq("owner_email", email).order("created_at", { ascending: false }).limit(100),
    supabase.from("affiliate_ledger").select("type, amount, status, buyer_email, created_at, product").eq("owner_email", email).order("created_at", { ascending: false }).limit(500),
  ]);
  const bal = balanceOf(ledger);
  return [200, {
    code: row.code,
    email,
    referrals: (rewards || []).map((r) => {
      const product = r.product || "siswa";
      const earn = (ledger || []).find((l) => l.type === "earn" && l.buyer_email === r.buyer_email && (l.product || "siswa") === product);
      return { email: maskEmail(r.buyer_email), tier: r.buyer_tier || null, product, at: r.created_at, days: r.days || 0, amount: earn?.amount || 0 };
    }),
    rewardsThisSemester: (rewards || []).filter((r) => r.created_at >= since).length,
    ...bal,
    hasPending: bal.pending > 0,
    rewards: rewardTable(cfg),
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
  // Index unik "satu penarikan pending per orang" menolak klik ganda/request paralel.
  if (error?.code === "23505") return [409, { error: "Masih ada penarikan yang menunggu" }];
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
    .select("id, tier, tanggal_berakhir")
    .eq("email", email)
    .eq("status", "digunakan")
    .eq("product", "siswa")
    .order("tanggal_berakhir", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = Date.now();
  // Jangan turunkan PRO yang masih aktif lewat kode PLUS.
  if (tier === "PLUS" && current && (current.tier || "PRO") === "PRO" && (!current.tanggal_berakhir || current.tanggal_berakhir > now)) {
    const sampai = current.tanggal_berakhir ? new Date(current.tanggal_berakhir).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";
    return [409, { error: `Paket PRO masih aktif sampai ${sampai}. Pakai kode PRO untuk memperpanjang.` }];
  }
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

const REF_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Masukkan kode teman setelah aktivasi: sekali, paling lambat 7 hari setelah lisensi Siswa pertama.
async function addRef(supabase, body, req) {
  const email = await sessionEmail(supabase, req);
  if (!email) return [401, { error: "Verifikasi email dulu", code: "NO_SESSION" }];
  const { data: first } = await supabase.from("licenses").select("tier, tanggal_aktivasi").eq("email", email).eq("status", "digunakan").eq("product", "siswa").order("tanggal_aktivasi", { ascending: true }).limit(1).maybeSingle();
  if (!first) return [403, { error: "Kode teman bisa dipakai setelah aktivasi PLUS/PRO", code: "NO_LICENSE" }];
  if (Date.now() - (first.tanggal_aktivasi || 0) > REF_WINDOW_MS) return [409, { error: "Batas memasukkan kode teman 7 hari setelah aktivasi", code: "TOO_LATE" }];
  const { count } = await supabase.from("referral_rewards").select("id", { count: "exact", head: true }).eq("buyer_email", email).eq("product", "siswa");
  if (count) return [409, { error: "Kode teman sudah pernah dipakai", code: "USED" }];
  const result = await applyReferral(supabase, body.ref, email, first.tier || "PRO");
  const MSG = {
    ok: "Kode teman berhasil dipakai",
    invalid: "Kode teman tidak ditemukan",
    self: "Tidak bisa memakai kode sendiri",
    not_new: "Kode teman hanya untuk pembelian pertama",
    owner_not_pro: "Pemilik kode belum PRO aktif",
    cap: "Kode teman ini sudah mencapai batas semester ini",
    used: "Kode teman sudah pernah dipakai",
  };
  return [result === "ok" ? 200 : 409, { ok: result === "ok", result, message: MSG[result] || "Kode teman tidak bisa dipakai" }];
}

// Saldo bonus untuk siapa saja yang sudah verifikasi email (termasuk pembeli yang bukan PRO).
async function saldo(supabase, body, req) {
  const email = await sessionEmail(supabase, req);
  if (!email) return [401, { error: "Verifikasi email dulu", code: "NO_SESSION" }];
  const cfg = await getSettings(supabase);
  const [{ data: ledger }, { count }, { data: first }] = await Promise.all([
    supabase.from("affiliate_ledger").select("type, amount, status").eq("owner_email", email),
    supabase.from("referral_rewards").select("id", { count: "exact", head: true }).eq("buyer_email", email).eq("product", "siswa"),
    supabase.from("licenses").select("tanggal_aktivasi").eq("email", email).eq("product", "siswa").eq("status", "digunakan")
      .order("tanggal_aktivasi", { ascending: true }).limit(1).maybeSingle(),
  ]);
  // Kode teman hanya bisa diisi dalam 7 hari setelah aktivasi pertama (aturan sama dengan add_ref).
  const refOpen = !count && !!first?.tanggal_aktivasi && Date.now() - first.tanggal_aktivasi <= 7 * 86400000;
  return [200, { ...balanceOf(ledger), minWithdraw: cfg.affiliate_min_withdraw, refUsed: !!count, refOpen }];
}

const ACTIONS = { activate, renew, status, restore, affiliate, affiliate_info: affiliateInfo, withdraw, add_ref: addRef, saldo };

// Pengumuman aktif untuk semua pengguna (tanpa login). Di-cache CDN 5 menit.
async function announcements(res) {
  const now = new Date().toISOString();
  const { data, error } = await getSupabase()
    .from("announcements")
    .select("id, title, body, target, level, link_url, link_label, starts_at")
    .eq("active", true)
    .in("product", ["siswa", "all"])
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
  const { action } = req.body || {};
  const fn = ACTIONS[action];
  if (!fn) return res.status(400).json({ error: "Action tidak dikenal" });
  try {
    const supabase = getSupabase();
    if (LIMITED_ACTIONS.has(action) && (await rateLimited(supabase, "lic:" + ip, 30, 600))) {
      return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 10 menit lagi." });
    }
    const [code, payload] = await fn(supabase, req.body, req);
    return res.status(code).json(payload);
  } catch {
    return res.status(500).json({ error: "Gagal memproses lisensi di server" });
  }
}
