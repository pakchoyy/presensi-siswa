import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { School, Teacher, Classroom, Student } from "@/types/entities";
import { PageName } from "@/types/enums";
import { schoolRepo } from "@/repositories/dexie/school.repo";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import { classroomRepo } from "@/repositories/dexie/classroom.repo";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { setupService } from "@/services/setup.service";
import { licenseService } from "@/services/license.service";
import { useAuth } from "@/contexts/AuthContext";
import { Tier } from "@/types/enums";
import { todayStr } from "@/lib/utils";

interface AppState {
  setupSelesai: boolean;
  school: School | null;
  teacher: Teacher | null;
  classrooms: Classroom[];
  activeClassroom: Classroom | null;
  activePage: PageName;
  tanggalAktif: string;
  darkMode: boolean;
  loading: boolean;
}

interface AppContextType extends AppState {
  setActivePage: (page: PageName) => void;
  setTanggalAktif: (tgl: string) => void;
  setActiveClassroom: (cls: Classroom | null) => void;
  toggleDarkMode: () => void;
  refreshClassrooms: () => Promise<void>;
  refreshStudents: (classroomId: number) => Promise<Student[]>;
  refreshTeacher: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [state, setState] = useState<AppState>({
    setupSelesai: false,
    school: null,
    teacher: null,
    classrooms: [],
    activeClassroom: null,
    activePage: PageName.PRESENSI,
    tanggalAktif: todayStr(),
    darkMode: localStorage.getItem("bgy_presensi_dark") === "1",
    loading: true,
  });

  useEffect(() => {
    async function init() {
      const sudah = await setupService.sudahSetup();
      if (sudah) {
        const [school, teacher, classrooms] = await Promise.all([
          schoolRepo.get(),
          teacherRepo.get(),
          classroomRepo.getAll(),
        ]);
        setState((prev) => ({
          ...prev,
          setupSelesai: true,
          school: school || null,
          teacher: teacher || null,
          classrooms,
          activeClassroom: classrooms[0] || null,
          loading: false,
        }));

      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    }
    init();
  }, [token]);

  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("bgy_presensi_dark", state.darkMode ? "1" : "0");
  }, [state.darkMode]);

  const setActivePage = useCallback((page: PageName) => {
    setState((prev) => ({ ...prev, activePage: page }));
  }, []);

  const setTanggalAktif = useCallback((tgl: string) => {
    setState((prev) => ({ ...prev, tanggalAktif: tgl }));
  }, []);

  const setActiveClassroom = useCallback((cls: Classroom | null) => {
    setState((prev) => ({ ...prev, activeClassroom: cls }));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const refreshClassrooms = useCallback(async () => {
    const classrooms = await classroomRepo.getAll();
    const t = await teacherRepo.get();
    setState((prev) => ({
      ...prev,
      classrooms,
      activeClassroom: classrooms[0] || null,
      setupSelesai: true,
      teacher: t || prev.teacher,
    }));
  }, []);

  const refreshStudents = useCallback(async (classroomId: number) => {
    return studentRepo.getByClass(classroomId);
  }, []);

  const refreshTeacher = useCallback(async () => {
    const teacher = await teacherRepo.get();
    if (teacher) {
      await licenseService.checkExpiry(teacher.id);
    }
    const updated = await teacherRepo.get();
    setState((prev) => ({ ...prev, teacher: updated || null }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        setActivePage,
        setTanggalAktif,
        setActiveClassroom,
        toggleDarkMode,
        refreshClassrooms,
        refreshStudents,
        refreshTeacher,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
