import { useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { formatTanggalPanjang, addDays } from "@/lib/utils";

export function DateNavigator() {
  const { tanggalAktif, setTanggalAktif } = useApp();
  const lastClickRef = useRef(0);

  const change = (days: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) return;
    lastClickRef.current = now;
    setTanggalAktif(addDays(tanggalAktif, days));
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-[10px] py-[8px] mb-[10px] flex items-center justify-between gap-1">
      <button
        onClick={() => change(-1)}
        className="h-10 w-10 min-w-[40px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5 select-none"
        style={{ touchAction: "manipulation" }}
      >
        <ChevronLeft size={18} />
      </button>
      <div className="text-center flex-1 min-w-0">
        <div className="font-bold text-[0.82rem] whitespace-nowrap px-1">{formatTanggalPanjang(tanggalAktif)}</div>
      </div>
      <label className="h-10 w-10 min-w-[40px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5 select-none">
        <Calendar size={17} />
        <input
          type="date"
          value={tanggalAktif}
          onChange={(e) => setTanggalAktif(e.target.value)}
          className="absolute opacity-0 w-0 h-0"
        />
      </label>
      <button
        onClick={() => change(1)}
        className="h-10 w-10 min-w-[40px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5 select-none"
        style={{ touchAction: "manipulation" }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
