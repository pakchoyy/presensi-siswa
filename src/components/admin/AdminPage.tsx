import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cloudLoginService } from "@/services/cloud-login.service";
import { DEFAULT_LOGO } from "@/lib/constants";
import { Users, KeyRound, Gift, Settings, Search, Loader2, LogOut, Copy, RefreshCw } from "lucide-react";

// Halaman super admin (/admin). Semua data & aksi lewat /api/admin yang memeriksa
// sesi OTP + daftar email admin di server; halaman ini hanya tampilan.

async function adminApi<T = any>(action: string, body: Record<string, unknown> = {}): Promise<{ status: number; data: T & { error?: string } }> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) return { status: 401, data: { error: "Masuk dengan kode email dulu" } as any };
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  });
  return { status: res.status, data: await res.json().catch(() => ({ error: "Respons tidak valid" })) };
}

const rp = (n: number) => "Rp" + (n || 0).toLocaleString("id-ID");
const tgl = (v: number | string | null) =>
  v ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

const card = "bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-3 mb-3";
const inputCls = "w-full px-3 py-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] text-[0.85rem]";
const btn = "min-h-[40px] px-3 rounded-[10px] font-bold text-[0.78rem] border-none cursor-pointer disabled:opacity-50";
const btnMain = `${btn} text-white`;
const mainBg = { background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" };

type Tab = "users" | "codes" | "affiliate" | "settings";

export default function AdminPage() {
  const [stage, setStage] = useState<"check" | "login" | "denied" | "ok">("check");
  const [me, setMe] = useState("");
  const [tab, setTab] = useState<Tab>("users");
  const [msg, setMsg] = useState("");

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

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3500); };

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

      <main className="max-w-[720px] mx-auto px-3 pt-3 pb-10">
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
            <nav className="grid grid-cols-4 gap-1 mb-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-1">
              {([
                ["users", "Pengguna", Users],
                ["codes", "Kode", KeyRound],
                ["affiliate", "Affiliate", Gift],
                ["settings", "Atur", Settings],
              ] as const).map(([k, label, Icon]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`min-h-[48px] flex flex-col items-center justify-center gap-[2px] rounded-lg border-none cursor-pointer text-[0.68rem] font-bold ${tab === k ? "text-white" : "bg-transparent text-[var(--text-light)]"}`}
                  style={tab === k ? mainBg : undefined}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </nav>
            {tab === "users" && <UsersTab flash={flash} />}
            {tab === "codes" && <CodesTab flash={flash} />}
            {tab === "affiliate" && <AffiliateTab flash={flash} />}
            {tab === "settings" && <SettingsTab flash={flash} />}
          </>
        )}
      </main>

      {msg && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-5 z-50 px-4 py-[10px] rounded-xl bg-[#1e293b] text-white text-[0.8rem] shadow-lg max-w-[90vw]">{msg}</div>
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
        <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Kode 6 angka" maxLength={8} className={`${inputCls} mb-2 text-center tracking-[0.4em] font-bold`} />
      )}
      <button onClick={sent ? verify : send} disabled={busy || !email} className={`${btnMain} w-full`} style={mainBg}>
        {busy ? "Memproses..." : sent ? "Masuk" : "Kirim kode"}
      </button>
      {sent && <button onClick={() => { setSent(false); setCode(""); }} className="mt-2 bg-transparent border-none text-[0.75rem] text-[var(--text-light)] cursor-pointer p-0">Ganti email</button>}
      {error && <div className="mt-2 text-[0.75rem] text-[#dc2626]">{error}</div>}
    </div>
  );
}

type Flash = { flash: (m: string) => void };

interface AdminUser {
  email: string; tier: string; aktif: boolean; tanggalAktivasi: number | null; tanggalBerakhir: number | null; jumlahKode: number; perangkat: number;
}

