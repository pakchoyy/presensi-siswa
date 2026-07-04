import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { syncService } from "@/services/sync.service";
import { useToast } from "@/components/shared/Toast";
import { useApp } from "@/contexts/AppContext";
import { 
  ArrowLeft, Smartphone, Cloud, Upload, 
  Trash2, Download, Clock, RefreshCw, AlertCircle 
} from "lucide-react";
import { PageName } from "@/types/enums";

export function CloudSettingsPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { setActivePage } = useApp();
  const [syncing, setSyncing] = useState(false);
  const [loggingOut, setLoggingOut] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Queries
  const activeDevices = useQuery(api.users.getActiveDevices, 
    token ? { token } : "skip"
  );
  const syncStatus = useQuery(api.sync.getSyncStatus, 
    token ? { token } : "skip"
  );
  const cloudBackups = useQuery(api.backup.listCloudBackups,
    token ? { token } : "skip"
  );

  // Mutations
  const logoutDevice = useMutation(api.users.logoutDevice);
  const deleteBackup = useMutation(api.backup.deleteCloudBackup);

  // Handlers
  const handleManualSync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      const result = await syncService.syncAll(token);
      toast(`✅ Sync selesai: ${result.uploaded} upload, ${result.downloaded} download`);
    } catch (error) {
      toast("❌ Sync gagal. Coba lagi.");
    } finally {
      setSyncing(false);
    }
  };

  const handleLogoutDevice = async (deviceId: string) => {
    if (!token) return;
    setLoggingOut(deviceId);
    try {
      await logoutDevice({ token, deviceId });
      toast("✅ Device berhasil logout");
    } catch (error) {
      toast("❌ Gagal logout device");
    } finally {
      setLoggingOut(null);
    }
  };

  const handleDeleteBackup = async (backupId: any) => {
    if (!token || !confirm("Hapus backup ini?")) return;
    setDeleting(backupId);
    try {
      await deleteBackup({ token, backupId });
      toast("✅ Backup dihapus");
    } catch (error) {
      toast("❌ Gagal hapus backup");
    } finally {
      setDeleting(null);
    }
  };

  if (!token || !user) {
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
                {device.isCurrent ? (
                  <span className="text-[0.65rem] text-[#0ea5a0] font-bold flex-shrink-0">
                    Device Ini
                  </span>
                ) : (
                  <button
                    onClick={() => handleLogoutDevice(device.deviceId)}
                    disabled={loggingOut !== null}
                    className="px-3 py-1.5 text-[0.7rem] bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex-shrink-0"
                  >
                    {loggingOut === device.deviceId ? "..." : "Logout"}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[0.75rem] text-[var(--text-light)]">
            Tidak ada device aktif
          </p>
        )}
      </div>

      {/* Section 2: Sync Status */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-[0.8rem] font-bold flex items-center gap-2 mb-3">
          <Cloud size={15} /> Sync Status
        </div>
        
        {syncStatus && syncStatus.length > 0 ? (
          <div className="space-y-2 mb-3">
            {syncStatus.map((meta: any) => (
              <div key={meta.entityType} className="flex justify-between text-[0.72rem]">
                <span className="text-[var(--text-light)] capitalize">{meta.entityType}:</span>
                <span className="font-semibold">{meta.totalRecords} records</span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-[0.7rem] text-[var(--text-light)] pt-2 border-t border-[var(--border)]">
              <Clock size={12} />
              Last synced: {formatRelativeTime(syncStatus[0]?.lastSyncedAt)}
            </div>
          </div>
        ) : (
          <p className="text-[0.75rem] text-[var(--text-light)] mb-3">
            Belum ada sync
          </p>
        )}

        <button
          onClick={handleManualSync}
          disabled={syncing || !token}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white font-bold text-[0.78rem] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: syncing ? "#999" : "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
        >
          {syncing ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Upload size={14} />
              Sync Now
            </>
          )}
        </button>
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
