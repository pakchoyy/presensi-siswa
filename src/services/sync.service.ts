import { db } from "@/repositories/dexie/db";
import { convexClient } from "@/lib/convex";

export type SyncStatus = "tersinkron" | "menyinkronkan" | "menunggu" | "error";

export const syncService = {
  /**
   * Initial upload - First time sync from local to cloud
   */
  async initialUpload(token: string): Promise<number> {
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
        token,
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
  async downloadAll(token: string): Promise<number> {
    try {
      const cloudData = await (convexClient as any).query("sync:downloadAll", { token });

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
  async getSyncStatus(token: string) {
    try {
      return await (convexClient as any).query("sync:getSyncStatus", { token });
    } catch (error) {
      console.error("Get sync status failed:", error);
      return null;
    }
  },

  /**
   * Full sync - upload local changes then download cloud changes
   */
  async syncAll(token: string): Promise<{ uploaded: number; downloaded: number }> {
    const uploaded = await this.initialUpload(token);
    const downloaded = await this.downloadAll(token);
    return { uploaded, downloaded };
  },
};
