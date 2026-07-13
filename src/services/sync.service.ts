import { db } from "@/repositories/dexie/db";
import { convexClient } from "@/lib/convex";

export type SyncStatus = "tersinkron" | "menyinkronkan" | "menunggu" | "error";

const LAST_SYNC_KEY = "presensi_last_sync";

// Get last sync timestamp from localStorage
function getLastSyncTimestamp(): number {
  const stored = localStorage.getItem(LAST_SYNC_KEY);
  return stored ? parseInt(stored) : 0;
}

// Save last sync timestamp to localStorage
function saveLastSyncTimestamp(timestamp: number) {
  localStorage.setItem(LAST_SYNC_KEY, timestamp.toString());
}

// Get data changed since timestamp
async function getChangedData(since: number) {
  const tables = [
    "schools",
    "teachers",
    "academicYears",
    "classrooms",
    "students",
    "attendanceSessions",
    "attendanceRecords",
    "calendarEntries",
  ];

  const changes: Record<string, any[]> = {};

  for (const table of tables) {
    try {
      // Get all records modified after 'since' timestamp
      const records = await db.table(table).toArray();
      changes[table] = records.filter((r: any) => {
        const modifiedAt = r.diubahPada || r.dibuatPada || 0;
        return modifiedAt > since;
      });
    } catch (error) {
      console.error(`getChangedData error for table ${table}:`, error);
      changes[table] = [];
    }
  }

  return changes;
}

