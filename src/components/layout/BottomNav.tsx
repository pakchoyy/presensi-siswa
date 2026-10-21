import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { PageName } from "@/types/enums";
import {
  ClipboardCheck,
  BarChart3,
  Users,
  Calendar,
  ArrowUpCircle,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { QrScanner } from "@/components/attendance/QrScanner";
import { attendanceService } from "@/services/attendance.service";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { AttendanceStatus } from "@/types/enums";
import { recordIdFrom } from "@/lib/utils";
import { useToast } from "@/components/shared/Toast";

interface NavItemData {
  page: PageName;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItemData[] = [
  { page: PageName.PRESENSI, label: "Presensi", icon: ClipboardCheck },
  { page: PageName.REKAP, label: "Rekap", icon: BarChart3 },
  { page: PageName.SISWA, label: "Siswa", icon: Users },
  { page: PageName.KALENDER, label: "Kalender", icon: Calendar },
  { page: PageName.UPGRADE, label: "Upgrade", icon: ArrowUpCircle },
];

export function BottomNav() {
  const { activePage, setActivePage, setupSelesai, teacher, activeClassroom, tanggalAktif } = useApp();
  const { toast } = useToast();
  const [showQr, setShowQr] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ nama: string; status: string } | null>(null);

  if (!setupSelesai) return null;

  const isPRO = teacher?.tier === "PRO";
  const qrMode = localStorage.getItem("bgy_qr_mode") === "1";

  const handleQrScan = async (studentId: number) => {
    if (!activeClassroom || !tanggalAktif) return;
    const students = await studentRepo.getByClass(activeClassroom.id);
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      setLastScanned({ nama: "Tidak ditemukan", status: "Siswa bukan dari kelas ini" });
      return;
    }
    const result = await attendanceService.bukaSesiPresensi(activeClassroom.id, tanggalAktif);
    const existing = result.records.find((r) => r.siswaId === studentId);
    if (existing) {
      const labelMap: Record<string, string> = { H: "Hadir", S: "Sakit", I: "Izin", A: "Alpha", T: "Terlambat" };
      setLastScanned({ nama: student.nama, status: `Sudah: ${labelMap[existing.status]}` });
      return;
    }
    await attendanceService.ubahStatus(result.session.id, studentId, AttendanceStatus.HADIR);
    setLastScanned({ nama: student.nama, status: "Hadir ✓" });
    toast(`${student.nama} — Hadir`);
  };

  const filteredItems = NAV_ITEMS.filter(item => {
    if (item.page === PageName.UPGRADE && isPRO) return false;
    return true;
  });

  const midIndex = Math.floor(filteredItems.length / 2);

  return (
    <>
      <nav
        className="lg:hidden fixed left-1/2 bottom-0 -translate-x-1/2 w-full max-w-app bg-[var(--card-bg)] border-t border-[var(--border)] flex items-end z-[300] py-[6px] px-1"
        style={{ boxShadow: "0 -2px 12px rgba(0,0,0,.08)" }}
      >
        {filteredItems.map((item, i) => {
          const isActive = activePage === item.page;
          const isUpgrade = item.page === PageName.UPGRADE;

          const buttons = [(
            <button
              key={item.page}
              onClick={() => setActivePage(item.page)}
              className={`flex-1 flex flex-col items-center gap-[2px] py-[6px] px-[2px] rounded-[10px] cursor-pointer bg-transparent border-none font-[inherit] ${
                isActive ? (isUpgrade ? "text-[#f59e0b]" : "text-[#0ea5a0]") : "text-[var(--text-light)]"
              }`}
            >
              <item.icon size={19} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          )];

          if (qrMode && i === midIndex) {
            buttons.unshift(
              <button
                key="qr-scan"
                onClick={() => { setLastScanned(null); setShowQr(true); }}
                className="flex flex-col items-center justify-center -mt-4 mx-1"
              >
                <div
                  className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
                >
                  <QrCode size={24} />
                </div>
                <span className="text-[9px] font-bold text-[#0ea5a0] mt-[2px]">Scan</span>
              </button>
            );
          }

          return buttons;
        })}
      </nav>

      {showQr && (
        <QrScanner
          onScan={handleQrScan}
          onClose={() => setShowQr(false)}
          lastScanned={lastScanned}
        />
      )}
    </>
  );
}
