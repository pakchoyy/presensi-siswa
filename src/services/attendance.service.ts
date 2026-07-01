import { attendanceRepo, buildDefaultRecords } from "@/repositories/dexie/attendance.repo";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { db } from "@/repositories/dexie/db";
import type { AttendanceSession, AttendanceRecord } from "@/types/entities";
import { AttendanceStatus, CalendarEntryType } from "@/types/enums";
import { timestamp, generateId } from "@/lib/utils";

export const attendanceService = {
  async bukaSesiPresensi(
    kelasId: number,
    tanggal: string
  ): Promise<{ session: AttendanceSession; records: AttendanceRecord[] }> {
    let session = await attendanceRepo.getSession(kelasId, tanggal);

    if (!session) {
      const now = timestamp();
      session = {
        id: generateId(),
        kelasId,
        tanggal,
        dibuatPada: now,
        diubahPada: now,
      };
      await attendanceRepo.createSession(session);

      const students = await studentRepo.getByClass(kelasId);
      const records = buildDefaultRecords(
        session.id,
        students.map((s) => s.id)
      );
      await attendanceRepo.bulkSaveRecords(records);
      return { session, records };
    }

    const records = await attendanceRepo.getRecords(session.id);
    return { session, records };
  },

  async ubahStatus(
    sesiId: number,
    siswaId: number,
    statusBaru: AttendanceStatus
  ): Promise<AttendanceRecord> {
    const existing = await attendanceRepo.getRecordBySiswa(sesiId, siswaId);
    const now = timestamp();

    let record: AttendanceRecord;
    if (existing) {
      record = { ...existing, status: statusBaru, diubahPada: now };
    } else {
      record = {
        id: generateId(),
        sesiId,
        siswaId,
        status: statusBaru,
        diubahPada: now,
      };
    }
    await attendanceRepo.saveRecord(record);
    await attendanceRepo.updateSessionTimestamp(sesiId);
    return record;
  },

  async hitungRekap(kelasId: number) {
    const records = await attendanceRepo.getAllRecordsForClass(kelasId);
    const ringkasan: Record<number, Record<string, number>> = {};

    for (const r of records) {
      if (!ringkasan[r.siswaId]) {
        ringkasan[r.siswaId] = { H: 0, S: 0, I: 0, A: 0 };
      }
      ringkasan[r.siswaId][r.status]++;
    }

    return ringkasan;
  },

  async hitungRekapRentang(kelasId: number, startDate: string, endDate: string) {
    const sessions = await attendanceRepo.getSessionsInRange(kelasId, startDate, endDate);
    const sesiIds = sessions.map((s) => s.id);
    if (sesiIds.length === 0) {
      return {};
    }

    // Ambil daftar hari libur dalam rentang
    const liburDates = new Set<string>();
    const calendarEntries = await db.calendarEntries
      .where("tanggal")
      .between(startDate, endDate, true, true)
      .filter((e) => e.jenis === CalendarEntryType.HARI_LIBUR)
      .toArray();

    for (const entry of calendarEntries) {
      liburDates.add(entry.tanggal);
    }

    // Filter sesi — hanya yang bukan hari libur
    const effectiveSessions = sessions.filter((s) => !liburDates.has(s.tanggal));

    // Ambil semua record untuk sesi efektif
    const effectiveSesiIds = effectiveSessions.map((s) => s.id);
    if (effectiveSesiIds.length === 0) {
      return {};
    }

    const records = await db.attendanceRecords
      .where("sesiId")
      .anyOf(effectiveSesiIds)
      .toArray();

    const ringkasan: Record<number, Record<string, number>> = {};

    for (const r of records) {
      if (!ringkasan[r.siswaId]) {
        ringkasan[r.siswaId] = { H: 0, S: 0, I: 0, A: 0 };
      }
      ringkasan[r.siswaId][r.status]++;
    }

    return ringkasan;
  },
};
