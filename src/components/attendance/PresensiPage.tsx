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
import { academicYearRepo } from "@/repositories/dexie/academic-year.repo";
import { todayStr } from "@/lib/utils";
import { Info, ChevronDown, Plus, CalendarRange } from "lucide-react";

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

  // Academic year
  const [activeAy, setActiveAy] = useState<{ tanggalMulai: string; tanggalSelesai: string } | null>(null);

  // State for "Sejak Awal Ajaran" ringkasan
  const [rekapAjaran, setRekapAjaran] = useState<Record<number, Record<string, number>> | null>(null);
  const [totalHariAjaran, setTotalHariAjaran] = useState(0);
  const [showRekapAjaran, setShowRekapAjaran] = useState(false);
  const [loadingRekap, setLoadingRekap] = useState(false);

  const hariAktif = (localStorage.getItem("bgy_hari_aktif") as HariAktif) || HariAktif.SENIN_SABTU;
  const isLibur = isWeekend(tanggalAktif, hariAktif);
  const isSebelumPeriode = activeAy ? tanggalAktif < activeAy.tanggalMulai : false;
  const isSesudahPeriode = activeAy ? tanggalAktif > activeAy.tanggalSelesai : false;
  const diLuarPeriode = isSebelumPeriode || isSesudahPeriode;
  const autoHadir = localStorage.getItem("bgy_auto_hadir") !== "0";

  const loadData = useCallback(async () => {
    if (!activeClassroom || isLibur || diLuarPeriode) return;
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
  }, [activeClassroom, tanggalAktif, isLibur, diLuarPeriode]);

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

  useEffect(() => {
    academicYearRepo.getActive().then((ay) => {
      if (ay) setActiveAy({ tanggalMulai: ay.tanggalMulai, tanggalSelesai: ay.tanggalSelesai });
    });
  }, []);

  const loadRekapAjaran = useCallback(async () => {
    if (!activeClassroom) return;
    setLoadingRekap(true);
    const ay = await academicYearRepo.getActive();
    if (!ay) { setLoadingRekap(false); return; }
    const today = todayStr();
    const [data, totalHari] = await Promise.all([
      attendanceService.hitungRekapRentang(activeClassroom.id, ay.tanggalMulai, today),
      attendanceService.hitungHariSekolah(activeClassroom.id, ay.tanggalMulai, today),
    ]);
    setRekapAjaran(data);
    setTotalHariAjaran(totalHari);
    setLoadingRekap(false);
  }, [activeClassroom]);

  useEffect(() => {
    loadRekapAjaran();
  }, [loadRekapAjaran]);

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
      <div className="flex-1 px-[14px] pt-[14px] pb-[130px] lg:pb-4">
        <DateNavigator />

        <div className="mb-3 lg:hidden">
          <RingkasanBar counts={counts} />
        </div>

        <div className="hidden lg:block mb-3">
          <RingkasanBar counts={counts} />
        </div>

        {/* Sejak Awal Ajaran */}
        {activeClassroom && !isLibur && (
          <div className="mb-3">
            <button
              onClick={() => { if (!showRekapAjaran && !rekapAjaran) loadRekapAjaran(); setShowRekapAjaran(!showRekapAjaran); }}
              className="w-full flex items-center gap-2 px-[10px] py-[8px] border border-[var(--border)] rounded-xl text-[0.72rem] font-semibold cursor-pointer"
              style={{ background: showRekapAjaran ? "var(--input-bg)" : "var(--card-bg)" }}
            >
              <CalendarRange size={14} className="text-[#0ea5a0]" />
              <span className="text-[var(--text)] flex-1 text-left">Sejak Awal Ajaran</span>
              {loadingRekap ? (
                <span className="w-4 h-4 border-2 border-[var(--border)] border-t-[#0ea5a0] rounded-full animate-spin" />
              ) : rekapAjaran ? (
                <span className="text-[0.68rem] text-[var(--text-light)]">{totalHariAjaran} hari</span>
              ) : null}
              <ChevronDown size={13} className={`text-[var(--text-light)] transition-transform ${showRekapAjaran ? "rotate-180" : ""}`} />
            </button>

            {showRekapAjaran && rekapAjaran && (
              <div className="mt-1 border border-[var(--border)] rounded-xl p-3 animate-fade-in" style={{ background: "var(--card-bg)" }}>
                {/* Overall summary */}
                {(() => {
                  const total = { H: 0, S: 0, I: 0, A: 0 };
                  for (const r of Object.values(rekapAjaran)) {
                    total.H += r.H || 0;
                    total.S += r.S || 0;
                    total.I += r.I || 0;
                    total.A += r.A || 0;
                  }
                  return (
                    <div className="flex flex-nowrap gap-[10px] justify-between mb-3 text-[11px] font-semibold">
                      <span className="flex items-center gap-[5px]">
                        <span className="w-2 h-2 rounded-full" style={{ background: "var(--hadir)" }} /> Hadir <b>{total.H}</b>
                      </span>
                      <span className="flex items-center gap-[5px]">
                        <span className="w-2 h-2 rounded-full" style={{ background: "var(--sakit)" }} /> Sakit <b>{total.S}</b>
                      </span>
                      <span className="flex items-center gap-[5px]">
                        <span className="w-2 h-2 rounded-full" style={{ background: "var(--izin)" }} /> Izin <b>{total.I}</b>
                      </span>
                      <span className="flex items-center gap-[5px]">
                        <span className="w-2 h-2 rounded-full" style={{ background: "var(--alpha)" }} /> Alpha <b>{total.A}</b>
                      </span>
                    </div>
                  );
                })()}

                {/* Per-student breakdown */}
                <div className="max-h-[200px] overflow-y-auto space-y-[3px]">
                  {students.map((s) => {
                    const r = rekapAjaran[s.id];
                    if (!r) return null;
                    const totalSiswa = totalHariAjaran;
                    const hadir = r.H || 0;
                    const alpha = r.A || 0;
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-[0.68rem]">
                        <span className="flex-1 truncate">{s.nama}</span>
                        <span className="text-[var(--hadir)] font-semibold">{hadir}/{totalSiswa}</span>
                        {alpha > 0 && <span className="text-[var(--alpha)] font-semibold">A:{alpha}</span>}
                        <div className="w-16 h-[5px] rounded-full bg-[var(--border)] overflow-hidden flex-shrink-0">
                          <div className="h-full rounded-full bg-[var(--hadir)]" style={{ width: `${totalSiswa > 0 ? (hadir / totalSiswa) * 100 : 0}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

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
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-lg z-[100] py-1 animate-slide-down">
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

        {isLibur || diLuarPeriode ? (
          <div className="text-center py-[40px]">
            <div className="text-[2.5rem] mb-2">📅</div>
            <div className="text-[0.95rem] font-bold text-[var(--text-light)]">
              {diLuarPeriode ? "Di Luar Periode Ajaran" : "Hari Libur"}
            </div>
            <div className="text-[0.75rem] text-[var(--text-light)] mt-1">
              {diLuarPeriode
                ? (isSebelumPeriode
                    ? `Periode ajaran dimulai ${activeAy?.tanggalMulai}`
                    : `Periode ajaran berakhir ${activeAy?.tanggalSelesai}`)
                : (hariAktif === HariAktif.SENIN_JUMAT ? "Sabtu & Minggu tidak ada presensi" : "Minggu tidak ada presensi")
              }
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
