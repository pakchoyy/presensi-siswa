import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { formatTanggalPanjang, addDays } from "@/lib/utils";

export function DateNavigator() {
  const { tanggalAktif, setTanggalAktif } = useApp();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-[14px] py-[10px] mb-[10px] flex items-center justify-between">
      <button
        onClick={() => setTanggalAktif(addDays(tanggalAktif, -1))}
        className="h-8 w-[34px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5"
      >
        <ChevronLeft size={16} />
      </button>
      <div className="text-center flex items-center gap-2 cursor-pointer" onClick={() => setShowPicker(!showPicker)}>
        <Calendar size={14} className="text-[var(--text-light)]" />
        <div>
          <div className="font-bold text-[0.85rem]">{formatTanggalPanjang(tanggalAktif)}</div>
          <div className="text-[var(--text-light)] text-[0.72rem]">
            {showPicker ? "Pilih tanggal" : "Tap untuk pilih tanggal"}
          </div>
        </div>
      </div>
      {showPicker && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-2 shadow-lg z-[100]">
          <input
            type="date"
            value={tanggalAktif}
            onChange={(e) => {
              setTanggalAktif(e.target.value);
              setShowPicker(false);
            }}
            className="w-full px-[10px] py-[8px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] bg-[var(--input-bg)] outline-none font-[inherit]"
          />
        </div>
      )}
      <button
        onClick={() => setTanggalAktif(addDays(tanggalAktif, 1))}
        className="h-8 w-[34px] rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer active:bg-black/5"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
