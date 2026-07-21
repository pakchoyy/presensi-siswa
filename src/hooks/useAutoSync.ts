import { useEffect, useRef } from "react";
import { useCloudAuth } from "@/contexts/CloudAuthContext";
import { useSyncDebounce } from "./useSyncDebounce";

export function useAutoSync() {
  const { cloudEmail, isCloudConnected } = useCloudAuth();
  const { sync, isSyncing } = useSyncDebounce(cloudEmail);
  const syncTimerRef = useRef<number>();

  useEffect(() => {
    if (!isCloudConnected || !cloudEmail) return;

    const triggerSync = () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => sync(true), 1000);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "presensi_last_sync" || e.key === "presensi_cloud_email") return;
      triggerSync();
    };

    const handleDataChange = () => triggerSync();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("data-changed", handleDataChange);

    const pollTimer = setInterval(() => sync(false), 30 * 1000);
    const initTimer = setTimeout(() => sync(true), 3000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("data-changed", handleDataChange);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      clearInterval(pollTimer);
      clearTimeout(initTimer);
    };
  }, [cloudEmail, isCloudConnected, sync]);
}

export function triggerAutoSync() {
  window.dispatchEvent(new Event("data-changed"));
}
