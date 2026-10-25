import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cloudLoginService } from "@/services/cloud-login.service";
import { DEFAULT_LOGO } from "@/lib/constants";
import { Users, KeyRound, Gift, Settings, Search, Loader2, LogOut, Copy, RefreshCw, LayoutDashboard } from "lucide-react";
import { useToast } from "@/components/shared/Toast";

// Halaman super admin (/admin). Semua data & aksi lewat /api/admin yang memeriksa
// sesi OTP + daftar email admin di server; halaman ini hanya tampilan.

// Produk yang sedang dikelola (Siswa/Guru); ikut dikirim di setiap aksi admin.
type Product = "siswa" | "guru";
const PRODUCT_KEY = "py_admin_product";
let PRODUCT: Product = (() => { try { return localStorage.getItem(PRODUCT_KEY) === "guru" ? "guru" : "siswa"; } catch { return "siswa"; } })();
const tiersFor = (): ("PLUS" | "PRO")[] => ["PLUS", "PRO"];

async function adminApi<T = any>(action: string, body: Record<string, unknown> = {}): Promise<{ status: number; data: T & { error?: string } }> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) return { status: 401, data: { error: "Masuk dengan kode email dulu" } as any };
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, product: PRODUCT, ...body }),
  });
  return { status: res.status, data: await res.json().catch(() => ({ error: "Respons tidak valid" })) };
}

const rp = (n: number) => "Rp" + (n || 0).toLocaleString("id-ID");
// Tanggal 0/1 (data uji lama) dianggap kosong supaya tidak tampil "1 Jan 1970".
const tgl = (v: number | string | null) =>
  v && new Date(v).getFullYear() > 2000 ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

const card = "bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-3 mb-3";
const inputCls = "w-full px-3 py-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] text-[0.85rem]";
const btn = "min-h-[40px] px-3 rounded-[10px] font-bold text-[0.78rem] border-none cursor-pointer disabled:opacity-50";
const btnMain = `${btn} text-white`;
const mainBg = { background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" };

type Tab = "summary" | "users" | "codes" | "affiliate" | "settings";

const TABS = [
  ["summary", "Ringkasan", LayoutDashboard],
  ["users", "Pengguna", Users],
  ["codes", "Kode", KeyRound],
  ["affiliate", "Affiliate", Gift],
  ["settings", "Atur", Settings],
] as const;

export default function AdminPage() {
  const [stage, setStage] = useState<"check" | "login" | "denied" | "ok">("check");
  const [me, setMe] = useState("");
  const [tab, setTab] = useState<Tab>("summary");
  const [product, setProduct] = useState<Product>(PRODUCT);
  const pickProduct = (p: Product) => {
    PRODUCT = p;
    try { localStorage.setItem(PRODUCT_KEY, p); } catch { /* ignore */ }
    setProduct(p);
  };
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Admin — Presensi Yuk";
    if (localStorage.getItem("bgy_presensi_dark") === "1") document.documentElement.classList.add("dark");
  }, []);

  const check = useCallback(async () => {
    setStage("check");
    const email = await cloudLoginService.verifiedEmail();
    if (!email) return setStage("login");
    const { status } = await adminApi("me");
    setMe(email);
    setStage(status === 200 ? "ok" : status === 403 ? "denied" : "login");
  }, []);

  useEffect(() => { check(); }, [check]);

  const flash = useCallback((m: string, type?: "success" | "error" | "info") => toast(m, type), [toast]);

  const logout = async () => {
    await supabase.auth.signOut();
    setMe("");
    setStage("login");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-10 px-3 h-[54px] flex items-center gap-2 text-white" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>
        <img src={DEFAULT_LOGO} alt="" className="w-8 h-8 rounded-lg" />
        <div className="font-extrabold"><i>Presensi Yuk</i> <span className="opacity-80 font-semibold">| Admin</span></div>
        <div className="ml-auto flex items-center gap-1">
          <a href="/" className="text-white/90 text-[0.75rem] font-semibold no-underline px-2">Ke aplikasi</a>
          {me && (
            <button onClick={logout} aria-label="Keluar" className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 text-white border-none cursor-pointer"><LogOut size={16} /></button>
          )}
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-3 pt-3 pb-[96px]">
        {stage === "check" && <Center><Loader2 className="animate-spin" /></Center>}
        {stage === "login" && <AdminLogin onDone={check} />}
        {stage === "denied" && (
          <div className={card}>
            <div className="font-bold mb-1">Akun ini bukan admin</div>
            <p className="text-[0.8rem] text-[var(--text-light)] mt-0">{me} tidak terdaftar sebagai admin.</p>
            <button onClick={logout} className={btnMain} style={mainBg}>Masuk dengan email lain</button>
          </div>
        )}
        {stage === "ok" && (
          <>
            <div className="text-[0.72rem] text-[var(--text-light)] mb-2">Masuk sebagai <b>{me}</b></div>
            <div className="grid grid-cols-2 gap-2 mb-3" role="tablist" aria-label="Aplikasi">
              {(["siswa", "guru"] as const).map((p) => (
                <button key={p} role="tab" aria-selected={product === p} onClick={() => pickProduct(p)} className={`${btn} ${product === p ? "text-white" : "bg-[var(--input-bg)] text-[var(--text)]"}`} style={product === p ? mainBg : undefined}>
                  Presensi {p === "siswa" ? "Siswa" : "Guru"}
                </button>
              ))}
            </div>
            <div key={product}>
              {tab === "summary" && <SummaryTab flash={flash} go={setTab} />}
              {tab === "users" && <UsersTab flash={flash} />}
              {tab === "codes" && <CodesTab flash={flash} />}
              {/* Satu kode & satu saldo affiliate untuk Siswa + Guru. */}
              {tab === "affiliate" && <AffiliateTab flash={flash} />}
              {tab === "settings" && <><AnnouncementsCard flash={flash} /><SettingsTab flash={flash} /></>}
            </div>
          </>
        )}
      </main>

      {stage === "ok" && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-20 bg-[var(--card-bg)] border-t border-[var(--border)] grid grid-cols-5"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", boxShadow: "0 -4px 16px rgba(0,0,0,.06)" }}
        >
          {TABS.map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => { setTab(k); window.scrollTo(0, 0); }}
              className={`min-h-[60px] flex flex-col items-center justify-center gap-[3px] border-none bg-transparent cursor-pointer text-[0.66rem] font-bold ${tab === k ? "text-[#0d7a8a]" : "text-[var(--text-light)]"}`}
              aria-current={tab === k ? "page" : undefined}
            >
              <span className={`w-10 h-7 rounded-full flex items-center justify-center ${tab === k ? "bg-[#0ea5a0]/15" : ""}`}><Icon size={18} /></span>
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="py-16 flex justify-center text-[var(--text-light)]">{children}</div>;
}

function AdminLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setBusy(true); setError("");
    const r = await cloudLoginService.sendCode(email);
    setBusy(false);
    if (r.ok) setSent(true); else setError(r.error || "Gagal mengirim kode");
  };
  const verify = async () => {
    setBusy(true); setError("");
    const r = await cloudLoginService.verifyCode(email, code);
    setBusy(false);
    if (r.ok) onDone(); else setError(r.error || "Kode salah");
  };

  return (
    <div className={`${card} max-w-[400px] mx-auto mt-6`}>
      <div className="font-extrabold text-[1rem] mb-1">Masuk Admin</div>
      <p className="text-[0.78rem] text-[var(--text-light)] mt-0 mb-3">Masukkan email admin, lalu kode yang dikirim ke email itu.</p>
      <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value.trim().toLowerCase())} placeholder="email admin" className={`${inputCls} mb-2`} disabled={sent} />
      {sent && (
        <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Kode dari email" maxLength={8} className={`${inputCls} mb-2 text-center tracking-[0.4em] font-bold`} />
      )}
      <button onClick={sent ? verify : send} disabled={busy || !email} className={`${btnMain} w-full`} style={mainBg}>
        {busy ? "Memproses..." : sent ? "Masuk" : "Kirim kode"}
      </button>
      {sent && <button onClick={() => { setSent(false); setCode(""); }} className="mt-2 bg-transparent border-none text-[0.75rem] text-[var(--text-light)] cursor-pointer p-0">Ganti email</button>}
      {error && <div className="mt-2 text-[0.75rem] text-[#dc2626]">{error}</div>}
    </div>
  );
}

type Flash = { flash: (m: string, type?: "success" | "error" | "info") => void };

interface Summary {
  totalPengguna: number;
  aktif: { PLUS: number; PRO: number };
  expired: number;
  akanHabis: { email: string; tier: string; tanggalBerakhir: number }[];
  bulanIni: { PLUS: number; PRO: number; pendapatan: number };
  semesterIni: { PLUS: number; PRO: number; pendapatan: number };
  stok: Record<string, number>;
  penarikanPending: { jumlah: number; total: number };
}

function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-[var(--input-bg)] p-3">
      <div className="text-[0.7rem] text-[var(--text-light)] font-semibold">{label}</div>
      <div className="text-[1.35rem] font-extrabold leading-tight" style={tone ? { color: tone } : undefined}>{value}</div>
      {sub && <div className="text-[0.68rem] text-[var(--text-light)] mt-[2px]">{sub}</div>}
    </div>
  );
}

