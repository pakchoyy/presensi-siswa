import { useEffect } from "react";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CloudAuthProvider } from "@/contexts/CloudAuthContext";
import { ToastProvider } from "@/components/shared/Toast";
import { ConfirmDialogProvider } from "@/components/shared/ConfirmDialog";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { attendanceRepo } from "@/repositories/dexie/attendance.repo";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Marquee } from "@/components/layout/Marquee";
import { InstallPrompt } from "@/components/shared/InstallPrompt";
import { useAutoSync } from "@/hooks/useAutoSync";
import { WizardSetup } from "@/components/wizard/WizardSetup";
import { LoginPage } from "@/components/auth/LoginPage";
import { PresensiPage } from "@/components/attendance/PresensiPage";
import { RekapPage } from "@/components/reports/RekapPage";
import { SiswaPage } from "@/components/students/SiswaPage";
import { KalenderPage } from "@/components/calendar/KalenderPage";
import { BackupRestorePage } from "@/components/backup/BackupRestorePage";
import { PetunjukPage } from "@/components/guide/PetunjukPage";
import { TentangKontak } from "@/components/about/TentangKontak";
import { PengaturanPage } from "@/components/pro/PengaturanPage";
import { UpgradePage } from "@/components/pro/UpgradePage";
import { CloudSettingsPage } from "@/components/pro/CloudSettingsPage";

import { PageName } from "@/types/enums";

function PageRouter() {
  const { activePage, setupSelesai, loading } = useApp();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-[var(--text-light)]">
          <div className="text-lg font-bold mb-2">Memuat...</div>
        </div>
      </div>
    );
  }

  if (!setupSelesai) {
    return (
      <div className="flex-1 flex flex-col w-full max-w-full lg:max-w-app lg:mx-auto lg:w-full overflow-x-hidden">
        <WizardSetup />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full max-w-full lg:max-w-[720px] lg:mx-auto lg:w-full overflow-x-hidden">
      <PageContent />
    </div>
  );
}

function PageContent() {
  const { activePage } = useApp();

  switch (activePage) {
    case PageName.PRESENSI:
      return <PresensiPage />;
    case PageName.REKAP:
      return <RekapPage />;
    case PageName.SISWA:
      return <SiswaPage />;
    case PageName.KALENDER:
      return <KalenderPage />;
    case PageName.PETUNJUK:
      return <PetunjukPage />;
    case PageName.TENTANG:
      return <TentangKontak />;
    case PageName.BACKUP:
      return <BackupRestorePage />;
    case PageName.UPGRADE:
      return <UpgradePage />;
    case PageName.PENGATURAN:
      return <PengaturanPage />;
    case PageName.CLOUD_SETTINGS:
      return <CloudSettingsPage />;
    default:
      return <PresensiPage />;
  }
}

function AppContent() {
  const { setupSelesai } = useApp();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  
  // Enable auto-sync for cloud-connected users
  useAutoSync();

  // Sekali jalan: gabungkan siswa "hantu" (nonaktif) ke siswa aktif yang
  // senama, agar riwayat absensi lama tidak hilang setelah soft-delete lalu
  // re-add/import (sumber bug "masuk terus tapi itungan beda").
  useEffect(() => {
    if (localStorage.getItem("bgy_repair_students_v1")) return;
    studentRepo
      .mergeDuplicateStudents()
      .then((n) => {
        if (n > 0) console.log(`[Repair] ${n} siswa hantu digabung`);
        localStorage.setItem("bgy_repair_students_v1", "1");
      })
      .catch((err) => console.error("[Repair] gagal:", err));
  }, []);

  // Sekali jalan: gabungkan sesi duplikat (kelas+tanggal sama) yang terlanjur ada,
  // agar rekap tidak menghitung dua kali untuk hari yang sama.
  useEffect(() => {
    if (localStorage.getItem("bgy_repair_sessions_v1")) return;
    attendanceRepo
      .mergeAllDuplicateSessions()
      .then((n) => {
        if (n > 0) console.log(`[Repair] ${n} tanggal sesi ganda digabung`);
        localStorage.setItem("bgy_repair_sessions_v1", "1");
      })
      .catch((err) => console.error("[Repair] sesi gagal:", err));
  }, []);

  // Show login page only for PRO users or users trying to use cloud features
  // For now, make auth optional - users can use app without login (local only)
  // Auth is needed only for cloud sync features
  
  return (
    <>
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <PageRouter />
      </div>
      {setupSelesai && (
        <div className="sticky bottom-[56px] lg:static z-[95] w-full">
          <Marquee />
          <Footer />
        </div>
      )}
      <BottomNav />
      {setupSelesai && <InstallPrompt />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CloudAuthProvider>
        <AppProvider>
          <ToastProvider>
            <ConfirmDialogProvider />
            <AppContent />
          </ToastProvider>
        </AppProvider>
      </CloudAuthProvider>
    </AuthProvider>
  );
}
