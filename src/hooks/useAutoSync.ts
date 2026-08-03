import { useEffect, useRef } from "react";
import { useCloudAuth } from "@/contexts/CloudAuthContext";
import { useSyncDebounce } from "./useSyncDebounce";
import { useCloudRealtime } from "./useCloudRealtime";

const LAST_SYNC_KEY = "presensi_last_sync";
const POLL_INTERVAL = 60 * 1000;

export function useAutoSync() {
  const { cloudEmail, cloudUser, isCloudConnected } = useCloudAuth();
  const { sync, isSyncing, lastSync } = useSyncDebounce(cloudEmail);
  const syncTimerRef = useRef<number>();

  const useRealtime = !!(cloudUser?.id && isCloudConnected);
  const { connected: realtimeConnected } = useCloudRealtime(
    cloudUser?.id || null,
    useRealtime
  );

  useEffect(() => {
    if (lastSync > 0) {
      localStorage.setItem(LAST_SYNC_KEY, lastSync.toString());
      window.dispatchEvent(new Event("storage"));
    }
  }, [lastSync]);

  useEffect(() => {
    if (!isCloudConnected || !cloudEmail) return;

    const triggerSync = () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => sync(true), 2000);
    };

    const handleDataChange = () => {
      // Perubahan yang datang dari realtime cloud tidak perlu di-upload ulang
      if ((window as any).__realtimeDirty) {
        (window as any).__realtimeDirty = false;
        return;
      }
      triggerSync();
    };

    window.addEventListener("data-changed", handleDataChange);

    const handleVisibility = () => {
      if (document.hidden) return;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => sync(true), 1000);
    };
    const handleFocus = () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => sync(true), 1000);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    const pollTimer = setInterval(() => sync(false), POLL_INTERVAL);
    const initTimer = setTimeout(() => sync(true), 5000);

    return () => {
      window.removeEventListener("data-changed", handleDataChange);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      if (pollTimer) clearInterval(pollTimer);
      clearTimeout(initTimer);
    };
  }, [cloudEmail, isCloudConnected, sync, realtimeConnected]);
}

export function triggerAutoSync() {
  window.dispatchEvent(new Event("data-changed"));
}
