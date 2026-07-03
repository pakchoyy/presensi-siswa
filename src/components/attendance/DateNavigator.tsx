import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { formatTanggalPanjang, addDays } from "@/lib/utils";

export function DateNavigator() {
  const { tanggalAktif, setTanggalAktif } = useApp();

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-[8px] py-[6px] mb-[10px] flex items-center justify-between gap-1">
      <button
        onClick={() => setTanggalAktif(addDays(tanggalAktif, -1))}
        className="h-10 w-10 min-w-[40px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5 select-none"
        style={{ touchAction: "manipulation" }}
      >
        <ChevronLeft size={18} />
      </button>
      <div className="text-center flex-1 min-w-0 px-1" style={{ minWidth: "160px" }}>
        <div className="font-bold text-[0.78rem] whitespace-nowrap">{formatTanggalPanjang(tanggalAktif)}</div>
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
        onClick={() => setTanggalAktif(addDays(tanggalAktif, 1))}
        className="h-10 w-10 min-w-[40px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5 select-none"
        style={{ touchAction: "manipulation" }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
