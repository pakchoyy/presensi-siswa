import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { attendanceService } from "@/services/attendance.service";
import { studentRepo } from "@/repositories/dexie/student.repo";
import type { Student, AttendanceRecord, Classroom } from "@/types/entities";
import { AttendanceStatus, CalendarEntryType, PageName } from "@/types/enums";
import { db } from "@/repositories/dexie/db";
import { DateNavigator } from "./DateNavigator";
import { StudentRow } from "./StudentRow";
import { StatusSheet } from "./StatusSheet";
import { RingkasanBar } from "@/components/layout/RingkasanBar";
import { academicYearRepo } from "@/repositories/dexie/academic-year.repo";
import { todayStr, isDayActive, recordIdFrom } from "@/lib/utils";
import { Info, ChevronDown, Plus, CalendarRange, Search, X, TrendingUp, QrCode } from "lucide-react";
const QrScanner = lazy(() => import("./QrScanner").then((m) => ({ default: m.QrScanner })));
import { isQrActive, isPjjActive, isKelasLocked, QR_MODE_EVENT } from "@/lib/features";
import { Lock } from "lucide-react";
import { Tier } from "@/types/enums";

const CLASS_COLORS = ["#0ea5a0", "#f59e0b", "#8b5cf6", "#ef4444", "#3b82f6", "#10b981", "#f97316", "#ec4899"];

const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  return !isDayActive(d.getDay());
}

