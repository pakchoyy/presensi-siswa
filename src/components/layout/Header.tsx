import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { LogoUpload } from "@/components/shared/LogoUpload";
import { DropdownMenu } from "@/components/layout/DropdownMenu";
import { SyncIndicator } from "@/components/layout/SyncIndicator";
import { LicenseExpiryBadge } from "@/components/layout/LicenseExpiryBadge";
import { Moon, Sun, Menu } from "lucide-react";
import { formatTanggalPendek } from "@/lib/utils";

export function Header() {
  const { activePage, activeClassroom, tanggalAktif, darkMode, toggleDarkMode, setupSelesai } =
    useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  let subtitle = "| Presensi Siswa";
  let sub = "";

  if (!setupSelesai) {
    subtitle = "";
    sub = "Selamat datang di BGY Presensi";
  } else if (activePage === "presensi") {
    subtitle = "| Presensi Siswa";
    sub = `${activeClassroom?.nama || ""} \u2022 ${formatTanggalPendek(tanggalAktif)}`;
  } else if (activePage === "rekap") {
    subtitle = "| Rekap Presensi";
    sub = activeClassroom?.nama || "";
  } else if (activePage === "siswa") {
    subtitle = "| Manajemen Siswa";
    sub = activeClassroom?.nama || "";
  } else if (activePage === "kalender") {
    subtitle = "| Kalender Akademik";
    sub = activeClassroom?.nama || "";
  } else if (activePage === "petunjuk") {
    subtitle = "| Petunjuk";
  } else if (activePage === "tentang") {
    subtitle = "| Tentang & Kontak";
  } else if (activePage === "pengaturan") {
    subtitle = "| Pengaturan";
  } else if (activePage === "backup") {
    subtitle = "| Backup & Restore";
  }

  return (
    <header
      className="sticky top-0 z-[300] px-4"
      style={{
        background: darkMode
          ? "linear-gradient(135deg, #0d4a47, #1a3a4a)"
          : "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)",
        boxShadow: "0 2px 10px rgba(0,0,0,.18)",
      }}
    >
      <div className="flex items-center justify-between h-14">
        <div className="flex items-center gap-[10px] flex-1 min-w-0">
          <LogoUpload />
          <div className="min-w-0">
            <div className="text-[0.85rem] font-extrabold text-white whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
              {setupSelesai ? `Bantu Guru Yuk ${subtitle}` : "Setup Awal"}
            </div>
            {sub && (
              <div className="text-[0.62rem] text-white/70 font-medium mt-[1px] whitespace-nowrap overflow-hidden text-ellipsis">
                {sub}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-[6px] flex-shrink-0 relative">
          <SyncIndicator />
          <LicenseExpiryBadge />
          <button
            onClick={toggleDarkMode}
            className="h-8 w-[34px] rounded-lg border-[1.5px] border-white/30 bg-white/10 text-white flex items-center justify-center flex-shrink-0 active:bg-white/25 cursor-pointer"
            title="Mode gelap/terang"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {setupSelesai && (
            <>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="h-8 w-[34px] rounded-lg border-[1.5px] border-white/30 bg-white/10 text-white flex items-center justify-center flex-shrink-0 active:bg-white/25 cursor-pointer"
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
