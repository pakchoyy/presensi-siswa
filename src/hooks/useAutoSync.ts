import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCloudAuth } from "@/contexts/CloudAuthContext";
import { useSyncDebounce } from "./useSyncDebounce";
import { useCloudRealtime } from "./useCloudRealtime";

const LAST_SYNC_KEY = "presensi_last_sync";
const POLL_INTERVAL = 60 * 1000;

export function useAutoSync() {
  const { user } = useAuth();
  const { cloudEmail, isCloudConnected } = useCloudAuth();
  const { sync, isSyncing, lastSync } = useSyncDebounce(cloudEmail);
  const syncTimerRef = useRef<number>();

  const useRealtime = !!(user?.id && isCloudConnected);
  const { connected: realtimeConnected } = useCloudRealtime(
    user?.id || null,
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

    const handleDataChange = () => triggerSync();

    window.addEventListener("data-changed", handleDataChange);

    const pollTimer = setInterval(() => sync(false), POLL_INTERVAL);
    const initTimer = setTimeout(() => sync(true), 5000);

    return () => {
      window.removeEventListener("data-changed", handleDataChange);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      if (pollTimer) clearInterval(pollTimer);
      clearTimeout(initTimer);
    };
  }, [cloudEmail, isCloudConnected, sync, realtimeConnected]);
}

export function triggerAutoSync() {
  window.dispatchEvent(new Event("data-changed"));
}
