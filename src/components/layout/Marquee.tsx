import { useEffect, useState } from "react";
import { MAIN_SITE_URL } from "@/lib/constants";

// Satu pesan tampil bergantian (fade). Tiap pesan punya link sendiri;
// ganti `url` untuk mengarahkan ke halaman spesifik.
const MESSAGES: { text: string; cta: string; url: string }[] = [
  { text: "Mau buat soal dalam lima menit?", cta: "Coba →", url: MAIN_SITE_URL },
  { text: "Butuh prompt LKPD menarik?", cta: "Lihat →", url: MAIN_SITE_URL },
  { text: "Modul kokurikuler hitungan menit?", cta: "Coba →", url: MAIN_SITE_URL },
  { text: "Semua alat guru ada di", cta: "bantuguruyuk.web.id", url: MAIN_SITE_URL },
];
const INTERVAL_MS = 4500;

// Strip info: di HP duduk di atas navbar (lihat BottomNav), di layar lebar
// di bawah header. Ketuk badge untuk jeda.
export function Marquee() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused]);

  const m = MESSAGES[idx];
  return (
    <div className="ticker-wrap">
      <button type="button" className="ticker-badge border-none cursor-pointer" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Lanjutkan info" : "Jeda info"}>
        Info
      </button>
      <a
        key={idx}
        href={m.url}
        target="_blank"
        rel="noopener noreferrer"
        className="ticker-fade flex-1 min-w-0 flex items-center gap-2 px-3 no-underline"
        style={{ color: "#1e293b" }}
      >
        <span className="truncate font-semibold">{m.text}</span>
        <span className="flex-shrink-0 font-extrabold underline decoration-2">{m.cta}</span>
      </a>
    </div>
  );
}
