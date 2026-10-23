import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { isQrActive, QR_MODE_EVENT } from "@/lib/features";
import { PageName } from "@/types/enums";
import { Marquee } from "@/components/layout/Marquee";
import {
  ClipboardCheck,
  BarChart3,
  Users,
  Calendar,
  Settings,
  QrCode,
  type LucideIcon,
} from "lucide-react";

interface NavItemData {
  page: PageName;
  label: string;
  icon: LucideIcon;
}

// Urutan: Rekap, Siswa, [Presensi di tengah], Kalender, Pengaturan
const NAV_ITEMS: NavItemData[] = [
  { page: PageName.REKAP, label: "Rekap", icon: BarChart3 },
  { page: PageName.SISWA, label: "Siswa", icon: Users },
  { page: PageName.PRESENSI, label: "Presensi", icon: ClipboardCheck },
  { page: PageName.KALENDER, label: "Kalender", icon: Calendar },
  { page: PageName.PENGATURAN, label: "Pengaturan", icon: Settings },
];

export function BottomNav() {
  const { activePage, setActivePage, setupSelesai, tier } = useApp();
  const [qrOn, setQrOn] = useState(() => isQrActive(tier));
  useEffect(() => {
    const sync = () => setQrOn(isQrActive(tier));
    sync();
    window.addEventListener(QR_MODE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(QR_MODE_EVENT, sync); window.removeEventListener("storage", sync); };
  }, [tier]);
  // Strip info duduk tepat di atas puncak tombol tengah, jadi tidak pernah tertutup.
  const centerRef = useRef<HTMLDivElement>(null);
  const [tickerBottom, setTickerBottom] = useState(84);
  useLayoutEffect(() => {
    const measure = () => {
      const el = centerRef.current;
      if (el) setTickerBottom(Math.ceil(window.innerHeight - el.getBoundingClientRect().top) + 6);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [setupSelesai]);

  if (!setupSelesai) return null;

  return (
    <>
    <div className="lg:hidden fixed left-1/2 -translate-x-1/2 w-full max-w-app z-[290]" style={{ bottom: tickerBottom }}>
      <Marquee />
    </div>
    <nav
      className="lg:hidden fixed left-1/2 bottom-0 -translate-x-1/2 w-full max-w-app bg-[var(--card-bg)] border-t border-[var(--border)] flex items-end z-[300] py-[6px] px-1"
      style={{ boxShadow: "0 -2px 12px rgba(0,0,0,.08)" }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activePage === item.page;
        if (item.page === PageName.PRESENSI) {
          return (
            <button
              key={item.page}
              onClick={() => {
                if (qrOn) {
                  // Mode QR: tombol tengah langsung membuka pemindai di halaman Presensi
                  sessionStorage.setItem("bgy_open_scan", String(Date.now()));
                  window.dispatchEvent(new Event("bgy-open-scan"));
                }
                setActivePage(item.page);
              }}
              className="flex-1 flex flex-col items-center -mt-5 bg-transparent border-none cursor-pointer font-[inherit]"
              aria-label={qrOn ? "Scan QR" : "Presensi"}
            >
              <div
                ref={centerRef}
                className={`w-[54px] h-[54px] rounded-full flex items-center justify-center text-white shadow-lg border-4 border-[var(--card-bg)] ${isActive ? "" : "opacity-90"}`}
                style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
              >
                {qrOn ? <QrCode size={24} /> : <item.icon size={24} />}
              </div>
              <span className={`text-[10px] font-bold mt-[1px] ${isActive ? "text-[#0ea5a0]" : "text-[var(--text-light)]"}`}>{qrOn ? "Scan QR" : item.label}</span>
            </button>
          );
        }
        return (
          <button
            key={item.page}
            onClick={() => setActivePage(item.page)}
            className={`flex-1 flex flex-col items-center gap-[2px] py-[6px] px-[2px] rounded-[10px] cursor-pointer bg-transparent border-none font-[inherit] ${
              isActive ? "text-[#0ea5a0]" : "text-[var(--text-light)]"
            }`}
          >
            <item.icon size={19} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        );
      })}
    </nav>
    </>
  );
}
