import { db } from "@/repositories/dexie/db";
import { supabase } from "@/lib/supabase";

export type SyncStatus = "tersinkron" | "menyinkronkan" | "menunggu" | "error";

const LAST_SYNC_KEY = "presensi_last_sync";

const SYNC_TABLES = [
  "schools",
  "teachers",
  "academicYears",
  "classrooms",
  "students",
  "attendanceSessions",
  "attendanceRecords",
  "calendarEntries",
] as const;

const CLOUD_TABLE_MAP: Record<string, string> = {
  schools: "cloud_schools",
  teachers: "cloud_teachers",
  academicYears: "cloud_academic_years",
  classrooms: "cloud_classrooms",
  students: "cloud_students",
  attendanceSessions: "cloud_attendance_sessions",
  attendanceRecords: "cloud_attendance_records",
  calendarEntries: "cloud_calendar_entries",
};

let _userIdCache: { email: string; id: string } | null = null;

function getLastSyncTimestamp(): number {
  const stored = localStorage.getItem(LAST_SYNC_KEY);
  return stored ? parseInt(stored) : 0;
}

function saveLastSyncTimestamp(ts: number) {
  localStorage.setItem(LAST_SYNC_KEY, ts.toString());
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  if (_userIdCache && _userIdCache.email === email.toLowerCase().trim()) {
    return _userIdCache.id;
  }
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (data?.id) {
    _userIdCache = { email: email.toLowerCase().trim(), id: data.id };
  }
  return data?.id || null;
}

async function getLocalChanges(since: number): Promise<Record<string, any[]>> {
  const changes: Record<string, any[]> = {};
  for (const table of SYNC_TABLES) {
    try {
      const records = await db.table(table).toArray();
      const filtered = records.filter((r: any) => {
        const modifiedAt = r.diubahPada || r.dibuatPada || 0;
        return modifiedAt > since;
      });
      if (filtered.length > 0) changes[table] = filtered;
    } catch {
      changes[table] = [];
    }
  }
  return changes;
}

