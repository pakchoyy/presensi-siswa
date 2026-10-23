import { useState } from "react";
import { MAIN_SITE_URL } from "@/lib/constants";

const MESSAGES = [
  "Mau buat soal dalam lima menit?",
  "Butuh prompt LKPD menarik?",
  "Mau buat modul kokurikuler hitungan menit?",
  "Yuk cobain semuanya di ",
];

// Strip info: di HP duduk di atas navbar (lihat BottomNav), di layar lebar
// di bawah header. Ketuk untuk jeda.
export function Marquee() {
  const [paused, setPaused] = useState(false);
  const duplicated = [...MESSAGES, ...MESSAGES];

  return (
    <div className="ticker-wrap">
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
    </div>
  );
}
