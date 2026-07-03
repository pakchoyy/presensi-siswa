import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { PRO_PRICE } from "@/lib/constants";
import { licenseService } from "@/services/license.service";
import { ArrowUpCircle, Check, MessageCircle, Crown, ShieldCheck, Mail } from "lucide-react";
import { useToast } from "@/components/shared/Toast";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import { Tier } from "@/types/enums";

export function UpgradePage() {
  const { teacher, refreshTeacher } = useApp();
  const { toast } = useToast();
  const isPRO = teacher?.tier === "PRO";
  const manfaat = licenseService.getManfaat();

  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleWA = () => {
    const msg = encodeURIComponent(
      "Halo Pak Choyy, saya mau beli lisensi PRO Presensi Siswa\nEmail: " + (teacher?.email || email || "")
    );
    window.open(`https://wa.me/6289530713597?text=${msg}`, "_blank");
  };

  const handleCheckEmail = async () => {
    if (!email.trim()) {
      toast("⚠️ Masukkan email terlebih dahulu");
      return;
    }

    if (!teacher) {
      toast("⚠️ Data guru tidak ditemukan");
      return;
    }

    setChecking(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_CONVEX_URL}/api/query`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: "licenses:checkEmail",
            args: { email: email.trim() },
            format: "json",
          }),
        }
      );

      const data = await response.json();

      if (data.value?.tier === "PRO") {
        // Update teacher tier di local
        await teacherRepo.update(teacher.id, {
          ...teacher,
          tier: Tier.PRO,
          email: email.trim(),
        });

        // Refresh context
        await refreshTeacher();

        toast("✅ Email terverifikasi! Kamu sekarang PRO");
      } else {
        toast("⚠️ Email belum terdaftar sebagai PRO. Hubungi admin via WhatsApp.");
      }
    } catch (error) {
      console.error("Check email error:", error);
      toast("❌ Gagal mengecek email. Coba lagi.");
    } finally {
      setChecking(false);
    }
  };

  if (isPRO) {
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
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-[#0ea5a0] to-[#2d6a7f] rounded-2xl p-6 mb-3 text-white text-center">
        <ArrowUpCircle size={48} className="mx-auto mb-3 opacity-90" />
        <h2 className="text-[1.3rem] font-extrabold mb-2">Upgrade ke PRO</h2>
        <p className="text-[0.85rem] opacity-90 mb-3">
          Semua fitur premium, selamanya
        </p>
        <div className="text-[2.5rem] font-extrabold mb-4">{PRO_PRICE}</div>
        <a
          href="https://lynk.id/kreacy/o9g1wgrxg7gl"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full max-w-[280px] py-3 rounded-xl bg-white text-[#0ea5a0] font-extrabold text-[0.95rem] no-underline hover:bg-white/90 transition-all"
        >
          🛒 Beli Sekarang
        </a>
        <button
          onClick={handleWA}
          className="w-full max-w-[280px] mt-2 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-white/30 text-white font-bold text-[0.85rem] hover:bg-white/10 transition-all bg-transparent cursor-pointer mx-auto"
        >
          <MessageCircle size={16} />
          <span>Atau Chat WhatsApp</span>
        </button>
      </div>

      {/* Sudah Beli PRO */}
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
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="w-full px-4 py-3 rounded-lg border-2 border-[#0ea5a0]/30 bg-white text-[0.85rem] mb-3 focus:border-[#0ea5a0] outline-none"
          style={{ outline: "none" }}
        />
        
        <button
          onClick={handleCheckEmail}
          disabled={checking}
          className="w-full py-3 rounded-lg font-bold text-[0.9rem] text-white border-none cursor-pointer disabled:opacity-60 transition-opacity"
          style={{ background: checking ? "#999" : "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}
        >
          {checking ? "⏳ Mengecek..." : "✅ Verifikasi Email"}
        </button>
      </div>

      {/* Fitur PRO */}
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

      {/* Perbandingan */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px]">
        <div className="text-[0.78rem] font-bold flex items-center gap-[6px] mb-2">
          <ShieldCheck size={14} className="text-[#0ea5a0]" /> Perbandingan
        </div>
        <div className="grid grid-cols-2 gap-2 text-[0.7rem]">
          <div className="bg-[var(--input-bg)] rounded-lg p-2">
            <div className="font-bold mb-1">FREE</div>
            <div className="text-[var(--text-light)] leading-[1.6]">
              • 1 kelas<br />• 15 siswa<br />• Offline<br />• Rekap & export
            </div>
          </div>
          <div className="bg-[rgba(14,165,160,0.06)] rounded-lg p-2 border border-[#0ea5a0]/20">
            <div className="font-bold text-[#0ea5a0] mb-1">PRO</div>
            <div className="text-[var(--text-light)] leading-[1.6]">
              • Unlimited kelas<br />• Unlimited siswa<br />• Cloud sync<br />• Multi device
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
