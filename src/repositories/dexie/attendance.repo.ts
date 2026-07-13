import { db } from "./db";
import type { AttendanceSession, AttendanceRecord } from "@/types/entities";
import { AttendanceStatus } from "@/types/enums";
import { triggerAutoSync } from "@/hooks/useAutoSync";

export const attendanceRepo = {
  async getSession(kelasId: number, tanggal: string): Promise<AttendanceSession | undefined> {
    if (!kelasId || !tanggal || typeof kelasId !== 'number' || typeof tanggal !== 'string') {
      console.warn('getSession: invalid params', { kelasId, tanggal });
      return undefined;
    }
    try {
      // Use separate filters instead of compound index to avoid DataError
      return await db.attendanceSessions
        .where("kelasId")
        .equals(kelasId)
        .filter(s => s.tanggal === tanggal)
        .first();
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
    return db.attendanceRecords.where("sesiId").equals(sesiId).toArray();
  },

  async saveRecord(record: AttendanceRecord): Promise<number> {
    const result = await db.attendanceRecords.put(record);
    triggerAutoSync();
    return result;
  },

  async updateSessionTimestamp(sesiId: number): Promise<void> {
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
    return db.attendanceSessions.where("kelasId").equals(kelasId).toArray();
  },

  async getSessionsInRange(kelasId: number, startDate: string, endDate: string): Promise<AttendanceSession[]> {
    return db.attendanceSessions
      .where("kelasId")
      .equals(kelasId)
      .filter((s) => s.tanggal >= startDate && s.tanggal <= endDate)
      .toArray();
  },

  async getAllRecordsForClass(kelasId: number): Promise<AttendanceRecord[]> {
    const sessions = await this.getAllSessionsForClass(kelasId);
    const sesiIds = sessions.map((s) => s.id);
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
    id: now + siswaId + Math.floor(Math.random() * 100),
    sesiId,
    siswaId,
    status: AttendanceStatus.HADIR as AttendanceStatus,
    diubahPada: now,
  }));
}
