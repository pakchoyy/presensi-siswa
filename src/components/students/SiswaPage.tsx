import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { Search, UserPlus, Trash2, FileSpreadsheet, RefreshCw, ArrowLeft, Users, GraduationCap, PenLine } from "lucide-react";
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
import { MAX_STUDENTS_FREE } from "@/lib/constants";

function formatKelasLabel(namaKelas: string): string {
  if (namaKelas.toLowerCase().startsWith("kelas")) {
    return namaKelas;
  }
  
  const romawiMap: Record<string, string> = {
    "7": "VII", "8": "VIII", "9": "IX",
    "10": "X", "11": "XI", "12": "XII"
  };
  
  const trimmed = namaKelas.trim();
  
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed);
    if (num >= 1 && num <= 6) {
      return `Kelas ${num}`;
    } else if (romawiMap[trimmed]) {
      return `Kelas ${romawiMap[trimmed]}`;
    }
  }
  
  if (/^(VII|VIII|IX|X|XI|XII)$/i.test(trimmed)) {
    return `Kelas ${trimmed.toUpperCase()}`;
  }
  
  return `Kelas ${namaKelas}`;
}

export function SiswaPage() {
  const { activeClassroom, classrooms, teacher, refreshClassrooms, setActiveClassroom, setActivePage } = useApp();
  const isPRO = teacher?.tier === Tier.PRO;
  const { toast } = useToast();

  const [view, setView] = useState<"kelas" | "detail">(classrooms.length <= 1 ? "detail" : "kelas");
  const [selectedKelas, setSelectedKelas] = useState<Classroom | null>(classrooms.length <= 1 ? activeClassroom : null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showImportUpdate, setShowImportUpdate] = useState(false);
  const [modalNama, setModalNama] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [kelasCounts, setKelasCounts] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editNisn, setEditNisn] = useState("");
  const [editJK, setEditJK] = useState<"L" | "P" | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

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

  useEffect(() => {
    if (classrooms.length <= 1 && activeClassroom) {
      setSelectedKelas(activeClassroom);
      setView("detail");
      loadStudents(activeClassroom.id);
    }
  }, [classrooms.length, activeClassroom?.id]);

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
    
    if (!isPRO && students.length >= MAX_STUDENTS_FREE) {
      toast("⚠️ Limit FREE: maksimal 15 siswa. Upgrade ke PRO untuk unlimited siswa.");
      return;
    }
    
    setSaving(true);
    
    try {
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
    } catch (error) {
      toast("❌ Gagal menambahkan siswa");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (result: ImportResult) => {
    if (!selectedKelas) return;

    if (!isPRO) {
      const totalAfterImport = students.length + result.students.length;
      if (totalAfterImport > MAX_STUDENTS_FREE) {
        const canImport = MAX_STUDENTS_FREE - students.length;
        if (canImport <= 0) {
          toast("⚠️ Kelas sudah penuh (15 siswa). Upgrade ke PRO untuk unlimited siswa.");
          return;
        }
        toast(`⚠️ Hanya ${canImport} siswa pertama yang akan diimport (limit FREE: 15 siswa). Upgrade ke PRO untuk unlimited.`);
        result.students = result.students.slice(0, canImport);
      }
    }

    // Get updated classrooms list first
    let updatedClassrooms = await classroomRepo.getAll();
    
    // Auto-create classes from Excel if they exist (PRO only)
    if (result.classes.length > 0 && isPRO) {
      const ay = await academicYearRepo.getActive();
      if (ay && teacher) {
        for (const namaKelas of result.classes) {
          const exists = updatedClassrooms.find(c => c.nama.toLowerCase() === namaKelas.toLowerCase());
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
            updatedClassrooms.push(newCls); // Update local array immediately
          }
        }
        await refreshClassrooms();
      }
    }
    
    // Convert with classroom matching (PRO gets auto-assign, FREE uses current class)
    const newStudents = siswaToImportResult(result, selectedKelas.id, isPRO ? updatedClassrooms : undefined);
    
    await studentRepo.bulkSave(newStudents);
    
    // Reload all classes' student counts
    await loadCounts();
    
    // Show success with breakdown
    const classCounts: Record<string, number> = {};
    result.students.forEach(s => {
      const kls = s.kelas || selectedKelas.nama;
      classCounts[kls] = (classCounts[kls] || 0) + 1;
    });
    
    const summary = Object.entries(classCounts)
      .map(([kelas, count]) => `${kelas}: ${count} siswa`)
      .join(', ');
    
    toast(`✅ Import berhasil! ${summary}`);
    
    if (!isPRO && result.classes.length > 0) {
      setTimeout(() => toast('💡 Upgrade ke PRO untuk auto-assign siswa ke kelas yang sesuai'), 1000);
    }
  };

  const handleEdit = async () => {
    if (!editTarget || !editNama.trim()) {
      toast("Nama siswa tidak boleh kosong");
      return;
    }
    
    setEditing(true);
    
    try {
      const updated: Student = {
        ...editTarget,
        nama: editNama.trim(),
        nisn: editNisn.trim() || undefined,
        jenisKelamin: editJK,
        diubahPada: timestamp(),
      };
      
      await studentRepo.save(updated);
      setEditTarget(null);
      await loadStudents(editTarget.kelasId);
      toast("✅ Data siswa diperbarui");
    } catch (error) {
      toast("❌ Gagal mengupdate siswa");
    } finally {
      setEditing(false);
    }
  };

  const handleRemove = async () => {
    if (!deleteTarget) return;
    
    setDeleting(true);
    
    try {
      await studentRepo.softDelete(deleteTarget.id);
      const kelasId = deleteTarget.kelasId;
      setDeleteTarget(null);
      await loadStudents(kelasId);
      await loadCounts();
      toast("Siswa dihapus");
    } catch (error) {
      toast("❌ Gagal menghapus siswa");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!selectedKelas) return;
    
    setDeletingAll(true);
    
    try {
      for (const student of students) {
        await studentRepo.softDelete(student.id);
      }
      
      setShowDeleteAll(false);
      await loadStudents(selectedKelas.id);
      await loadCounts();
      toast(`✅ ${students.length} siswa berhasil dihapus`);
    } catch (error) {
      toast("❌ Gagal menghapus siswa");
    } finally {
      setDeletingAll(false);
    }
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
                  <div className="text-[0.82rem] font-bold text-[var(--text)] leading-tight mb-1">{formatKelasLabel(cls.nama)}</div>
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

      <div className="text-[0.85rem] font-bold mb-1">{formatKelasLabel(selectedKelas?.nama || "")}</div>
      <div className="text-[0.7rem] text-[var(--text-light)] mb-3">
        {students.length} siswa terdaftar
        {!isPRO && <span className="text-[var(--text-light)]"> • Limit: {students.length}/{MAX_STUDENTS_FREE}</span>}
        {!isPRO && students.length >= MAX_STUDENTS_FREE && <span className="text-[#b45309] font-semibold"> • Penuh</span>}
      </div>

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

      {students.length > 0 && (
        <button
          onClick={() => setShowDeleteAll(true)}
          className="w-full flex items-center justify-center gap-[6px] py-[8px] rounded-[10px] border-[1.5px] border-dashed border-[#ef4444]/40 text-[#ef4444] font-bold text-[0.76rem] cursor-pointer bg-transparent hover:bg-[#ef4444]/5 transition-colors mb-3"
        >
          <Trash2 size={14} />
          Hapus Semua Siswa ({students.length})
        </button>
      )}

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
              {s.nisn && <div className="text-[0.7rem] text-[var(--text-light)]">NISN: {s.nisn}</div>}
            </div>
            <button
              onClick={() => {
                setEditTarget(s);
                setEditNama(s.nama);
                setEditNisn(s.nisn || "");
                setEditJK(s.jenisKelamin);
              }}
              className="h-8 w-[34px] rounded-lg border-[1.5px] border-[#0ea5a0] text-[#0ea5a0] flex items-center justify-center bg-transparent cursor-pointer flex-shrink-0"
            >
              <PenLine size={15} />
            </button>
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
                  disabled={saving}
                  className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Edit Siswa */}
      {editTarget && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[600] flex items-end lg:items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditTarget(null);
            }}
          >
            <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px]">
              <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
              <div className="text-[0.85rem] font-bold mb-[14px] text-center">
                Edit Siswa
              </div>
              
              {/* Input Nama */}
              <div className="mb-3">
                <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  placeholder="Nama siswa"
                  className="w-full px-[11px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[9px] text-[0.85rem] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
                />
              </div>

              {/* Input NISN */}
              <div className="mb-3">
                <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase">
                  NISN (Opsional)
                </label>
                <input
                  type="text"
                  value={editNisn}
                  onChange={(e) => setEditNisn(e.target.value)}
                  placeholder="10 digit NISN"
                  maxLength={10}
                  className="w-full px-[11px] py-[9px] border-[1.5px] border-[var(--border)] rounded-[9px] text-[0.85rem] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
                />
              </div>

              {/* Jenis Kelamin */}
              <div className="mb-4">
                <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase">
                  Jenis Kelamin (Opsional)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditJK("L")}
                    className={`flex-1 py-[10px] rounded-[8px] border-[1.5px] text-[0.78rem] font-bold cursor-pointer ${
                      editJK === "L" ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]" : "border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-light)]"
                    }`}
                  >
                    Laki-laki
                  </button>
                  <button
                    onClick={() => setEditJK("P")}
                    className={`flex-1 py-[10px] rounded-[8px] border-[1.5px] text-[0.78rem] font-bold cursor-pointer ${
                      editJK === "P" ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]" : "border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-light)]"
                    }`}
                  >
                    Perempuan
                  </button>
                  <button
                    onClick={() => setEditJK(undefined)}
                    className={`flex-1 py-[10px] rounded-[8px] border-[1.5px] text-[0.78rem] font-bold cursor-pointer ${
                      !editJK ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]" : "border-[var(--border)] bg-[var(--input-bg)] text-[var(--text-light)]"
                    }`}
                  >
                    Tidak diisi
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditTarget(null)}
                  className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleEdit}
                  disabled={editing}
                  className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
                >
                  {editing ? "Menyimpan..." : "Simpan"}
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
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] bg-[#ef4444] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {deleting ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Hapus Semua */}
      {showDeleteAll && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[600] flex items-end lg:items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDeleteAll(false);
            }}
          >
            <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px]">
              <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
              <div className="text-[0.85rem] font-bold mb-2 text-center text-[#ef4444]">
                Hapus Semua Siswa?
              </div>
              <p className="text-[var(--text-light)] text-[0.75rem] text-center mb-[14px]">
                <b className="text-[var(--text)]">{students.length} siswa</b> akan dihapus dari <b className="text-[var(--text)]">{selectedKelas?.nama}</b>.<br/>
                Riwayat presensi tetap tersimpan sebagai data historis.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteAll(false)}
                  className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] bg-[#ef4444] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {deletingAll ? "Menghapus..." : "Hapus Semua"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
