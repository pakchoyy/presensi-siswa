const MESSAGES = [
  "Mau buat soal dalam lima menit?",
  "Butuh prompt LKPD menarik?",
  "Mau buat modul kokurikuler hitungan menit?",
  "Yuk cobain semuanya di Bantu Guru Yuk! ✨",
];

export function Marquee() {
  const duplicated = [...MESSAGES, ...MESSAGES];

  return (
    <div className="ticker-wrap">
      <div className="ticker-badge">INFO</div>
      <div className="ticker-track">
        <a
          href="https://bantuguruyuk.web.id"
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
