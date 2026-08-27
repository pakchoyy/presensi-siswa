import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { Search, UserPlus, Trash2, FileSpreadsheet, RefreshCw, ArrowLeft, Users, GraduationCap, PenLine, Lightbulb, Link2, Copy, Check, Share2 } from "lucide-react";
import { ImportExcel } from "@/components/import/ImportExcel";
import { ImportUpdateExcel } from "@/components/import/ImportUpdateExcel";
import { triggerAutoSync } from "@/hooks/useAutoSync";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { classroomRepo } from "@/repositories/dexie/classroom.repo";
import { academicYearRepo } from "@/repositories/dexie/academic-year.repo";

import { db } from "@/repositories/dexie/db";
import type { Student, Classroom } from "@/types/entities";
import { inisial, generateId, timestamp } from "@/lib/utils";
import { siswaToImportResult } from "@/services/import.service";
import type { ImportResult } from "@/services/import.service";
import { Tier } from "@/types/enums";
import { MAX_STUDENTS_FREE, MAX_KELAS_FREE } from "@/lib/constants";
import { getCache, setCache, clearCache } from "@/lib/cache";

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);
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
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [addingClass, setAddingClass] = useState(false);
  const [deleteClassTarget, setDeleteClassTarget] = useState<Classroom | null>(null);
  const [deletingClass, setDeletingClass] = useState(false);
  const [absenLinkGenerating, setAbsenLinkGenerating] = useState(false);
  const [absenLinks, setAbsenLinks] = useState<{ nama: string; token: string; url: string }[] | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [togglingAbsen, setTogglingAbsen] = useState(false);

  const loadCounts = useCallback(async () => {
    const counts: Record<number, number> = {};
    for (const cls of classrooms) {
      counts[cls.id] = await studentRepo.countActiveByClass(cls.id);
    }
    setKelasCounts(counts);
  }, [classrooms]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  const loadStudents = useCallback(async (kelasId: number, forceReload = false) => {
    const cacheKey = `students_${kelasId}`;
    if (!forceReload) {
      const cached = getCache<Student[]>(cacheKey);
      if (cached) {
        setStudents(cached);
        return;
      }
    }

    const data = await studentRepo.getByClass(kelasId);
    setStudents(data);
    setCache(cacheKey, data);
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
    setDebouncedSearch("");
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    loadCounts();
  };

  const handleDeleteClass = async () => {
    if (!deleteClassTarget) return;
    
    setDeletingClass(true);
    const cls = deleteClassTarget;
    
    try {
      // Validate cls.id before using it in Dexie queries
      if (!cls.id) {
        console.error('Invalid classroom ID');
        return;
      }
      
      const now = timestamp();
      await db.students.where('kelasId').equals(cls.id).modify({ statusAktif: false, diubahPada: now });
      await classroomRepo.softDelete(cls.id);
      // NOTE: tidak membuat tombstones di sini. Soft-delete (statusAktif=false)
      // sudah tersinkronisasi ke cloud/device lain lewat data sync biasa. Tombstone
      // justru membuat data ikut TERHAPUS permanen di device lain + siswa hantu
      // saat data di-create ulang.

      triggerAutoSync();
      await refreshClassrooms();
      if (activeClassroom?.id === cls.id) {
        setActiveClassroom(null);
      }
      await loadCounts();
      setDeleteClassTarget(null);
      toast(`✅ Kelas ${formatKelasLabel(cls.nama)} berhasil dihapus`);
    } catch (error) {
      console.error('Delete class error:', error);
      toast('❌ Gagal menghapus kelas');
    } finally {
      setDeletingClass(false);
    }
  };

  const filtered = students.filter((s) =>
    s.nama.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleSave = async () => {
    const nama = modalNama.trim();
    const targetKelas = selectedKelas || activeClassroom;
    if (!nama || !targetKelas) {
      toast("Nama siswa belum diisi");
      return;
    }
    
    if (!isPRO && students.length >= MAX_STUDENTS_FREE) {
      toast(`⚠️ Limit FREE: maksimal ${MAX_STUDENTS_FREE} siswa. Upgrade ke PRO untuk unlimited siswa.`);
      return;
    }
    
    setSaving(true);
    
    try {
      const now = timestamp();
      const s: Student = {
        id: generateId(),
        kelasId: targetKelas.id,
        nama,
        urutan: students.length + 1,
        statusAktif: true,
        dibuatPada: now,
        diubahPada: now,
      };
      // addOrRestore: kalau ada siswa nonaktif senama, dihidupkan lagi
      // (bukan bikin baris baru) supaya riwayat absensi lama tidak terputus.
      await studentRepo.addOrRestore(s);
      setModalNama("");
      setShowModal(false);
      clearCache(`students_${targetKelas.id}`);
      await loadStudents(targetKelas.id, true);
      await loadCounts();
      toast("Siswa berhasil ditambahkan");
    } catch (error) {
      toast("❌ Gagal menambahkan siswa");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (result: ImportResult) => {
    const targetKelas = selectedKelas || activeClassroom;
    if (!targetKelas) return;

    if (!isPRO) {
      const totalAfterImport = students.length + result.students.length;
      if (totalAfterImport > MAX_STUDENTS_FREE) {
        const canImport = MAX_STUDENTS_FREE - students.length;
        if (canImport <= 0) {
          toast(`⚠️ Kelas sudah penuh (${MAX_STUDENTS_FREE} siswa). Upgrade ke PRO untuk unlimited siswa.`);
          return;
        }
        toast(`⚠️ Hanya ${canImport} siswa pertama yang akan diimport (limit FREE: ${MAX_STUDENTS_FREE} siswa). Upgrade ke PRO untuk unlimited.`);
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
    const newStudents = siswaToImportResult(result, targetKelas.id, isPRO ? updatedClassrooms : undefined);
    
    // addOrRestore per siswa: siswa yang timbul dari import lama (setelah soft-delete)
    // dihidupkan lagi, bukan dibuat baris baru yang memutus riwayat absensi.
    for (const s of newStudents) {
      await studentRepo.addOrRestore(s);
    }
    
    // Reload all classes' student counts
    await loadCounts();
    clearCache(`students_${targetKelas.id}`);
    await loadStudents(targetKelas.id, true);
    
    // Show success with breakdown
    const classCounts: Record<string, number> = {};
    result.students.forEach(s => {
      const kls = s.kelas || targetKelas.nama;
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
      clearCache(`students_${editTarget.kelasId}`);
      await loadStudents(editTarget.kelasId, true);
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
      clearCache(`students_${kelasId}`);
      await loadStudents(kelasId, true);
      await loadCounts();
      toast("Siswa dihapus");
    } catch (error) {
      toast("❌ Gagal menghapus siswa");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddClass = async () => {
    const className = newClassName.trim();
    if (!className || !teacher) {
      toast("Nama kelas tidak boleh kosong");
      return;
    }
    
    setAddingClass(true);
    
    try {
      const ay = await academicYearRepo.getActive();
      if (!ay) {
        toast("❌ Tahun ajaran belum ada");
        return;
      }
      
      // Check if class already exists
      const exists = classrooms.find(c => c.nama.toLowerCase() === className.toLowerCase());
      if (exists) {
        toast("❌ Kelas sudah ada");
        setAddingClass(false);
        return;
      }

      // Limit FREE: hanya 1 kelas
      if (!isPRO) {
        const activeClassCount = classrooms.filter(c => c.statusAktif !== false).length;
        if (activeClassCount >= MAX_KELAS_FREE) {
          toast(`⚠️ Limit FREE: maksimal ${MAX_KELAS_FREE} kelas. Upgrade ke PRO untuk unlimited kelas.`);
          setAddingClass(false);
          return;
        }
      }
      
      const newCls: Classroom = {
        id: generateId(),
        nama: className,
        tahunAjaranId: ay.id,
        guruId: teacher.id,
        statusAktif: true,
        dibuatPada: timestamp(),
        diubahPada: timestamp(),
      };
      
      await classroomRepo.save(newCls);
      await refreshClassrooms();
      await loadCounts();
      
      setNewClassName("");
      setShowAddClassModal(false);
      toast(`✅ Kelas ${formatKelasLabel(className)} berhasil ditambahkan`);
    } catch (error) {
      toast("❌ Gagal menambahkan kelas");
    } finally {
      setAddingClass(false);
    }
  };

  const handleDeleteAll = async () => {
    const targetKelas = selectedKelas || activeClassroom;
    if (!targetKelas) return;
    
    setDeletingAll(true);
    
    try {
      // Query SEMUA siswa di kelas ini (termasuk yang statusAktif=false)
      const allStudents = await db.students
        .where("kelasId")
        .equals(targetKelas.id)
        .toArray();
      
      for (const student of allStudents) {
        await studentRepo.softDelete(student.id);
      }
      // NOTE: tanpa tombstones — soft-delete menyebar via data sync biasa, sehingga
      // tidak menghapus permanen data di device lain / cloud.
      
      setShowDeleteAll(false);
      await loadStudents(targetKelas.id);
      await loadCounts();
      toast(`✅ ${allStudents.length} siswa berhasil dihapus`);
    } catch (error) {
      toast("❌ Gagal menghapus siswa");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleToggleAbsenMandiri = async () => {
    const targetKelas = selectedKelas || activeClassroom;
    if (!targetKelas) return;
    setTogglingAbsen(true);
    try {
      const next = !targetKelas.allowSiswaAbsenMandiri;
      await classroomRepo.save({ ...targetKelas, allowSiswaAbsenMandiri: next, diubahPada: timestamp() });
      await refreshClassrooms();
      // update selectedKelas local
      setSelectedKelas({ ...targetKelas, allowSiswaAbsenMandiri: next });
      toast(next ? "✅ Absen mandiri diaktifkan untuk kelas ini" : "Absen mandiri dinonaktifkan");
    } catch {
      toast("❌ Gagal mengubah pengaturan");
    } finally {
      setTogglingAbsen(false);
    }
  };

  const handleGenerateLinks = async () => {
    const targetKelas = selectedKelas || activeClassroom;
    if (!targetKelas || students.length === 0) { toast("Belum ada siswa"); return; }
    setAbsenLinkGenerating(true);
    try {
      const links: { nama: string; token: string; url: string }[] = [];
      const origin = window.location.origin;
      for (const s of students) {
        let token = s.absenToken;
        if (!token) {
          token = crypto.randomUUID();
          await db.students.update(s.id, { absenToken: token, diubahPada: timestamp() } as Partial<Student>);
        }
        links.push({ nama: s.nama, token, url: `${origin}/s/${token}` });
      }
      // refresh local
      clearCache(`students_${targetKelas.id}`);
      await loadStudents(targetKelas.id, true);
      triggerAutoSync();
      setAbsenLinks(links);
      toast(`✅ ${links.length} link absen siap`);
    } catch {
      toast("❌ Gagal generate link");
    } finally {
      setAbsenLinkGenerating(false);
    }
  };

  const handleCopy = async (url: string, token: string) => {
    try { await navigator.clipboard.writeText(url); setCopiedToken(token); setTimeout(() => setCopiedToken(null), 1500); toast("Link disalin"); } catch { toast(url); }
  };

  const handleCopyAll = async () => {
    if (!absenLinks) return;
    const text = absenLinks.map((l) => `${l.nama}: ${l.url}`).join("\n");
    try { await navigator.clipboard.writeText(text); toast("Semua link disalin"); } catch { toast(text); }
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
          <>
            {/* Hint */}
            <div className="flex items-center justify-center gap-2 mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Lightbulb size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-[0.75rem] text-blue-600 dark:text-blue-400">
                Klik card kelas untuk import siswa, edit dan hapus siswa
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
            {classrooms.map((cls) => {
              const count = kelasCounts[cls.id] || 0;
              const isActive = activeClassroom?.id === cls.id;
              return (
                <button
                  key={cls.id}
                  onClick={() => openKelas(cls)}
                  className={`relative p-4 rounded-xl border-[1.5px] text-left cursor-pointer transition-all ${
                    isActive
                      ? "border-[#0ea5a0] bg-[rgba(14,165,160,0.06)]"
                      : "border-[var(--border)] bg-[var(--card-bg)] hover:border-[#0ea5a0]/40"
                  }`}
                >
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteClassTarget(cls);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/10 active:bg-red-500 text-red-600 active:text-white transition-colors flex items-center justify-center z-10"
                    title="Hapus Kelas"
                  >
                    <Trash2 size={14} />
                  </button>
                  
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
            
            {/* Add Class Button */}
            <button
              onClick={() => setShowAddClassModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[#0ea5a0] text-[var(--text-light)] hover:text-[#0ea5a0] transition-colors bg-[var(--card-bg)] cursor-pointer"
            >
              <UserPlus size={16} />
              <span className="text-[0.8rem] font-bold">Tambah Kelas Baru</span>
            </button>
          </>
        )}
        
        {/* Add Class Modal */}
        {/* Delete Class Modal */}
        {deleteClassTarget && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-end lg:items-center justify-center animate-fade-in" onClick={() => setDeleteClassTarget(null)}>
            <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px] animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
              <div className="text-[0.85rem] font-bold mb-2 text-center text-[#ef4444]">
                Hapus {formatKelasLabel(deleteClassTarget.nama)}?
              </div>
              <p className="text-[var(--text-light)] text-[0.75rem] text-center mb-[14px]">
                Semua data siswa di kelas ini <b className="text-[var(--text)]">({kelasCounts[deleteClassTarget.id] || 0} siswa)</b> akan dinonaktifkan. Riwayat presensi tetap tersimpan.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteClassTarget(null)}
                  className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteClass}
                  disabled={deletingClass}
                  className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] bg-[#ef4444] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {deletingClass ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {showAddClassModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setShowAddClassModal(false)}>
            <div className="bg-[var(--card-bg)] rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="text-[0.9rem] font-bold mb-4">Tambah Kelas Baru</div>
              
              <div className="mb-4">
                <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-2 uppercase">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Contoh: 7A, XII IPA 1, Kelas 5"
                  className="w-full px-3 py-2.5 border-[1.5px] border-[var(--border)] rounded-lg text-[0.85rem] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] font-[inherit]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newClassName.trim()) {
                      handleAddClass();
                    }
                  }}
                />
                <div className="text-[0.65rem] text-[var(--text-light)] mt-1">
                  Akan otomatis diformat: "Kelas 7A", "Kelas XII IPA 1", dll.
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddClassModal(false); setNewClassName(""); }}
                  className="flex-1 py-2.5 rounded-lg border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.8rem] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddClass}
                  disabled={addingClass || !newClassName.trim()}
                  className="flex-1 py-2.5 rounded-lg text-white font-bold text-[0.8rem] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
                >
                  {addingClass ? "Menambahkan..." : "Tambah"}
                </button>
              </div>
            </div>
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

      {/* Absen Mandiri (trial 1-2 guru) */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[0.78rem] font-bold"><Link2 size={14} className="text-[#0ea5a0]" /> Absen Mandiri (PJJ)</div>
          <button
            onClick={handleToggleAbsenMandiri}
            disabled={togglingAbsen}
            className={`relative w-[44px] h-[24px] rounded-full transition-colors ${((selectedKelas || activeClassroom)?.allowSiswaAbsenMandiri) ? "bg-[#0ea5a0]" : "bg-[var(--border)]"}`}
          >
            <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow transition-all ${((selectedKelas || activeClassroom)?.allowSiswaAbsenMandiri) ? "left-[22px]" : "left-[2px]"}`} />
          </button>
        </div>
        <div className="text-[0.68rem] text-[var(--text-light)] mb-2">
          {(selectedKelas || activeClassroom)?.allowSiswaAbsenMandiri ? "Aktif — murid bisa absen via link pribadi" : "Nonaktif — hanya guru yang bisa input"}
        </div>
        {(selectedKelas || activeClassroom)?.allowSiswaAbsenMandiri && (
          <button
            onClick={handleGenerateLinks}
            disabled={absenLinkGenerating || students.length === 0}
            className="w-full flex items-center justify-center gap-2 py-[9px] rounded-[10px] text-white font-bold text-[0.78rem] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
          >
            <Share2 size={14} /> {absenLinkGenerating ? "Membuat..." : `Buat Link Absen (${students.length} siswa)`}
          </button>
        )}
        {absenLinks && (
          <div className="mt-3 max-h-[220px] overflow-y-auto border border-[var(--border)] rounded-lg p-2 bg-[var(--input-bg)]">
            <div className="flex justify-end mb-2">
              <button onClick={handleCopyAll} className="text-[0.7rem] font-bold text-[#0ea5a0] flex items-center gap-1"><Copy size={12} /> Salin Semua</button>
            </div>
            {absenLinks.map((l) => (
              <div key={l.token} className="flex items-center gap-2 py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="flex-1 text-[0.75rem] font-semibold truncate">{l.nama}</span>
                <span className="text-[0.65rem] text-[var(--text-light)] truncate max-w-[150px] hidden sm:inline">{l.url}</span>
                <button onClick={() => handleCopy(l.url, l.token)} className="h-7 px-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[0.7rem] font-bold flex items-center gap-1">
                  {copiedToken === l.token ? <Check size={12} className="text-[#16a34a]" /> : <Copy size={12} />} {copiedToken === l.token ? "Tersalin" : "Salin"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[var(--text-light)]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Cari nama siswa..."
          className="w-full pl-9 pr-[11px] py-[10px] border-[1.5px] border-[var(--border)] rounded-[9px] text-[0.85rem] text-[var(--text)] bg-[var(--input-bg)] outline-none focus:border-[#0ea5a0] focus:shadow-[0_0_0_3px_rgba(14,165,160,0.12)] font-[inherit]"
        />
      </div>

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="flex-1 flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer active:bg-[var(--input-bg)]"
        >
          <FileSpreadsheet size={15} /> Import Excel
        </button>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex-1 flex items-center justify-center gap-[6px] py-[10px] px-[14px] rounded-[10px] text-white font-bold text-[0.82rem] cursor-pointer active:opacity-80"
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

      {showImport && (selectedKelas || activeClassroom) && (
        <div className="mb-3">
          <ImportExcel
            kelasId={(selectedKelas || activeClassroom)!.id}
            existingCount={students.length}
            onImport={handleImport}
            onClose={() => setShowImport(false)}
          />
        </div>
      )}

      {isPRO && showImportUpdate && (selectedKelas || activeClassroom) && (
        <div className="mb-3">
          <ImportUpdateExcel
            kelasId={(selectedKelas || activeClassroom)!.id}
            existingCount={students.length}
            onDone={() => { setShowImportUpdate(false); loadStudents((selectedKelas || activeClassroom)!.id); }}
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[600] flex items-end lg:items-center justify-center animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px] animate-slide-up">
              <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[600] flex items-end lg:items-center justify-center animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditTarget(null);
            }}
          >
            <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px] animate-slide-up">
              <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[600] flex items-end lg:items-center justify-center animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeleteTarget(null);
            }}
          >
            <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px] animate-slide-up">
              <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[600] flex items-end lg:items-center justify-center animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDeleteAll(false);
            }}
          >
            <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px] animate-slide-up">
              <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
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