export const syncService = {
  async initialUpload(email: string): Promise<number> {
    try {
      const userId = await getUserIdByEmail(email);
      if (!userId) return 0;

      const allData = await Promise.all(SYNC_TABLES.map(t => db.table(t).toArray()));
      const now = Date.now();

      let totalUploaded = 0;

      for (let i = 0; i < SYNC_TABLES.length; i++) {
        const rows = allData[i];
        if (rows.length === 0) continue;

        const batch = rows.map((row: any) => ({
          user_id: userId,
          local_id: row.id,
          ...buildCloudRow(row, now),
        }));

        const { error } = await supabase.from(CLOUD_TABLE_MAP[SYNC_TABLES[i]]).insert(batch);
        if (!error) totalUploaded += batch.length;
      }

      return totalUploaded;
    } catch (error) {
      console.error("Initial upload failed:", error);
      return 0;
    }
  },

  async downloadAll(email: string): Promise<number> {
    try {
      const userId = await getUserIdByEmail(email);
      if (!userId) return 0;

      let count = 0;

      await db.transaction("rw", SYNC_TABLES.map(t => db.table(t)), async () => {
        for (const table of SYNC_TABLES) {
          const { data: cloudRows } = await supabase
            .from(CLOUD_TABLE_MAP[table])
            .select("*")
            .eq("user_id", userId);

          if (!cloudRows || cloudRows.length === 0) continue;

          for (const cloudRow of cloudRows) {
            const localId = cloudRow.local_id;
            if (!localId || typeof localId !== "number" || isNaN(localId)) continue;

            const existing = await db.table(table).get(localId);
            if (existing) {
              const localTime = (existing as any).diubahPada || 0;
              const cloudTime = cloudRow.diubah_pada || 0;
              if (cloudTime < localTime) continue;
            }

            const localData = convertCloudToLocal(cloudRow);
            await db.table(table).put(localData);
            count++;
          }
        }

        const { data: tombstones } = await supabase
          .from("cloud_tombstones")
          .select("id, entity_type, local_id, deleted_at")
          .eq("user_id", userId);

        if (tombstones) {
          for (const tomb of tombstones) {
            if (!tomb.local_id || isNaN(tomb.local_id)) continue;
            await db.table(tomb.entity_type).delete(tomb.local_id);
          }
        }
      });

      if (count > 0) {
        window.dispatchEvent(new Event("data-changed"));
      }

      return count;
    } catch (error) {
      console.error("Download all failed:", error);
      return 0;
    }
  },

  async hasCloudChanges(email: string): Promise<boolean> {
    try {
      const userId = await getUserIdByEmail(email);
      if (!userId) return false;

      const lastSync = getLastSyncTimestamp();

      for (const table of SYNC_TABLES) {
        const cloudTable = CLOUD_TABLE_MAP[table];
        const { count } = await supabase
          .from(cloudTable)
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gt("last_synced_at", lastSync);

        if (count && count > 0) return true;
      }

      const { count: tombCount } = await supabase
        .from("cloud_tombstones")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gt("deleted_at", lastSync);

      return (tombCount || 0) > 0;
    } catch {
      return false;
    }
  },

  async incrementalSync(email: string): Promise<{ uploaded: number; downloaded: number; hasChanges: boolean }> {
    try {
      const userId = await getUserIdByEmail(email);
      if (!userId) return { uploaded: 0, downloaded: 0, hasChanges: false };

      const lastSync = getLastSyncTimestamp();
      const now = Date.now();

      const localChanges = await getLocalChanges(lastSync);
      const localTombstones = await db.tombstones.toArray();

      const hasLocalChanges = Object.values(localChanges).some(r => r.length > 0) || localTombstones.length > 0;

      let uploaded = 0;

      if (hasLocalChanges) {
        for (const [table, rows] of Object.entries(localChanges)) {
          const cloudTable = CLOUD_TABLE_MAP[table];
          if (!cloudTable || rows.length === 0) continue;

          const localIds = rows.map(r => r.id);
          const { data: existingRows } = await supabase
            .from(cloudTable)
            .select("id, local_id, version, diubah_pada")
            .eq("user_id", userId)
            .in("local_id", localIds);

          const existingMap = new Map(
            (existingRows || []).map((r: any) => [r.local_id, r])
          );

          const toInsert: any[] = [];
          const toUpdate: any[] = [];

          for (const row of rows) {
            const existing = existingMap.get(row.id);
            if (existing) {
              if ((row.diubahPada || 0) >= (existing.diubah_pada || 0)) {
                toUpdate.push({ ...buildCloudRow(row, now), version: existing.version + 1, _eq_id: existing.id });
              }
            } else {
              toInsert.push({ ...buildCloudRow(row, now), user_id: userId, local_id: row.id });
            }
          }

          if (toInsert.length > 0) {
            const { error } = await supabase.from(cloudTable).insert(toInsert);
            if (!error) uploaded += toInsert.length;
          }

          for (const item of toUpdate) {
            const { _eq_id, ...updateData } = item;
            await supabase.from(cloudTable).update(updateData).eq("id", _eq_id);
            uploaded++;
          }
        }

        for (const tomb of localTombstones) {
          const cloudTable = CLOUD_TABLE_MAP[tomb.entityType];
          if (cloudTable) {
            await supabase.from(cloudTable).delete().eq("user_id", userId).eq("local_id", tomb.localId);
            await supabase.from("cloud_tombstones").insert({
              user_id: userId,
              entity_type: tomb.entityType,
              local_id: tomb.localId,
              deleted_at: now,
            });
          }
        }
      }

      const hasCloud = await this.hasCloudChanges(email);
      let downloaded = 0;
      let hasChanges = hasLocalChanges || hasCloud;

      if (hasCloud) {
        for (const table of SYNC_TABLES) {
          const cloudTable = CLOUD_TABLE_MAP[table];
          const { data: cloudRows } = await supabase
            .from(cloudTable)
            .select("*")
            .eq("user_id", userId)
            .gt("last_synced_at", lastSync);

          if (cloudRows && cloudRows.length > 0) {
            for (const cloudRow of cloudRows) {
              const localId = cloudRow.local_id;
              if (!localId || isNaN(localId)) continue;

              const existing = await db.table(table).get(localId);
              if (existing) {
                if ((cloudRow.diubah_pada || 0) >= ((existing as any).diubahPada || 0)) {
                  const localData = convertCloudToLocal(cloudRow);
                  await db.table(table).put(localData);
                  downloaded++;
                }
              } else {
                const localData = convertCloudToLocal(cloudRow);
                await db.table(table).put(localData);
                downloaded++;
              }
            }
          }
        }

        const { data: cloudTombstones } = await supabase
          .from("cloud_tombstones")
          .select("id, entity_type, local_id, deleted_at")
          .eq("user_id", userId)
          .gt("deleted_at", lastSync);

        if (cloudTombstones && cloudTombstones.length > 0) {
          for (const tomb of cloudTombstones) {
            if (!tomb.local_id || isNaN(tomb.local_id)) continue;
            await db.table(tomb.entity_type).delete(tomb.local_id);
          }
        }
      }

      await db.tombstones.clear();
      saveLastSyncTimestamp(now);

      if (downloaded > 0) {
        window.dispatchEvent(new Event("data-changed"));
      }

      return { uploaded, downloaded, hasChanges };
    } catch (error) {
      console.error("Incremental sync failed:", error);
      return { uploaded: 0, downloaded: 0, hasChanges: false };
    }
  },

  async fullSync(email: string): Promise<{ uploaded: number; downloaded: number }> {
    const uploaded = await this.initialUpload(email);
    const downloaded = await this.downloadAll(email);
    saveLastSyncTimestamp(Date.now());
    return { uploaded, downloaded };
  },

  async syncAll(email: string): Promise<{ uploaded: number; downloaded: number }> {
    const lastSync = getLastSyncTimestamp();
    if (lastSync === 0) {
      return await this.fullSync(email);
    }

    try {
      const result = await this.incrementalSync(email);
      return { uploaded: result.uploaded, downloaded: result.downloaded };
    } catch (error) {
      console.error("Incremental sync failed, falling back to full sync", error);
      return await this.fullSync(email);
    }
  },

  resetSyncState() {
    localStorage.removeItem(LAST_SYNC_KEY);
    _userIdCache = null;
  },
};