function UsersTab({ flash }: Flash) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<AdminUser[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [days, setDays] = useState("30");

  const search = useCallback(async (query: string) => {
    setBusy(true);
    const { status, data } = await adminApi<{ users: AdminUser[] }>("users", { q: query });
    setBusy(false);
    if (status === 200) setList(data.users); else flash(data.error || "Gagal memuat");
  }, [flash]);

  useEffect(() => { search(""); }, [search]);

  const act = async (action: string, body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    const { status, data } = await adminApi(action, body);
    setBusy(false);
    flash(status === 200 ? ok : data.error || "Gagal");
    if (status === 200) search(q);
  };

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); search(q); }} className="flex gap-2 mb-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari email…" className={inputCls} />
        <button type="submit" className={`${btnMain} flex-shrink-0`} style={mainBg} aria-label="Cari"><Search size={16} /></button>
      </form>
      {!list ? <Center><Loader2 className="animate-spin" /></Center> : list.length === 0 ? (
        <Center>Tidak ada pengguna.</Center>
      ) : (
        list.map((u) => (
          <div key={u.email} className={card}>
            <button onClick={() => setOpen(open === u.email ? null : u.email)} className="w-full text-left bg-transparent border-none p-0 cursor-pointer text-[var(--text)]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[0.85rem] truncate flex-1">{u.email}</span>
                <span className={`text-[0.65rem] font-bold px-2 py-[2px] rounded-full ${u.tier === "PRO" ? "bg-[#f59e0b]/15 text-[#d97706]" : "bg-[#0ea5a0]/15 text-[#0ea5a0]"}`}>{u.tier}</span>
                <span className={`text-[0.65rem] font-bold px-2 py-[2px] rounded-full ${u.aktif ? "bg-[#16a34a]/15 text-[#16a34a]" : "bg-[#dc2626]/15 text-[#dc2626]"}`}>{u.aktif ? "Aktif" : "Expired"}</span>
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
                  {["PLUS", "PRO"].map((t) => (
                    <button key={t} disabled={busy || u.tier === t} onClick={() => act("set_tier", { email: u.email, tier: t }, `Paket jadi ${t}`)} className={`${btn} flex-1 bg-[var(--input-bg)] text-[var(--text)]`}>Jadikan {t}</button>
                  ))}
                </div>
                <button disabled={busy} onClick={() => confirm(`Keluarkan semua perangkat ${u.email}?`) && act("reset_devices", { email: u.email }, "Perangkat direset")} className={`${btn} w-full bg-[#dc2626]/10 text-[#dc2626]`}>
                  Reset perangkat ({u.perangkat})
                </button>
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

  const load = useCallback(async () => {
    const { status, data } = await adminApi<{ stock: Record<string, number> }>("code_stock");
    if (status === 200) setStock(data.stock);
  }, []);
  useEffect(() => { load(); }, [load]);

  const gen = async (bind: boolean) => {
    setBusy(true);
    const { status, data } = await adminApi<{ codes: string[]; bound: boolean; tanggalBerakhir: number | null }>("generate_codes", bind ? { tier, email } : { tier, n: Number(n) });
    setBusy(false);
    if (status !== 200) return flash(data.error || "Gagal membuat kode");
    setCodes(data.codes);
    setNote(bind
      ? data.bound
        ? `Kode cadangan untuk ${email}, berlaku sampai ${tgl(data.tanggalBerakhir)}. Pengguna memulihkan dengan email + kode ini.`
        : `${email} tidak punya lisensi aktif — kode masuk stok dan bisa diaktivasi biasa.`
      : `${data.codes.length} kode ${tier} masuk stok.`);
    load();
  };

  return (
    <>
      <div className={card}>
        <div className="font-bold text-[0.85rem] mb-2">Stok kode belum terpakai</div>
        <div className="grid grid-cols-2 gap-2">
          {["PLUS", "PRO"].map((t) => (
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
          {(["PLUS", "PRO"] as const).map((t) => (
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
          <input type="number" min={1} max={100} value={n} onChange={(e) => setN(e.target.value)} className={`${inputCls} w-24`} aria-label="Jumlah kode" />
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
        <div className="font-bold text-[0.85rem] mb-2">Daftar affiliate</div>
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
                  <tr key={a.code} className="border-t border-[var(--border)]">
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
