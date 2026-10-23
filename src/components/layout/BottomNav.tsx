import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { PageName, Tier } from "@/types/enums";
import {
  ClipboardCheck,
  BarChart3,
  Users,
  Calendar,
  Settings,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { QrScanner } from "@/components/attendance/QrScanner";
import { attendanceService } from "@/services/attendance.service";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { AttendanceStatus } from "@/types/enums";
import { useToast } from "@/components/shared/Toast";
import { canUse, isKelasLocked } from "@/lib/features";
import type { Student, AttendanceRecord } from "@/types/entities";

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
  { page: PageName.PENGATURAN, label: "Pengaturan", icon: Settings },
];

export function BottomNav() {
  const { activePage, setActivePage, setupSelesai, activeClassroom, classrooms, tanggalAktif, tier: appTier } = useApp();
  const { toast } = useToast();
  const [showQr, setShowQr] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ nama: string; status: string } | null>(null);
  const [qrMode, setQrMode] = useState(localStorage.getItem("bgy_qr_mode") === "1");
  const [pickerMode, setPickerMode] = useState(localStorage.getItem("bgy_qr_picker") === "1");

  // Cache students + session in refs so each scan is instant (no DB roundtrip)
  const studentsCache = useRef<Student[] | null>(null);
  const sessionIdCache = useRef<number | null>(null);
  const recordsCache = useRef<Map<number, AttendanceRecord>>(new Map());

  useEffect(() => {
    const handler = () => {
      setQrMode(localStorage.getItem("bgy_qr_mode") === "1");
      setPickerMode(localStorage.getItem("bgy_qr_picker") === "1");
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Prewarm cache when scanner opens
  useEffect(() => {
    if (!showQr || !activeClassroom || !tanggalAktif) return;
    studentsCache.current = null;
    sessionIdCache.current = null;
    recordsCache.current = new Map();
    (async () => {
      try {
        const [students, result] = await Promise.all([
          studentRepo.getByClass(activeClassroom.id),
          attendanceService.bukaSesiPresensi(activeClassroom.id, tanggalAktif),
        ]);
        studentsCache.current = students;
        sessionIdCache.current = result.session.id;
        recordsCache.current = new Map(result.records.map((r) => [r.siswaId, r]));
      } catch { /* silent */ }
    })();
  }, [showQr, activeClassroom, tanggalAktif]);

  if (!setupSelesai) return null;

  const tier = appTier;
  const canScan = canUse("qr_mode", tier);

  const handleQrScan = async (payload: { studentId?: number; token?: string }, pickedStatus?: string) => {
    if (!activeClassroom || !tanggalAktif) return;
    if (isKelasLocked(activeClassroom.id, classrooms, tier)) {
      setLastScanned({ nama: "Kelas terkunci", status: "Paket FREE hanya 1 kelas" });
      return;
    }
    // Fallback: kalau cache belum siap, load on-the-fly
    let students = studentsCache.current;
    let sessionId = sessionIdCache.current;
    if (!students || !sessionId) {
      const [s, result] = await Promise.all([
        studentRepo.getByClass(activeClassroom.id),
        attendanceService.bukaSesiPresensi(activeClassroom.id, tanggalAktif),
      ]);
      students = s;
      sessionId = result.session.id;
      studentsCache.current = students;
      sessionIdCache.current = sessionId;
      recordsCache.current = new Map(result.records.map((r) => [r.siswaId, r]));
    }
    const student = payload.token
      ? students.find((s) => s.absenToken === payload.token)
      : students.find((s) => s.id === payload.studentId);
    if (!student) {
      setLastScanned({ nama: "Tidak ditemukan", status: "Siswa bukan dari kelas ini" });
      return;
    }
    const labelMap: Record<string, string> = { H: "Hadir", S: "Sakit", I: "Izin", A: "Alpha", T: "Terlambat" };
    const status = (pickedStatus as AttendanceStatus) || AttendanceStatus.HADIR;
    const existing = recordsCache.current.get(student.id);
    if (existing && !pickedStatus) {
      setLastScanned({ nama: student.nama, status: `Sudah: ${labelMap[existing.status]}` });
      return;
    }
    // Optimistic UI — tampilkan feedback dulu, simpan di background
    setLastScanned({ nama: student.nama, status: `${labelMap[status]} ✓` });
    toast(`${student.nama} — ${labelMap[status]}`);
    attendanceService.ubahStatus(sessionId, student.id, status).then((rec) => {
      recordsCache.current.set(student.id, rec);
    }).catch(() => { /* ignore */ });
  };

  const filteredItems = NAV_ITEMS;
  const midIndex = Math.floor(filteredItems.length / 2);

  return (
    <>
      <nav
        className="lg:hidden fixed left-1/2 bottom-0 -translate-x-1/2 w-full max-w-app bg-[var(--card-bg)] border-t border-[var(--border)] flex items-end z-[300] py-[6px] px-1"
        style={{ boxShadow: "0 -2px 12px rgba(0,0,0,.08)" }}
      >
        {filteredItems.map((item, i) => {
          const isActive = activePage === item.page;

          const buttons = [(
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
          )];

          if (qrMode && canScan && i === midIndex) {
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
          pickerMode={pickerMode}
        />
      )}
    </>
  );
}
