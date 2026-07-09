import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { attendanceService } from "@/services/attendance.service";
import { studentRepo } from "@/repositories/dexie/student.repo";
import type { Student, AttendanceRecord, Classroom } from "@/types/entities";
import { AttendanceStatus, HariAktif, PageName } from "@/types/enums";
import { DateNavigator } from "./DateNavigator";
import { StudentRow } from "./StudentRow";
import { StatusSheet } from "./StatusSheet";
import { RingkasanBar } from "@/components/layout/RingkasanBar";
import { Info, ChevronDown, Plus } from "lucide-react";

const CLASS_COLORS = ["#0ea5a0", "#f59e0b", "#8b5cf6", "#ef4444", "#3b82f6", "#10b981", "#f97316", "#ec4899"];

function isWeekend(dateStr: string, hariAktif: HariAktif): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  if (hariAktif === HariAktif.SENIN_JUMAT) return day === 0 || day === 6;
  return day === 0;
}

export function PresensiPage() {
  const { activeClassroom, tanggalAktif, setActivePage, classrooms, setActiveClassroom } = useApp();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Map<number, AttendanceRecord>>(new Map());
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [classDropdown, setClassDropdown] = useState(false);
  const classRef = useRef<HTMLDivElement>(null);

  const hariAktif = (localStorage.getItem("bgy_hari_aktif") as HariAktif) || HariAktif.SENIN_SABTU;
  const isLibur = isWeekend(tanggalAktif, hariAktif);
  const autoHadir = localStorage.getItem("bgy_auto_hadir") !== "0";

  const loadData = useCallback(async () => {
    if (!activeClassroom || isLibur) return;
    setLoading(true);

    const [siswa, result] = await Promise.all([
      studentRepo.getByClass(activeClassroom.id),
      attendanceService.bukaSesiPresensi(activeClassroom.id, tanggalAktif),
    ]);

    setStudents(siswa);
    setSessionId(result.session.id);

    const map = new Map<number, AttendanceRecord>();
    for (const r of result.records) {
      map.set(r.siswaId, r);
    }
    setRecords(map);
    setLoading(false);
  }, [activeClassroom, tanggalAktif, isLibur]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (classRef.current && !classRef.current.contains(e.target as Node)) {
        setClassDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelectStatus = async (status: AttendanceStatus) => {
    if (!selectedStudent || !sessionId) return;

    await attendanceService.ubahStatus(
      sessionId,
      selectedStudent.id,
      status
    );

    setSelectedStudent(null);

    const updatedRecords = new Map(records);
    const existing = updatedRecords.get(selectedStudent.id);
    if (existing) {
      updatedRecords.set(selectedStudent.id, { ...existing, status });
    } else {
      updatedRecords.set(selectedStudent.id, {
        id: 0,
        sesiId: sessionId,
        siswaId: selectedStudent.id,
        status,
        diubahPada: Date.now(),
      });
    }
    setRecords(updatedRecords);

    const labelMap: Record<string, string> = {
      H: "Hadir",
      S: "Sakit",
      I: "Izin",
      A: "Alpha",
    };
    toast(`Status disimpan — ${labelMap[status]}`);
  };

  const getStatus = (siswaId: number): AttendanceStatus | undefined => {
    if (autoHadir) return records.get(siswaId)?.status || AttendanceStatus.HADIR;
    return records.get(siswaId)?.status;
  };



  const activeIdx = activeClassroom
    ? classrooms.findIndex((c) => c.id === activeClassroom.id)
    : -1;
  const activeColor = activeIdx >= 0 ? CLASS_COLORS[activeIdx % CLASS_COLORS.length] : "#0ea5a0";

  const counts: Record<AttendanceStatus, number> = {
    [AttendanceStatus.HADIR]: 0,
    [AttendanceStatus.SAKIT]: 0,
    [AttendanceStatus.IZIN]: 0,
    [AttendanceStatus.ALPHA]: 0,
  };

  for (const r of records.values()) {
    counts[r.status]++;
  }

  return (
    <>
      <RingkasanBar counts={counts} />
      <div className="flex-1 px-[14px] pt-[14px] pb-[130px] lg:pb-4">
        <DateNavigator />

        {!isLibur && !loading && students.length > 0 && (
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-3 mb-3">
            <div className="text-[0.7rem] text-[var(--text-light)] mb-2">
              💡 <b className="text-[var(--text)]">Klik nama siswa</b> untuk edit status kehadiran siswa
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-[var(--text-light)]" />
                <span className="text-[0.75rem] text-[var(--text)]">
                  Auto isi hadir semua siswa: <b className={autoHadir ? "text-[#0ea5a0]" : "text-[var(--text-light)]"}>{autoHadir ? "AKTIF" : "NONAKTIF"}</b>
                </span>
              </div>
              <button
                onClick={() => setActivePage(PageName.PENGATURAN)}
                className="text-[0.7rem] text-[#0ea5a0] font-semibold bg-transparent border-none cursor-pointer hover:underline"
              >
                Ubah
              </button>
            </div>
          </div>
        )}

        {classrooms.length > 1 && (
          <div className="relative mb-3" ref={classRef}>
            <button
              onClick={() => setClassDropdown(!classDropdown)}
              className="flex items-center gap-2 w-full px-[10px] py-[9px] bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-[0.78rem] font-semibold cursor-pointer"
              style={{ borderLeft: `4px solid ${activeColor}`, background: `${activeColor}0d` }}
            >
              <span style={{ color: activeColor }}>{activeClassroom?.nama}</span>
              <ChevronDown size={14} className="ml-auto text-[var(--text-light)]" />
            </button>
            {classDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-lg z-20 py-1 animate-slide-down">
                {classrooms.map((cls, i) => {
                  const cc = CLASS_COLORS[i % CLASS_COLORS.length];
                  const isActive = activeClassroom?.id === cls.id;
                  return (
                    <button
                      key={cls.id}
                      onClick={() => { setActiveClassroom(cls); setClassDropdown(false); }}
                      className="block w-full text-left px-[14px] py-[9px] text-[0.8rem] font-semibold cursor-pointer border-none hover:opacity-90"
                      style={{ borderLeft: `4px solid ${cc}`, background: isActive ? `${cc}1a` : "transparent" }}
                    >
                      <span style={{ color: isActive ? cc : undefined }}>{cls.nama}</span>
                      {isActive && <span style={{ color: cc }}> ✓</span>}
                    </button>
                  );
                })}
                <div className="border-t border-[var(--border)] mt-1 pt-1">
                  <button
                    onClick={() => { setActivePage(PageName.SISWA); setClassDropdown(false); }}
                    className="flex items-center gap-1 w-full text-left px-[14px] py-[9px] text-[0.75rem] font-semibold text-[#0ea5a0] cursor-pointer border-none bg-transparent hover:bg-[var(--input-bg)]"
                  >
                    <Plus size={13} /> Tambah Kelas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {isLibur ? (
          <div className="text-center py-[40px]">
            <div className="text-[2.5rem] mb-2">📅</div>
            <div className="text-[0.95rem] font-bold text-[var(--text-light)]">Hari Libur</div>
            <div className="text-[0.75rem] text-[var(--text-light)] mt-1">
              {hariAktif === HariAktif.SENIN_JUMAT ? "Sabtu & Minggu tidak ada presensi" : "Minggu tidak ada presensi"}
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-[30px] text-[var(--text-light)] text-[0.8rem]">
            <div className="inline-block w-8 h-8 border-[3px] border-[var(--border)] border-t-[#0ea5a0] rounded-full animate-spin mb-2" />
            <div>Memuat...</div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-[30px] text-[var(--text-light)] text-[0.8rem]">
            Belum ada siswa. Tambah siswa di menu Siswa.
          </div>
        ) : (
          students.map((s, i) => (
            <StudentRow
              key={s.id}
              student={s}
              index={i}
              status={getStatus(s.id)}
              onClick={() => setSelectedStudent(s)}
            />
          ))
        )}

        <StatusSheet
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onSelect={handleSelectStatus}
          studentName={selectedStudent?.nama || ""}
        />
      </div>
    </>
  );
}
