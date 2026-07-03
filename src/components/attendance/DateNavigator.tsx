import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { formatTanggalPanjang, addDays } from "@/lib/utils";

export function DateNavigator() {
  const { tanggalAktif, setTanggalAktif } = useApp();
  const lastRef = useRef(0);
  const [busy, setBusy] = useState(false);

  const change = (days: number) => {
    const now = Date.now();
    if (now - lastRef.current < 400) return;
    lastRef.current = now;
    setBusy(true);
    setTanggalAktif(addDays(tanggalAktif, days));
    setTimeout(() => setBusy(false), 400);
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-[8px] py-[6px] mb-[10px] flex items-center justify-between gap-1">
      <button
        onClick={() => change(-1)}
        disabled={busy}
        className="h-11 w-11 min-w-[44px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5 select-none disabled:opacity-30 disabled:cursor-default relative z-[1]"
        style={{ touchAction: "manipulation" }}
      >
        <ChevronLeft size={19} />
      </button>
      <div className="text-center flex-1 min-w-0 px-2" style={{ minWidth: "150px" }}>
        <div className="font-bold text-[0.78rem] whitespace-nowrap">{formatTanggalPanjang(tanggalAktif)}</div>
      </div>
      <label className="h-11 w-11 min-w-[44px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5 select-none">
        <Calendar size={18} />
        <input
          type="date"
          value={tanggalAktif}
          onChange={(e) => setTanggalAktif(e.target.value)}
          className="absolute opacity-0 w-0 h-0"
        />
      </label>
      <button
        onClick={() => change(1)}
        disabled={busy}
        className="h-11 w-11 min-w-[44px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5 select-none disabled:opacity-30 disabled:cursor-default relative z-[1]"
        style={{ touchAction: "manipulation" }}
      >
        <ChevronRight size={19} />
      </button>
    </div>
  );
}
