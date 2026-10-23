import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/shared/Toast";
import { PageName, Tier } from "@/types/enums";
import { canUse, isQrActive, setQrMode as saveQrMode, QR_MODE_EVENT } from "@/lib/features";
import { licenseService } from "@/services/license.service";
import { BookOpen, Info, Download, Globe, ArrowUpCircle, Cloud, QrCode, Lock, Gift } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function DropdownMenu({ isOpen, onClose }: Props) {
  const { setActivePage, setupSelesai, teacher, tier: appTier, realTier } = useApp();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [qrMode, setQrMode] = useState(isQrActive(appTier));
  useEffect(() => {
    const sync = () => setQrMode(isQrActive(appTier));
    sync();
    window.addEventListener(QR_MODE_EVENT, sync);
    return () => window.removeEventListener(QR_MODE_EVENT, sync);
  }, [appTier]);
  const [lic, setLic] = useState<{ berakhir: string; daysRemaining: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !teacher || realTier === Tier.FREE) { setLic(null); return; }
    licenseService.getStatus(teacher.id).then((st) => {
      setLic(st.aktif && st.berakhir && st.daysRemaining !== undefined
        ? { berakhir: st.berakhir, daysRemaining: st.daysRemaining } : null);
    }).catch(() => setLic(null));
  }, [isOpen, teacher, realTier]);

  if (!isOpen || !setupSelesai) return null;

  const tier = appTier;
  const isPaid = tier === Tier.PRO || tier === Tier.PLUS;

  const canInstall = !!(window as any).__bgy_deferredPrompt;

  const handleInstall = () => {
    const promptEv = (window as any).__bgy_deferredPrompt as BeforeInstallPromptEvent | undefined;
    if (promptEv) {
      promptEv.prompt();
      promptEv.userChoice.then(() => {
        (window as any).__bgy_deferredPrompt = null;
      });
    } else {
      toast("Buka di Chrome/Edge Android, lalu menu > Tambahkan ke Layar Utama");
    }
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[290]"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div
        className="absolute top-[calc(100%+8px)] right-0 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl z-[400] min-w-[220px] overflow-hidden"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <button
          onClick={() => { setActivePage(PageName.PETUNJUK); onClose(); }}
          className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <BookOpen size={16} /> Petunjuk
        </button>

        {canUse("qr_mode", tier) ? (
          <button
            role="switch"
            aria-checked={qrMode}
            onClick={() => {
              const newVal = !qrMode;
              saveQrMode(newVal);
              onClose();
              toast(newVal ? "Mode QR aktif — tombol tengah jadi Scan QR" : "Mode QR mati — tombol tengah kembali ke Presensi");
            }}
            className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
          >
            <QrCode size={16} /> Mode QR
            <span className={`ml-auto relative w-[36px] h-[20px] rounded-full transition-colors ${qrMode ? "bg-[#0ea5a0]" : "bg-[var(--border)]"}`}>
              <span className={`absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow transition-all ${qrMode ? "left-[18px]" : "left-[2px]"}`} />
            </span>
          </button>
        ) : (
          <button
            onClick={() => { setActivePage(PageName.UPGRADE); onClose(); }}
            className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[var(--text-light)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
          >
            <QrCode size={16} /> Mode QR
            <span className="ml-auto flex items-center gap-1 text-[0.62rem] font-bold px-[7px] py-[2px] rounded-full bg-[#f59e0b]/15 text-[#d97706]"><Lock size={10} /> PRO</span>
          </button>
        )}

        {isPaid && isAuthenticated && (
          <button
            onClick={() => { setActivePage(PageName.CLOUD_SETTINGS); onClose(); }}
            className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
          >
            <Cloud size={16} /> Cloud Settings
          </button>
        )}

        <div className="h-px bg-[var(--border)] mx-0" />

        <button
          onClick={() => { setActivePage(PageName.TENTANG); onClose(); }}
          className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <Info size={16} /> Tentang &amp; Kontak
        </button>

        <div className="h-px bg-[var(--border)] mx-0" />

        <button
          onClick={() => { setActivePage(PageName.AFFILIATE); onClose(); }}
          className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <Gift size={16} /> Program Affiliate
          {realTier !== Tier.PRO && (
            <span className="ml-auto flex items-center gap-1 text-[0.62rem] font-bold px-[7px] py-[2px] rounded-full bg-[#f59e0b]/15 text-[#d97706]"><Lock size={10} /> PRO</span>
          )}
        </button>
        <button
          onClick={handleInstall}
          className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <Download size={16} /> Install Aplikasi
        </button>
        <button
          onClick={() => {
            window.open("https://bantuguruyuk.web.id", "_blank", "noopener");
            onClose();
          }}
          className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <Globe size={16} /> bantuguruyuk.web.id
        </button>

        <div className="h-px bg-[var(--border)] mx-0" />

        {/* Paling bawah: tanda pelanggan / tombol upgrade */}
        {realTier === Tier.PRO && lic ? (
          <div className="px-4 py-[11px] bg-[rgba(245,158,11,0.10)]">
            <div className="text-[0.8rem] font-extrabold text-[#d97706]">Pelanggan PRO ✓</div>
            <div className="text-[0.68rem] text-[var(--text-light)] mt-[2px]">
              Aktif sampai {lic.berakhir} ({lic.daysRemaining} hari lagi)
            </div>
          </div>
        ) : realTier === Tier.PLUS && lic ? (
          <div className="px-4 py-[11px] bg-[rgba(14,165,160,0.08)]">
            <div className="text-[0.8rem] font-extrabold text-[#0ea5a0]">Pelanggan PLUS ✓</div>
            <div className="text-[0.68rem] text-[var(--text-light)] mt-[2px]">
              Aktif sampai {lic.berakhir} ({lic.daysRemaining} hari lagi)
            </div>
            <button
              onClick={() => { setActivePage(PageName.UPGRADE); onClose(); }}
              className="mt-[6px] text-[0.7rem] font-bold text-[#d97706] bg-transparent border-none p-0 cursor-pointer"
            >
              Upgrade ke PRO →
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setActivePage(PageName.UPGRADE); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-[12px] text-[0.85rem] font-bold text-white border-none cursor-pointer text-left"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            <ArrowUpCircle size={17} /> Upgrade paket
          </button>
        )}

      </div>
    </>
  );
}
