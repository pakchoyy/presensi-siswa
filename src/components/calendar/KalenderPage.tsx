import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { db } from "@/repositories/dexie/db";
import { academicYearRepo } from "@/repositories/dexie/academic-year.repo";
import type { AcademicCalendarEntry } from "@/types/entities";
import { CalendarEntryType, CalendarSource, Tier } from "@/types/enums";
import { ChevronLeft, ChevronRight, Plus, Trash2, Lock } from "lucide-react";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function KalenderPage() {
  const { activeClassroom, teacher } = useApp();
  const { toast } = useToast();
  const isPRO = teacher?.tier === Tier.PRO;

  const [entries, setEntries] = useState<AcademicCalendarEntry[]>([]);
  const [ay, setAy] = useState<{ id: number; label: string } | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [editTarget, setEditTarget] = useState<AcademicCalendarEntry | null>(null);
  const [addForm, setAddForm] = useState(false);
  const [newLiburName, setNewLiburName] = useState("");

  const loadEntries = useCallback(async () => {
    const a = await academicYearRepo.getActive();
    if (a) setAy({ id: a.id, label: a.label });
    const all = await db.calendarEntries.toArray();
    setEntries(all);
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = (day: number) => `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;

  const getEntry = (day: number) =>
    day ? entries.find((e) => e.tanggal === dateStr(day) && e.jenis === CalendarEntryType.HARI_LIBUR) : undefined;

  const isToday = (day: number) => {
    const t = new Date();
    return currentYear === t.getFullYear() && currentMonth === t.getMonth() && day === t.getDate();
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const handleAddLibur = async () => {
    const nama = newLiburName.trim();
    if (!nama) { toast("Isi nama hari libur"); return; }
    if (!ay) return;

    const entry: AcademicCalendarEntry = {
      id: Date.now(),
      tahunAjaranId: ay.id,
      tanggal: dateStr(editTarget ? new Date(editTarget.tanggal).getDate() : new Date().getDate()),
      jenis: CalendarEntryType.HARI_LIBUR,
      keterangan: nama,
      sumber: CalendarSource.KUSTOM,
    };

    // Find which day the editTarget or addForm is for
    if (editTarget) {
      entry.tanggal = editTarget.tanggal;
      entry.id = editTarget.id;
      await db.calendarEntries.put(entry);
      toast("✅ Hari libur diperbarui");
    } else {
      await db.calendarEntries.put(entry);
      toast("✅ Hari libur ditambahkan");
    }
    setAddForm(false);
    setEditTarget(null);
    setNewLiburName("");
    await loadEntries();
  };

  const handleDeleteLibur = async (entry: AcademicCalendarEntry) => {
    if (entry.sumber === CalendarSource.BAWAAN) {
      toast("Hari libur bawaan tidak bisa dihapus");
      return;
    }
    await db.calendarEntries.delete(entry.id);
    toast("🗑️ Hari libur dihapus");
    setEditTarget(null);
    await loadEntries();
  };

  const handleDayClick = (day: number, entry?: AcademicCalendarEntry) => {
    if (!isPRO) return;
    if (entry) {
      setEditTarget(entry);
      setNewLiburName(entry.keterangan || "");
      setAddForm(true);
    } else {
      const d = dateStr(day);
      setEditTarget({ id: 0, tahunAjaranId: ay?.id || 0, tanggal: d, jenis: CalendarEntryType.HARI_LIBUR, keterangan: "", sumber: CalendarSource.KUSTOM });
      setNewLiburName("");
      setAddForm(true);
    }
  };

  return (
    <div className="flex-1 px-[14px] pt-[14px] pb-[90px] lg:pb-4">
      {!isPRO && (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[10px] mb-3 flex items-center gap-2 text-[0.7rem] text-[var(--text-light)]">
          <Lock size={12} className="text-[#b45309]" />
          Kalender hanya bisa dilihat. <span className="font-semibold text-[#0ea5a0]">Upgrade ke PRO</span> untuk menambah/mengedit hari libur.
        </div>
      )}

      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px]">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="h-8 w-8 rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer">
            <ChevronLeft size={16} />
          </button>
          <div className="text-[0.9rem] font-bold">{MONTHS[currentMonth]} {currentYear}</div>
          <button onClick={nextMonth} className="h-8 w-8 rounded-lg border-[1.5px] border-[var(--border)] text-[var(--text)] flex items-center justify-center bg-transparent cursor-pointer">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-[2px] text-center mb-2">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
            <div key={d} className="text-[0.6rem] font-bold uppercase text-[var(--text-light)] py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-[2px]">
          {days.map((day, i) => {
            const entry = day ? getEntry(day) : undefined;
            const weekendClass = i % 7 === 0;
            const todayClass = day && isToday(day);

            return (
              <div
                key={i}
                onClick={() => day && handleDayClick(day, entry)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[0.7rem] transition-colors ${
                  !day ? "" :
                  entry ? "bg-[#fee2e2] text-[#dc2626] font-bold" :
                  todayClass ? "bg-[#0ea5a0] text-white font-bold" :
                  weekendClass ? "bg-[var(--input-bg)] text-[var(--text-light)]" :
                  isPRO ? "cursor-pointer hover:bg-[var(--input-bg)]" : ""
                }`}
                title={entry ? entry.keterangan || "Hari Libur" : isPRO ? "Klik untuk tambah hari libur" : undefined}
              >
                {day && <span>{day}</span>}
                {entry && day && (
                  <span className="text-[0.45rem] leading-tight text-center px-[1px] truncate max-w-full">
                    {entry.keterangan?.slice(0, 8)}
                  </span>
                )}
                {isPRO && day && !entry && (
                  <span className="text-[0.45rem] text-[var(--text-light)]/40">+</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Form (PRO only) */}
      {isPRO && addForm && (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mt-3">
          <div className="text-[0.78rem] font-bold mb-2">
            {editTarget?.id ? "Edit Hari Libur" : "Tambah Hari Libur"}
            {editTarget && <span className="text-[var(--text-light)] font-normal text-[0.7rem]"> — {editTarget.tanggal}</span>}
          </div>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newLiburName}
              onChange={(e) => setNewLiburName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddLibur()}
              placeholder="Nama hari libur (contoh: Ulang Tahun Sekolah)"
              className="flex-1 px-[10px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[8px] text-[0.82rem] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddLibur}
              className="flex-1 flex items-center justify-center gap-[4px] py-[9px] rounded-[10px] text-white font-bold text-[0.78rem] cursor-pointer"
              style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
            >
              <Plus size={14} /> {editTarget?.id ? "Simpan" : "Tambah"}
            </button>
            {editTarget?.id ? (
              <button
                onClick={() => handleDeleteLibur(editTarget)}
                className="flex-1 py-[9px] rounded-[10px] border-[1.5px] border-[#ef4444] text-[#ef4444] font-bold text-[0.78rem] bg-transparent cursor-pointer flex items-center justify-center gap-[4px]"
              >
                <Trash2 size={14} /> Hapus
              </button>
            ) : null}
            <button
              onClick={() => { setAddForm(false); setEditTarget(null); }}
              className="flex-1 py-[9px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.78rem] cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px]">
        <div className="text-[0.75rem] font-bold mb-2">Keterangan</div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1 text-[0.7rem]">
            <div className="w-3 h-3 rounded bg-[#dc2626]" /> Hari Libur
          </div>
          <div className="flex items-center gap-1 text-[0.7rem]">
            <div className="w-3 h-3 rounded bg-[#0ea5a0]" /> Hari Ini
          </div>
          {isPRO && (
            <div className="flex items-center gap-1 text-[0.7rem]">
              <span className="text-[0.5rem] text-[var(--text-light)]">Klik tanggal untuk tambah/edit hari libur</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
