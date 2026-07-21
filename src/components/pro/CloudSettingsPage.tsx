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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    if (!cloudEmail) return;
    setDeleting(backupId);
    setDeleteConfirmId(null);
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

      {/* Manual Upload / Tarik */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-[0.8rem] font-bold flex items-center gap-2 mb-2">
          <Upload size={15} className="text-[#0ea5a0]" /> Upload & Tarik Manual
        </div>
        <div className="text-[0.68rem] text-[var(--text-light)] mb-3">
          Upload data lokal ke cloud, atau tarik data dari cloud ke device ini.
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!cloudEmail) return;
              setSyncing(true);
              try {
                await syncService.initialUpload(cloudEmail);
                toast("✅ Upload ke cloud berhasil");
              } catch (error) {
                toast("❌ Upload gagal. Coba lagi.");
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="flex-1 flex items-center justify-center gap-[5px] py-[9px] rounded-[10px] bg-[#0ea5a0] text-white font-bold text-[0.75rem] border-none cursor-pointer disabled:opacity-50"
          >
            <Upload size={13} /> {syncing ? "Memproses..." : "Upload ke Cloud"}
          </button>
          <button
            onClick={async () => {
              if (!cloudEmail) return;
              setSyncing(true);
              try {
                const count = await syncService.downloadAll(cloudEmail);
                toast(`✅ Tarik dari cloud berhasil (${count} data)`);
              } catch (error) {
                toast("❌ Tarik gagal. Coba lagi.");
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="flex-1 flex items-center justify-center gap-[5px] py-[9px] rounded-[10px] border border-[#0ea5a0] text-[#0ea5a0] font-bold text-[0.75rem] cursor-pointer bg-transparent disabled:opacity-50"
          >
            <Download size={13} /> {syncing ? "Memproses..." : "Tarik dari Cloud"}
          </button>
        </div>
      </div>

      {/* Sync Sekarang (combined) */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="flex items-center justify-between">
          <div className="text-[0.8rem] font-bold flex items-center gap-2">
            <RefreshCw size={15} className="text-[#0ea5a0]" /> Sync Semua
          </div>
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex items-center gap-[5px] px-[14px] py-[8px] rounded-[10px] bg-[#0ea5a0] text-white font-bold text-[0.75rem] border-none cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Menyinkronkan..." : "Sync Sekarang"}
          </button>
        </div>
        <div className="text-[0.68rem] text-[var(--text-light)] mt-2">
          Upload + Tarik sekaligus. Semua device akan mendapat data terbaru.
        </div>
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
                  onClick={() => setDeleteConfirmId(backup._id)}
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
      
      {/* Delete Backup Modal */}
      {deleteConfirmId && cloudBackups && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-end lg:items-center justify-center animate-fade-in" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] mx-4 px-4 pt-[18px] pb-[22px] animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
            <div className="text-[0.85rem] font-bold mb-2 text-center text-[#ef4444]">
              Hapus Backup?
            </div>
            <p className="text-[var(--text-light)] text-[0.75rem] text-center mb-[14px]">
              Backup <b className="text-[var(--text)]">{cloudBackups.find(b => b._id === deleteConfirmId)?.label || ""}</b> akan dihapus permanen.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteBackup(deleteConfirmId)}
                disabled={deleting !== null}
                className="flex-1 flex items-center justify-center py-[10px] px-[14px] rounded-[10px] bg-[#ef4444] text-white font-bold text-[0.82rem] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting === deleteConfirmId ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
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
