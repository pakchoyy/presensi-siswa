import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { PRO_PRICE, PLUS_PRICE, KREACY_PLUS_URL, KREACY_PRO_URL, LICENSE_DURATION_DAYS } from "@/lib/constants";
import { licenseService } from "@/services/license.service";
import { licenseRepo } from "@/repositories/dexie/license.repo";
import { syncService } from "@/services/sync.service";
import type { License } from "@/types/entities";
import { ArrowUpCircle, Check, MessageCircle, Crown, ShieldCheck, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/components/shared/Toast";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import { Tier } from "@/types/enums";
import { generateId } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import Confetti from "react-confetti";
import { PageName } from "@/types/enums";

export function UpgradePage() {
  const { teacher, refreshTeacher } = useApp();
  const { toast } = useToast();
  const manfaat = licenseService.getManfaat();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError("Email tidak boleh kosong");
      return false;
    }
    if (!regex.test(email)) {
      setEmailError("Format email tidak valid");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleWA = () => {
    const msg = encodeURIComponent(
      "Halo Pak Choyy, saya mau beli lisensi PRO Presensi Siswa\nEmail: " + (teacher?.email || email || "")
    );
    window.open(`https://wa.me/6289530713597?text=${msg}`, "_blank");
  };

  const handleCheckEmail = async () => {
    setErrorMessage("");

    if (!validateEmail(email)) {
      return;
    }

    if (!teacher) {
      setErrorMessage("Data guru tidak ditemukan");
      return;
    }

    setChecking(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const lookup = await licenseService.lookupByEmail(normalizedEmail);
      const licenseData = lookup.found ? { tanggal_berakhir: lookup.tanggalBerakhir } : null;

      if (licenseData) {
        const now = Date.now();
        const expiry = licenseData.tanggal_berakhir || (now + LICENSE_DURATION_DAYS * 24 * 60 * 60 * 1000);
        const resolvedTier: Tier = (lookup.tier as Tier) || Tier.PRO;
        const license: License = {
          id: generateId(),
          guruId: teacher.id,
          emailAktivasi: normalizedEmail,
          kodeLisensi: "EMAIL-VERIFIED",
          tier: resolvedTier,
          tanggalAktivasi: now,
          tanggalBerakhir: expiry,
          statusLisensi: "Aktif",
        };
        await licenseRepo.save(license);

        await teacherRepo.update(teacher.id, {
          ...teacher,
          tier: resolvedTier,
          email: normalizedEmail,
        });

        await refreshTeacher();

        localStorage.setItem("presensi_cloud_email", normalizedEmail);

        toast("✅ Email terverifikasi! Kamu sekarang PRO 🎉");
        setErrorMessage("");
        setShowConfetti(true);

        // Trigger initial upload to cloud
        syncService.initialUpload(normalizedEmail).catch(() => {});

        // Reload after confetti to activate cloud sync
        setTimeout(() => {
          setShowConfetti(false);
          window.location.reload();
        }, 3000);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tier")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (profile && (profile.tier === "PRO" || profile.tier === "PLUS")) {
          const now = Date.now();
          const resolvedTier: Tier = profile.tier === "PLUS" ? Tier.PLUS : Tier.PRO;
          const license: License = {
            id: generateId(),
            guruId: teacher.id,
            emailAktivasi: normalizedEmail,
            kodeLisensi: "EMAIL-VERIFIED",
            tier: resolvedTier,
            tanggalAktivasi: now,
            tanggalBerakhir: now + LICENSE_DURATION_DAYS * 24 * 60 * 60 * 1000,
            statusLisensi: "Aktif",
          };
          await licenseRepo.save(license);
          await teacherRepo.update(teacher.id, { ...teacher, tier: resolvedTier, email: normalizedEmail });
          await refreshTeacher();

          localStorage.setItem("presensi_cloud_email", normalizedEmail);

          toast("✅ Email terverifikasi! Kamu sekarang PRO 🎉");
          setShowConfetti(true);

          syncService.initialUpload(normalizedEmail).catch(() => {});

          setTimeout(() => {
            setShowConfetti(false);
            window.location.reload();
          }, 3000);
        } else {
          setErrorMessage("Email belum terdaftar sebagai PLUS/PRO. Silakan hubungi admin via WhatsApp.");
        }
      }
    } catch (error) {
      console.error("Check email error:", error);
      setErrorMessage("Gagal mengecek email. Periksa koneksi internet dan coba lagi.");
    } finally {
      setChecking(false);
    }
  };

  const currentTier = teacher?.tier as Tier | undefined;
  if (currentTier === Tier.PRO) {
    return (
      <div className="flex-1 px-[14px] pt-[14px] pb-[130px] lg:pb-4">
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] text-center">
          <div className="text-[2rem] mb-2">👑</div>
          <div className="text-[0.9rem] font-bold text-[#f59e0b] mb-1">Kamu sudah PRO!</div>
          <p className="text-[0.75rem] text-[var(--text-light)]">
            Semua fitur premium sudah terbuka. Buka <b>Pengaturan</b> untuk info lisensi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-[14px] pt-[14px] pb-[130px] lg:pb-4">
      <div className="bg-gradient-to-br from-[#0ea5a0] to-[#2d6a7f] rounded-2xl p-5 mb-3 text-white text-center">
        <ArrowUpCircle size={40} className="mx-auto mb-2 opacity-90" />
        <h2 className="text-[1.2rem] font-extrabold mb-1">Pilih Paket</h2>
        <p className="text-[0.78rem] opacity-85 mb-3">
          Bayar per semester (6 bulan)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {currentTier !== Tier.PLUS && (
            <a
              href={KREACY_PLUS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white/15 rounded-xl p-3 no-underline border-2 border-white/30 hover:bg-white/25 transition-all"
            >
              <div className="text-[0.75rem] font-bold mb-1 opacity-90">PLUS</div>
              <div className="text-[1.3rem] font-extrabold mb-1">{PLUS_PRICE.split("/")[0]}</div>
              <div className="text-[0.6rem] opacity-80 mb-2">/semester</div>
              <div className="text-[0.65rem] opacity-90 leading-tight mb-2">4 kelas × 25 siswa + Cloud sync + PJJ</div>
              <div className="bg-white text-[#0ea5a0] py-1.5 rounded-lg text-[0.78rem] font-bold">Beli PLUS</div>
            </a>
          )}
          <a
            href={KREACY_PRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[#f59e0b]/25 rounded-xl p-3 no-underline border-2 border-[#f59e0b]/50 hover:bg-[#f59e0b]/35 transition-all"
          >
            <div className="text-[0.75rem] font-bold mb-1 opacity-90 flex items-center justify-center gap-1"><Crown size={13}/> PRO</div>
            <div className="text-[1.3rem] font-extrabold mb-1">{PRO_PRICE.split("/")[0]}</div>
            <div className="text-[0.6rem] opacity-80 mb-2">/semester</div>
            <div className="text-[0.65rem] opacity-90 leading-tight mb-2">Unlimited + Mode QR + Backup manual + Priority</div>
            <div className="bg-[#f59e0b] text-white py-1.5 rounded-lg text-[0.78rem] font-bold">Beli PRO</div>
          </a>
        </div>
        <button
          onClick={handleWA}
          className="w-full max-w-[280px] mt-3 flex items-center justify-center gap-2 py-[8px] rounded-xl border-[1.5px] border-white/30 text-white font-bold text-[0.78rem] hover:bg-white/10 transition-all bg-transparent cursor-pointer mx-auto"
        >
          <MessageCircle size={14} />
          <span>Atau Chat WhatsApp</span>
        </button>
      </div>

      <div className="bg-[rgba(14,165,160,0.08)] border-2 border-[#0ea5a0] rounded-xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#0ea5a0] flex items-center justify-center">
            <Mail size={20} className="text-white" />
          </div>
          <div>
            <div className="text-[0.9rem] font-extrabold text-[var(--text)]">
              Sudah Beli PRO?
            </div>
            <div className="text-[0.7rem] text-[var(--text-light)]">
              Verifikasi email untuk aktivasi
            </div>
          </div>
        </div>
        
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError("");
            setErrorMessage("");
          }}
          placeholder="email@example.com"
          className={`w-full px-4 py-3 rounded-lg border-2 bg-white text-[0.85rem] mb-1 outline-none ${
            emailError ? "border-red-500" : "border-[#0ea5a0]/30 focus:border-[#0ea5a0]"
          }`}
        />
        
        {emailError && (
          <p className="text-[0.7rem] text-red-500 mb-2">{emailError}</p>
        )}
        
        <button
          onClick={handleCheckEmail}
          disabled={checking}
          className="w-full py-3 rounded-lg font-bold text-[0.9rem] text-white border-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
          style={{ background: checking ? "#999" : "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}
        >
          {checking && <Loader2 size={16} className="animate-spin" />}
          {checking ? "Mengecek Email..." : "✅ Verifikasi Email"}
        </button>
        
        {errorMessage && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-[0.75rem] text-red-600 dark:text-red-400 mb-2">
              {errorMessage}
            </p>
            <button
              onClick={handleWA}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-[0.75rem] font-bold transition-colors cursor-pointer border-none"
            >
              <MessageCircle size={14} />
              Hubungi Admin via WhatsApp
            </button>
          </div>
        )}
      </div>

      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 mb-3">
        <div className="text-[0.85rem] font-bold mb-3 flex items-center gap-2">
          <Crown size={16} className="text-[#f59e0b]" />
          Fitur PRO
        </div>
        
        <div className="space-y-2">
          {manfaat.map((m, i) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--input-bg)] transition-colors">
              <div className="w-6 h-6 rounded-full bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0 mt-[1px]">
                <Check size={14} className="text-[#16a34a]" />
              </div>
              <span className="text-[0.78rem] text-[var(--text)] leading-relaxed">{m}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px]">
        <div className="text-[0.78rem] font-bold flex items-center gap-[6px] mb-2">
          <ShieldCheck size={14} className="text-[#0ea5a0]" /> Perbandingan
        </div>
        <div className="grid grid-cols-3 gap-2 text-[0.65rem]">
          <div className="bg-[var(--input-bg)] rounded-lg p-2">
            <div className="font-bold mb-1">FREE</div>
            <div className="text-[var(--text-light)] leading-[1.6]">
              • Trial 30 hari<br />• 1 kelas<br />• 10 siswa<br />• Offline
            </div>
          </div>
          <div className="bg-[rgba(14,165,160,0.06)] rounded-lg p-2 border border-[#0ea5a0]/20">
            <div className="font-bold text-[#0ea5a0] mb-1">PLUS</div>
            <div className="text-[var(--text-light)] leading-[1.6]">
              • 4 kelas × 25 siswa<br />• Cloud sync<br />• Logo laporan<br />• PJJ
            </div>
          </div>
          <div className="bg-[rgba(245,158,11,0.08)] rounded-lg p-2 border border-[#f59e0b]/30">
            <div className="font-bold text-[#f59e0b] mb-1">PRO</div>
            <div className="text-[var(--text-light)] leading-[1.6]">
              • Unlimited<br />• Mode QR<br />• Backup manual<br />• Priority support
            </div>
          </div>
        </div>
      </div>
      
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
        />
      )}
    </div>
  );
}
