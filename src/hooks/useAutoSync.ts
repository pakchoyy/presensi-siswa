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
    
    // Debounced sync - accumulate changes and sync after 3 seconds of inactivity
    const triggerSync = () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      
      syncTimerRef.current = setTimeout(() => {
        syncQueue.push(async () => {
          console.log("[AutoSync] Syncing changes to cloud...");
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
      }, 3000); // 3 seconds debounce
    };
    
    // Listen to storage events (data changes)
    const handleStorageChange = (e: StorageEvent) => {
      // Ignore sync-related storage changes
      if (e.key === "presensi_last_sync" || e.key === "presensi_cloud_email") return;
      
      triggerSync();
    };
    
    // Listen to custom data change events
    const handleDataChange = () => {
      triggerSync();
    };
    
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("data-changed", handleDataChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("data-changed", handleDataChange);
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [cloudEmail, isCloudConnected]);
}

// Helper function to trigger sync manually
export function triggerAutoSync() {
  window.dispatchEvent(new Event("data-changed"));
}
