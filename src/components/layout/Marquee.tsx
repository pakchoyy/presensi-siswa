import { useEffect, useMemo, useState } from "react";
import { MAIN_SITE_URL } from "@/lib/constants";
import { useApp } from "@/contexts/AppContext";
import { Tier, PageName } from "@/types/enums";
import { isOnTrial } from "@/lib/features";

type Msg = { text: string; cta: string; url?: string; page?: PageName };

const site = (path: string) => MAIN_SITE_URL.replace(/\/$/, "") + path;

// Alat lain di bantuguruyuk.web.id (alamat dicek langsung dari situsnya).
const BGY_TOOLS: Msg[] = [
  { text: "Buat soal dalam lima menit?", cta: "Buat Soal →", url: site("/soal") },
  { text: "Butuh prompt LKPD menarik?", cta: "Prompt LKPD →", url: site("/lkpd") },
  { text: "Susun modul ajar lebih cepat", cta: "Modul Ajar →", url: site("/modul-ajar") },
  { text: "Modul kokurikuler hitungan menit?", cta: "Kokurikuler →", url: site("/kokurikuler") },
  { text: "Olah nilai rapor lebih mudah", cta: "Katrol Nilai →", url: site("/katrol-nilai") },
];

const UPGRADE_NUDGES: Msg[] = [
  { text: "Kelas & siswa tanpa batas + Mode QR", cta: "Lihat PRO →", page: PageName.UPGRADE },
  { text: "Data aman di cloud, bisa dibuka di HP lain", cta: "Lihat paket →", page: PageName.UPGRADE },
  { text: "Mulai Rp17.000/semester, cuma ±Rp2.800 sebulan", cta: "Upgrade →", page: PageName.UPGRADE },
];

const PRO_NUDGE: Msg = { text: "Butuh lebih dari 4 kelas atau Mode QR?", cta: "Upgrade ke PRO →", page: PageName.UPGRADE };

/** Isi info disesuaikan paket: FREE/trial → ajakan upgrade, PLUS → ajakan PRO + alat BGY, PRO → alat BGY. */
function messagesFor(realTier: Tier | undefined): Msg[] {
  const t = realTier || Tier.FREE;
  if (t === Tier.PRO) return BGY_TOOLS;
  if (t === Tier.PLUS) return [PRO_NUDGE, ...BGY_TOOLS];
  // FREE (termasuk masa coba): selang-seling ajakan upgrade dan alat BGY
  const out: Msg[] = [];
  const tools = isOnTrial(t) ? BGY_TOOLS : BGY_TOOLS.slice(0, 2);
  for (let i = 0; i < Math.max(UPGRADE_NUDGES.length, tools.length); i++) {
    if (UPGRADE_NUDGES[i]) out.push(UPGRADE_NUDGES[i]);
    if (tools[i]) out.push(tools[i]);
  }
  return out;
}

const INTERVAL_MS = 4500;

// Strip info: di HP duduk di atas navbar (lihat BottomNav), di layar lebar
// di bawah header. Satu pesan bergantian (fade); ketuk badge untuk jeda.
export function Marquee() {
  const { realTier, setActivePage } = useApp();
  const messages = useMemo(() => messagesFor(realTier), [realTier]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % messages.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused, messages.length]);

  const m = messages[idx % messages.length];
  const inner = (
    <>
      <span className="truncate font-semibold">{m.text}</span>
      <span className="flex-shrink-0 font-extrabold underline decoration-2">{m.cta}</span>
    </>
  );
  const cls = "ticker-fade flex-1 min-w-0 flex items-center gap-2 px-3 no-underline bg-transparent border-none cursor-pointer text-left h-full";

  return (
    <div className="ticker-wrap">
      <button type="button" className="ticker-badge border-none cursor-pointer" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Lanjutkan info" : "Jeda info"}>
        Info
      </button>
      {m.page ? (
        <button key={idx} type="button" className={cls} style={{ color: "#1e293b", fontFamily: "inherit" }} onClick={() => setActivePage(m.page!)}>
          {inner}
        </button>
      ) : (
        <a key={idx} href={m.url} target="_blank" rel="noopener noreferrer" className={cls} style={{ color: "#1e293b" }}>
          {inner}
        </a>
      )}
    </div>
  );
}
