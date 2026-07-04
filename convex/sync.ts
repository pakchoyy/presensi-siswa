import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Initial sync: Upload local data to cloud
 * Called when user first enables cloud sync
 */
export const initialUpload = mutation({
  args: {
    token: v.string(),
    schools: v.array(v.any()),
    teachers: v.array(v.any()),
    academicYears: v.array(v.any()),
    classrooms: v.array(v.any()),
    students: v.array(v.any()),
    attendanceSessions: v.array(v.any()),
    attendanceRecords: v.array(v.any()),
    calendarEntries: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = session.userId;
    const now = Date.now();

    // Upload schools
    for (const school of args.schools) {
      await ctx.db.insert("cloudSchools", {
        userId,
        localId: school.id,
        nama: school.nama,
        jenjang: school.jenjang,
        logoUrl: school.logoUrl,
        alamat: school.alamat,
        dibuatPada: school.dibuatPada,
        diubahPada: school.diubahPada,
        lastSyncedAt: now,
        version: 1,
      });
    }

    // Upload teachers
    for (const teacher of args.teachers) {
      await ctx.db.insert("cloudTeachers", {
        userId,
        localId: teacher.id,
        nama: teacher.nama,
        email: teacher.email,
        sekolahId: teacher.sekolahId,
        tier: teacher.tier,
        dibuatPada: teacher.dibuatPada,
        diubahPada: teacher.diubahPada,
        lastSyncedAt: now,
        version: 1,
      });
    }

    // Upload academic years
    for (const ay of args.academicYears) {
      await ctx.db.insert("cloudAcademicYears", {
        userId,
        localId: ay.id,
        guruId: ay.guruId,
        label: ay.label,
        tanggalMulai: ay.tanggalMulai,
        tanggalSelesai: ay.tanggalSelesai,
        semesterAktif: ay.semesterAktif,
        lastSyncedAt: now,
        version: 1,
      });
    }

    // Upload classrooms
    for (const classroom of args.classrooms) {
      await ctx.db.insert("cloudClassrooms", {
        userId,
        localId: classroom.id,
        tahunAjaranId: classroom.tahunAjaranId,
        guruId: classroom.guruId,
        nama: classroom.nama,
        statusAktif: classroom.statusAktif,
        dibuatPada: classroom.dibuatPada,
        diubahPada: classroom.diubahPada,
        lastSyncedAt: now,
        version: 1,
      });
    }

    // Upload students
    for (const student of args.students) {
      await ctx.db.insert("cloudStudents", {
        userId,
        localId: student.id,
        kelasId: student.kelasId,
        nama: student.nama,
        nisn: student.nisn,
        jenisKelamin: student.jenisKelamin,
        urutan: student.urutan,
        statusAktif: student.statusAktif,
        dibuatPada: student.dibuatPada,
        diubahPada: student.diubahPada,
        lastSyncedAt: now,
        version: 1,
      });
    }

    // Upload attendance sessions
    for (const session of args.attendanceSessions) {
      await ctx.db.insert("cloudAttendanceSessions", {
        userId,
        localId: session.id,
        kelasId: session.kelasId,
        tanggal: session.tanggal,
        dibuatPada: session.dibuatPada,
        diubahPada: session.diubahPada,
        lastSyncedAt: now,
        version: 1,
      });
    }

    // Upload attendance records
    for (const record of args.attendanceRecords) {
      await ctx.db.insert("cloudAttendanceRecords", {
        userId,
        localId: record.id,
        sesiId: record.sesiId,
        siswaId: record.siswaId,
        status: record.status,
        catatan: record.catatan,
        diubahPada: record.diubahPada,
        lastSyncedAt: now,
        version: 1,
      });
    }

    // Upload calendar entries
    for (const entry of args.calendarEntries) {
      await ctx.db.insert("cloudCalendarEntries", {
        userId,
        localId: entry.id,
        tahunAjaranId: entry.tahunAjaranId,
        tanggal: entry.tanggal,
        jenis: entry.jenis,
        keterangan: entry.keterangan,
        sumber: entry.sumber,
        lastSyncedAt: now,
        version: 1,
      });
    }

    // Update sync metadata
    const entityTypes = [
      "school",
      "teacher",
      "academicYear",
      "classroom",
      "student",
      "attendanceSession",
      "attendanceRecord",
      "calendarEntry",
    ];
    const entityCounts = [
      args.schools.length,
      args.teachers.length,
      args.academicYears.length,
      args.classrooms.length,
      args.students.length,
      args.attendanceSessions.length,
      args.attendanceRecords.length,
      args.calendarEntries.length,
    ];

    for (let i = 0; i < entityTypes.length; i++) {
      await ctx.db.insert("syncMetadata", {
        userId,
        entityType: entityTypes[i],
        lastSyncedAt: now,
        syncStatus: "idle",
        totalRecords: entityCounts[i],
      });
    }

    return {
      success: true,
      totalUploaded:
        args.schools.length +
        args.teachers.length +
        args.academicYears.length +
        args.classrooms.length +
        args.students.length +
        args.attendanceSessions.length +
        args.attendanceRecords.length +
        args.calendarEntries.length,
    };
  },
});

/**
 * Download all data from cloud
 * Called when user logs in from new device
 */
export const downloadAll = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = session.userId;

    // Download all data
    const schools = await ctx.db
      .query("cloudSchools")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const teachers = await ctx.db
      .query("cloudTeachers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const academicYears = await ctx.db
      .query("cloudAcademicYears")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const classrooms = await ctx.db
      .query("cloudClassrooms")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const students = await ctx.db
      .query("cloudStudents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const attendanceSessions = await ctx.db
      .query("cloudAttendanceSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const attendanceRecords = await ctx.db
      .query("cloudAttendanceRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const calendarEntries = await ctx.db
      .query("cloudCalendarEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      schools,
      teachers,
      academicYears,
      classrooms,
      students,
      attendanceSessions,
      attendanceRecords,
      calendarEntries,
    };
  },
});

/**
 * Get sync status for user
 */
export const getSyncStatus = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!session) {
      return null;
    }

    const userId = session.userId;

    // Get sync metadata
    const metadata = await ctx.db
      .query("syncMetadata")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return metadata;
  },
});
