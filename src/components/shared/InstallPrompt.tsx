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

/** Banner ringkas ajakan install, tidak menghalangi aplikasi. Tiap kunjungan di browser. */
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
      aria-label="Install aplikasi"
      className="fixed left-1/2 -translate-x-1/2 top-[62px] z-[400] w-[calc(100%-24px)] max-w-[420px] animate-fade-in"
    >
      <div
        className="flex items-center gap-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl pl-3 pr-2 py-[10px]"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}
      >
        <img src={DEFAULT_LOGO} alt="" className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[0.82rem] font-extrabold text-[var(--text)] leading-tight">Install Presensi Yuk</div>
          {mode === "ios" ? (
            <div className="text-[0.7rem] text-[var(--text-light)] leading-snug">
              Ketuk <Share size={12} className="inline -mt-[2px]" /> <b>Bagikan</b>, lalu <b>Tambahkan ke Layar Utama</b>
            </div>
          ) : (
            <div className="text-[0.7rem] text-[var(--text-light)] leading-snug">Lebih cepat dibuka & bisa dipakai offline</div>
          )}
        </div>
        {mode === "android" && (
          <button
            onClick={install}
            className="flex items-center gap-1 min-h-[40px] px-3 rounded-xl text-white font-bold text-[0.78rem] border-none cursor-pointer flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}
          >
            <Download size={15} /> Install
          </button>
        )}
        <button
          onClick={later}
          aria-label="Nanti"
          className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--text-light)] bg-transparent border-none cursor-pointer flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
