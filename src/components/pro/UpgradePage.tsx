import { useApp } from "@/contexts/AppContext";
import { PRO_PRICE } from "@/lib/constants";
import { licenseService } from "@/services/license.service";
import { ArrowUpCircle, Check, MessageCircle, Crown, ShieldCheck } from "lucide-react";

export function UpgradePage() {
  const { teacher } = useApp();
  const isPRO = teacher?.tier === "PRO";
  const manfaat = licenseService.getManfaat();

  const handleWA = () => {
    const msg = encodeURIComponent(
      "Halo Pak Choyy, saya mau beli lisensi PRO Presensi Siswa\nEmail: " + (teacher?.email || "")
    );
    window.open(`https://wa.me/6289530713597?text=${msg}`, "_blank");
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
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-center mb-3">
          <ArrowUpCircle size={32} className="text-[#f59e0b] mx-auto mb-2" />
          <div className="text-[1rem] font-extrabold text-[var(--text)]">Upgrade ke PRO</div>
          <div className="text-[0.78rem] text-[var(--text-light)] mt-1">
            Semua fitur premium, cukup
          </div>
          <div className="text-[1.8rem] font-extrabold text-[#f59e0b] mt-1">{PRO_PRICE}</div>
          <div className="text-[0.65rem] text-[var(--text-light)] mt-[2px]">Pembayaran sekali, akses 1 tahun penuh</div>
        </div>

        <div className="mb-4">
          {manfaat.map((m, i) => (
            <div key={i} className="flex items-start gap-2 mb-[6px] text-[0.76rem] text-[var(--text)]">
              <Check size={14} className="text-[#16a34a] flex-shrink-0 mt-[2px]" />
              <span>{m}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleWA}
          className="w-full flex items-center justify-center gap-[6px] py-[12px] rounded-[10px] text-white font-bold text-[0.85rem] cursor-pointer"
          style={{ background: "#25D366" }}
        >
          <MessageCircle size={16} /> Beli via WhatsApp
        </button>
      </div>

      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px]">
        <div className="text-[0.78rem] font-bold flex items-center gap-[6px] mb-2">
          <ShieldCheck size={14} className="text-[#0ea5a0]" /> Perbandingan FREE vs PRO
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[0.7rem] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 px-2 text-left text-[0.65rem] uppercase text-[var(--text-light)] font-semibold">Fitur</th>
                <th className="py-2 px-2 text-center text-[0.65rem] uppercase text-[var(--text-light)] font-semibold">FREE</th>
                <th className="py-2 px-2 text-center text-[0.65rem] uppercase text-[#0ea5a0] font-bold">PRO</th>
              </tr>
            </thead>
            <tbody>
              {[
                { fitur: "Jumlah Kelas", free: "1 Kelas", pro: "Unlimited" },
                { fitur: "Multi Device", free: "-", pro: "Ya" },
                { fitur: "Cloud Sync", free: "-", pro: "Ya" },
                { fitur: "Kalender Edit", free: "-", pro: "Ya" },
                { fitur: "Backup Cloud", free: "-", pro: "Ya" },
                { fitur: "Logo Sekolah", free: "-", pro: "Ya" },
                { fitur: "Import Update", free: "-", pro: "Ya" },
                { fitur: "Harga", free: "Gratis", pro: PRO_PRICE },
              ].map((row, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 px-2 font-semibold">{row.fitur}</td>
                  <td className="py-2 px-2 text-center text-[var(--text-light)]">{row.free}</td>
                  <td className="py-2 px-2 text-center text-[#0ea5a0] font-bold">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
