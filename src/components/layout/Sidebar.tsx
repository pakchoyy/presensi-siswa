import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { PageName, Tier } from "@/types/enums";
import { PRO_PRICE } from "@/lib/constants";
import { classroomRepo } from "@/repositories/dexie/classroom.repo";
import { academicYearRepo } from "@/repositories/dexie/academic-year.repo";
import { useToast } from "@/components/shared/Toast";
import type { Classroom } from "@/types/entities";
import { generateId, timestamp } from "@/lib/utils";
import {
  ClipboardCheck,
  BarChart3,
  Users,
  Calendar,
  BookOpen,
  Info,
  Settings,
  Database,
  ArrowUpCircle,
  School,
  GraduationCap,
  Plus,
  Lock,
  X,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  page: PageName;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { page: PageName.PRESENSI, label: "Presensi", icon: ClipboardCheck },
  { page: PageName.REKAP, label: "Rekap", icon: BarChart3 },
  { page: PageName.SISWA, label: "Siswa", icon: Users },
  { page: PageName.KALENDER, label: "Kalender", icon: Calendar },
  { page: PageName.UPGRADE, label: "Upgrade PRO", icon: ArrowUpCircle },
  { page: PageName.PETUNJUK, label: "Petunjuk", icon: BookOpen },
  { page: PageName.BACKUP, label: "Backup", icon: Database },
];

export function Sidebar() {
  const {
    setupSelesai,
    school,
    teacher,
    classrooms,
    activeClassroom,
    activePage,
    setActivePage,
    setActiveClassroom,
    refreshClassrooms,
  } = useApp();
  const { toast } = useToast();

  const [showAddKelas, setShowAddKelas] = useState(false);
  const [newKelasName, setNewKelasName] = useState("");

  if (!setupSelesai) return null;

  const isPRO = teacher?.tier === "PRO";

  const handleAddKelas = async () => {
    const nama = newKelasName.trim();
    if (!nama) {
      toast("Isi nama kelas dulu ya");
      return;
    }
    const ay = await academicYearRepo.getActive();
    if (!ay || !teacher) return;

    const classroom: Classroom = {
      id: generateId(),
      nama,
      tahunAjaranId: ay.id,
      guruId: teacher.id,
      statusAktif: true,
      dibuatPada: timestamp(),
      diubahPada: timestamp(),
    };
    await classroomRepo.save(classroom);
    toast("Kelas berhasil ditambahkan");
    setNewKelasName("");
    setShowAddKelas(false);
    await refreshClassrooms();
  };

  return (
    <aside
      className="hidden lg:flex flex-col w-64 flex-shrink-0 min-h-[calc(100vh-3.5rem)] border-r border-[var(--border)] bg-[var(--card-bg)] sticky top-14"
    >
      {/* Info Sekolah & Guru */}
      <div className="px-4 pt-4 pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-1">
          <School size={14} className="text-[var(--text-light)]" />
          <span className="text-[0.72rem] font-semibold text-[var(--text-light)] truncate">
            {school?.nama || "Sekolah"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <GraduationCap size={14} className="text-[var(--text-light)]" />
          <span className="text-[0.72rem] text-[var(--text-light)] truncate">
            {teacher?.nama || "Guru"}
          </span>
        </div>
      </div>

      {/* Daftar Kelas */}
      <div className="px-3 py-3 border-b border-[var(--border)]">
        <div className="text-[0.6rem] font-bold uppercase tracking-[0.8px] text-[var(--text-light)] mb-2 px-1">
          Kelas
        </div>
        {classrooms.map((cls) => {
          const isActive = activeClassroom?.id === cls.id;
          return (
            <button
              key={cls.id}
              onClick={() => {
                setActiveClassroom(cls);
                setActivePage(PageName.PRESENSI);
              }}
              className={`w-full flex items-center gap-2 px-3 py-[8px] rounded-lg text-left text-[0.8rem] font-semibold transition-colors mb-[2px] ${
                isActive
                  ? "bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                  : "text-[var(--text)] hover:bg-[var(--input-bg)]"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isActive ? "bg-[#0ea5a0]" : "bg-[var(--border)]"
                }`}
              />
              <span className="truncate">{cls.nama}</span>
              {isActive && (
                <span className="ml-auto text-[0.6rem] text-[#0ea5a0] font-medium">
                  aktif
                </span>
              )}
            </button>
          );
        })}
        {classrooms.length === 0 && (
          <div className="text-[0.7rem] text-[var(--text-light)] px-3 py-2">
            Belum ada kelas
          </div>
        )}

        {/* Tambah Kelas */}
        {showAddKelas ? (
          <div className="px-3 mt-1">
            <div className="flex gap-1">
              <input
                type="text"
                value={newKelasName}
                onChange={(e) => setNewKelasName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddKelas()}
                placeholder="Nama kelas baru"
                className="flex-1 px-2 py-[6px] border-[1.5px] border-[var(--border)] rounded-[6px] text-[0.72rem] bg-[var(--input-bg)] outline-none font-[inherit]"
                autoFocus
              />
              <button
                onClick={handleAddKelas}
                className="px-2 py-[6px] rounded-[6px] text-white text-[0.7rem] font-bold cursor-pointer"
                style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}
              >
                OK
              </button>
              <button
                onClick={() => setShowAddKelas(false)}
                className="px-2 py-[6px] rounded-[6px] text-[var(--text-light)] text-[0.7rem] cursor-pointer bg-transparent border-none"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              if (isPRO) {
                setShowAddKelas(true);
              } else {
                setActivePage(PageName.PENGATURAN);
              }
            }}
            className={`w-full flex items-center gap-2 px-3 py-[7px] rounded-lg text-left text-[0.75rem] font-semibold transition-colors mt-1 ${
              isPRO
                ? "text-[var(--text-light)] hover:bg-[var(--input-bg)]"
                : "text-[#b45309] hover:bg-[#fef3c7]/50"
            }`}
          >
            {isPRO ? (
              <Plus size={14} className="text-[#0ea5a0]" />
            ) : (
              <Lock size={13} className="text-[#b45309]" />
            )}
            <span>{isPRO ? "Tambah Kelas" : "Tambah Kelas (PRO)"}</span>
          </button>
        )}
      </div>

      {/* Navigasi Utama */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <div className="text-[0.6rem] font-bold uppercase tracking-[0.8px] text-[var(--text-light)] mb-2 px-1">
          Menu
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => setActivePage(item.page)}
              className={`w-full flex items-center gap-3 px-3 py-[8px] rounded-lg text-left text-[0.8rem] font-semibold transition-colors mb-[2px] ${
                isActive
                  ? "bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                  : "text-[var(--text)] hover:bg-[var(--input-bg)]"
              }`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* PRO Badge / Upgrade */}
      <div className="px-3 py-3 border-t border-[var(--border)]">
        {isPRO ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(14,165,160,0.1)]">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[0.6rem] font-bold"
              style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}>
              PRO
            </div>
            <span className="text-[0.72rem] font-semibold text-[#0ea5a0]">Akun PRO</span>
          </div>
        ) : (
          <button
            onClick={() => setActivePage(PageName.PENGATURAN)}
            className="w-full flex items-center gap-2 px-3 py-[8px] rounded-lg text-[0.78rem] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
          >
            <ArrowUpCircle size={16} />
            <span>Upgrade PRO</span>
            <span className="ml-auto text-[0.65rem] opacity-90">{PRO_PRICE}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