export function PresensiPage() {
  const { activeClassroom, tanggalAktif, setActivePage, classrooms, setActiveClassroom, teacher, tier } = useApp();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Map<number, AttendanceRecord>>(new Map());
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [classDropdown, setClassDropdown] = useState(false);
  const [searchSiswa, setSearchSiswa] = useState("");
  const classRef = useRef<HTMLDivElement>(null);

  // Tren kehadiran bulan ini vs bulan lalu
  const [tren, setTren] = useState<{ label: string; p: number; labelPrev: string; pPrev: number; diff: number } | null>(null);

  // Academic year
  const [activeAy, setActiveAy] = useState<{ tanggalMulai: string; tanggalSelesai: string; semesterAktif: string } | null>(null);

  // Hari libur dari kalender (selain akhir pekan / hari non-aktif)
  const [liburKalender, setLiburKalender] = useState<string | null>(null);

  // State for "Sejak Awal Ajaran" ringkasan
  const [rekapAjaran, setRekapAjaran] = useState<Record<number, Record<string, number>> | null>(null);
  const [totalHariAjaran, setTotalHariAjaran] = useState(0);
  const [showRekapAjaran, setShowRekapAjaran] = useState(false);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [semesterOnly, setSemesterOnly] = useState(true);

  const [showQrScanner, setShowQrScanner] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ nama: string; status: string } | null>(null);
  const [, setForceUpdate] = useState(0);

  const isLibur = isWeekend(tanggalAktif) || !!liburKalender;
  const isSebelumPeriode = activeAy ? tanggalAktif < activeAy.tanggalMulai : false;
  const isSesudahPeriode = activeAy ? tanggalAktif > activeAy.tanggalSelesai : false;
  const diLuarPeriode = isSebelumPeriode || isSesudahPeriode;

  // Tombol "Scan QR" di navbar (Mode QR): buka pemindai begitu data kelas siap.
  const [scanReq, setScanReq] = useState(0);
  useEffect(() => {
    const onReq = () => setScanReq((n) => n + 1);
    window.addEventListener("bgy-open-scan", onReq);
    return () => window.removeEventListener("bgy-open-scan", onReq);
  }, []);
  useEffect(() => {
    // Hanya permintaan baru dari tombol navbar (maks. 8 detik) yang membuka kamera,
    // supaya menyalakan Mode QR di menu tidak ikut membuka pemindai.
    const at = Number(sessionStorage.getItem("bgy_open_scan") || 0);
    if (!at) return;
    if (Date.now() - at > 8000 || !isQrActive(tier)) { sessionStorage.removeItem("bgy_open_scan"); return; }
    if (!dataReady || loading) return;
    sessionStorage.removeItem("bgy_open_scan");
    if (!activeClassroom || students.length === 0) { toast("Belum ada siswa di kelas ini untuk di-scan"); return; }
    if (isLibur || diLuarPeriode) { toast("Hari ini bukan hari presensi"); return; }
    setLastScanned(null);
    setShowQrScanner(true);
  }, [scanReq, dataReady, loading, activeClassroom, students.length, isLibur, diLuarPeriode, tier]);
  const isAbsenMandiri = !!activeClassroom?.allowSiswaAbsenMandiri;
  // untuk kelas mandiri (siswa absen sendiri) jangan auto-Hadir, biar "belum absen" kelihatan
  const [autoHadirPref, setAutoHadirPref] = useState(() => localStorage.getItem("bgy_auto_hadir") !== "0");
  // Mode QR mematikan Auto Hadir; ikuti perubahannya tanpa perlu muat ulang.
  useEffect(() => {
    const sync = () => setAutoHadirPref(localStorage.getItem("bgy_auto_hadir") !== "0");
    window.addEventListener(QR_MODE_EVENT, sync);
    return () => window.removeEventListener(QR_MODE_EVENT, sync);
  }, []);
  const [tipSeen, setTipSeen] = useState(() => localStorage.getItem("bgy_tip_klik_seen") === "1");
  const autoHadir = !isAbsenMandiri && autoHadirPref;
  const toggleAutoHadir = () => {
    const next = !autoHadirPref;
    localStorage.setItem("bgy_auto_hadir", next ? "1" : "0");
    setAutoHadirPref(next);
  };
  const dismissTip = () => {
    localStorage.setItem("bgy_tip_klik_seen", "1");
    setTipSeen(true);
  };

  // Cek apakah tanggal aktif ditandai "Hari Libur" di kalender
  const loadLiburKalender = useCallback(async () => {
    if (!tanggalAktif) return;
    const libur = await db.calendarEntries
      .where("tanggal")
      .equals(tanggalAktif)
      .filter((e) => e.jenis === CalendarEntryType.HARI_LIBUR)
      .first();
    setLiburKalender(libur ? libur.keterangan || "Hari Libur" : null);
  }, [tanggalAktif]);

  useEffect(() => {
    loadLiburKalender();
  }, [loadLiburKalender]);

  const loadData = useCallback(async (silent = false) => {
    if (!activeClassroom || isLibur || diLuarPeriode) {
      setLoading(false);
      setDataReady(true);
      return;
    }
    
    if (!activeClassroom.id || !tanggalAktif) {
      console.error('loadData: missing required params', { activeClassroom, tanggalAktif });
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
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
    } catch (error) {
      console.error('loadData failed:', error);
      toast('Gagal memuat data presensi');
    } finally {
      setLoading(false);
      setDataReady(true);
    }
  }, [activeClassroom, tanggalAktif, isLibur, diLuarPeriode, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kelasLocked = isKelasLocked(activeClassroom?.id, classrooms, tier);

  useEffect(() => {
    const handleRealtimeUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.table && ["attendanceSessions", "attendanceRecords"].includes(detail.table)) {
        loadData(true);
      }
    };
    window.addEventListener("realtime-update", handleRealtimeUpdate);
    window.addEventListener("data-changed", handleRealtimeUpdate as EventListener);
    return () => {
      window.removeEventListener("realtime-update", handleRealtimeUpdate);
      window.removeEventListener("data-changed", handleRealtimeUpdate as EventListener);
    };
  }, [loadData]);

  // untuk kelas mandiri: polling 10 detik sebagai fallback kalau realtime belum aktif
  useEffect(() => {
    if (!isAbsenMandiri || isLibur || diLuarPeriode) return;
    const iv = setInterval(() => loadData(true), 10000);
    return () => clearInterval(iv);
  }, [isAbsenMandiri, isLibur, diLuarPeriode, loadData]);

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
      if (ay) setActiveAy({ tanggalMulai: ay.tanggalMulai, tanggalSelesai: ay.tanggalSelesai, semesterAktif: ay.semesterAktif });
    });
  }, []);

  const getRekapRange = useCallback((start: string, end: string, semester: string) => {
    const year = parseInt(start.split("-")[0]);
    const today = todayStr();
    let rangeStart = start;
    let rangeEnd = end < today ? end : today;
    if (semester === "Ganjil") {
      const s = `${year}-07-01`;
      const e = `${year}-12-31`;
      rangeStart = s > start ? s : start;
      rangeEnd = e < end ? e : end;
    } else if (semester === "Genap") {
      const s = `${year + 1}-01-01`;
      const e = `${year + 1}-06-30`;
      rangeStart = s > start ? s : start;
      rangeEnd = e < end ? e : end;
    }
    if (rangeEnd > today) rangeEnd = today;
    return { start: rangeStart, end: rangeEnd };
  }, []);

  const loadRekapAjaran = useCallback(async () => {
    if (!activeClassroom) return;
    setLoadingRekap(true);
    const ay = await academicYearRepo.getActive();
    if (!ay) { setLoadingRekap(false); return; }
    const today = todayStr();
    const range = semesterOnly
      ? getRekapRange(ay.tanggalMulai, ay.tanggalSelesai, ay.semesterAktif)
      : { start: ay.tanggalMulai, end: ay.tanggalSelesai < today ? ay.tanggalSelesai : today };
    const [data, totalHari] = await Promise.all([
      attendanceService.hitungRekapRentang(activeClassroom.id, range.start, range.end),
      attendanceService.hitungHariSekolah(activeClassroom.id, range.start, range.end),
    ]);
    setRekapAjaran(data);
    setTotalHariAjaran(totalHari);
    setLoadingRekap(false);
  }, [activeClassroom, semesterOnly, getRekapRange]);

  useEffect(() => {
    loadRekapAjaran();
  }, [loadRekapAjaran]);

  const handleSelectStatus = async (status: AttendanceStatus, catatan?: string) => {
    if (!selectedStudent || !sessionId || kelasLocked) return;

    await attendanceService.ubahStatus(
      sessionId,
      selectedStudent.id,
      status,
      catatan
    );

    setSelectedStudent(null);

    const updatedRecords = new Map(records);
    const existing = updatedRecords.get(selectedStudent.id);
    if (existing) {
      updatedRecords.set(selectedStudent.id, { ...existing, status });
    } else {
      updatedRecords.set(selectedStudent.id, {
        // Id deterministik, sama dengan yang dipakai ubahStatus saat disimpan
        id: recordIdFrom(sessionId, selectedStudent.id),
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
      T: "Terlambat",
    };
    toast(`Status disimpan — ${labelMap[status]}`);
  };

  const getStatus = (siswaId: number): AttendanceStatus | undefined => {
    if (autoHadir) return records.get(siswaId)?.status || AttendanceStatus.HADIR;
    return records.get(siswaId)?.status;
  };

  const getCatatan = (siswaId: number): string | undefined => records.get(siswaId)?.catatan;

  const handleQrScan = (payload: { studentId?: number; token?: string }, pickedStatus?: string) => {
    if (!sessionId || kelasLocked) return;
    const student = payload.token
      ? students.find((s) => s.absenToken === payload.token)
      : students.find((s) => s.id === payload.studentId);
    if (!student) {
      setLastScanned({ nama: "Siswa tidak ditemukan", status: "QR tidak cocok dengan kelas ini" });
      return;
    }
    const labelMap: Record<string, string> = { H: "Hadir", S: "Sakit", I: "Izin", A: "Alpha", T: "Terlambat" };
    const status = (pickedStatus as AttendanceStatus) || AttendanceStatus.HADIR;
    const existing = records.get(student.id)?.status;
    if (existing && !pickedStatus) {
      setLastScanned({ nama: student.nama, status: `Sudah tercatat: ${labelMap[existing]}` });
      return;
    }
    // Optimistic UI — update state dulu, simpan ke DB di background
    const updatedRecords = new Map(records);
    updatedRecords.set(student.id, {
      id: recordIdFrom(sessionId, student.id),
      sesiId: sessionId,
      siswaId: student.id,
      status,
      diubahPada: Date.now(),
    });
    setRecords(updatedRecords);
    setLastScanned({ nama: student.nama, status: `${labelMap[status]} ✓` });
    attendanceService.ubahStatus(sessionId, student.id, status).catch(() => { /* ignore */ });
  };

  // Filter siswa untuk pencarian
  const q = searchSiswa.trim().toLowerCase();
  const tampilSiswa = q
    ? students.filter((s) => s.nama.toLowerCase().includes(q))
    : students;

  // Hitung tren kehadiran bulan ini vs bulan lalu (% hadir)
  const loadTren = useCallback(async () => {
    if (!activeClassroom || students.length === 0) { setTren(null); return; }
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const s1 = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      const e1 = todayStr();
      const s2 = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-01`;
      const e2 = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-${pad(new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate())}`;
      const [r1, h1, r2, h2] = await Promise.all([
        attendanceService.hitungRekapRentang(activeClassroom.id, s1, e1),
        attendanceService.hitungHariSekolah(activeClassroom.id, s1, e1),
        attendanceService.hitungRekapRentang(activeClassroom.id, s2, e2),
        attendanceService.hitungHariSekolah(activeClassroom.id, s2, e2),
      ]);
      const sumH = (r: Record<number, Record<string, number>>) => {
        let H = 0;
        for (const st of students) H += r[st.id]?.H || 0;
        return H;
      };
      const p1 = h1 > 0 ? Math.round((sumH(r1) / (h1 * students.length)) * 100) : 0;
      const p2 = h2 > 0 ? Math.round((sumH(r2) / (h2 * students.length)) * 100) : 0;
      if (h1 === 0 && h2 === 0) { setTren(null); return; }
      setTren({
        label: BULAN_SINGKAT[now.getMonth()],
        p: p1,
        labelPrev: BULAN_SINGKAT[prev.getMonth()],
        pPrev: p2,
        diff: p1 - p2,
      });
    } catch {
      setTren(null);
    }
  }, [activeClassroom, students]);

  useEffect(() => {
    loadTren();
  }, [loadTren]);



  const activeIdx = activeClassroom
    ? classrooms.findIndex((c) => c.id === activeClassroom.id)
    : -1;
  const activeColor = activeIdx >= 0 ? CLASS_COLORS[activeIdx % CLASS_COLORS.length] : "#0ea5a0";

  const counts: Record<AttendanceStatus, number> = {
    [AttendanceStatus.HADIR]: 0,
    [AttendanceStatus.SAKIT]: 0,
    [AttendanceStatus.IZIN]: 0,
    [AttendanceStatus.ALPHA]: 0,
    [AttendanceStatus.TERLAMBAT]: 0,
  };

  // Hitung berdasarkan baris yang TAMPIL (daftar siswa aktif), bukan dari
  // record yang ada di DB. Saat auto-hadir AKTIF, siswa tanpa record dianggap
  // Hadir — sehingga RingkasanBar konsisten dengan daftar siswa.
  for (const st of students) {
    const status = records.get(st.id)?.status;
    const effective = autoHadir ? status || AttendanceStatus.HADIR : status;
    if (effective) counts[effective]++;
  }

  return (
    <>
      <div className="flex-1 px-[14px] pt-[14px] pb-[100px] lg:pb-4">
        <DateNavigator />

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
                      {isKelasLocked(cls.id, classrooms, tier) && <Lock size={12} className="inline ml-1 text-[var(--text-light)]" />}
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

        <div className="mb-3">
          <RingkasanBar counts={counts} />
        </div>

        {kelasLocked && (
          <div className="bg-[#fef3c7] border border-[#fbbf24] rounded-xl p-3 mb-3 flex items-center gap-2 text-[0.74rem] text-[#78350f]">
            <Lock size={15} className="flex-shrink-0" />
            <div className="flex-1">Paket FREE hanya bisa mengisi presensi <b>1 kelas</b>. Kelas ini bisa dilihat & direkap, tapi statusnya tidak bisa diubah.</div>
            <button onClick={() => setActivePage(PageName.UPGRADE)} className="px-[10px] py-[6px] rounded-lg bg-[#d97706] text-white font-bold text-[0.7rem] border-none cursor-pointer flex-shrink-0">Lihat Paket</button>
          </div>
        )}

        {/* QR mode help banner — one-time hint */}
        {activeClassroom && !isLibur && !diLuarPeriode && !loading && students.length > 0 && isQrActive(tier) && localStorage.getItem("bgy_qr_hint_seen") !== "1" && (
          <div className="bg-[rgba(14,165,160,0.08)] border border-[#0ea5a0]/30 rounded-xl p-3 mb-3 flex items-start gap-2">
            <QrCode size={16} className="text-[#0ea5a0] flex-shrink-0 mt-[2px]" />
            <div className="flex-1 text-[0.72rem] text-[var(--text)] leading-relaxed">
              <b>Mode QR aktif.</b> Cetak kartu QR di menu <b>Siswa</b>. Siswa scan pakai kamera HP sendiri untuk pilih status, atau guru ketuk tombol <b>Scan QR</b> di tengah navbar untuk tandai Hadir.
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                localStorage.setItem("bgy_qr_hint_seen", "1");
                setForceUpdate(f => f + 1);
              }}
              className="text-[var(--text-light)] text-[1rem] px-1 bg-transparent border-none cursor-pointer leading-none"
              aria-label="Tutup petunjuk"
            >
              ×
            </button>
          </div>
        )}

        {/* PJJ mode help banner — one-time hint */}
        {activeClassroom && !isLibur && !diLuarPeriode && !loading && students.length > 0 && isPjjActive(tier) && localStorage.getItem("bgy_pjj_hint_seen") !== "1" && (
          <div className="bg-[rgba(139,92,246,0.08)] border border-[#8b5cf6]/30 rounded-xl p-3 mb-3 flex items-start gap-2">
            <div className="flex-shrink-0 mt-[2px] text-[#8b5cf6]">💻</div>
            <div className="flex-1 text-[0.72rem] text-[var(--text)] leading-relaxed">
              <b>Mode PJJ aktif.</b> Aktifkan <b>Absen Mandiri</b> per kelas di menu <b>Siswa</b>, lalu bagikan link ke siswa — siswa absen sendiri dari rumah.
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                localStorage.setItem("bgy_pjj_hint_seen", "1");
                setForceUpdate(f => f + 1);
              }}
              className="text-[var(--text-light)] text-[1rem] px-1 bg-transparent border-none cursor-pointer leading-none"
              aria-label="Tutup petunjuk"
            >
              ×
            </button>
          </div>
        )}

        {/* Tren bulanan + rekap semester dalam satu baris */}
        {activeClassroom && !isLibur && (
          <div className="mb-3">
            <button
              onClick={() => setShowRekapAjaran(!showRekapAjaran)}
              className="w-full flex items-center gap-2 px-[10px] py-[9px] border border-[var(--border)] rounded-xl text-[0.72rem] font-semibold cursor-pointer"
              style={{ background: showRekapAjaran ? "var(--input-bg)" : "var(--card-bg)" }}
            >
              {tren ? (
                <span className="flex items-center gap-[5px] min-w-0">
                  <TrendingUp size={14} className="text-[#0ea5a0] flex-shrink-0" />
                  <span className="text-[var(--text-light)]">Kehadiran {tren.label}</span>
                  <b className="text-[#0ea5a0]">{tren.p}%</b>
                  {tren.pPrev > 0 && tren.diff !== 0 && (
                    <span style={{ color: tren.diff > 0 ? "#16a34a" : "#dc2626" }}>
                      {tren.diff > 0 ? "▲" : "▼"}{Math.abs(tren.diff)}%
                    </span>
                  )}
                </span>
              ) : (
                <CalendarRange size={14} className="text-[#0ea5a0]" />
              )}
              <span className="flex-1" />
              <span className="text-[var(--text)] truncate">
                {semesterOnly && activeAy ? `Semester ${activeAy.semesterAktif}` : "Tahun ajaran"}
              </span>
              {loadingRekap ? (
                <span className="w-4 h-4 border-2 border-[var(--border)] border-t-[#0ea5a0] rounded-full animate-spin" />
              ) : rekapAjaran ? (
                <span className="text-[0.68rem] text-[var(--text-light)]">· {totalHariAjaran} hari</span>
              ) : null}
              <ChevronDown size={13} className={`text-[var(--text-light)] transition-transform flex-shrink-0 ${showRekapAjaran ? "rotate-180" : ""}`} />
            </button>

            {showRekapAjaran && rekapAjaran && (
              <div className="mt-1 border border-[var(--border)] rounded-xl p-3 animate-fade-in" style={{ background: "var(--card-bg)" }}>
                {/* Semester/Tahun toggle */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => { if (!semesterOnly) { setSemesterOnly(true); } }}
                    className={`flex-1 py-[6px] rounded-[8px] text-[0.68rem] font-bold border cursor-pointer ${
                      semesterOnly
                        ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                        : "border-[var(--border)] bg-transparent text-[var(--text-light)]"
                    }`}
                  >
                    Semester {activeAy?.semesterAktif}
                  </button>
                  <button
                    onClick={() => { if (semesterOnly) { setSemesterOnly(false); } }}
                    className={`flex-1 py-[6px] rounded-[8px] text-[0.68rem] font-bold border cursor-pointer ${
                      !semesterOnly
                        ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                        : "border-[var(--border)] bg-transparent text-[var(--text-light)]"
                    }`}
                  >
                    Tahun Ajaran
                  </button>
                </div>
                {/* Overall summary */}
                {(() => {
                  const total = { H: 0, S: 0, I: 0, A: 0, T: 0 };
                  // Hanya akumulasi dari siswa yang tampil (aktif), bukan dari
                  // record siswa yang sudah dinonaktifkan (siswa "hantu")
                  for (const s of students) {
                    const r = rekapAjaran[s.id];
                    if (!r) continue;
                    total.H += r.H || 0;
                    total.S += r.S || 0;
                    total.I += r.I || 0;
                    total.A += r.A || 0;
                    total.T += (r as Record<string, number>).T || 0;
                  }
                  return (
                    <div className="flex flex-wrap gap-x-[10px] gap-y-[6px] mb-3 text-[11px] font-semibold">
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
                      <span className="flex items-center gap-[5px]">
                        <span className="w-2 h-2 rounded-full" style={{ background: "var(--terlambat)" }} /> Terlambat <b>{total.T}</b>
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
            {!tipSeen && (
              <div className="flex items-start gap-2 text-[0.7rem] text-[var(--text-light)] mb-2 pb-2 border-b border-[var(--border)]">
                <span className="flex-1">💡 <b className="text-[var(--text)]">Klik nama siswa</b> untuk mengubah status kehadirannya</span>
                <button onClick={dismissTip} aria-label="Tutup tips" className="bg-transparent border-none cursor-pointer text-[var(--text-light)] text-[1rem] leading-none px-1">×</button>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Info size={14} className="text-[var(--text-light)] flex-shrink-0" />
                <span className="text-[0.75rem] text-[var(--text)]">
                  {isAbsenMandiri ? "Isi hadir otomatis tidak berlaku untuk kelas absen mandiri" : "Isi hadir otomatis untuk semua siswa"}
                </span>
              </div>
              {!isAbsenMandiri && (
                <button
                  role="switch"
                  aria-checked={autoHadirPref}
                  aria-label="Isi hadir otomatis"
                  onClick={toggleAutoHadir}
                  className={`relative w-10 h-[22px] rounded-full border-none cursor-pointer flex-shrink-0 transition-colors ${autoHadirPref ? "bg-[#0ea5a0]" : "bg-[var(--border)]"}`}
                >
                  <span className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${autoHadirPref ? "left-[20px]" : "left-[2px]"}`} />
                </button>
              )}
            </div>
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
                : liburKalender
                  ? `Tidak ada presensi · ${liburKalender}`
                  : "Tidak ada presensi (hari libur / tidak aktif)"
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
          <>
            {students.length > 5 && (
              <div className="bg-[var(--card-bg)] border-[1.5px] border-[#0ea5a0]/40 rounded-xl mb-3 flex items-center gap-2 px-3 shadow-[0_0_0_3px_rgba(14,165,160,0.06)]">
                <Search size={16} className="text-[#0ea5a0] flex-shrink-0" />
                <input
                  type="text"
                  value={searchSiswa}
                  onChange={(e) => setSearchSiswa(e.target.value)}
                  placeholder={`Cari siswa (${students.length} siswa)...`}
                  className="flex-1 bg-transparent border-none outline-none py-[11px] text-[0.85rem] text-[var(--text)] font-[inherit] min-w-0"
                />
                {searchSiswa && (
                  <button
                    onClick={() => setSearchSiswa("")}
                    className="p-1 cursor-pointer bg-transparent border-none flex-shrink-0"
                    title="Hapus pencarian"
                  >
                    <X size={15} className="text-[var(--text-light)]" />
                  </button>
                )}
              </div>
            )}
            {tampilSiswa.length === 0 ? (
              <div className="text-center py-[20px] text-[var(--text-light)] text-[0.78rem]">
                Tidak ada siswa yang cocok dengan "{searchSiswa}"
              </div>
            ) : (
              tampilSiswa.map((s, i) => (
                <StudentRow
                  key={s.id}
                  student={s}
                  index={i}
                  status={getStatus(s.id)}
                  catatan={getCatatan(s.id)}
                  onClick={() => { if (kelasLocked) { toast("Kelas ini terkunci di paket FREE"); return; } setSelectedStudent(s); }}
                />
              ))
            )}
          </>
        )}

        <StatusSheet
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onSelect={handleSelectStatus}
          studentName={selectedStudent?.nama || ""}
          initialCatatan={selectedStudent ? getCatatan(selectedStudent.id) : undefined}
        />
      </div>

      {showQrScanner && (
        <Suspense fallback={null}>
          <QrScanner
            onScan={handleQrScan}
            onClose={() => setShowQrScanner(false)}
            lastScanned={lastScanned}
            pickerMode={localStorage.getItem("bgy_qr_picker") === "1"}
          />
        </Suspense>
      )}
    </>
  );
}
