import { useApp } from "@/contexts/AppContext";
import { PageName } from "@/types/enums";
import { PRO_PRICE } from "@/lib/constants";
import { Home, BookOpen, Info, Download, Globe, ArrowUpCircle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function DropdownMenu({ isOpen, onClose }: Props) {
  const { setActivePage, setupSelesai } = useApp();

  if (!isOpen || !setupSelesai) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[290]"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div
        className="absolute top-[calc(100%+8px)] right-0 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl z-[400] min-w-[200px] overflow-hidden"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <button
          onClick={() => { setActivePage(PageName.PRESENSI); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-[11px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <Home size={16} /> Home
        </button>
        <button
          onClick={() => { setActivePage(PageName.PETUNJUK); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-[11px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <BookOpen size={16} /> Petunjuk
        </button>

        <div className="h-px bg-[var(--border)] mx-0" />

        <button
          onClick={() => { setActivePage(PageName.TENTANG); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-[11px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <Info size={16} /> Tentang &amp; Kontak
        </button>

        <div className="h-px bg-[var(--border)] mx-0" />

        <button
          onClick={() => {
            // Trigger PWA install if available
            const promptEv = (window as any).__bgy_deferredPrompt;
            if (promptEv) {
              promptEv.prompt();
              promptEv.userChoice.then(() => {
                (window as any).__bgy_deferredPrompt = null;
              });
            }
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-[11px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <Download size={16} /> Install BGY
        </button>
        <button
          onClick={() => {
            window.open("https://bantuguruyuk.web.id", "_blank", "noopener");
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-[11px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <Globe size={16} /> bantuguruyuk.web.id
        </button>

        <div className="h-px bg-[var(--border)] mx-0" />

        <button
          onClick={() => { setActivePage(PageName.PENGATURAN); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-[11px] text-[0.83rem] font-semibold text-[#0ea5a0] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <ArrowUpCircle size={16} /> Upgrade PRO
          <span className="ml-auto text-[0.65rem] text-[var(--text-light)]">{PRO_PRICE}</span>
        </button>
      </div>
    </>
  );
}
