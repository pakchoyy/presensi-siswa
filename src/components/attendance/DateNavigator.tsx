import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { formatTanggalPanjang, addDays } from "@/lib/utils";

export function DateNavigator() {
  const { tanggalAktif, setTanggalAktif } = useApp();

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-[14px] py-[10px] mb-[10px] flex items-center justify-between">
      <button
        onClick={() => setTanggalAktif(addDays(tanggalAktif, -1))}
        className="h-8 w-[34px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="text-center">
        <div className="font-bold text-[0.85rem]">{formatTanggalPanjang(tanggalAktif)}</div>
        <div className="text-[var(--text-light)] text-[0.75rem]">
          Tap nama siswa untuk ubah status
        </div>
      </div>
      <button
        onClick={() => setTanggalAktif(addDays(tanggalAktif, 1))}
        className="h-8 w-[34px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
