import { attendanceRepo, buildDefaultRecords } from "@/repositories/dexie/attendance.repo";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { db } from "@/repositories/dexie/db";
import type { AttendanceSession, AttendanceRecord } from "@/types/entities";
import { AttendanceStatus, CalendarEntryType } from "@/types/enums";
import { timestamp, sessionIdFrom, recordIdFrom } from "@/lib/utils";

export const attendanceService = {
  async bukaSesiPresensi(
    kelasId: number,
    tanggal: string
  ): Promise<{ session: AttendanceSession; records: AttendanceRecord[] }> {
    if (!kelasId || !tanggal) {
      throw new Error('Invalid parameters for bukaSesiPresensi');
    }
    // getSession otomatis menggabungkan sesi duplikat untuk kelas+tanggal ini
    let session = await attendanceRepo.getSession(kelasId, tanggal);

    if (!session) {
      const now = timestamp();
      // Id deterministik dari kelas+tanggal → semua perangkat menghasilkan id
      // yang sama, sehingga dua perangkat tidak membuat dua sesi berbeda.
      session = {
        id: sessionIdFrom(kelasId, tanggal),
        kelasId,
        tanggal,
        dibuatPada: now,
        diubahPada: now,
      };
      await attendanceRepo.createSession(session);

      const autoHadirGlobal = localStorage.getItem("bgy_auto_hadir") !== "0";
      // untuk kelas mandiri jangan auto-Hadir biar siswa absen sendiri
      let isMandiri = false;
      try {
        const cls = await db.classrooms.get(kelasId);
        isMandiri = !!cls?.allowSiswaAbsenMandiri;
      } catch {}
      const autoHadir = autoHadirGlobal && !isMandiri;
      if (autoHadir) {
        const students = await studentRepo.getByClass(kelasId);
        const records = buildDefaultRecords(
          session.id,
          students.map((s) => s.id)
        );
        await attendanceRepo.bulkSaveRecords(records);
        return { session, records };
      }
      return { session, records: [] };
    }

    // Validate session.id before using it in queries
    if (!session.id) {
      throw new Error('Invalid session ID');
    }
    
    const records = await attendanceRepo.getRecords(session.id);
    return { session, records };
  },

  async ubahStatus(
    sesiId: number,
    siswaId: number,
    statusBaru: AttendanceStatus
  ): Promise<AttendanceRecord> {
    // Validate parameters before using in Dexie queries
    if (!sesiId || !siswaId) {
      throw new Error('Invalid sesiId or siswaId for ubahStatus');
    }
    
    const existing = await attendanceRepo.getRecordBySiswa(sesiId, siswaId);
    const now = timestamp();

    let record: AttendanceRecord;
    if (existing) {
      record = { ...existing, status: statusBaru, diubahPada: now };
    } else {
      record = {
        // Id deterministik → peranti lain yang mengubah siswa yang sama di sesi
        // yang sama menghasilkan id yang sama (bukan record ganda).
        id: recordIdFrom(sesiId, siswaId),
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
        ringkasan[r.siswaId] = { H: 0, S: 0, I: 0, A: 0, T: 0 };
      }
      ringkasan[r.siswaId][r.status]++;
    }

    return ringkasan;
  },

  async hitungRekapRentang(kelasId: number, startDate: string, endDate: string) {
    if (!kelasId || !startDate || !endDate || typeof kelasId !== 'number') {
      console.warn('hitungRekapRentang: invalid params', { kelasId, startDate, endDate });
      return {};
    }
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
        ringkasan[r.siswaId] = { H: 0, S: 0, I: 0, A: 0, T: 0 };
      }
      ringkasan[r.siswaId][r.status]++;
    }

    return ringkasan;
  },

  async hitungHariSekolah(kelasId: number, startDate: string, endDate: string): Promise<number> {
    if (!kelasId || !startDate || !endDate || typeof kelasId !== 'number') {
      console.warn('hitungHariSekolah: invalid params', { kelasId, startDate, endDate });
      return 0;
    }
    const sessions = await attendanceRepo.getSessionsInRange(kelasId, startDate, endDate);
    if (sessions.length === 0) return 0;

    const holidayDates = new Set<string>();
    const holidays = await db.calendarEntries
      .where("tanggal")
      .between(startDate, endDate, true, true)
      .filter((e) => e.jenis === CalendarEntryType.HARI_LIBUR)
      .toArray();
    for (const h of holidays) {
      holidayDates.add(h.tanggal);
    }

    return sessions.filter((s) => !holidayDates.has(s.tanggal)).length;
  },
};
