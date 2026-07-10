import { useState, useRef, useCallback } from "react";
import { syncService } from "@/services/sync.service";

const MIN_INTERVAL = 5 * 60 * 1000;
const RETRY_BASE = 10_000;
const RETRY_MAX = 60_000;
const POLL_INTERVAL = 5 * 60 * 1000;

export function useSyncDebounce(email: string | null) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(0);

  const lastSyncRef = useRef(0);
  const hasChangesRef = useRef(true);
  const retryCount = useRef(0);
  const timerRef = useRef<number>();

  const doSync = useCallback(async () => {
    if (!email) return;
    const now = Date.now();

    if (now - lastSyncRef.current < MIN_INTERVAL) return;
    if (!hasChangesRef.current && lastSyncRef.current > 0) return;

    setIsSyncing(true);

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
      timerRef.current = setTimeout(doSync, delay);
    } finally {
      setIsSyncing(false);
    }
  }, [email]);

  const resetDebounce = useCallback(() => {
    lastSyncRef.current = 0;
    hasChangesRef.current = true;
  }, []);

  return { sync: doSync, isSyncing, lastSync, resetDebounce };
}
