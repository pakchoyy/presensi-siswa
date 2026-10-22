import { X, ArrowUpCircle, Check } from "lucide-react";
import { Tier } from "@/types/enums";
import { PLUS_PRICE, PRO_PRICE, KREACY_PLUS_URL, KREACY_PRO_URL } from "@/lib/constants";

interface Props {
  reason: string;
  currentTier?: Tier;
  onClose: () => void;
  onGoToUpgrade?: () => void;
}

export function UpgradePrompt({ reason, currentTier = Tier.FREE, onClose, onGoToUpgrade }: Props) {
  const showPlus = currentTier === Tier.FREE;
  const showPro = currentTier !== Tier.PRO;

  return (
    <div className="fixed inset-0 bg-black/60 z-[800] flex items-end lg:items-center justify-center p-2" onClick={onClose}>
      <div
        className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[440px] px-4 pt-[18px] pb-[22px] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#f59e0b]/15 text-[#f59e0b] flex items-center justify-center">
              <ArrowUpCircle size={20} />
            </div>
            <div>
              <div className="text-[0.95rem] font-extrabold text-[var(--text)]">Upgrade Tier</div>
              <div className="text-[0.7rem] text-[var(--text-light)]">Buka fitur lebih banyak</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--input-bg)] text-[var(--text-light)] border-none cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="bg-[rgba(245,158,11,0.08)] border border-[#f59e0b]/30 rounded-xl p-3 mb-3 text-[0.78rem] text-[var(--text)]">
          ⚠️ {reason}
        </div>

        <div className="space-y-2">
          {showPlus && (
            <a
              href={KREACY_PLUS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block border-[1.5px] border-[#0ea5a0] rounded-xl p-3 no-underline"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-[0.85rem] font-bold text-[#0ea5a0]">PLUS</div>
                <div className="text-[0.9rem] font-extrabold text-[#0ea5a0]">{PLUS_PRICE}</div>
              </div>
              <div className="text-[0.72rem] text-[var(--text-light)] mb-2">4 kelas × 25 siswa, cloud sync, logo laporan, Mode PJJ</div>
              <div className="w-full py-[8px] rounded-[8px] text-white text-[0.78rem] font-bold text-center" style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}>
                Beli PLUS
              </div>
            </a>
          )}

          {showPro && (
            <a
              href={KREACY_PRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block border-[1.5px] border-[#f59e0b] rounded-xl p-3 no-underline"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1 text-[0.85rem] font-bold text-[#f59e0b]">PRO <Check size={14} /></div>
                <div className="text-[0.9rem] font-extrabold text-[#f59e0b]">{PRO_PRICE}</div>
              </div>
              <div className="text-[0.72rem] text-[var(--text-light)] mb-2">Unlimited siswa & kelas, Mode QR, backup manual, support priority</div>
              <div className="w-full py-[8px] rounded-[8px] text-white text-[0.78rem] font-bold text-center" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                Beli PRO
              </div>
            </a>
          )}

          {onGoToUpgrade && (
            <button
              onClick={onGoToUpgrade}
              className="w-full py-[10px] text-[0.78rem] text-[var(--text-light)] bg-transparent border-none cursor-pointer"
            >
              Lihat perbandingan lengkap →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
