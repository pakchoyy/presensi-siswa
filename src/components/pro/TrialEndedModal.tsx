import { useState } from "react";
import { bonusTrialUsed, startBonusTrial, BONUS_TRIAL_DAYS } from "@/lib/features";

interface Props {
  onLihatPaket: () => void;
}

/** Kunci "sudah dilihat": terpisah untuk akhir masa coba 30 hari dan akhir bonus 7 hari. */
export function trialEndSeenKey(): string {
  return bonusTrialUsed() ? "bgy_bonus_end_seen" : "bgy_trial_end_seen";
}

export function TrialEndedModal({ onLihatPaket }: Props) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const bisaBonus = !bonusTrialUsed();

  const tutup = () => {
    localStorage.setItem(trialEndSeenKey(), "1");
    setOpen(false);
  };

  const ambilBonus = () => {
    localStorage.setItem("bgy_trial_end_seen", "1");
    startBonusTrial();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[600] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[var(--card-bg)] rounded-2xl p-5 max-w-[360px] w-full text-center" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="text-[2rem] mb-2">⏰</div>
        <h2 className="text-[1.05rem] font-extrabold text-[var(--text)] mb-1">Masa coba PRO selesai</h2>
        <p className="text-[0.85rem] text-[var(--text-light)] mb-4">
          Sekarang akun Anda FREE (1 kelas, 10 siswa). Data Anda tetap aman dan bisa dilihat.
        </p>
        {bisaBonus && (
          <button
            onClick={ambilBonus}
            className="w-full py-[11px] rounded-xl text-white font-bold border-none cursor-pointer mb-2"
            style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}
          >
            🎁 Coba PRO lagi {BONUS_TRIAL_DAYS} hari (gratis, sekali saja)
          </button>
        )}
        <button
          onClick={() => { tutup(); onLihatPaket(); }}
          className="w-full py-[11px] rounded-xl text-white font-bold border-none cursor-pointer mb-2"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
        >
          Lihat Paket
        </button>
        <button onClick={tutup} className="w-full py-[10px] rounded-xl font-semibold text-[var(--text-light)] bg-transparent border border-[var(--border)] cursor-pointer">
          Nanti saja
        </button>
      </div>
    </div>
  );
}
