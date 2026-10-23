import { useState } from "react";
import { X } from "lucide-react";
import { MAIN_SITE_URL } from "@/lib/constants";

const MESSAGES = [
  "Mau buat soal dalam lima menit?",
  "Butuh prompt LKPD menarik?",
  "Mau buat modul kokurikuler hitungan menit?",
  "Yuk cobain semuanya di ",
];

// Strip info di bawah header. Bisa ditutup (muncul lagi setelah 3 hari),
// ketuk untuk jeda. Dulu di atas navbar dan tertutup tombol tengah.
const HIDE_KEY = "bgy_ticker_hide_until";
const HIDE_MS = 3 * 24 * 60 * 60 * 1000;

function isHidden(): boolean {
  try {
    return Number(localStorage.getItem(HIDE_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

export function Marquee() {
  const [hidden, setHidden] = useState(isHidden);
  const [paused, setPaused] = useState(false);
  if (hidden) return null;

  const duplicated = [...MESSAGES, ...MESSAGES];
  const close = () => {
    try { localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_MS)); } catch { /* ignore */ }
    setHidden(true);
  };

  return (
    <div className="ticker-wrap -mx-3 w-auto">
      <div className="ticker-badge">Info</div>
      <div className="ticker-track" onClick={() => setPaused((p) => !p)}>
        <div className="ticker-content" style={paused ? { animationPlayState: "paused" } : undefined}>
          {duplicated.map((msg, i) => (
            <span key={i} className="ticker-msg inline-flex items-center leading-none">
              {msg}
              {msg.includes("Yuk cobain") && (
                <a
                  href={MAIN_SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline decoration-2 inline-flex items-center leading-none"
                  style={{ color: "#1e293b" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  bantuguruyuk.web.id
                </a>
              )}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Tutup info"
        className="flex-shrink-0 w-[36px] h-[28px] flex items-center justify-center bg-transparent border-none cursor-pointer text-[#1e293b]"
      >
        <X size={15} />
      </button>
    </div>
  );
}
