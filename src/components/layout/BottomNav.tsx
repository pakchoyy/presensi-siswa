import { useApp } from "@/contexts/AppContext";
import { PageName } from "@/types/enums";
import {
  ClipboardCheck,
  BarChart3,
  Users,
  Calendar,
  Settings,
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
  const { activePage, setActivePage, setupSelesai } = useApp();
  if (!setupSelesai) return null;

  return (
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
              onClick={() => setActivePage(item.page)}
              className="flex-1 flex flex-col items-center -mt-5 bg-transparent border-none cursor-pointer font-[inherit]"
              aria-label="Presensi"
            >
              <div
                className={`w-[54px] h-[54px] rounded-full flex items-center justify-center text-white shadow-lg border-4 border-[var(--card-bg)] ${isActive ? "" : "opacity-90"}`}
                style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
              >
                <item.icon size={24} />
              </div>
              <span className={`text-[10px] font-bold mt-[1px] ${isActive ? "text-[#0ea5a0]" : "text-[var(--text-light)]"}`}>{item.label}</span>
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
  );
}
