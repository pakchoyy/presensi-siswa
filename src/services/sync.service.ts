import { db } from "@/repositories/dexie/db";
import { convexClient } from "@/lib/convex";

export type SyncStatus = "tersinkron" | "menyinkronkan" | "menunggu" | "error";

export const syncService = {
  async pushToCloud(guruId: number): Promise<number> {
    try {
      const tables = ["schools", "teachers", "academicYears", "classrooms", "students", "attendanceSessions", "attendanceRecords", "calendarEntries"];

      const batch: Record<string, unknown[]> = {};
      for (const table of tables) {
        batch[table] = await db.table(table).toArray();
      }

      const result = await (convexClient as any).mutation("sync:pushBatch", { entities: batch });
      return (result as any).count || 0;
    } catch {
      return 0;
    }
  },

  async pullFromCloud(guruId: number): Promise<number> {
    try {
      const data = await (convexClient as any).query("sync:pullAll", { guruId });
      const cloudData = data as Record<string, unknown[]>;

      let count = 0;
      const tables = Object.keys(cloudData);

      await db.transaction("rw", tables.map((t) => db.table(t)), async () => {
        for (const table of tables) {
          const rows = cloudData[table] as any[];
          if (rows.length === 0) continue;

          for (const row of rows) {
            const localRow = await db.table(table).get((row as any).id || (row as any).email);
            if (localRow) {
              const localTime = (localRow as any).diubahPada || 0;
              const cloudTime = (row as any).diubahPada || 0;
              if (cloudTime >= localTime) {
                await db.table(table).put({ ...(localRow as any), ...row });
                count++;
              }
            } else {
              if (table === "teachers") {
                const existingByEmail = await db.table(table).where("email").equals((row as any).email).first();
                if (!existingByEmail) {
                  await db.table(table).put(row);
                  count++;
                }
              } else {
                await db.table(table).put(row);
                count++;
              }
            }
          }
        }
      });

      return count;
    } catch {
      return 0;
    }
  },

  async syncAll(guruId: number): Promise<{ pushed: number; pulled: number }> {
    const pushed = await this.pushToCloud(guruId);
    const pulled = await this.pullFromCloud(guruId);
    return { pushed, pulled };
  },
};
