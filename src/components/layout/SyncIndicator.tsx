import { useSyncStatus, type SyncStatus } from "@/hooks/useSyncStatus";
import { CloudOff, Cloud, WifiOff, RefreshCw } from "lucide-react";

const STATUS_CONFIG: Record<SyncStatus, { bg: string; icon: React.ReactNode; label: string; title: string }> = {
  synced: {
    bg: "rgba(22,163,74,0.25)",
    icon: <Cloud size={11} />,
    label: "Cloud",
    title: "Tersinkron — data aman di cloud",
  },
  syncing: {
    bg: "rgba(59,130,246,0.25)",
    icon: <RefreshCw size={11} className="animate-spin" />,
    label: "Sync",
    title: "Menyinkronkan...",
  },
  waiting: {
    bg: "rgba(234,179,8,0.25)",
    icon: <CloudOff size={11} />,
    label: "Sync",
    title: "Menunggu sinkronisasi...",
  },
  offline: {
    bg: "rgba(239,68,68,0.25)",
    icon: <WifiOff size={11} />,
    label: "Offline",
    title: "Tidak ada koneksi internet",
  },
  "not-connected": {
    bg: "rgba(234,179,8,0.25)",
    icon: <CloudOff size={11} />,
    label: "Belum",
    title: "Cloud belum terhubung — hubungkan di Pengaturan",
  },
};

export function SyncIndicator() {
  const { status } = useSyncStatus();

  if (status === "not-connected") return null;

  const config = STATUS_CONFIG[status];

  return (
    <div
      className="flex items-center gap-1 text-[0.6rem] px-2 py-1 rounded-full text-white/80"
      style={{ background: config.bg }}
      title={config.title}
    >
      {config.icon}
      <span className="font-semibold">{config.label}</span>
    </div>
  );
}
