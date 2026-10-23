import { schoolRepo } from "@/repositories/dexie/school.repo";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import { academicYearRepo } from "@/repositories/dexie/academic-year.repo";
import { classroomRepo } from "@/repositories/dexie/classroom.repo";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { attendanceRepo } from "@/repositories/dexie/attendance.repo";
import { db } from "@/repositories/dexie/db";
import { generateDefaultCalendar } from "@/data/kalender-akademik";
import { AttendanceStatus, Jenjang, Semester, Tier } from "@/types/enums";
import type { AttendanceRecord, Student } from "@/types/entities";
import { timestamp, generateId, recordIdFrom } from "@/lib/utils";
import { clearLocalData } from "@/lib/local-data";

const DEMO_KEY = "bgy_demo_mode";

const NAMA_CONTOH = [
  "Adi Saputra", "Bunga Lestari", "Citra Ayu", "Dimas Pratama", "Eka Putri",
  "Fajar Nugroho", "Gita Rahma", "Hendra Wijaya", "Intan Permata", "Joko Santoso",
];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isDemoMode(): boolean {
  try { return localStorage.getItem(DEMO_KEY) === "1"; } catch { return false; }
}

export const demoService = {
  /** Isi data contoh: 1 kelas, 10 siswa, presensi 10 hari sekolah terakhir. Tanpa cek lisensi & tanpa sync cloud. */
  async seed(): Promise<void> {
    const now = timestamp();
    const today = new Date();
    const startYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
    const tahunAjaran = `${startYear}/${startYear + 1}`;

    const schoolId = generateId();
    await schoolRepo.save({ id: schoolId, nama: "SD Contoh Ceria", jenjang: Jenjang.SD, dibuatPada: now, diubahPada: now });

    const teacherId = generateId() + 1;
    await teacherRepo.save({ id: teacherId, nama: "Guru Contoh", email: "", sekolahId: schoolId, tier: Tier.FREE, dibuatPada: now, diubahPada: now });

    const ayId = generateId() + 2;
    await academicYearRepo.save({
      id: ayId,
      label: tahunAjaran,
      tanggalMulai: `${startYear}-07-01`,
      tanggalSelesai: `${startYear + 1}-06-30`,
      semesterAktif: today.getMonth() >= 6 ? Semester.GANJIL : Semester.GENAP,
      guruId: teacherId,
    });

    const kelasId = generateId() + 3;
    await classroomRepo.save({ id: kelasId, nama: "Kelas 4A", tahunAjaranId: ayId, guruId: teacherId, statusAktif: true, dibuatPada: now, diubahPada: now });

    const students: Student[] = NAMA_CONTOH.map((nama, i) => ({
      id: generateId() + 10 + i,
      kelasId,
      nama,
      urutan: i + 1,
      statusAktif: true,
      dibuatPada: now,
      diubahPada: now,
    }));
    await studentRepo.bulkSave(students);

    await db.calendarEntries.bulkPut(generateDefaultCalendar(ayId, tahunAjaran));

    // 10 hari sekolah (Senin–Jumat) terakhir, termasuk hari ini bila hari kerja
    const dates: string[] = [];
    const d = new Date(today);
    while (dates.length < 10) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) dates.unshift(toDateStr(d));
      d.setDate(d.getDate() - 1);
    }

    const variasi = [AttendanceStatus.SAKIT, AttendanceStatus.IZIN, AttendanceStatus.ALPHA, AttendanceStatus.TERLAMBAT];
    for (let di = 0; di < dates.length; di++) {
      const sesiId = generateId() + 100 + di;
      await attendanceRepo.createSession({ id: sesiId, kelasId, tanggal: dates[di], dibuatPada: now, diubahPada: now });
      const records: AttendanceRecord[] = students.map((s, si) => ({
        id: recordIdFrom(sesiId, s.id),
        sesiId,
        siswaId: s.id,
        // sebagian besar hadir, sesekali ada S/I/A/T supaya rekap terlihat hidup
        status: (di * 3 + si) % 13 === 0 ? variasi[(di + si) % variasi.length] : AttendanceStatus.HADIR,
        diubahPada: now,
      }));
      await attendanceRepo.bulkSaveRecords(records);
    }

    localStorage.setItem(DEMO_KEY, "1");
  },

  /** Hapus data contoh lalu kembali ke wizard. */
  async clear(): Promise<void> {
    await clearLocalData();
    window.location.replace("/");
  },
};
