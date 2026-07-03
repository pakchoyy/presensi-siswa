import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { Search, UserPlus, Trash2, FileSpreadsheet, RefreshCw, ArrowLeft, Users, GraduationCap } from "lucide-react";
import { ImportExcel } from "@/components/import/ImportExcel";
import { ImportUpdateExcel } from "@/components/import/ImportUpdateExcel";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { classroomRepo } from "@/repositories/dexie/classroom.repo";
import { academicYearRepo } from "@/repositories/dexie/academic-year.repo";
import type { Student, Classroom } from "@/types/entities";
import { inisial, generateId, timestamp } from "@/lib/utils";
import { siswaToImportResult } from "@/services/import.service";
import type { ImportResult } from "@/services/import.service";
import { Tier } from "@/types/enums";

export function SiswaPage() {
  const { activeClassroom, classrooms, teacher, refreshClassrooms, setActiveClassroom, setActivePage } = useApp();
  const isPRO = teacher?.tier === Tier.PRO;
  const { toast } = useToast();

  const [view, setView] = useState<"kelas" | "detail">("kelas");
  const [selectedKelas, setSelectedKelas] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showImportUpdate, setShowImportUpdate] = useState(false);
  const [modalNama, setModalNama] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [kelasCounts, setKelasCounts] = useState<Record<number, number>>({});

  const loadCounts = useCallback(async () => {
    const counts: Record<number, number> = {};
    for (const cls of classrooms) {
      counts[cls.id] = await studentRepo.countActiveByClass(cls.id);
    }
    setKelasCounts(counts);
  }, [classrooms]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  const loadStudents = useCallback(async (kelasId: number) => {
    const data = await studentRepo.getByClass(kelasId);
    setStudents(data);
  }, []);

  const openKelas = (cls: Classroom) => {
    setSelectedKelas(cls);
    setView("detail");
    loadStudents(cls.id);
  };

  const backToKelas = () => {
    setView("kelas");
    setSelectedKelas(null);
    setSearch("");
    loadCounts();
  };

  const filtered = students.filter((s) =>
    s.nama.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    const nama = modalNama.trim();
    if (!nama || !selectedKelas) {
      toast("Nama siswa belum diisi");
      return;
    }
    const now = timestamp();
    const s: Student = {
      id: generateId(),
      kelasId: selectedKelas.id,
      nama,
      urutan: students.length + 1,
      statusAktif: true,
      dibuatPada: now,
      diubahPada: now,
    };
    await studentRepo.save(s);
    setModalNama("");
    setShowModal(false);
    await loadStudents(selectedKelas.id);
    await loadCounts();
    toast("Siswa berhasil ditambahkan");
  };

  const handleImport = async (result: ImportResult) => {
    if (!selectedKelas) return;

    // Auto-create classes from Excel if they exist
    if (result.classes.length > 0 && isPRO) {
      const ay = await academicYearRepo.getActive();
      if (ay && teacher) {
        for (const namaKelas of result.classes) {
          const exists = classrooms.find(c => c.nama.toLowerCase() === namaKelas.toLowerCase());
          if (!exists) {
            const newCls: Classroom = {
              id: generateId(),
              nama: namaKelas,
              tahunAjaranId: ay.id,
              guruId: teacher.id,
              statusAktif: true,
              dibuatPada: timestamp(),
              diubahPada: timestamp(),
            };
            await classroomRepo.save(newCls);
          }
        }
        await refreshClassrooms();
      }
    }

    const newStudents = siswaToImportResult(result, selectedKelas.id);
    await studentRepo.bulkSave(newStudents);
    await loadStudents(selectedKelas.id);
    await loadCounts();
  };

  const handleRemove = async () => {
    if (!deleteTarget) return;
    await studentRepo.softDelete(deleteTarget.id);
    setDeleteTarget(null);
    await loadStudents(deleteTarget.kelasId);
    await loadCounts();
    toast("Siswa dihapus");
  };

  // View: Daftar Kelas (Cards)
  if (view === "kelas") {
    return (
      <div className="flex-1 px-[14px] pt-[14px] pb-[130px] lg:pb-4">
        <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-[10px]">
          <GraduationCap size={16} /> Daftar Kelas
        </div>

        {classrooms.length === 0 ? (
          <div className="text-center py-[40px]">
            <Users size={40} className="text-[var(--border)] mx-auto mb-3" />
            <div className="text-[0.85rem] font-bold text-[var(--text-light)] mb-1">Belum ada kelas</div>
            <div className="text-[0.72rem] text-[var(--text-light)]">
              Import Excel dengan kolom "Kelas" atau tambah kelas di sidebar
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {classrooms.map((cls) => {
              const count = kelasCounts[cls.id] || 0;
              const isActive = activeClassroom?.id === cls.id;
              return (
                <button
                  key={cls.id}
                  onClick={() => openKelas(cls)}
                  className={`p-4 rounded-xl border-[1.5px] text-left cursor-pointer transition-all ${
                    isActive
                      ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.06)]"
                      : "border-[var(--border)] bg-[var(--card-bg)] hover:border-[#0ea5a0]/40"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl mb-2 flex items-center justify-center text-white text-[1.1rem]"
                    style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>
                    <Users size={18} />
                  </div>
                  <div className="text-[0.82rem] font-bold text-[var(--text)] leading-tight mb-1">{cls.nama}</div>
                  <div className="text-[0.68rem] text-[var(--text-light)]">
                    {count} siswa {isActive && <span className="text-[#0ea5a0] font-semibold">• Aktif</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // View: Detail Siswa per Kelas
  return (
    <div className="flex-1 px-[14px] pt-[14px] pb-[130px] lg:pb-4">
      {/* Back button */}
      <button
        onClick={backToKelas}
        className="flex items-center gap-[6px] text-[0.78rem] font-bold text-[#0ea5a0] mb-3 bg-transparent border-none cursor-pointer"
      >
        <ArrowLeft size={16} /> Kembali ke Daftar Kelas
      </button>

      <div className="text-[0.85rem] font-bold mb-1">{selectedKelas?.nama}</div>
      <div className="text-[0.7rem] text-[var(--text-light)] mb-3">{students.length} siswa terdaftar</div>

      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[var(--text-light)]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama siswa..."
          className="w-full pl-9 pr-[11px] py-[10px] border-[1.5px] border-[var(--border)] rounded-[9px] text-[0.85rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] focus:shadow-[0_0_0_3px_rgba(14,165,160,0.12)] font-[inherit]"
        />
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setShowImport(!showImport)}
          className="flex-1 flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
        >
          <FileSpreadsheet size={15} /> Import Excel
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer"
          style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
        >
          <UserPlus size={15} /> Tambah
        </button>
      </div>

      {showImport && selectedKelas && (
        <div className="mb-3">
          <ImportExcel
            kelasId={selectedKelas.id}
            existingCount={students.length}
            onImport={handleImport}
            onClose={() => setShowImport(false)}
          />
        </div>
      )}

      {isPRO && showImportUpdate && selectedKelas && (
        <div className="mb-3">
          <ImportUpdateExcel
            kelasId={selectedKelas.id}
            existingCount={students.length}
            onDone={() => { setShowImportUpdate(false); loadStudents(selectedKelas.id); }}
          />
        </div>
      )}

      {isPRO && !showImportUpdate && (
        <div className="mb-3">
          <button
            onClick={() => setShowImportUpdate(true)}
            className="w-full flex items-center justify-center gap-[6px] py-[8px] rounded-[10px] border-[1.5px] border-dashed border-[#0ea5a0]/40 text-[#0ea5a0] font-bold text-[0.76rem] cursor-pointer bg-transparent"
          >
            <RefreshCw size={14} /> Import Update Excel (PRO)
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-[30px] text-[var(--text-light)] text-[0.8rem]">
          {search ? "Tidak ada siswa ditemukan" : "Belum ada siswa terdaftar"}
        </div>
      ) : (
        filtered.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-[10px] px-3 py-[11px] rounded-[10px] bg-[var(--input-bg)] mb-2 border-l-4"
            style={{ borderLeftColor: "#16a34a" }}
          >
            <div
              className="w-[34px] h-[34px] rounded-full text-white flex items-center justify-center font-bold text-[0.78rem] flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
            >
              {inisial(s.nama)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.86rem] font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                {s.nama}
              </div>
            </div>
            <button
              onClick={() => setDeleteTarget(s)}
              className="h-8 w-[34px] rounded-lg border-[1.5px] border-[#ef4444] text-[#ef4444] flex items-center justify-center bg-transparent cursor-pointer flex-shrink-0"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))
      )}

      {/* Modal Tambah */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[600] flex items-end lg:items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px]">
              <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
              <div className="text-[0.85rem] font-bold mb-[14px] text-center">
                Tambah Siswa Baru
              </div>
              <div className="mb-4">
                <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase tracking-[0.4px]">
                  Nama Siswa
                </label>
                <input
                  type="text"
                  value={modalNama}
                  onChange={(e) => setModalNama(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder="Nama lengkap siswa"
                  className="w-full px-[11px] py-[10px] border-[1.5px] border-[var(--border)] rounded-[9px] text-[0.85rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] focus:shadow-[0_0_0_3px_rgba(14,165,160,0.12)] font-[inherit]"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Hapus */}
      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[600] flex items-end lg:items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteTarget(null);
            }}
          >
            <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px]">
              <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
              <div className="text-[0.85rem] font-bold mb-2 text-center">
                Hapus {deleteTarget.nama}?
              </div>
              <p className="text-[var(--text-light)] text-[0.75rem] text-center mb-[14px]">
                Riwayat presensi siswa ini akan tetap tersimpan sebagai data historis.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleRemove}
                  className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] bg-[#ef4444] text-white font-bold text-[0.82rem] cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
