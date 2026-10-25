import { useEffect, useRef, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  PRO_PRICE,
  PLUS_PRICE,
  KREACY_PLUS_URL,
  KREACY_PRO_URL,
  LICENSE_DURATION_DAYS,
} from "@/lib/constants";
import { licenseService } from "@/services/license.service";
import { licenseRepo } from "@/repositories/dexie/license.repo";
import { syncService } from "@/services/sync.service";
import { OtpVerify } from "@/components/auth/OtpVerify";
import type { License } from "@/types/entities";
import {
  Check,
  MessageCircle,
  Crown,
  Mail,
  Loader2,
  ChevronDown,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/components/shared/Toast";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import { Tier } from "@/types/enums";
import { generateId } from "@/lib/utils";
import { readAktivasiLink, clearAktivasiLink, readRefCode } from "@/lib/aktivasi-link";
import Confetti from "react-confetti";
import { trialDaysRemaining, tierLabel } from "@/lib/features";

const WA_NUMBER = "6289530713597";

const COMPARE_ROWS: [string, string, string, string][] = [
  ["Kelas", "1", "4", "∞"],
  ["Siswa / kelas", "10", "25", "∞"],
  ["Cloud sync", "—", "1 HP", "3 perangkat"],
  ["Mode PJJ", "—", "✓", "✓"],
  ["Mode QR", "—", "—", "✓"],
  ["Kalender edit", "—", "—", "✓"],
  ["Logo di laporan", "—", "✓", "✓"],
  ["Program Affiliate (komisi + bonus masa aktif)", "—", "—", "✓"],
  ["Bebas iklan", "—", "—", "✓"],
];

export function UpgradePage() {
  const { teacher, refreshTeacher, tier: appTier, realTier } = useApp();
  const { toast } = useToast();

  const link = readAktivasiLink();
  const [email, setEmail] = useState(link?.email || "");
  const [kode, setKode] = useState(link?.kode || "");
  const [refCode, setRefCode] = useState(readRefCode());
  const [emailError, setEmailError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [showVerify, setShowVerify] = useState(!!link);
  const verifyRef = useRef<HTMLDivElement>(null);
  // Datang dari link toko: langsung gulir ke form aktivasi.
  useEffect(() => {
    if (link) setTimeout(() => verifyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tier = realTier;
  void appTier;
  const trialLeft = tier === Tier.FREE ? trialDaysRemaining() : 0;

  const validateEmail = (val: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val.trim()) {
      setEmailError("Email tidak boleh kosong");
      return false;
    }
    if (!regex.test(val)) {
      setEmailError("Format email tidak valid");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleWA = () => {
    const msg = encodeURIComponent(
      "Halo Pak Choyy, saya mau tanya paket PLUS/PRO Presensi Yuk.\nEmail: " + (teacher?.email || email || "")
    );
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank");
  };

  const finishActivation = async (resolvedTier: Tier, expiry: number, normalizedEmail: string, kodeLisensi: string, alreadySaved: boolean) => {
    if (!teacher) return;
    if (!alreadySaved) {
      const license: License = {
        id: generateId(),
        guruId: teacher.id,
        emailAktivasi: normalizedEmail,
        kodeLisensi,
        tier: resolvedTier,
        tanggalAktivasi: Date.now(),
        tanggalBerakhir: expiry,
        statusLisensi: "Aktif",
      };
      await licenseRepo.save(license);
      await teacherRepo.update(teacher.id, { ...teacher, tier: resolvedTier, email: normalizedEmail });
    }
    await refreshTeacher();
    localStorage.setItem("presensi_cloud_email", normalizedEmail);
    clearAktivasiLink();
    toast(`✅ Lisensi aktif — kamu sekarang ${resolvedTier} 🎉`);
    setShowConfetti(true);
    syncService.initialUpload(normalizedEmail).catch(() => {});
    setTimeout(() => {
      setShowConfetti(false);
      window.location.reload();
    }, 3000);
  };

  const handleActivate = async () => {
    setErrorMessage("");
    if (!validateEmail(email)) return;
    const kodeUp = kode.trim().toUpperCase();
    if (!kodeUp && teacher) {
      // Ganti HP / lupa kode: pulihkan dengan email + kode verifikasi yang dikirim ke email itu.
      setOtpEmail(email.trim().toLowerCase());
      return;
    }
    if (!/^BGY-[A-Z0-9-]{4,60}$/.test(kodeUp)) {
      setErrorMessage("Masukkan kode lisensi dari toko (format BGY-PS-PLUS-XXXX atau BGY-PS-PRO-XXXX).");
      return;
    }
    if (!teacher) {
      setErrorMessage("Data guru tidak ditemukan");
      return;
    }
    setChecking(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await licenseService.activate(normalizedEmail, kodeUp, teacher.id, refCode.trim().toUpperCase());
      if (res.success && res.tier) {
        await finishActivation(res.tier, res.tanggalBerakhir || Date.now(), normalizedEmail, kodeUp, true);
        return;
      }
      // Kode sudah pernah dipakai email ini (mis. ganti HP) → pulihkan
      const restored = await licenseService.restore(normalizedEmail, kodeUp);
      if (restored.ok && restored.tier) {
        await finishActivation(restored.tier, restored.tanggalBerakhir || Date.now() + LICENSE_DURATION_DAYS * 86400000, normalizedEmail, kodeUp, false);
        return;
      }
      setErrorMessage(res.message || restored.error || "Aktivasi gagal. Hubungi admin WA di bawah.");
    } catch (err) {
      console.error("Activate error:", err);
      setErrorMessage("Gagal aktivasi. Periksa koneksi internet.");
    } finally {
      setChecking(false);
    }
  };

  // Hero text per tier
  const heroSub = tier === Tier.PRO
    ? "Semua fitur sudah terbuka. Terima kasih sudah pakai PRO!"
    : tier === Tier.PLUS
      ? "Kamu di tier PLUS. Upgrade PRO untuk unlimited + Mode QR."
      : trialLeft > 0
        ? `Coba PRO gratis — tersisa ${trialLeft} hari. Setelah itu otomatis jadi FREE.`
        : "Kamu di FREE (1 kelas, 10 siswa). Pilih paket untuk kelas & siswa lebih banyak.";

  const badgeStyle = tier === Tier.PRO
    ? { bg: "rgba(245,158,11,0.18)", border: "#f59e0b", text: "#fbbf24" }
    : tier === Tier.PLUS
      ? { bg: "rgba(14,165,160,0.18)", border: "#0ea5a0", text: "#5eead4" }
      : trialLeft > 7
        ? { bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.25)", text: "rgba(255,255,255,0.85)" }
        : { bg: "rgba(220,38,38,0.25)", border: "rgba(220,38,38,0.5)", text: "#fecaca" };

  return (
    <div className="flex-1 px-[14px] pt-[14px] pb-[calc(100px+var(--ticker-h,0px))] lg:pb-4">
      {/* Hero */}
      <div
        className="rounded-2xl p-5 mb-3 text-white"
        style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
      >
        <h2 className="text-[1.35rem] font-extrabold leading-tight mb-1">
          Pilih paket yang pas buat sekolahmu
        </h2>
        <p className="text-[0.78rem] opacity-85 leading-relaxed mb-3">
          Bayar per semester (6 bulan). User PRO lama tetap PRO sampai masa berlaku habis.
        </p>
        <div
          className="inline-flex items-center gap-[6px] px-[10px] py-[5px] rounded-full text-[0.72rem] font-bold border"
          style={{ background: badgeStyle.bg, borderColor: badgeStyle.border, color: badgeStyle.text }}
        >
          <span>Kamu sekarang: {tierLabel(tier)}</span>
          {tier === Tier.FREE && trialLeft > 0 && (
            <span className="opacity-80">· Coba PRO {trialLeft} hari lagi</span>
          )}
          {tier === Tier.FREE && trialLeft === 0 && (
            <span className="opacity-80">· Trial habis</span>
          )}
        </div>
        <p className="text-[0.68rem] opacity-70 mt-3">{heroSub}</p>
      </div>

      {/* Tabel pembanding singkat */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl mb-3 overflow-hidden">
        <table className="w-full text-[0.7rem] text-[var(--text)]">
          <thead>
            <tr className="bg-[var(--input-bg)]">
              <th className="text-left font-bold px-3 py-2">Fitur</th>
              <th className="font-bold px-1 py-2 text-[#64748b]">FREE</th>
              <th className="font-bold px-1 py-2 text-[#0ea5a0]">PLUS</th>
              <th className="font-bold px-1 py-2 text-[#d97706]">PRO</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map(([label, f, p, r]) => (
              <tr key={label} className="border-t border-[var(--border)]">
                <td className="px-3 py-[6px] text-[var(--text-light)]">{label}</td>
                <td className="text-center px-1">{f}</td>
                <td className="text-center px-1">{p}</td>
                <td className="text-center px-1 font-semibold">{r}</td>
              </tr>
            ))}
            <tr className="border-t border-[var(--border)] bg-[var(--input-bg)]">
              <td className="px-3 py-[6px] font-bold">Harga / semester</td>
              <td className="text-center px-1">Gratis</td>
              <td className="text-center px-1">{PLUS_PRICE.replace("/semester", "")}</td>
              <td className="text-center px-1 font-bold">{PRO_PRICE.replace("/semester", "")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FREE card (muted if not FREE) */}
      <TierCard
        name="FREE"
        tagline="Gratis selamanya — 30 hari pertama coba PRO"
        price={null}
        bullets={[
          "1 kelas · 10 siswa",
          "Presensi harian + status",
          "Export PDF/Excel basic",
        ]}
        accentColor="#64748b"
        isCurrent={tier === Tier.FREE}
        muted={tier !== Tier.FREE}
        cta={null}
      />

      {/* PLUS card */}
      <TierCard
        name="PLUS"
        tagline="Buat sekolah kecil, cloud + logo laporan"
        price={PLUS_PRICE}
        perMonth="setara Rp2.800/bulan"
        bullets={[
          "4 kelas · 25 siswa per kelas (= 100 siswa total)",
          "Cloud sync 1 perangkat — data aman di internet",
          "Logo sekolah di laporan PDF/Excel",
          "Backup otomatis harian",
          "Mode PJJ (link absen mandiri untuk siswa)",
        ]}
        accentColor="#0ea5a0"
        isCurrent={tier === Tier.PLUS}
        muted={false}
        cta={
          tier === Tier.PLUS
            ? { label: "Sedang Dipakai ✓", href: null, disabled: true, color: "#0ea5a0" }
            : { label: `Beli PLUS ${PLUS_PRICE.replace("/semester", "")}`, href: KREACY_PLUS_URL, disabled: false, color: "#0ea5a0" }
        }
      />

      {/* PRO card — highlighted */}
      <TierCard
        name="PRO"
        tagline="Semua di PLUS, plus:"
        price={PRO_PRICE}
        perMonth="setara Rp5.300/bulan"
        bullets={[
          "Unlimited kelas & siswa — buat sekolah besar",
          "Cloud sync 3 perangkat (HP + laptop + tablet)",
          "Mode QR — scan kartu siswa untuk absen",
          "Backup manual kapan saja",
          "Priority WhatsApp support",
        ]}
        accentColor="#f59e0b"
        isCurrent={tier === Tier.PRO}
        muted={false}
        recommended={tier !== Tier.PRO}
        cta={
          tier === Tier.PRO
            ? { label: "Sedang Dipakai ✓", href: null, disabled: true, color: "#f59e0b" }
            : { label: `Beli PRO ${PRO_PRICE.replace("/semester", "")}`, href: KREACY_PRO_URL, disabled: false, color: "#f59e0b" }
        }
        showCrown
      />

      {/* Copywriting PRO — jujur, tanpa klaim berlebihan */}
      {tier !== Tier.PRO && (
        <div className="rounded-xl p-4 mb-3 border border-[#f59e0b]/40 bg-[rgba(245,158,11,0.08)]">
          <div className="text-[0.9rem] font-extrabold text-[var(--text)] mb-1">
            Cuma Rp5.300 sebulan — kurang dari segelas es teh seminggu.
          </div>
          <p className="text-[0.74rem] text-[var(--text-light)] leading-relaxed">
            Dengan {PRO_PRICE.replace("/semester", "")} per semester, semua kelas & siswa masuk tanpa batas, data tersimpan di cloud
            (tidak hilang kalau HP rusak), bisa dibuka di 3 perangkat, dan presensi pagi lebih cepat pakai scan kartu QR.
            Bayar sekali per semester, tidak ada tagihan otomatis.
          </p>
        </div>
      )}

      {/* Trust row */}
      <div className="flex items-start gap-2 bg-[var(--input-bg)] rounded-xl p-3 mb-3 text-[0.7rem] text-[var(--text-light)] leading-relaxed">
        <ShieldCheck size={15} className="text-[#0ea5a0] flex-shrink-0 mt-[1px]" />
        <div>
          Bisa upgrade atau downgrade kapan saja. Pembayaran satu kali per semester, tidak auto-renew.
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-[0.7rem] text-[var(--text-light)] font-semibold">atau</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      {/* WA secondary */}
      <button
        onClick={handleWA}
        className="w-full flex items-center justify-center gap-2 py-[11px] rounded-xl border border-[#25D366]/40 text-[#128C7E] dark:text-[#25D366] font-bold text-[0.82rem] bg-[#25D366]/5 hover:bg-[#25D366]/10 cursor-pointer transition-colors mb-3"
      >
        <MessageCircle size={16} />
        <span>Chat admin via WhatsApp</span>
      </button>

      {/* Verify email (collapsible) */}
      <div ref={verifyRef} className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden mb-3">
        <button
          onClick={() => setShowVerify((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-[12px] text-left bg-transparent border-none cursor-pointer"
        >
          <Mail size={16} className="text-[#0ea5a0]" />
          <div className="flex-1">
            <div className="text-[0.82rem] font-bold text-[var(--text)]">Aktivasi Lisensi</div>
            <div className="text-[0.68rem] text-[var(--text-light)]">Sudah beli? Masukkan email &amp; kode dari toko</div>
          </div>
          <ChevronDown
            size={18}
            className={`text-[var(--text-light)] transition-transform ${showVerify ? "rotate-180" : ""}`}
          />
        </button>
        {showVerify && (
          <div className="px-4 pb-4 pt-1">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
                setErrorMessage("");
              }}
              placeholder="email@example.com"
              className={`w-full px-[12px] py-[10px] rounded-lg border-[1.5px] bg-[var(--input-bg)] text-[0.85rem] mb-2 outline-none text-[var(--text)] ${
                emailError ? "border-red-500" : "border-[var(--border)] focus:border-[#0ea5a0]"
              }`}
            />
            {emailError && (
              <p className="text-[0.7rem] text-red-500 mb-2">{emailError}</p>
            )}
            <input
              type="text"
              value={kode}
              onChange={(e) => { setKode(e.target.value.toUpperCase()); setErrorMessage(""); }}
              placeholder="BGY-PS-PRO-XXXX"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full px-[12px] py-[10px] rounded-lg border-[1.5px] border-[var(--border)] focus:border-[#0ea5a0] bg-[var(--input-bg)] text-[0.85rem] mb-2 outline-none text-[var(--text)] font-mono tracking-wide"
            />
            <input
              type="text"
              value={refCode}
              onChange={(e) => setRefCode(e.target.value.toUpperCase())}
              placeholder="Kode affiliate (opsional), mis. PY-AB12CD"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={9}
              className="w-full px-[12px] py-[10px] rounded-lg border-[1.5px] border-dashed border-[var(--border)] focus:border-[#0ea5a0] bg-[var(--input-bg)] text-[0.8rem] mb-2 outline-none text-[var(--text)] font-mono tracking-wide"
            />
            <p className="text-[0.66rem] text-[var(--text-light)] mb-2">Ganti HP atau lupa kode? Isi email, kosongkan kode — kami kirim kode verifikasi ke email itu.</p>
            <button
              onClick={handleActivate}
              disabled={checking}
              className="w-full py-[11px] rounded-lg font-bold text-[0.85rem] text-white border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              style={{ background: checking ? "#999" : "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}
            >
              {checking && <Loader2 size={15} className="animate-spin" />}
              {checking ? "Mengecek..." : "Aktivasi Lisensi"}
            </button>
            {errorMessage && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-[0.72rem] text-red-600 dark:text-red-400 mb-2">{errorMessage}</p>
                <button
                  onClick={handleWA}
                  className="w-full flex items-center justify-center gap-2 py-[8px] rounded-lg bg-[#25D366] hover:bg-[#128C7E] text-white text-[0.72rem] font-bold cursor-pointer border-none transition-colors"
                >
                  <MessageCircle size={13} /> Hubungi Admin WhatsApp
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {otpEmail && (
        <OtpVerify
          email={otpEmail}
          title="Pulihkan lisensi"
          onConnected={(r, e) => {
            setOtpEmail(null);
            if (r.trial) { toast("Email ini belum punya lisensi PLUS/PRO. Masukkan kode lisensi untuk aktivasi."); return; }
            return finishActivation(r.tier, r.tanggalBerakhir || Date.now() + LICENSE_DURATION_DAYS * 86400000, e, "EMAIL-RESTORE", false);
          }}
          onClose={() => setOtpEmail(null)}
        />
      )}
      {showConfetti && (
        <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={400} />
      )}
    </div>
  );
}

// ---------------- TierCard ----------------
interface CTA {
  label: string;
  href: string | null;
  disabled: boolean;
  color: string;
}

function TierCard(props: {
  name: string;
  tagline: string;
  price: string | null;
  perMonth?: string;
  bullets: string[];
  accentColor: string;
  isCurrent: boolean;
  muted: boolean;
  recommended?: boolean;
  cta: CTA | null;
  showCrown?: boolean;
}) {
  const { name, tagline, price, perMonth, bullets, accentColor, isCurrent, muted, recommended, cta, showCrown } = props;

  return (
    <div
      className="relative rounded-2xl p-4 mb-3"
      style={{
        background: "var(--card-bg)",
        border: recommended ? `2px solid ${accentColor}` : "1px solid var(--border)",
        opacity: muted ? 0.6 : 1,
        boxShadow: recommended ? `0 4px 20px ${accentColor}30` : "none",
      }}
    >
      {recommended && (
        <div
          className="absolute -top-[11px] left-4 flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.65rem] font-extrabold text-white"
          style={{ background: `linear-gradient(135deg, ${accentColor}, #d97706)` }}
        >
          <Sparkles size={11} /> Rekomendasi
        </div>
      )}
      {isCurrent && !recommended && (
        <div
          className="absolute -top-[11px] left-4 px-[10px] py-[3px] rounded-full text-[0.65rem] font-extrabold text-white"
          style={{ background: accentColor }}
        >
          Paket Kamu
        </div>
      )}

      <div className="flex items-center gap-2 mb-1">
        {showCrown && <Crown size={16} style={{ color: accentColor }} />}
        <div className="text-[1.1rem] font-extrabold" style={{ color: accentColor }}>
          {name}
        </div>
      </div>
      <p className="text-[0.74rem] text-[var(--text-light)] mb-3 leading-snug">{tagline}</p>

      {price && (
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[1.75rem] font-extrabold text-[var(--text)]">{price.split("/")[0]}</span>
          <span className="text-[0.78rem] text-[var(--text-light)]">/semester</span>
        </div>
      )}
      {perMonth && (
        <p className="text-[0.65rem] text-[var(--text-light)] mb-3">{perMonth}</p>
      )}
      {!price && <div className="mb-3" />}

      <ul className="space-y-[7px] mb-4">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-[0.78rem] text-[var(--text)] leading-snug">
            <Check size={15} className="flex-shrink-0 mt-[2px]" style={{ color: accentColor }} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {cta && (
        cta.disabled ? (
          <button
            disabled
            className="w-full py-[11px] rounded-xl font-bold text-[0.85rem] border-[1.5px] cursor-not-allowed opacity-70"
            style={{ borderColor: cta.color, color: cta.color, background: "transparent" }}
          >
            {cta.label}
          </button>
        ) : (
          <a
            href={cta.href!}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-[11px] rounded-xl font-bold text-[0.85rem] text-white no-underline cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${cta.color}, ${cta.color}dd)` }}
          >
            {cta.label}
          </a>
        )
      )}
    </div>
  );
}
