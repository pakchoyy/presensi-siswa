import { useState, useRef, useCallback } from "react";
import { syncService } from "@/services/sync.service";

const MIN_INTERVAL = 30 * 1000;
const RETRY_BASE = 10_000;
const RETRY_MAX = 60_000;

function dispatchSyncEvent(type: "sync-start" | "sync-end") {
  window.dispatchEvent(new CustomEvent("presensi-sync", { detail: { type } }));
}

export function useSyncDebounce(email: string | null) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(0);

  const lastSyncRef = useRef(0);
  const hasChangesRef = useRef(true);
  const retryCount = useRef(0);
  const timerRef = useRef<number>();
  const pendingRef = useRef(false);

  const doSync = useCallback(async (force = false) => {
    if (!email) return;
    if (pendingRef.current || isSyncing) return;

    const now = Date.now();

    if (!force) {
      if (now - lastSyncRef.current < MIN_INTERVAL) return;
      if (!hasChangesRef.current && lastSyncRef.current > 0) return;
    }

    pendingRef.current = true;
    setIsSyncing(true);
    dispatchSyncEvent("sync-start");

    try {
      const result = await syncService.incrementalSync(email);
      const ts = Date.now();
      lastSyncRef.current = ts;
      hasChangesRef.current = result.hasChanges;
      setLastSync(ts);
      retryCount.current = 0;
    } catch {
      retryCount.current++;
      const delay = Math.min(RETRY_BASE * Math.pow(2, retryCount.current - 1), RETRY_MAX);
      timerRef.current = setTimeout(() => doSync(false), delay);
    } finally {
      pendingRef.current = false;
      setIsSyncing(false);
      dispatchSyncEvent("sync-end");
    }
  }, [email, isSyncing]);

  const resetDebounce = useCallback(() => {
    lastSyncRef.current = 0;
    hasChangesRef.current = true;
  }, []);

  return { sync: doSync, isSyncing, lastSync, resetDebounce };
}
