import Dexie, { type EntityTable } from "dexie";
import type {
  School,
  Teacher,
  AcademicYear,
  Classroom,
  Student,
  AttendanceSession,
  AttendanceRecord,
  AcademicCalendarEntry,
  License,
  BackupMeta,
  Tombstone,
} from "@/types/entities";

export class PresensiDB extends Dexie {
  schools!: EntityTable<School, "id">;
  teachers!: EntityTable<Teacher, "id">;
  academicYears!: EntityTable<AcademicYear, "id">;
  classrooms!: EntityTable<Classroom, "id">;
  students!: EntityTable<Student, "id">;
  attendanceSessions!: EntityTable<AttendanceSession, "id">;
  attendanceRecords!: EntityTable<AttendanceRecord, "id">;
  calendarEntries!: EntityTable<AcademicCalendarEntry, "id">;
  licenses!: EntityTable<License, "id">;
  backupMeta!: EntityTable<BackupMeta, "id">;
  tombstones!: EntityTable<Tombstone, "id">;

  constructor() {
    super("bgy_presensi_db");
    this.version(2).stores({
      schools: "id",
      teachers: "id, sekolahId",
      academicYears: "id, guruId",
      classrooms: "id, tahunAjaranId, guruId, statusAktif",
      students: "id, kelasId, statusAktif",
      attendanceSessions: "id, kelasId, tanggal, [kelasId+tanggal]",
      attendanceRecords: "id, sesiId, siswaId, [sesiId+siswaId]",
      calendarEntries: "id, tahunAjaranId, tanggal",
      licenses: "id, guruId",
      backupMeta: "id, guruId",
    });
    this.version(3).stores({
      tombstones: "++id, entityType, localId",
    });
    // Version 4: Remove problematic compound indexes
    this.version(4).stores({
      attendanceSessions: "id, kelasId, tanggal",
      attendanceRecords: "id, sesiId, siswaId",
    });
  }
}

export const db = new PresensiDB();

// Auto-recovery for corrupt database
db.on('blocked', () => {
  console.warn('[DB] Database blocked - forcing delete');
  db.delete().then(() => {
    console.warn('[DB] Database deleted, reloading page...');
    window.location.reload();
  }).catch(console.error);
});

db.open().catch((err) => {
  console.error('[DB] Database open failed:', err);
  const isCorrupt = err.name === 'DataError' || 
                    err.name === 'InvalidStateError' ||
                    (err.message && err.message.includes('not a valid key'));
  
  if (isCorrupt) {
    console.warn('[DB] Corrupt database detected - auto-deleting');
    db.delete().then(() => {
      console.warn('[DB] Database cleared, reloading page...');
      window.location.reload();
    }).catch(console.error);
  }
});
