import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { attendanceService } from "@/services/attendance.service";
import { studentRepo } from "@/repositories/dexie/student.repo";
import type { Student, AttendanceRecord } from "@/types/entities";
import { AttendanceStatus, HariAktif } from "@/types/enums";
import { DateNavigator } from "./DateNavigator";
import { StudentRow } from "./StudentRow";
import { StatusSheet } from "./StatusSheet";
import { RingkasanBar } from "@/components/layout/RingkasanBar";
import { Info, Zap } from "lucide-react";

function isWeekend(dateStr: string, hariAktif: HariAktif): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  if (hariAktif === HariAktif.SENIN_JUMAT) return day === 0 || day === 6;
  return day === 0;
}

export function PresensiPage() {
  const { activeClassroom, tanggalAktif } = useApp();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Map<number, AttendanceRecord>>(new Map());
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoFill, setAutoFill] = useState(false);

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

  const handleAutoFill = async () => {
    if (!sessionId || students.length === 0) return;

    const updatedRecords = new Map(records);
    let count = 0;

    for (const student of students) {
      const existing = updatedRecords.get(student.id);
      if (!existing) {
        await attendanceService.ubahStatus(
          sessionId,
          student.id,
          AttendanceStatus.HADIR
        );
        updatedRecords.set(student.id, {
          id: 0,
          sesiId: sessionId,
          siswaId: student.id,
          status: AttendanceStatus.HADIR,
          diubahPada: Date.now(),
        });
        count++;
      }
    }

    setRecords(updatedRecords);
    if (count > 0) {
      toast(`✅ ${count} siswa ditandai hadir`);
    }
  };

  useEffect(() => {
    if (autoFill && students.length > 0 && sessionId) {
      handleAutoFill();
    }
  }, [autoFill, students, sessionId]);

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

        {!isLibur && students.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-[6px] bg-[rgba(14,165,160,0.06)] border border-[#0ea5a0]/20 rounded-lg px-[10px] py-[7px] mb-[10px] text-[0.68rem] text-[var(--text-light)]">
              <div className="flex items-center gap-[6px]">
                <Info size={13} className="text-[#0ea5a0] flex-shrink-0" />
                <span>
                  {autoHadir
                    ? <>Semua otomatis <b className="text-[var(--text)]">Hadir</b> — klik yang Sakit/Izin/Alpha</>
                    : <>Klik tiap siswa, pilih status <b className="text-[var(--text)]">Hadir/Sakit/Izin/Alpha</b></>
                  }
                </span>
              </div>
              <span className={`text-[0.62rem] font-bold px-[6px] py-[2px] rounded-full flex-shrink-0 ${autoHadir ? "bg-[#0ea5a0]/10 text-[#0ea5a0]" : "bg-[var(--border)] text-[var(--text-light)]"}` }>
                {autoHadir ? "Auto" : "Manual"}
              </span>
            </div>
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-[#f59e0b]" />
                  <span className="text-[0.8rem] font-semibold text-[var(--text)]">
                    Auto isi hadir
                  </span>
                </div>
                <button
                  onClick={() => setAutoFill(!autoFill)}
                  className={`relative w-[44px] h-[24px] rounded-full transition-colors cursor-pointer border-none ${
                    autoFill ? "bg-[#0ea5a0]" : "bg-[var(--input-bg)]"
                  }`}
                >
                  <div
                    className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-transform ${
                      autoFill ? "translate-x-[22px]" : "translate-x-[2px]"
                    }`}
                    style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}
                  />
                </button>
              </div>
            </div>
          </>
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
