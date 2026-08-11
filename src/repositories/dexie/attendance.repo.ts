import { db } from "./db";
import type { AttendanceSession, AttendanceRecord } from "@/types/entities";
import { AttendanceStatus } from "@/types/enums";
import { recordIdFrom } from "@/lib/utils";
import { triggerAutoSync } from "@/hooks/useAutoSync";

export const attendanceRepo = {
  async getSessionsByDate(kelasId: number, tanggal: string): Promise<AttendanceSession[]> {
    if (!kelasId || !tanggal || typeof kelasId !== 'number' || typeof tanggal !== 'string') {
      console.warn('getSessionsByDate: invalid params', { kelasId, tanggal });
      return [];
    }
    try {
      // Use separate filters instead of compound index to avoid DataError
      return await db.attendanceSessions
        .where("kelasId")
        .equals(kelasId)
        .filter(s => s.tanggal === tanggal)
        .toArray();
    } catch (error) {
      console.error('getSessionsByDate failed:', error);
      return [];
    }
  },

  // Gabungkan beberapa sesi untuk kelas+tanggal yang sama menjadi SATU sesi.
  // Sesi duplikat bisa muncul saat aplikasi dibuka dari 2 perangkat hampir
  // bersamaan (sebelumnya tidak ada jaminan id unik per kelas+tanggal).
  // Record dipindah ke sesi kanonik; jika siswa punya 2 record (satu di tiap
  // sesi duplikat), yang terbaru yang dipakai.
  async ensureSingleSession(kelasId: number, tanggal: string): Promise<AttendanceSession | undefined> {
    const sessions = await this.getSessionsByDate(kelasId, tanggal);
    if (sessions.length === 0) return undefined;
    if (sessions.length === 1) return sessions[0];

    // Sesi kanonik = id terkecil (deterministik di semua perangkat)
    const sorted = [...sessions].sort((a, b) => a.id - b.id);
    const canonical = sorted[0];
    const others = sorted.slice(1);
    const now = Date.now();

    await db.transaction("rw", db.attendanceSessions, db.attendanceRecords, async () => {
      for (const other of others) {
        const records = await db.attendanceRecords.where("sesiId").equals(other.id).toArray();
        for (const rec of records) {
          const existing = await db.attendanceRecords
            .where("sesiId")
            .equals(canonical.id)
            .filter(r => r.siswaId === rec.siswaId)
            .first();
          if (existing) {
            if ((rec.diubahPada || 0) > (existing.diubahPada || 0)) {
              await db.attendanceRecords.update(existing.id, {
                status: rec.status,
                catatan: rec.catatan,
                diubahPada: rec.diubahPada,
              });
            }
            // Record lama (dari sesi duplikat) dibuang agar tak dobel dihitung
            await db.attendanceRecords.delete(rec.id);
          } else {
            await db.attendanceRecords.put({ ...rec, sesiId: canonical.id });
          }
        }
        await db.attendanceSessions.delete(other.id);
      }
      await db.attendanceSessions.update(canonical.id, { diubahPada: now });
    });

    triggerAutoSync();
    return canonical;
  },

  async getSession(kelasId: number, tanggal: string): Promise<AttendanceSession | undefined> {
    if (!kelasId || !tanggal || typeof kelasId !== 'number' || typeof tanggal !== 'string') {
      console.warn('getSession: invalid params', { kelasId, tanggal });
      return undefined;
    }
    try {
      return await this.ensureSingleSession(kelasId, tanggal);
    } catch (error) {
      console.error('getSession failed:', error);
      return undefined;
    }
  },

  async createSession(session: AttendanceSession): Promise<number> {
    const result = await db.attendanceSessions.put(session);
    triggerAutoSync();
    return result;
  },

  async getRecords(sesiId: number): Promise<AttendanceRecord[]> {
    if (!sesiId || typeof sesiId !== 'number') {
      console.warn('getRecords: invalid sesiId', { sesiId });
      return [];
    }
    return db.attendanceRecords.where("sesiId").equals(sesiId).toArray();
  },

  async saveRecord(record: AttendanceRecord): Promise<number> {
    const result = await db.attendanceRecords.put(record);
    triggerAutoSync();
    return result;
  },

  async updateSessionTimestamp(sesiId: number): Promise<void> {
    if (!sesiId || typeof sesiId !== 'number') {
      console.warn('updateSessionTimestamp: invalid sesiId', { sesiId });
      return;
    }
    await db.attendanceSessions.update(sesiId, { diubahPada: Date.now() });
    triggerAutoSync();
  },

  async bulkSaveRecords(records: AttendanceRecord[]): Promise<number> {
    const result = await db.attendanceRecords.bulkPut(records);
    triggerAutoSync();
    return result;
  },

  async getRecordBySiswa(sesiId: number, siswaId: number): Promise<AttendanceRecord | undefined> {
    if (!sesiId || !siswaId || typeof sesiId !== 'number' || typeof siswaId !== 'number') {
      console.warn('getRecordBySiswa: invalid params', { sesiId, siswaId });
      return undefined;
    }
    try {
      // Use separate filters instead of compound index to avoid DataError
      return await db.attendanceRecords
        .where("sesiId")
        .equals(sesiId)
        .filter(r => r.siswaId === siswaId)
        .first();
    } catch (error) {
      console.error('getRecordBySiswa failed:', error);
      return undefined;
    }
  },

  async getAllSessionsForClass(kelasId: number): Promise<AttendanceSession[]> {
    if (!kelasId || typeof kelasId !== 'number') {
      console.warn('getAllSessionsForClass: invalid kelasId', { kelasId });
      return [];
    }
    return db.attendanceSessions.where("kelasId").equals(kelasId).toArray();
  },

  // Gabungkan SEMUA sesi duplikat (kelas+tanggal yang sama) di seluruh database.
  // Dipakai sekali saat aplikasi dibuka untuk memperbaiki data lama dari sesi
  // dobel hasil buka dari 2 perangkat. Mengembalikan jumlah tanggal yang diperbaiki.
  async mergeAllDuplicateSessions(): Promise<number> {
    try {
      const sessions = await db.attendanceSessions.toArray();
      const grouped = new Map<string, AttendanceSession[]>();
      for (const s of sessions) {
        const key = `${s.kelasId}|${s.tanggal}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(s);
      }

      let fixed = 0;
      for (const [, list] of grouped) {
        if (list.length < 2) continue;
        const canonical = await this.ensureSingleSession(list[0].kelasId, list[0].tanggal);
        if (canonical) fixed++;
      }
      if (fixed > 0) {
        triggerAutoSync();
        window.dispatchEvent(new Event("data-changed"));
      }
      return fixed;
    } catch (error) {
      console.error('mergeAllDuplicateSessions failed:', error);
      return 0;
    }
  },

  async getSessionsInRange(kelasId: number, startDate: string, endDate: string): Promise<AttendanceSession[]> {
    if (!kelasId || !startDate || !endDate || typeof kelasId !== 'number') {
      console.warn('getSessionsInRange: invalid params', { kelasId, startDate, endDate });
      return [];
    }
    return db.attendanceSessions
      .where("kelasId")
      .equals(kelasId)
      .filter((s) => s.tanggal >= startDate && s.tanggal <= endDate)
      .toArray();
  },

  async getAllRecordsForClass(kelasId: number): Promise<AttendanceRecord[]> {
    const sessions = await this.getAllSessionsForClass(kelasId);
    const sesiIds = sessions.map((s) => s.id).filter(id => id != null && !isNaN(id));
    if (sesiIds.length === 0) return [];
    return db.attendanceRecords.where("sesiId").anyOf(sesiIds).toArray();
  },
};

export function buildDefaultRecords(
  sesiId: number,
  siswaIds: number[],
): AttendanceRecord[] {
  const now = Date.now();
  return siswaIds.map((siswaId) => ({
    // Id deterministik: peranti lain yang membuka sesi sama menghasilkan id sama,
    // sehingga record tidak diduplikasi saat di-put.
    id: recordIdFrom(sesiId, siswaId),
    sesiId,
    siswaId,
    status: AttendanceStatus.HADIR as AttendanceStatus,
    diubahPada: now,
  }));
}
