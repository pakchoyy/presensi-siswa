import { schoolRepo } from "@/repositories/dexie/school.repo";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import { academicYearRepo } from "@/repositories/dexie/academic-year.repo";
import { classroomRepo } from "@/repositories/dexie/classroom.repo";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { db } from "@/repositories/dexie/db";
import { generateDefaultCalendar } from "@/data/kalender-akademik";
import { Tier, Jenjang, Semester } from "@/types/enums";
import type { School, Teacher, AcademicYear, Classroom, Student } from "@/types/entities";
import { timestamp, generateId } from "@/lib/utils";
import { convexClient } from "@/lib/convex";

export interface SetupData {
  sekolah: string;
  jenjang: Jenjang;
  namaGuru: string;
  email: string;
  tahunAjaran: string;
  semester: Semester;
  namaKelas: string;
  siswa: { nama: string }[];
}

export const setupService = {
  async sudahSetup(): Promise<boolean> {
    const count = await db.teachers.count();
    return count > 0;
  },

  async executeSetup(data: SetupData): Promise<void> {
    const now = timestamp();

    // Check Convex for email — detect admin or existing PRO
    let defaultTier = Tier.FREE;
    try {
      const result = await (convexClient as any).query("licenses:checkEmail", { email: data.email });
      if (result?.tier === "PRO") {
        defaultTier = Tier.PRO;
        // Ensure a Convex users record exists so cloud sync works
        await (convexClient as any).mutation("users:ensureUser", {
          email: data.email,
          tier: "PRO",
          name: data.namaGuru,
        });
      }
    } catch {
      // Offline — default to FREE
    }

    const school: School = {
      id: generateId(),
      nama: data.sekolah,
      jenjang: data.jenjang,
      dibuatPada: now,
      diubahPada: now,
    };
    await schoolRepo.save(school);

    const teacher: Teacher = {
      id: generateId(),
      nama: data.namaGuru,
      email: data.email,
      sekolahId: school.id,
      tier: defaultTier,
      dibuatPada: now,
      diubahPada: now,
    };
    await teacherRepo.save(teacher);

    const [startStr] = data.tahunAjaran.split("/");
    const startYear = parseInt(startStr);
    const academicYear: AcademicYear = {
      id: generateId(),
      label: data.tahunAjaran,
      tanggalMulai: `${startYear}-07-01`,
      tanggalSelesai: `${startYear + 1}-06-30`,
      semesterAktif: data.semester,
      guruId: teacher.id,
    };
    await academicYearRepo.save(academicYear);

    const classroom: Classroom = {
      id: generateId(),
      nama: data.namaKelas,
      tahunAjaranId: academicYear.id,
      guruId: teacher.id,
      statusAktif: true,
      dibuatPada: now,
      diubahPada: now,
    };
    await classroomRepo.save(classroom);

    if (data.siswa.length > 0) {
      const students: Student[] = data.siswa.map((s, i) => ({
        id: generateId() + i,
        kelasId: classroom.id,
        nama: s.nama,
        urutan: i + 1,
        statusAktif: true,
        dibuatPada: now,
        diubahPada: now,
      }));
      await studentRepo.bulkSave(students);
    }

    const calendarEntries = generateDefaultCalendar(academicYear.id, data.tahunAjaran);
    await db.calendarEntries.bulkPut(calendarEntries);
  },
};