export const syncService = {
  /**
   * Initial upload - First time sync from local to cloud
   */
  async initialUpload(email: string): Promise<number> {
    try {
      const schools = await db.table("schools").toArray();
      const teachers = await db.table("teachers").toArray();
      const academicYears = await db.table("academicYears").toArray();
      const classrooms = await db.table("classrooms").toArray();
      const students = await db.table("students").toArray();
      const attendanceSessions = await db.table("attendanceSessions").toArray();
      const attendanceRecords = await db.table("attendanceRecords").toArray();
      const calendarEntries = await db.table("calendarEntries").toArray();

      const result = await (convexClient as any).mutation("sync:initialUpload", {
        email,
        schools,
        teachers,
        academicYears,
        classrooms,
        students,
        attendanceSessions,
        attendanceRecords,
        calendarEntries,
      });

      return (result as any).totalUploaded || 0;
    } catch (error) {
      console.error("Initial upload failed:", error);
      return 0;
    }
  },

  /**
   * Download all data from cloud and merge with local
   */
  async downloadAll(email: string): Promise<number> {
    try {
      const cloudData = await (convexClient as any).query("sync:downloadAll", { email });

      let count = 0;
      const tables = [
        "schools",
        "teachers",
        "academicYears",
        "classrooms",
        "students",
        "attendanceSessions",
        "attendanceRecords",
        "calendarEntries",
      ];

      await db.transaction("rw", tables.map((t) => db.table(t)), async () => {
        // Process each entity type
        for (const table of tables) {
          const cloudRows = (cloudData as any)[table] as any[];
          if (!cloudRows || cloudRows.length === 0) continue;

          for (const cloudRow of cloudRows) {
            // Map cloud data back to local format
            const localData = {
              id: cloudRow.localId,
              ...cloudRow,
            };

            // Remove cloud-specific fields
            delete (localData as any).userId;
            delete (localData as any).localId;
            delete (localData as any).lastSyncedAt;
            delete (localData as any).version;
            delete (localData as any)._id;
            delete (localData as any)._creationTime;

            const existing = await db.table(table).get(localData.id);
            if (existing) {
              const localTime = (existing as any).diubahPada || 0;
              const cloudTime = (localData as any).diubahPada || 0;
              if (cloudTime >= localTime) {
                await db.table(table).put(localData);
                count++;
              }
            } else {
              await db.table(table).put(localData);
              count++;
            }
          }
        }

        // Process tombstones (deletions from other devices)
        if (cloudData.tombstones && cloudData.tombstones.length > 0) {
          for (const tomb of cloudData.tombstones) {
            await db.table(tomb.entityType).delete(tomb.localId);
          }
        }
      });

      return count;
    } catch (error) {
      console.error("Download all failed:", error);
      return 0;
    }
  },

  /**
   * Get sync status from cloud
   */
  async getSyncStatus(email: string) {
    try {
      return await (convexClient as any).query("sync:getSyncStatus", { email });
    } catch (error) {
      console.error("Get sync status failed:", error);
      return null;
    }
  },

  /**
   * Incremental sync - only sync changed data
   */
  async incrementalSync(email: string): Promise<{ uploaded: number; downloaded: number; hasChanges: boolean }> {
    try {
      const lastSync = getLastSyncTimestamp();
      const now = Date.now();

      // Get local changes since last sync
      const localChanges = await getChangedData(lastSync);

      // Get local tombstones (deletions to propagate)
      const localTombstones = await db.tombstones.toArray();

      // Upload local changes + deletions
      const uploadResult = await (convexClient as any).mutation("sync:incrementalUpload", {
        email,
        changes: localChanges,
        deletions: localTombstones.map((t) => ({ entityType: t.entityType, localId: t.localId })),
      });

      // Download cloud changes since last sync
      const cloudData = await (convexClient as any).query("sync:incrementalSync", {
        email,
        lastSyncedAt: lastSync,
      });

      let downloaded = 0;
      const tables = [
        "schools",
        "teachers",
        "academicYears",
        "classrooms",
        "students",
        "attendanceSessions",
        "attendanceRecords",
        "calendarEntries",
      ];

      // Merge cloud changes to local
      if (cloudData.hasChanges) {
        await db.transaction("rw", tables.map((t) => db.table(t)), async () => {
          for (const table of tables) {
            const cloudRows = (cloudData as any)[table] as any[];
            if (!cloudRows || cloudRows.length === 0) continue;

            for (const cloudRow of cloudRows) {
              const localData = {
                id: cloudRow.localId,
                ...cloudRow,
              };

              // Remove cloud-specific fields
              delete (localData as any).userId;
              delete (localData as any).localId;
              delete (localData as any).lastSyncedAt;
              delete (localData as any).version;
              delete (localData as any)._id;
              delete (localData as any)._creationTime;

              const existing = await db.table(table).get(localData.id);
              if (existing) {
                const localTime = (existing as any).diubahPada || 0;
                const cloudTime = (localData as any).diubahPada || 0;
                if (cloudTime >= localTime) {
                  await db.table(table).put(localData);
                  downloaded++;
                }
              } else {
                await db.table(table).put(localData);
                downloaded++;
              }
            }
          }
        });

        // Process cloud tombstones (deletions from other devices)
        if (cloudData.tombstones && cloudData.tombstones.length > 0) {
          for (const tomb of cloudData.tombstones) {
            await db.table(tomb.entityType).delete(tomb.localId);
          }
        }
      }

      // Clear local tombstones after successful upload
      await db.tombstones.clear();

      // Update last sync timestamp
      saveLastSyncTimestamp(now);

      return {
        uploaded: uploadResult.updated || 0,
        downloaded,
        hasChanges: cloudData.hasChanges || uploadResult.updated > 0,
      };
    } catch (error) {
      console.error("Incremental sync failed:", error);
      return { uploaded: 0, downloaded: 0, hasChanges: false };
    }
  },

  /**
   * Full sync - for first time or when incremental fails
   */
  async fullSync(email: string): Promise<{ uploaded: number; downloaded: number }> {
    const uploaded = await this.initialUpload(email);
    const downloaded = await this.downloadAll(email);
    // Save sync timestamp after full sync
    saveLastSyncTimestamp(Date.now());
    return { uploaded, downloaded };
  },

  /**
   * Smart sync - use incremental if possible, fallback to full sync
   */
  async syncAll(email: string): Promise<{ uploaded: number; downloaded: number }> {
    const lastSync = getLastSyncTimestamp();
    
    // If never synced before, do full sync
    if (lastSync === 0) {
      return await this.fullSync(email);
    }

    // Try incremental sync first
    try {
      const result = await this.incrementalSync(email);
      return { uploaded: result.uploaded, downloaded: result.downloaded };
    } catch (error) {
      console.error("Incremental sync failed, falling back to full sync", error);
      return await this.fullSync(email);
    }
  },

  /**
   * Reset sync state (force full sync next time)
   */
  resetSyncState() {
    localStorage.removeItem(LAST_SYNC_KEY);
  },
};
