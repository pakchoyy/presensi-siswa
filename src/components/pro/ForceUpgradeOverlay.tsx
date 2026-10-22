import { Clock, ArrowUpCircle } from "lucide-react";
import { PLUS_PRICE, PRO_PRICE, KREACY_PLUS_URL, KREACY_PRO_URL } from "@/lib/constants";

interface Props {
  onGoToUpgrade?: () => void;
}

export function ForceUpgradeOverlay({ onGoToUpgrade }: Props) {
  return (
    <div className="fixed inset-0 bg-black/85 z-[900] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--card-bg)] rounded-2xl w-full max-w-[440px] px-4 pt-5 pb-5 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f59e0b]/15 text-[#f59e0b] flex items-center justify-center mx-auto mb-3">
          <Clock size={28} />
        </div>
        <div className="text-[1.1rem] font-extrabold text-[var(--text)] mb-1">Trial FREE 30 Hari Sudah Habis</div>
        <div className="text-[0.78rem] text-[var(--text-light)] mb-4 leading-relaxed">
          Terima kasih sudah mencoba Presensi Siswa! Supaya bisa terus pakai, pilih salah satu paket di bawah ini.
        </div>

        <div className="space-y-2 mb-3 text-left">
          <a
            href={KREACY_PLUS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block border-[1.5px] border-[#0ea5a0] rounded-xl p-3 no-underline"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-[0.9rem] font-bold text-[#0ea5a0]">PLUS</div>
              <div className="text-[0.9rem] font-extrabold text-[#0ea5a0]">{PLUS_PRICE}</div>
            </div>
            <div className="text-[0.72rem] text-[var(--text-light)] mb-2">4 kelas × 25 siswa, cloud sync, Mode PJJ</div>
            <div className="w-full py-[9px] rounded-[8px] text-white text-[0.8rem] font-bold text-center" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}>
              Pilih PLUS
            </div>
          </a>

          <a
            href={KREACY_PRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block border-[1.5px] border-[#f59e0b] rounded-xl p-3 no-underline"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-[0.9rem] font-bold text-[#f59e0b]">PRO</div>
              <div className="text-[0.9rem] font-extrabold text-[#f59e0b]">{PRO_PRICE}</div>
            </div>
            <div className="text-[0.72rem] text-[var(--text-light)] mb-2">Unlimited, Mode QR, backup manual, priority support</div>
            <div className="w-full py-[9px] rounded-[8px] text-white text-[0.8rem] font-bold text-center" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              Pilih PRO
            </div>
          </a>
        </div>

        {onGoToUpgrade && (
          <button
            onClick={onGoToUpgrade}
            className="inline-flex items-center gap-1 text-[0.78rem] text-[#0ea5a0] bg-transparent border-none cursor-pointer"
          >
            <ArrowUpCircle size={14} /> Lihat perbandingan lengkap & aktivasi kode
          </button>
        )}

        <div className="text-[0.66rem] text-[var(--text-light)] mt-4 leading-relaxed">
          Sudah punya kode? Buka Pengaturan → Aktivasi Lisensi.
        </div>
      </div>
    </div>
  );
}
