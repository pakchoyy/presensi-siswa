import { AppProvider, useApp } from "@/contexts/AppContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/shared/Toast";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Marquee } from "@/components/layout/Marquee";
import { InstallPrompt } from "@/components/shared/InstallPrompt";
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

import { PageName } from "@/types/enums";
import { ConvexProvider } from "convex/react";
import { convexClient } from "@/lib/convex";

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
      <div className="flex-1 flex flex-col lg:max-w-app lg:mx-auto lg:w-full">
        <WizardSetup />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:max-w-[720px] lg:mx-auto lg:w-full">
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
    default:
      return <PresensiPage />;
  }
}

function AppContent() {
  const { setupSelesai } = useApp();
  const { isAuthenticated, loading: authLoading, user } = useAuth();

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
    <ConvexProvider client={convexClient}>
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AppProvider>
      </AuthProvider>
    </ConvexProvider>
  );
}