function SummaryTab({ flash, go }: Flash & { go: (t: Tab) => void }) {
  const [d, setD] = useState<Summary | null>(null);
  const load = useCallback(async () => {
    setD(null);
    const { status, data } = await adminApi<Summary>("summary");
    if (status === 200) setD(data); else flash(data.error || "Gagal memuat ringkasan", "error");
  }, [flash]);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Center><Loader2 className="animate-spin" /></Center>;
  const bulan = new Date().toLocaleDateString("id-ID", { month: "long" });
  return (
    <>
      <div className={card}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-[0.85rem]">Pengguna berbayar</div>
          <button onClick={load} aria-label="Muat ulang" className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--input-bg)] text-[var(--text-light)] border-none cursor-pointer"><RefreshCw size={14} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Total pengguna" value={d.totalPengguna} />
          <Stat label="Expired" value={d.expired} tone="#dc2626" />
          <Stat label="PRO aktif" value={d.aktif.PRO} tone="#d97706" />
          <Stat label="PLUS aktif" value={d.aktif.PLUS} tone="#0d7a8a" />
        </div>
      </div>

      <div className={card}>
        <div className="font-bold text-[0.85rem] mb-2">Penjualan</div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label={`Bulan ${bulan}`} value={rp(d.bulanIni.pendapatan)} sub={`${d.bulanIni.PRO} PRO · ${d.bulanIni.PLUS} PLUS`} tone="#16a34a" />
          <Stat label="Semester ini" value={rp(d.semesterIni.pendapatan)} sub={`${d.semesterIni.PRO} PRO · ${d.semesterIni.PLUS} PLUS`} tone="#16a34a" />
        </div>
        <p className="text-[0.66rem] text-[var(--text-light)] mt-2 mb-0">Estimasi dari kode yang diaktivasi × harga ({PRODUCT === "guru" ? "PLUS Rp27.000, PRO Rp51.000" : "PLUS Rp17.000, PRO Rp32.000"}).</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={() => go("codes")} className="text-left border-none p-0 bg-transparent cursor-pointer text-[var(--text)]">
          <Stat label="Stok kode" value={`${d.stok.PRO ?? 0} / ${d.stok.PLUS ?? 0}`} sub="PRO / PLUS" />
        </button>
        <button onClick={() => go("affiliate")} className="text-left border-none p-0 bg-transparent cursor-pointer text-[var(--text)]">
          <Stat label="Tarik dana menunggu" value={d.penarikanPending.jumlah} sub={rp(d.penarikanPending.total)} tone={d.penarikanPending.jumlah ? "#d97706" : undefined} />
        </button>
      </div>

      <div className={card}>
        <div className="font-bold text-[0.85rem] mb-2">Akan habis ≤ 14 hari ({d.akanHabis.length})</div>
        {d.akanHabis.length === 0 ? (
          <p className="text-[0.78rem] text-[var(--text-light)] text-center py-2 m-0">Tidak ada.</p>
        ) : d.akanHabis.map((u) => {
          const sisa = Math.max(0, Math.ceil((u.tanggalBerakhir - Date.now()) / 86400000));
          return (
            <div key={u.email} className="flex items-center gap-2 py-2 border-t border-[var(--border)] first:border-t-0">
              <span className="text-[0.8rem] font-semibold truncate flex-1">{u.email}</span>
              <span className="text-[0.65rem] font-bold text-[var(--text-light)]">{u.tier}</span>
              <span className={`text-[0.7rem] font-bold px-2 py-[2px] rounded-full ${sisa <= 3 ? "bg-[#dc2626]/15 text-[#dc2626]" : "bg-[#f59e0b]/15 text-[#d97706]"}`}>{sisa} hari</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

interface AdminUser {
  email: string; tier: string; aktif: boolean; tanggalAktivasi: number | null; tanggalBerakhir: number | null; jumlahKode: number; perangkat: number;
}

const FILTERS = [
  ["all", "Semua"], ["PRO", "PRO"], ["PLUS", "PLUS"], ["trial", "Trial"], ["aktif", "Aktif"], ["expired", "Expired"], ["soon", "Akan habis"],
] as const;

function UsersTab({ flash }: Flash) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [list, setList] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [days, setDays] = useState("30");
  const [newEmail, setNewEmail] = useState("");

  const search = useCallback(async (query: string, f: string) => {
    setBusy(true);
    const { status, data } = await adminApi<{ users: AdminUser[]; total: number }>("users", { q: query, filter: f });
    setBusy(false);
    if (status === 200) { setList(data.users); setTotal(data.total); } else flash(data.error || "Gagal memuat", "error");
  }, [flash]);

  useEffect(() => { search(q, filter); }, [filter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action: string, body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    const { status, data } = await adminApi(action, body);
    setBusy(false);
    if (status === 200) flash(ok, "success"); else flash(data.error || "Gagal", "error");
    if (status === 200) { setOpen(null); search(q, filter); }
    return status === 200;
  };

  const changeEmail = async (email: string) => {
    const to = newEmail.trim().toLowerCase();
    if (!to.includes("@")) return flash("Isi email baru dulu", "error");
    if (!confirm(`Pindahkan lisensi & data ${email} ke ${to}?\nPengguna harus verifikasi kode email lagi di HP-nya.`)) return;
    if (await act("change_email", { email, newEmail: to }, `Dipindah ke ${to}`)) setNewEmail("");
  };

  const remove = (email: string) => {
    const typed = prompt(`Hapus PERMANEN ${email}?\nLisensi, data cloud, perangkat, dan akun login ikut terhapus.\n\nKetik HAPUS untuk lanjut.`);
    if (typed?.trim().toUpperCase() !== "HAPUS") return;
    act("delete_user", { email }, `${email} dihapus`);
  };

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); search(q, filter); }} className="flex gap-2 mb-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari email…" className={inputCls} />
        <button type="submit" className={`${btnMain} flex-shrink-0`} style={mainBg} aria-label="Cari"><Search size={16} /></button>
      </form>
      <div className="flex gap-[6px] overflow-x-auto pb-2 mb-1 -mx-3 px-3" style={{ scrollbarWidth: "none" }}>
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`flex-shrink-0 min-h-[34px] px-3 rounded-full text-[0.74rem] font-bold border cursor-pointer ${filter === k ? "text-white border-transparent" : "bg-[var(--card-bg)] text-[var(--text)] border-[var(--border)]"}`}
            style={filter === k ? mainBg : undefined}
          >
            {label}
          </button>
        ))}
      </div>
      {list && <div className="text-[0.7rem] text-[var(--text-light)] mb-2">{total} pengguna{total > list.length ? ` · menampilkan ${list.length}` : ""}</div>}
      {!list ? <Center><Loader2 className="animate-spin" /></Center> : list.length === 0 ? (
        <Center>Tidak ada pengguna.</Center>
      ) : (
        list.map((u) => (
          <div key={u.email} className={card}>
            <button onClick={() => { setOpen(open === u.email ? null : u.email); setNewEmail(""); }} className="w-full text-left bg-transparent border-none p-0 cursor-pointer text-[var(--text)]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[0.85rem] truncate flex-1">{u.email}</span>
                <span className={`text-[0.65rem] font-bold px-2 py-[2px] rounded-full ${u.tier === "PRO" ? "bg-[#f59e0b]/15 text-[#d97706]" : "bg-[#0ea5a0]/15 text-[#0ea5a0]"}`}>{u.tier}</span>
                <span className={`text-[0.65rem] font-bold px-2 py-[2px] rounded-full whitespace-nowrap ${u.aktif ? "bg-[#16a34a]/15 text-[#16a34a]" : "bg-[#dc2626]/15 text-[#dc2626]"}`}>{u.tier === "FREE" && u.tanggalBerakhir ? `Trial · sisa ${Math.max(0, Math.ceil((u.tanggalBerakhir - Date.now()) / 86400000))} hari` : u.aktif ? "Aktif" : "Expired"}</span>
              </div>
              <div className="text-[0.72rem] text-[var(--text-light)] mt-1">
                Aktivasi {tgl(u.tanggalAktivasi)} · Berakhir <b className="text-[var(--text)]">{tgl(u.tanggalBerakhir)}</b> · {u.perangkat} perangkat · {u.jumlahKode} kode
              </div>
            </button>
            {open === u.email && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                <div className="flex gap-2">
                  <input type="number" min={1} max={400} value={days} onChange={(e) => setDays(e.target.value)} className={`${inputCls} w-24`} aria-label="Jumlah hari" />
                  <button disabled={busy} onClick={() => act("extend", { email: u.email, days: Number(days) }, `Diperpanjang ${days} hari`)} className={`${btnMain} flex-1`} style={mainBg}>Perpanjang +{days || 0} hari</button>
                </div>
                <div className="flex gap-2">
                  {tiersFor().map((t) => (
                    <button key={t} disabled={busy || u.tier === t} onClick={() => act("set_tier", { email: u.email, tier: t }, `Paket jadi ${t}`)} className={`${btn} flex-1 bg-[var(--input-bg)] text-[var(--text)]`}>Jadikan {t}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="email" inputMode="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email baru" className={inputCls} />
                  <button disabled={busy || !newEmail} onClick={() => changeEmail(u.email)} className={`${btn} flex-shrink-0 bg-[var(--input-bg)] text-[var(--text)]`}>Ganti email</button>
                </div>
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => confirm(`Keluarkan semua perangkat ${u.email}?`) && act("reset_devices", { email: u.email }, "Perangkat direset")} className={`${btn} flex-1 bg-[#f59e0b]/12 text-[#b45309]`}>
                    Reset perangkat ({u.perangkat})
                  </button>
                  <button disabled={busy} onClick={() => remove(u.email)} className={`${btn} flex-1 bg-[#dc2626]/10 text-[#dc2626]`}>Hapus pengguna</button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </>
  );
}

function CodesTab({ flash }: Flash) {
  const [stock, setStock] = useState<Record<string, number> | null>(null);
  const [tier, setTier] = useState<"PLUS" | "PRO">("PRO");
  const [n, setN] = useState("10");
  const [email, setEmail] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [buyer, setBuyer] = useState("");
  const [pesan, setPesan] = useState("");

  const load = useCallback(async () => {
    const { status, data } = await adminApi<{ stock: Record<string, number> }>("code_stock");
    if (status === 200) setStock(data.stock);
  }, []);
  useEffect(() => { load(); }, [load]);

  const gen = async (bind: boolean) => {
    setBusy(true);
    const { status, data } = await adminApi<{ codes: string[]; count?: number; bound: boolean; tanggalBerakhir: number | null }>("generate_codes", bind ? { tier, email } : { tier, n: Number(n) });
    setBusy(false);
    if (status !== 200) return flash(data.error || "Gagal membuat kode", "error");
    setCodes(data.codes);
    setNote(bind
      ? data.bound
        ? `Kode cadangan untuk ${email}, berlaku sampai ${tgl(data.tanggalBerakhir)}. Pengguna memulihkan dengan email + kode ini.`
        : `${email} tidak punya lisensi aktif — kode masuk stok dan bisa diaktivasi biasa.`
      : `${data.count ?? data.codes.length} kode ${tier} masuk stok${(data.count ?? 0) > data.codes.length ? ` (20 pertama ditampilkan)` : ""}.`);
    flash("Kode dibuat", "success");
    load();
  };

  // Penjualan manual lewat WA: satu kode baru + link yang sudah berisi email & kode pembeli.
  const jual = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer)) return flash("Email pembeli tidak valid", "error");
    setBusy(true);
    const { status, data } = await adminApi<{ codes: string[] }>("generate_codes", { tier, n: 1 });
    setBusy(false);
    if (status !== 200 || !data.codes?.[0]) return flash(data.error || "Gagal membuat kode", "error");
    const kode = data.codes[0];
    const host = PRODUCT === "guru" ? "https://preguru.bantuguruyuk.web.id" : "https://presiswa.bantuguruyuk.web.id";
    const app = PRODUCT === "guru" ? "Presensi Yuk | Guru" : "Presensi Yuk | Siswa";
    const link = `${host}/aktivasi?email=${encodeURIComponent(buyer)}&kode=${kode}`;
    setPesan(`Terima kasih sudah membeli ${app} paket ${tier}.\n\nBuka link ini lalu tekan Aktivasi:\n${link}\n\nEmail: ${buyer}\nKode: ${kode}`);
    flash("Link aktivasi dibuat", "success");
    load();
  };

  return (
    <>
      <div className={card}>
        <div className="font-bold text-[0.85rem] mb-1">Jual lewat WA</div>
        <p className="text-[0.68rem] text-[var(--text-light)] mt-0 mb-2">Isi email pembeli, pilih paket, lalu kirim pesannya. Pembeli cukup buka link dan tekan Aktivasi. Kalau lisensinya masih aktif, otomatis jadi perpanjangan.</p>
        <div className="flex gap-2 mb-2">
          {tiersFor().map((t) => (
            <button key={t} onClick={() => setTier(t)} className={`${btn} flex-1 ${tier === t ? "text-white" : "bg-[var(--input-bg)] text-[var(--text)]"}`} style={tier === t ? mainBg : undefined}>{t}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="email" value={buyer} onChange={(e) => setBuyer(e.target.value.trim().toLowerCase())} placeholder="email pembeli" className={inputCls} />
          <button disabled={busy || !buyer} onClick={jual} className={`${btnMain} flex-shrink-0`} style={mainBg}>Buat link</button>
        </div>
        {pesan && (
          <>
            <pre className="mt-2 mb-2 text-[0.74rem] whitespace-pre-wrap break-all bg-[var(--input-bg)] rounded-lg p-2">{pesan}</pre>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard?.writeText(pesan).then(() => flash("Pesan disalin"))} className={`${btn} flex-1 flex items-center justify-center gap-1 bg-[var(--input-bg)] text-[var(--text)]`}><Copy size={14} /> Salin</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(pesan)}`} target="_blank" rel="noreferrer" className={`${btnMain} flex-1 flex items-center justify-center no-underline`} style={{ background: "#25D366" }}>Kirim via WA</a>
            </div>
          </>
        )}
      </div>

      <div className={card}>
        <div className="font-bold text-[0.85rem] mb-2">Stok kode belum terpakai</div>
        <div className="grid grid-cols-2 gap-2">
          {tiersFor().map((t) => (
            <div key={t} className="rounded-lg bg-[var(--input-bg)] p-3 text-center">
              <div className="text-[0.7rem] text-[var(--text-light)]">{t}</div>
              <div className="text-[1.4rem] font-extrabold">{stock ? stock[t] ?? 0 : "…"}</div>
            </div>
          ))}
        </div>
        <p className="text-[0.68rem] text-[var(--text-light)] mt-2 mb-0">Samakan jumlah stok produk di toko dengan angka ini.</p>
      </div>

      <div className={card}>
        <div className="flex gap-2 mb-3">
          {tiersFor().map((t) => (
            <button key={t} onClick={() => setTier(t)} className={`${btn} flex-1 ${tier === t ? "text-white" : "bg-[var(--input-bg)] text-[var(--text)]"}`} style={tier === t ? mainBg : undefined}>{t}</button>
          ))}
        </div>
        <div className="font-bold text-[0.82rem] mb-1">Kode cadangan (pengguna lupa kode)</div>
        <div className="flex gap-2 mb-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value.trim().toLowerCase())} placeholder="email pengguna" className={inputCls} />
          <button disabled={busy || !email} onClick={() => gen(true)} className={`${btnMain} flex-shrink-0`} style={mainBg}>Buat</button>
        </div>
        <div className="font-bold text-[0.82rem] mb-1">Tambah stok</div>
        <div className="flex gap-2">
          <input type="number" min={1} max={1000} value={n} onChange={(e) => setN(e.target.value)} className={`${inputCls} w-24`} aria-label="Jumlah kode" />
          <button disabled={busy} onClick={() => gen(false)} className={`${btnMain} flex-1`} style={mainBg}>Buat {n || 0} kode {tier}</button>
        </div>
      </div>

      {codes.length > 0 && (
        <div className={card}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-[0.82rem]">Kode baru</div>
            <button onClick={() => navigator.clipboard?.writeText(codes.join("\n")).then(() => flash("Kode disalin"))} className={`${btn} flex items-center gap-1 bg-[var(--input-bg)] text-[var(--text)]`}><Copy size={14} /> Salin</button>
          </div>
          <p className="text-[0.72rem] text-[var(--text-light)] mt-0">{note}</p>
          <pre className="m-0 text-[0.78rem] font-mono whitespace-pre-wrap bg-[var(--input-bg)] rounded-lg p-2 max-h-60 overflow-auto">{codes.join("\n")}</pre>
        </div>
      )}
    </>
  );
}

interface Affiliate { code: string; email: string; referrals: number; saldo: number; pending: number; dicairkan: number }
interface Withdrawal { id: number; owner_email: string; amount: number; status: string; payout_info: string | null; created_at: string; updated_at: string }

function AffiliateTab({ flash }: Flash) {
  const [affs, setAffs] = useState<Affiliate[] | null>(null);
  const [wStatus, setWStatus] = useState<"pending" | "paid" | "rejected">("pending");
  const [ws, setWs] = useState<Withdrawal[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, w] = await Promise.all([
      adminApi<{ affiliates: Affiliate[] }>("affiliates"),
      adminApi<{ withdrawals: Withdrawal[] }>("withdrawals", { status: wStatus }),
    ]);
    if (a.status === 200) setAffs(a.data.affiliates);
    if (w.status === 200) setWs(w.data.withdrawals);
  }, [wStatus]);
  useEffect(() => { load(); }, [load]);

  const update = async (id: number, status: "paid" | "rejected") => {
    if (status === "rejected" && !confirm("Tolak penarikan ini? Saldo kembali ke pengguna.")) return;
    setBusy(true);
    const { status: s, data } = await adminApi("update_withdrawal", { id, status });
    setBusy(false);
    flash(s === 200 ? (status === "paid" ? "Ditandai sudah dibayar" : "Penarikan ditolak, saldo kembali") : data.error || "Gagal");
    load();
  };

  return (
    <>
      <div className={card}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-[0.85rem]">Penarikan dana</div>
          <button onClick={load} aria-label="Muat ulang" className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--input-bg)] text-[var(--text-light)] border-none cursor-pointer"><RefreshCw size={14} /></button>
        </div>
        <div className="flex gap-1 mb-2">
          {(["pending", "paid", "rejected"] as const).map((s) => (
            <button key={s} onClick={() => setWStatus(s)} className={`${btn} flex-1 ${wStatus === s ? "text-white" : "bg-[var(--input-bg)] text-[var(--text)]"}`} style={wStatus === s ? mainBg : undefined}>
              {s === "pending" ? "Menunggu" : s === "paid" ? "Dibayar" : "Ditolak"}
            </button>
          ))}
        </div>
        {!ws ? <Center><Loader2 className="animate-spin" /></Center> : ws.length === 0 ? (
          <p className="text-[0.78rem] text-[var(--text-light)] text-center py-3 m-0">Tidak ada.</p>
        ) : ws.map((w) => (
          <div key={w.id} className="border-t border-[var(--border)] py-2 first:border-t-0">
            <div className="flex items-center justify-between">
              <span className="text-[0.8rem] font-bold truncate">{w.owner_email}</span>
              <span className="text-[0.9rem] font-extrabold">{rp(w.amount)}</span>
            </div>
            <div className="text-[0.72rem] text-[var(--text-light)]">{w.payout_info || "—"} · {tgl(w.created_at)}</div>
            {w.status === "pending" && (
              <div className="flex gap-2 mt-2">
                <button disabled={busy} onClick={() => update(w.id, "paid")} className={`${btnMain} flex-1`} style={{ background: "#16a34a" }}>Tandai dibayar</button>
                <button disabled={busy} onClick={() => update(w.id, "rejected")} className={`${btn} flex-1 bg-[#dc2626]/10 text-[#dc2626]`}>Tolak</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={card}>
        <div className="font-bold text-[0.85rem] mb-1">Daftar affiliate</div>
        <div className="text-[0.7rem] text-[var(--text-light)] mb-2">Pembeli yang memakai kode teman dapat saldo setengah komisi pengajak (baris "Bonus pembeli").</div>
        {!affs ? <Center><Loader2 className="animate-spin" /></Center> : affs.length === 0 ? (
          <p className="text-[0.78rem] text-[var(--text-light)] text-center py-3 m-0">Belum ada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[0.74rem] border-collapse">
              <thead>
                <tr className="text-left text-[var(--text-light)]">
                  <th className="py-1 pr-2">Kode / pemilik</th><th className="py-1 pr-2 text-right">Ref</th><th className="py-1 pr-2 text-right">Saldo</th><th className="py-1 text-right">Cair</th>
                </tr>
              </thead>
              <tbody>
                {affs.map((a) => (
                  <tr key={a.code + a.email} className="border-t border-[var(--border)]">
                    <td className="py-[6px] pr-2"><div className="font-mono font-bold">{a.code}</div><div className="text-[var(--text-light)] truncate max-w-[160px]">{a.email}</div></td>
                    <td className="py-[6px] pr-2 text-right font-bold">{a.referrals}</td>
                    <td className="py-[6px] pr-2 text-right">{rp(a.saldo)}{a.pending > 0 && <div className="text-[#d97706]">+{rp(a.pending)} proses</div>}</td>
                    <td className="py-[6px] text-right">{rp(a.dicairkan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

const SETTING_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "affiliate_commission_plus", label: "Komisi pembeli PLUS (Rp)", hint: "Masuk ke saldo affiliate tiap pembeli PLUS baru" },
  { key: "affiliate_bonus_days_plus", label: "Bonus hari pembeli PLUS", hint: "Ditambahkan ke lisensi PRO pemilik kode" },
  { key: "affiliate_commission_pro", label: "Komisi pembeli PRO (Rp)", hint: "Masuk ke saldo affiliate tiap pembeli PRO baru" },
  { key: "affiliate_bonus_days_pro", label: "Bonus hari pembeli PRO", hint: "Ditambahkan ke lisensi PRO pemilik kode" },
  { key: "affiliate_commission_guru_plus", label: "Komisi pembeli Guru PLUS (Rp)", hint: "Presensi Guru — tiap pembeli PLUS baru" },
  { key: "affiliate_bonus_days_guru_plus", label: "Bonus hari pembeli Guru PLUS", hint: "Presensi Guru — ditambahkan ke lisensi pemilik kode" },
  { key: "affiliate_commission_guru_pro", label: "Komisi pembeli Guru PRO (Rp)", hint: "Presensi Guru — tiap pembeli PRO baru" },
  { key: "affiliate_bonus_days_guru_pro", label: "Bonus hari pembeli Guru PRO", hint: "Presensi Guru — ditambahkan ke lisensi pemilik kode" },
  { key: "affiliate_min_withdraw", label: "Minimal penarikan (Rp)", hint: "Saldo minimal agar tombol Tarik Dana aktif" },
  { key: "affiliate_cap_per_semester", label: "Batas bonus per semester", hint: "Maksimal pembeli yang memberi bonus per 180 hari" },
];

function SettingsTab({ flash }: Flash) {
  const [vals, setVals] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi<{ settings: Record<string, number> }>("settings_get").then(({ status, data }) => {
      if (status === 200) setVals(Object.fromEntries(Object.entries(data.settings).map(([k, v]) => [k, String(v)])));
    });
  }, []);

  const save = async () => {
    if (!vals) return;
    setBusy(true);
    const { status, data } = await adminApi("settings_set", { settings: Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, Number(v)])) });
    setBusy(false);
    flash(status === 200 ? "Pengaturan disimpan" : data.error || "Gagal menyimpan");
  };

  if (!vals) return <Center><Loader2 className="animate-spin" /></Center>;
  return (
    <div className={card}>
      <div className="font-bold text-[0.85rem] mb-3">Program Affiliate</div>
      {SETTING_FIELDS.map((f) => (
        <label key={f.key} className="block mb-3">
          <span className="block text-[0.78rem] font-semibold">{f.label}</span>
          <span className="block text-[0.68rem] text-[var(--text-light)] mb-1">{f.hint}</span>
          <input type="number" min={0} value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} className={inputCls} />
        </label>
      ))}
      <button disabled={busy} onClick={save} className={`${btnMain} w-full`} style={mainBg}>{busy ? "Menyimpan..." : "Simpan"}</button>
    </div>
  );
}

type Ann = { id: number; product?: string; title: string; body: string; target: string; level: string; link_url: string | null; link_label: string | null; active: boolean; ends_at: string | null };
const TARGETS: [string, string][] = [["all", "Semua"], ["free", "FREE/trial"], ["plus", "PLUS"], ["pro", "PRO"]];
const emptyAnn = { title: "", body: "", target: "all", level: "info", link_url: "", link_label: "", ends_at: "", product: "siswa" };
const APPS: [string, string][] = [["siswa", "Presensi Siswa"], ["guru", "Presensi Guru"], ["all", "Siswa & Guru"]];

function AnnouncementsCard({ flash }: Flash) {
  const [items, setItems] = useState<Ann[] | null>(null);
  const [form, setForm] = useState({ ...emptyAnn, product: PRODUCT });
  const [busy, setBusy] = useState(false);

  const run = async (action: string, body: Record<string, unknown>, ok?: string) => {
    setBusy(true);
    const { status, data } = await adminApi<{ items: Ann[] }>(action, body);
    setBusy(false);
    if (status === 200) { setItems(data.items); if (ok) flash(ok); return true; }
    flash(data.error || "Gagal");
    return false;
  };

  useEffect(() => { run("announcements", {}); }, []);

  const save = async () => {
    if (await run("announcement_save", { ...form, ends_at: form.ends_at ? new Date(form.ends_at + "T23:59:59").toISOString() : null }, "Pengumuman diterbitkan")) setForm({ ...emptyAnn, product: PRODUCT });
  };
  const set = (k: keyof typeof emptyAnn) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className={card}>
      <div className="font-bold text-[0.85rem] mb-1">Pengumuman</div>
      <div className="text-[0.68rem] text-[var(--text-light)] mb-3">Tampil di halaman Presensi pengguna. "Penting" muncul sebagai pop-up sekali.</div>
      <input value={form.title} onChange={set("title")} placeholder="Judul" maxLength={120} className={`${inputCls} mb-2`} />
      <textarea value={form.body} onChange={set("body")} placeholder="Isi pengumuman" maxLength={1000} rows={3} className={`${inputCls} mb-2`} />
      <select value={form.product} onChange={set("product")} className={`${inputCls} mb-2`} aria-label="Untuk aplikasi">
        {APPS.map(([v, l]) => <option key={v} value={v}>Aplikasi: {l}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <select value={form.target} onChange={set("target")} className={inputCls} aria-label="Untuk paket">
          {TARGETS.map(([v, l]) => <option key={v} value={v}>Untuk: {l}</option>)}
        </select>
        <select value={form.level} onChange={set("level")} className={inputCls} aria-label="Tingkat">
          <option value="info">Info</option>
          <option value="penting">Penting (pop-up)</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input value={form.link_url} onChange={set("link_url")} placeholder="Link (opsional) https://" className={inputCls} />
        <input value={form.link_label} onChange={set("link_label")} placeholder="Teks tombol" maxLength={40} className={inputCls} />
      </div>
      <label className="block mb-3">
        <span className="block text-[0.7rem] text-[var(--text-light)] mb-1">Berakhir (opsional)</span>
        <input type="date" value={form.ends_at} onChange={set("ends_at")} className={inputCls} />
      </label>
      <button disabled={busy || !form.title.trim()} onClick={save} className={`${btnMain} w-full mb-3`} style={mainBg}>Terbitkan</button>

      {!items ? <Center><Loader2 className="animate-spin" /></Center> : items.length === 0 ? (
        <div className="text-[0.75rem] text-[var(--text-light)] text-center py-2">Belum ada pengumuman.</div>
      ) : items.map((a) => (
        <div key={a.id} className={`border-t border-[var(--border)] py-2 ${a.active ? "" : "opacity-50"}`}>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[0.8rem]">{a.level === "penting" ? "❗ " : ""}{a.title}</div>
              <div className="text-[0.68rem] text-[var(--text-light)]">
                {APPS.find(([v]) => v === a.product)?.[1]} · {TARGETS.find(([v]) => v === a.target)?.[1]} · {a.ends_at ? `s/d ${tgl(a.ends_at)}` : "tanpa batas"}
              </div>
            </div>
            <button disabled={busy} onClick={() => run("announcement_toggle", { id: a.id, active: !a.active })} className={`${btn} bg-[var(--input-bg)] text-[var(--text)]`}>{a.active ? "Matikan" : "Aktifkan"}</button>
            <button disabled={busy} onClick={() => confirm("Hapus pengumuman ini?") && run("announcement_delete", { id: a.id }, "Dihapus")} className={`${btn} bg-[#fee2e2] text-[#b91c1c]`}>Hapus</button>
          </div>
        </div>
      ))}
    </div>
  );
}
