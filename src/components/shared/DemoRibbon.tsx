import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { demoService, isDemoMode } from "@/services/demo.service";

export function DemoRibbon() {
  const { setupSelesai } = useApp();
  const [busy, setBusy] = useState(false);
  if (!setupSelesai || !isDemoMode()) return null;

  const hapus = async () => {
    if (!confirm("Hapus semua data contoh dan mulai isi data sekolahmu?")) return;
    setBusy(true);
    await demoService.clear();
  };

  return (
    <div className="bg-[#fef3c7] border-b border-[#fbbf24] px-3 py-[7px] flex items-center gap-2 text-[0.72rem] text-[#78350f]">
      <span className="flex-1"><b>Mode Contoh</b> — data ini hanya untuk coba-coba.</span>
      <button
        onClick={hapus}
        disabled={busy}
        className="px-[10px] py-[5px] rounded-lg bg-[#d97706] text-white font-bold text-[0.68rem] border-none cursor-pointer flex-shrink-0 disabled:opacity-60"
      >
        {busy ? "Menghapus..." : "Hapus contoh & isi data sekolahku"}
      </button>
    </div>
  );
}
