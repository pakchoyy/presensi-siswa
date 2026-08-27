import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { attendanceService } from "@/services/attendance.service";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { academicYearRepo } from "@/repositories/dexie/academic-year.repo";
import { exportPDF, exportExcel } from "@/services/export.service";
import type { Student, Classroom } from "@/types/entities";
import { PageName } from "@/types/enums";
import { STATUS_COLOR } from "@/lib/constants";
import { Filter, Table, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";

const CLASS_COLORS = ["#0ea5a0", "#f59e0b", "#8b5cf6", "#ef4444", "#3b82f6", "#10b981", "#f97316", "#ec4899"];

const MONTH_LABELS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const SEMESTER_LABELS = ["Ganjil (Jul–Des)", "Genap (Jan–Jun)"];

export function RekapPage() {
  const { activeClassroom, school, teacher, classrooms, setActiveClassroom, setActivePage } = useApp();
  const { toast } = useToast();

  const [tab, setTab] = useState<"bulanan" | "semester">("bulanan");
  const [classDropdown, setClassDropdown] = useState(false);
  const classRef = useRef<HTMLDivElement>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [rekap, setRekap] = useState<Record<number, Record<string, number>>>({});
  const [totalH, setTotalH] = useState(0);
  const [totalS, setTotalS] = useState(0);
  const [totalI, setTotalI] = useState(0);
  const [totalA, setTotalA] = useState(0);
  const [totalT, setTotalT] = useState(0);

  // Filter states
  const [bulanIndex, setBulanIndex] = useState(new Date().getMonth());
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [semesterIdx, setSemesterIdx] = useState(
    new Date().getMonth() >= 6 ? 0 : 1
  );
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [taStart, setTaStart] = useState(`${new Date().getFullYear()}-07-01`);
  const [taEnd, setTaEnd] = useState(`${new Date().getFullYear() + 1}-06-30`);

  useEffect(() => {
    async function loadTA() {
      const ay = await academicYearRepo.getActive();
      if (ay) {
        setTaStart(ay.tanggalMulai);
        setTaEnd(ay.tanggalSelesai);
      }
    }
    loadTA();
  }, []);

  const dateRange = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    if (tab === "bulanan") {
      const start = `${tahun}-${pad(bulanIndex + 1)}-01`;
      const lastDay = new Date(tahun, bulanIndex + 1, 0).getDate();
      const end = `${tahun}-${pad(bulanIndex + 1)}-${pad(lastDay)}`;
      return { start, end, label: `${MONTH_LABELS[bulanIndex]} ${tahun}` };
    } else {
      const year = parseInt(taStart.split("-")[0]);
      let start: string;
      let end: string;
      let label: string;

      if (semesterIdx === 0) {
        start = `${year}-07-01`;
        end = `${year}-12-31`;
        label = `Semester Ganjil ${year}/${year + 1}`;
      } else {
        start = `${year + 1}-01-01`;
        end = `${year + 1}-06-30`;
        label = `Semester Genap ${year}/${year + 1}`;
      }
      return { start, end, label };
    }
  }, [tab, bulanIndex, tahun, semesterIdx, taStart]);

  const loadRekap = useCallback(async () => {
    if (!activeClassroom) return;
    const [siswa, data] = await Promise.all([
      studentRepo.getByClass(activeClassroom.id),
      attendanceService.hitungRekapRentang(
        activeClassroom.id,
        dateRange.start,
        dateRange.end
      ),
    ]);
    setStudents(siswa);
    setRekap(data || {});

    let h = 0, s = 0, i = 0, a = 0, t = 0;
    // Akumulasi hanya untuk siswa yang aktif & tampil di tabel, agar total
    // tidak ikut menjumlahkan record siswa yang sudah dinonaktifkan.
    for (const st of siswa) {
      const r = (data || {})[st.id];
      if (!r) continue;
      h += r.H || 0;
      s += r.S || 0;
      i += r.I || 0;
      a += r.A || 0;
      t += (r as Record<string, number>).T || 0;
    }
    setTotalH(h);
    setTotalS(s);
    setTotalI(i);
    setTotalA(a);
    setTotalT(t);
  }, [activeClassroom, dateRange]);

  useEffect(() => {
    loadRekap();
  }, [loadRekap]);

  useEffect(() => {
    const handler = () => loadRekap();
    window.addEventListener("data-changed", handler);
    return () => window.removeEventListener("data-changed", handler);
  }, [loadRekap]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (classRef.current && !classRef.current.contains(e.target as Node)) {
        setClassDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const exportableData = useMemo(() => {
    return students.map((student) => {
      const r = rekap[student.id] || { H: 0, S: 0, I: 0, A: 0, T: 0 };
      const rr = r as Record<string, number>;
      return { student, H: rr.H || 0, S: rr.S || 0, I: rr.I || 0, A: rr.A || 0, T: rr.T || 0 };
    });
  }, [students, rekap]);

  const handleExportPDF = async () => {
    try {
      setExporting("pdf");
      toast("Menyiapkan file PDF...");
      await exportPDF({
        school,
        teacher,
        classroom: activeClassroom,
        periode: dateRange.label,
        data: exportableData,
        total: { H: totalH, S: totalS, I: totalI, A: totalA, T: totalT },
      });
      toast("PDF berhasil diunduh");
    } catch {
      toast("Gagal mengekspor PDF");
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting("excel");
      toast("Menyiapkan file Excel...");
      await exportExcel({
        school,
        teacher,
        classroom: activeClassroom,
        periode: dateRange.label,
        data: exportableData,
        total: { H: totalH, S: totalS, I: totalI, A: totalA, T: totalT },
      });
      toast("Excel berhasil diunduh");
    } catch {
      toast("Gagal mengekspor Excel");
    } finally {
      setExporting(null);
    }
  };

  const availableYears: number[] = [];
  const taStartYear = parseInt(taStart.split("-")[0]);
  for (let y = taStartYear; y <= taStartYear + 1; y++) {
    if (!availableYears.includes(y)) availableYears.push(y);
  }

  const activeIdx = activeClassroom
    ? classrooms.findIndex((c) => c.id === activeClassroom.id)
    : -1;
  const activeColor = activeIdx >= 0 ? CLASS_COLORS[activeIdx % CLASS_COLORS.length] : "#0ea5a0";

  return (
    <div className="flex-1 px-[14px] pt-[14px] pb-[130px] lg:pb-4">
      {/* Classroom switcher */}
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
            </div>
          )}
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-1 mb-3 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-1">
        <button
          onClick={() => setTab("bulanan")}
          className={`flex-1 py-[8px] rounded-[10px] text-[0.78rem] font-bold transition-colors ${
            tab === "bulanan"
              ? "bg-[#0ea5a0] text-white"
              : "text-[var(--text-light)]"
          }`}
        >
          Bulanan
        </button>
        <button
          onClick={() => setTab("semester")}
          className={`flex-1 py-[8px] rounded-[10px] text-[0.78rem] font-bold transition-colors ${
            tab === "semester"
              ? "bg-[#0ea5a0] text-white"
              : "text-[var(--text-light)]"
          }`}
        >
          Semester
        </button>
      </div>

      {/* Filter */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
          <Filter size={15} /> Filter Rekap
        </div>

        {tab === "bulanan" ? (
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[0.65rem] font-bold text-[var(--text-light)] mb-1 uppercase">Bulan</label>
              <select
                value={bulanIndex}
                onChange={(e) => setBulanIndex(Number(e.target.value))}
                className="w-full px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none font-[inherit]"
              >
                {MONTH_LABELS.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[0.65rem] font-bold text-[var(--text-light)] mb-1 uppercase">Tahun</label>
              <select
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="w-full px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none font-[inherit]"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-[0.65rem] font-bold text-[var(--text-light)] mb-1 uppercase">Semester</label>
            <select
              value={semesterIdx}
              onChange={(e) => setSemesterIdx(Number(e.target.value))}
              className="w-full px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] text-[var(--text)] bg-[var(--input-bg)] outline-none font-[inherit]"
            >
              {SEMESTER_LABELS.map((s, i) => (
                <option key={i} value={i}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {[
          { label: "HADIR", value: totalH, key: "H" },
          { label: "SAKIT", value: totalS, key: "S" },
          { label: "IZIN", value: totalI, key: "I" },
          { label: "ALPHA", value: totalA, key: "A" },
          { label: "TERLAMBAT", value: totalT, key: "T" },
        ].map((item) => (
          <div
            key={item.key}
            className="bg-[var(--card-bg)] border-[1.5px] border-[var(--border)] rounded-[10px] py-[10px] px-[6px] text-center"
          >
            <b
              className="block text-[1.1rem]"
              style={{ color: STATUS_COLOR[item.key as keyof typeof STATUS_COLOR] }}
            >
              {item.value}
            </b>
            <span className="text-[10px] text-[var(--text-light)] font-semibold">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Detail Table */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
          <Table size={15} /> Detail per Siswa — {dateRange.label}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.74rem]">
            <thead>
              <tr>
                <th className="py-[7px] px-[5px] text-left font-semibold text-[10px] text-[var(--text-light)] uppercase border-b border-[var(--border)]">Nama</th>
                <th className="py-[7px] px-[5px] text-center font-semibold text-[10px] text-[var(--text-light)] uppercase border-b border-[var(--border)]" style={{ color: STATUS_COLOR.H }}>H</th>
                <th className="py-[7px] px-[5px] text-center font-semibold text-[10px] text-[var(--text-light)] uppercase border-b border-[var(--border)]" style={{ color: STATUS_COLOR.S }}>S</th>
                <th className="py-[7px] px-[5px] text-center font-semibold text-[10px] text-[var(--text-light)] uppercase border-b border-[var(--border)]" style={{ color: STATUS_COLOR.I }}>I</th>
                <th className="py-[7px] px-[5px] text-center font-semibold text-[10px] text-[var(--text-light)] uppercase border-b border-[var(--border)]" style={{ color: STATUS_COLOR.A }}>A</th>
                <th className="py-[7px] px-[5px] text-center font-semibold text-[10px] text-[var(--text-light)] uppercase border-b border-[var(--border)]" style={{ color: STATUS_COLOR.T }}>T</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-[var(--text-light)] text-[0.75rem] py-[14px] text-center">Belum ada data</td>
                </tr>
              ) : (
                exportableData.map((d) => (
                  <tr key={d.student.id}>
                    <td className="py-[7px] px-[5px] text-left font-semibold border-b border-[var(--border)]">{d.student.nama}</td>
                    <td className="py-[7px] px-[5px] text-center border-b border-[var(--border)]">{d.H}</td>
                    <td className="py-[7px] px-[5px] text-center border-b border-[var(--border)]">{d.S}</td>
                    <td className="py-[7px] px-[5px] text-center border-b border-[var(--border)]">{d.I}</td>
                    <td className="py-[7px] px-[5px] text-center border-b border-[var(--border)]">{d.A}</td>
                    <td className="py-[7px] px-[5px] text-center border-b border-[var(--border)]">{d.T}</td>
                  </tr>
                ))
              )}
              {exportableData.length > 0 && (
                <tr className="font-bold bg-[var(--input-bg)]">
                  <td className="py-[7px] px-[5px] text-left border-b border-[var(--border)]">TOTAL</td>
                  <td className="py-[7px] px-[5px] text-center border-b border-[var(--border)]">{totalH}</td>
                  <td className="py-[7px] px-[5px] text-center border-b border-[var(--border)]">{totalS}</td>
                  <td className="py-[7px] px-[5px] text-center border-b border-[var(--border)]">{totalI}</td>
                  <td className="py-[7px] px-[5px] text-center border-b border-[var(--border)]">{totalA}</td>
                  <td className="py-[7px] px-[5px] text-center border-b border-[var(--border)]">{totalT}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleExportPDF}
          disabled={exporting === "pdf"}
          className="flex-1 flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer active:scale-[0.98] disabled:opacity-50"
        >
          {exporting === "pdf" ? (
            <span className="inline-block w-4 h-4 border-2 border-[var(--text-light)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileText size={15} />
          )}
          {exporting === "pdf" ? "Menyiapkan..." : "Export PDF"}
        </button>
        <button
          onClick={handleExportExcel}
          disabled={exporting === "excel"}
          className="flex-1 flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer active:scale-[0.98] disabled:opacity-50"
        >
          {exporting === "excel" ? (
            <span className="inline-block w-4 h-4 border-2 border-[var(--text-light)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileSpreadsheet size={15} />
          )}
          {exporting === "excel" ? "Menyiapkan..." : "Export Excel"}
        </button>
      </div>
    </div>
  );
}
