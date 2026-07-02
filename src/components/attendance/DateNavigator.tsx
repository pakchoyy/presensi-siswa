import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { formatTanggalPanjang, addDays } from "@/lib/utils";

export function DateNavigator() {
  const { tanggalAktif, setTanggalAktif } = useApp();

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-[10px] py-[8px] mb-[10px] flex items-center justify-between gap-1">
      <button
        onTouchStart={() => setTanggalAktif(addDays(tanggalAktif, -1))}
        onClick={() => setTanggalAktif(addDays(tanggalAktif, -1))}
        className="h-8 w-8 min-w-[32px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5 select-none"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="text-center flex-1">
        <div className="font-bold text-[0.82rem]">{formatTanggalPanjang(tanggalAktif)}</div>
      </div>
      <label className="h-8 w-8 min-w-[32px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5 select-none">
        <Calendar size={15} />
        <input
          type="date"
          value={tanggalAktif}
          onChange={(e) => setTanggalAktif(e.target.value)}
          className="absolute opacity-0 w-0 h-0"
        />
      </label>
      <button
        onTouchStart={() => setTanggalAktif(addDays(tanggalAktif, 1))}
        onClick={() => setTanggalAktif(addDays(tanggalAktif, 1))}
        className="h-8 w-8 min-w-[32px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5 select-none"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
