import { useState } from "react";
import { useCloudAuth } from "@/contexts/CloudAuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { syncService } from "@/services/sync.service";
import { useToast } from "@/components/shared/Toast";
import { useApp } from "@/contexts/AppContext";
import { 
  ArrowLeft, Smartphone, Cloud, Upload, 
  Trash2, Download, Clock, RefreshCw, AlertCircle, Info 
} from "lucide-react";
import { PageName } from "@/types/enums";

export function CloudSettingsPage() {
  const { cloudUser, cloudEmail } = useCloudAuth();
  const { toast } = useToast();
  const { setActivePage } = useApp();
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Queries
  const activeDevices = useQuery(api.users.getActiveDevices, 
    cloudEmail ? { email: cloudEmail } : "skip"
  );
  const syncStatus = useQuery(api.sync.getSyncStatus, 
    cloudEmail ? { email: cloudEmail } : "skip"
  );
  const cloudBackups = useQuery(api.backup.listCloudBackups,
    cloudEmail ? { email: cloudEmail } : "skip"
  );

  // Mutations
  const deleteBackup = useMutation(api.backup.deleteCloudBackup);

  // Handlers
  const handleManualSync = async () => {
    if (!cloudEmail) return;
    setSyncing(true);
    try {
      const result = await syncService.syncAll(cloudEmail);
      toast(`✅ Sync selesai: ${result.uploaded} upload, ${result.downloaded} download`);
    } catch (error) {
      toast("❌ Sync gagal. Coba lagi.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteBackup = async (backupId: any) => {
    if (!cloudEmail || !confirm("Hapus backup ini?")) return;
    setDeleting(backupId);
    try {
      await deleteBackup({ email: cloudEmail, backupId });
      toast("✅ Backup dihapus");
    } catch (error) {
      toast("❌ Gagal hapus backup");
    } finally {
      setDeleting(null);
    }
  };

  if (!cloudEmail || !cloudUser) {
    return (
      <div className="flex-1 px-[14px] pt-[14px] pb-[90px] lg:pb-4">
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-[var(--text-light)]" />
          <div className="text-[0.85rem] font-bold mb-2">Belum Login</div>
          <p className="text-[0.75rem] text-[var(--text-light)] mb-3">
            Anda harus login terlebih dahulu untuk mengakses Cloud Settings.
          </p>
          <button
            onClick={() => setActivePage(PageName.PENGATURAN)}
            className="px-4 py-2 rounded-lg bg-[#0ea5a0] text-white font-bold text-[0.78rem]"
          >
            Kembali ke Pengaturan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-[14px] pt-[14px] pb-[90px] lg:pb-4">
      {/* Header with Back Button */}
      <button
        onClick={() => setActivePage(PageName.PENGATURAN)}
        className="flex items-center gap-2 text-[0.78rem] font-bold text-[#0ea5a0] mb-3 bg-transparent border-none cursor-pointer"
      >
        <ArrowLeft size={16} /> Kembali
      </button>

      <div className="text-[1.1rem] font-bold mb-3">
        Cloud Sync & Device Management
      </div>

      {/* Section 1: Active Devices */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-[0.8rem] font-bold flex items-center gap-2 mb-3">
          <Smartphone size={15} /> Active Devices ({activeDevices?.length || 0}/3)
        </div>
        
        {activeDevices && activeDevices.length > 0 ? (
          <div className="space-y-2">
            {activeDevices.map((device: any) => (
              <div key={device.deviceId} className="flex items-center gap-3 p-3 bg-[var(--input-bg)] rounded-lg border border-[var(--border)]">
                <Smartphone size={16} className="text-[var(--text-light)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[0.78rem] font-semibold truncate">
                    {device.deviceName}
                  </div>
                  <div className="text-[0.68rem] text-[var(--text-light)]">
                    Last active: {formatRelativeTime(device.lastActiveAt)}
                  </div>
                </div>
                <span className="text-[0.65rem] text-[var(--text-light)] flex-shrink-0">
                  {device.deviceId.substring(0, 8)}...
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[0.75rem] text-[var(--text-light)]">
            Tidak ada device aktif
          </p>
        )}
      </div>

      {/* Auto-Sync Info */}
      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800 p-[14px] mb-3">
        <div className="text-[0.8rem] font-bold flex items-center gap-2 mb-2">
          <Cloud size={15} className="text-blue-600 dark:text-blue-400" />
          <span className="text-blue-900 dark:text-blue-100">Auto-Sync Aktif</span>
        </div>
        <div className="text-[0.72rem] text-blue-900 dark:text-blue-100">
          Semua perubahan data otomatis tersinkronisasi ke cloud dalam 3 detik. Tidak perlu klik tombol apapun.
        </div>
      </div>

      {/* Section 3: Cloud Backups */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px]">
        <div className="text-[0.8rem] font-bold flex items-center gap-2 mb-3">
          <Download size={15} /> Cloud Backups
        </div>
        
        {cloudBackups && cloudBackups.length > 0 ? (
          <div className="space-y-2">
            {cloudBackups.map((backup: any) => (
              <div key={backup._id} className="flex items-center gap-3 p-3 bg-[var(--input-bg)] rounded-lg border border-[var(--border)]">
                <div className="flex-1 min-w-0">
                  <div className="text-[0.75rem] font-semibold truncate">
                    {backup.label}
                  </div>
                  <div className="text-[0.68rem] text-[var(--text-light)]">
                    {backup.totalEntitas} items • {formatBytes(backup.size)}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteBackup(backup._id)}
                  disabled={deleting !== null}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg disabled:opacity-50 flex-shrink-0"
                  title="Hapus backup"
                >
                  {deleting === backup._id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[0.75rem] text-[var(--text-light)]">
            Belum ada backup
          </p>
        )}
      </div>

      {/* Multi-Device Instructions */}
      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800 p-[14px]">
        <div className="text-[0.8rem] font-bold flex items-center gap-2 mb-2">
          <Info size={15} className="text-blue-600 dark:text-blue-400" />
          <span className="text-blue-900 dark:text-blue-100">
            Cara Sync ke Perangkat Lain
          </span>
        </div>
        
        <div className="space-y-2 text-[0.72rem] text-blue-900 dark:text-blue-100">
          <div>
            <b>1. Buka aplikasi di perangkat baru</b> (HP/laptop kedua)
          </div>
          <div>
            <b>2. Masuk ke menu Pengaturan → Lisensi PRO</b>
          </div>
          <div>
            <b>3. Aktivasi lisensi dengan email yang SAMA:</b>
            <div className="mt-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded font-mono text-[0.7rem]">
              {cloudUser?.email}
            </div>
          </div>
          <div>
            <b>4. Cloud sync otomatis aktif</b> → Data langsung tersinkronisasi
          </div>
          <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
            💡 <b>Tips:</b> Gunakan email lisensi yang sama di semua perangkat untuk sync otomatis
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  return `${days} hari lalu`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}
