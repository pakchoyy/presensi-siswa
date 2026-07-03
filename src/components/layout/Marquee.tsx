import { MAIN_SITE_URL } from "@/lib/constants";

const MESSAGES = [
  "Mau buat soal dalam lima menit?",
  "Butuh prompt LKPD menarik?",
  "Mau buat modul kokurikuler hitungan menit?",
  "Yuk cobain semuanya di bantuguruyuk.web.id! ✨",
];

export function Marquee() {
  const duplicated = [...MESSAGES, ...MESSAGES];

  return (
    <div className="ticker-wrap w-full">
      <div className="ticker-badge">INFO</div>
      <div className="ticker-track">
        <a
          href={MAIN_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ticker-content"
        >
          {duplicated.map((msg, i) => (
            <span key={i} className="ticker-msg">
              {msg}
            </span>
          ))}
        </a>
      </div>
    </div>
  );
}
