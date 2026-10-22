import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Tier } from "@/types/enums";
import { trialDaysRemaining } from "@/lib/features";
import { LogoUpload } from "@/components/shared/LogoUpload";
import { DropdownMenu } from "@/components/layout/DropdownMenu";
import { SyncIndicator } from "@/components/layout/SyncIndicator";
import { LicenseExpiryBadge } from "@/components/layout/LicenseExpiryBadge";
import { Moon, Sun, Menu } from "lucide-react";

export function Header() {
  const { activePage, darkMode, toggleDarkMode, setupSelesai, teacher } =
    useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  let subtitle = "| Presensi Siswa";

  if (!setupSelesai) {
    subtitle = "Setup Awal";
  } else if (activePage === "rekap") {
    subtitle = "| Rekap";
  } else if (activePage === "siswa") {
    subtitle = "| Manajemen";
  } else if (activePage === "kalender") {
    subtitle = "| Kalender";
  } else if (activePage === "petunjuk") {
    subtitle = "| Petunjuk";
  } else if (activePage === "tentang") {
    subtitle = "| Tentang";
  } else if (activePage === "pengaturan") {
    subtitle = "| Pengaturan";
  } else if (activePage === "backup") {
    subtitle = "| Backup";
  } else if (activePage === "upgrade") {
    subtitle = "| Upgrade";
  } else if (activePage === "cloud-settings") {
    subtitle = "| Cloud Settings";
  }

  return (
    <header
      className="sticky top-0 z-[300] px-3"
      style={{
        background: darkMode
          ? "linear-gradient(135deg, #0d4a47, #1a3a4a)"
          : "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)",
        boxShadow: "0 2px 10px rgba(0,0,0,.18)",
      }}
    >
      <div className="flex items-center justify-between h-[54px]">
        <div className="flex items-center gap-[8px] flex-1 min-w-0">
          <LogoUpload />
          <div className="min-w-0">
            <div className="text-[1rem] font-extrabold text-white whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
              {setupSelesai ? `Bantu Guru Yuk ${subtitle}` : "Setup"}
            </div>
          </div>
        </div>

        {setupSelesai && (() => {
          const tier = teacher?.tier || Tier.FREE;
          const trialDays = tier === Tier.FREE ? trialDaysRemaining() : 0;
          const label = tier === Tier.PRO ? "PRO" : tier === Tier.PLUS ? "PLUS" : trialDays > 0 ? `FREE ${trialDays}d` : "FREE";
          const warn = tier === Tier.FREE && trialDays <= 7;
          return (
            <span className={`text-[0.65rem] px-[8px] py-[3px] rounded-full font-bold flex-shrink-0 mr-1 ${
              tier === Tier.PRO
                ? "bg-[#f59e0b]/20 text-[#fbbf24] border border-[#f59e0b]/30"
                : tier === Tier.PLUS
                  ? "bg-[#0ea5a0]/20 text-[#5eead4] border border-[#0ea5a0]/30"
                  : warn
                    ? "bg-[#dc2626]/25 text-[#fecaca] border border-[#dc2626]/40"
                    : "bg-white/10 text-white/60 border border-white/20"
            }`}>
              {label}
            </span>
          );
        })()}

        <div className="flex items-center gap-[5px] flex-shrink-0 relative">
          <SyncIndicator />
          <LicenseExpiryBadge />
          <button
            onClick={toggleDarkMode}
            className="h-[34px] w-[34px] rounded-[8px] border-[1.5px] border-white/30 bg-white/10 text-white flex items-center justify-center flex-shrink-0 active:bg-white/25 cursor-pointer"
            title="Mode gelap/terang"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {setupSelesai && (
            <>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="h-[34px] w-[34px] rounded-[8px] border-[1.5px] border-white/30 bg-white/10 text-white flex items-center justify-center flex-shrink-0 active:bg-white/25 cursor-pointer"
                title="Menu"
              >
                <Menu size={16} />
              </button>
              <DropdownMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
