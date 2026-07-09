import { useEffect, useRef } from "react";
import { useCloudAuth } from "@/contexts/CloudAuthContext";
import { syncService } from "@/services/sync.service";

let syncQueue: (() => Promise<void>)[] = [];
let isProcessing = false;

async function processSyncQueue() {
  if (isProcessing || syncQueue.length === 0) return;
  
  isProcessing = true;
  
  while (syncQueue.length > 0) {
    const syncTask = syncQueue.shift();
    if (syncTask) {
      try {
        await syncTask();
        // Wait a bit before next sync to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error("Auto-sync failed:", error);
        // Retry after delay
        setTimeout(() => {
          if (syncTask) syncQueue.push(syncTask);
        }, 5000);
      }
    }
  }
  
  isProcessing = false;
}

export function useAutoSync() {
  const { cloudEmail, isCloudConnected } = useCloudAuth();
  const syncTimerRef = useRef<number>();
  
  useEffect(() => {
    if (!isCloudConnected || !cloudEmail) return;

    const doSync = async () => {
      syncQueue.push(async () => {
        try {
          const result = await syncService.incrementalSync(cloudEmail);
          if (result.uploaded > 0 || result.downloaded > 0) {
            console.log(`[AutoSync] ✅ ${result.uploaded} uploaded, ${result.downloaded} downloaded`);
          }
        } catch (error) {
          console.error("[AutoSync] Failed:", error);
          throw error;
        }
      });
      processSyncQueue();
    };
    
    // Debounced sync - accumulate changes and sync after 3 seconds of inactivity
    const triggerSync = () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = setTimeout(doSync, 3000);
    };
    
    // Listen to storage events (data changes)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "presensi_last_sync" || e.key === "presensi_cloud_email") return;
      triggerSync();
    };
    
    // Listen to custom data change events
    const handleDataChange = () => triggerSync();
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("data-changed", handleDataChange);
    
    // Periodic polling: sync every 30s to pick up changes from other devices
    const pollInterval = setInterval(doSync, 30000);
    
    // Initial sync after 5s (let app fully initialize first)
    const initialTimer = setTimeout(doSync, 5000);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("data-changed", handleDataChange);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      clearInterval(pollInterval);
      clearTimeout(initialTimer);
    };
  }, [cloudEmail, isCloudConnected]);
}

// Helper function to trigger sync manually
export function triggerAutoSync() {
  window.dispatchEvent(new Event("data-changed"));
}
