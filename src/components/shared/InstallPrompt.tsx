import { useState, useEffect } from "react";
import { Download, Share, X } from "lucide-react";
import { DEFAULT_LOGO } from "@/lib/constants";

const DISMISS_KEY = "bgy_install_later"; // sessionStorage: muncul lagi di kunjungan berikutnya

function isStandalone(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
}

/** Kartu ajakan install di tengah layar, tiap kunjungan di browser. "Nanti" berlaku sampai tab ditutup. */
export function InstallPrompt() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    try { if (sessionStorage.getItem(DISMISS_KEY)) return; } catch { /* ignore */ }

    if (isIOS()) {
      setMode("ios");
      return;
    }
    const check = () => { if ((window as any).__bgy_deferredPrompt) setMode("android"); };
    check();
    window.addEventListener("bgy_install_ready", check);
    const installed = () => setMode(null);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("bgy_install_ready", check);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const later = () => {
    setMode(null);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  };

  const install = async () => {
    const ev = (window as any).__bgy_deferredPrompt;
    if (!ev) return;
    ev.prompt();
    const { outcome } = await ev.userChoice;
    (window as any).__bgy_deferredPrompt = null;
    if (outcome === "accepted") setMode(null);
    else later();
  };

  if (!mode) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install aplikasi"
      className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/45 animate-fade-in"
      onClick={later}
    >
      <div
        className="relative w-full max-w-[340px] bg-[var(--card-bg)] rounded-3xl px-6 pt-7 pb-5 text-center"
        style={{ boxShadow: "0 20px 50px rgba(0,0,0,.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={later}
          aria-label="Tutup"
          className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center rounded-xl text-[var(--text-light)] bg-transparent border-none cursor-pointer"
        >
          <X size={18} />
        </button>
        <img src={DEFAULT_LOGO} alt="" className="w-20 h-20 rounded-[22px] mx-auto mb-3" />
        <div className="text-[1.15rem] font-extrabold text-[var(--text)] leading-tight">Install Presensi Yuk</div>
        {mode === "ios" ? (
          <p className="text-[0.9rem] text-[var(--text-light)] leading-relaxed mt-2 mb-4">
            Ketuk <Share size={15} className="inline -mt-[3px]" /> <b>Bagikan</b> di bawah layar, lalu pilih <b>Tambahkan ke Layar Utama</b>.
          </p>
        ) : (
          <p className="text-[0.9rem] text-[var(--text-light)] leading-relaxed mt-2 mb-4">
            Buka langsung dari layar HP, lebih cepat, dan tetap bisa dipakai tanpa internet.
          </p>
        )}
        {mode === "android" && (
          <button
            onClick={install}
            className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-2xl text-white font-bold text-[0.95rem] border-none cursor-pointer"
            style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}
          >
            <Download size={18} /> Install Sekarang
          </button>
        )}
        <button
          onClick={later}
          className="w-full min-h-[44px] mt-2 rounded-2xl text-[var(--text-light)] font-semibold text-[0.88rem] bg-transparent border-none cursor-pointer"
        >
          {mode === "ios" ? "Mengerti" : "Nanti saja"}
        </button>
      </div>
    </div>
  );
}
