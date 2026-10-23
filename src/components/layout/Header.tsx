import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Tier } from "@/types/enums";
import { trialDaysRemaining } from "@/lib/features";
import { LogoUpload } from "@/components/shared/LogoUpload";
import { DropdownMenu } from "@/components/layout/DropdownMenu";
import { SyncIndicator } from "@/components/layout/SyncIndicator";
import { licenseService } from "@/services/license.service";
import { PageName } from "@/types/enums";
import { Moon, Sun, Menu } from "lucide-react";

export function Header() {
  const { darkMode, toggleDarkMode, setupSelesai, realTier, teacher, setActivePage } =
    useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [licDays, setLicDays] = useState<number | null>(null);

  useEffect(() => {
    if (!teacher || (teacher.tier !== Tier.PRO && teacher.tier !== Tier.PLUS)) { setLicDays(null); return; }
    licenseService.getStatus(teacher.id).then((st) => {
      setLicDays(st.aktif && st.daysRemaining !== undefined && st.daysRemaining <= 14 ? st.daysRemaining : null);
    });
  }, [teacher]);

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
              <i>Presensi Yuk</i> <span className="font-semibold opacity-80">| Siswa</span>
            </div>
          </div>
        </div>

        {setupSelesai && (() => {
          const trialDays = realTier === Tier.FREE ? trialDaysRemaining() : 0;
          const onTrial = trialDays > 0;
          const tier = onTrial ? Tier.PRO : realTier;
          const name = tier === Tier.PRO ? "PRO" : tier === Tier.PLUS ? "PLUS" : "FREE";
          const showLic = !onTrial && licDays !== null && tier !== Tier.FREE;
          const label = onTrial ? `Trial ${trialDays}h` : showLic ? `${name} · ${licDays}h` : name;
          const warn = (onTrial && trialDays <= 7) || (showLic && (licDays as number) <= 7);
          return (
            <button type="button" onClick={() => setActivePage(realTier === Tier.PRO ? PageName.PENGATURAN : PageName.UPGRADE)} className={`text-[0.65rem] px-[8px] py-[3px] rounded-full font-bold flex-shrink-0 mr-1 whitespace-nowrap cursor-pointer ${
              warn
                ? "bg-[#dc2626]/25 text-[#fecaca] border border-[#dc2626]/40"
                : tier === Tier.PRO
                ? "bg-[#f59e0b]/20 text-[#fbbf24] border border-[#f59e0b]/30"
                : tier === Tier.PLUS
                  ? "bg-[#0ea5a0]/20 text-[#5eead4] border border-[#0ea5a0]/30"
                  : "bg-white/10 text-white/60 border border-white/20"
            }`}>
              {label}
            </button>
          );
        })()}

        <div className="flex items-center gap-[5px] flex-shrink-0 relative">
          <SyncIndicator />
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
