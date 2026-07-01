import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { attendanceService } from "@/services/attendance.service";
import { studentRepo } from "@/repositories/dexie/student.repo";
import type { Student, AttendanceRecord } from "@/types/entities";
import { AttendanceStatus } from "@/types/enums";
import { DateNavigator } from "./DateNavigator";
import { StudentRow } from "./StudentRow";
import { StatusSheet } from "./StatusSheet";
import { RingkasanBar } from "@/components/layout/RingkasanBar";

export function PresensiPage() {
  const { activeClassroom, tanggalAktif } = useApp();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Map<number, AttendanceRecord>>(new Map());
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeClassroom) return;
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
  }, [activeClassroom, tanggalAktif]);

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
    toast(`✅ Status disimpan — ${labelMap[status]}`);
  };

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
      <div className="flex-1 px-[14px] pt-[14px] pb-[90px] lg:pb-4">
        <DateNavigator />

        {loading ? (
          <div className="text-center py-[30px] text-[var(--text-light)] text-[0.8rem]">
            Memuat...
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
              status={records.get(s.id)?.status || AttendanceStatus.HADIR}
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