function buildCloudRow(row: any, now: number): Record<string, any> {
  return {
    nama: row.nama,
    jenjang: row.jenjang,
    logo_url: row.logoUrl || null,
    alamat: row.alamat || null,
    email: row.email,
    sekolah_id: row.sekolahId || 0,
    tier: row.tier || "FREE",
    guru_id: row.guruId || 0,
    label: row.label,
    tanggal_mulai: row.tanggalMulai,
    tanggal_selesai: row.tanggalSelesai,
    semester_aktif: row.semesterAktif,
    tahun_ajaran_id: row.tahunAjaranId || 0,
    status_aktif: row.statusAktif,
    kelas_id: row.kelasId || 0,
    nisn: row.nisn || null,
    jenis_kelamin: row.jenisKelamin || null,
    urutan: row.urutan || 0,
    tanggal: row.tanggal,
    sesi_id: row.sesiId || 0,
    siswa_id: row.siswaId || 0,
    status: row.status,
    catatan: row.catatan || null,
    keterangan: row.keterangan || null,
    sumber: row.sumber,
    dibuat_pada: row.dibuatPada || now,
    diubah_pada: row.diubahPada || now,
    last_synced_at: now,
    version: 1,
  };
}

function convertCloudToLocal(cloudRow: any): any {
  const localData: any = { id: cloudRow.local_id };
  for (const [key, value] of Object.entries(cloudRow)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (!["user_id", "local_id", "last_synced_at", "version", "id"].includes(key)) {
      localData[camelKey] = value;
    }
  }
  return localData;
}
