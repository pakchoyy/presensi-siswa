import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Incremental upload - only upload changed data
 */
export const incrementalUpload = mutation({
  args: {
    email: v.string(),
    changes: v.object({
      schools: v.array(v.any()),
      teachers: v.array(v.any()),
      academicYears: v.array(v.any()),
      classrooms: v.array(v.any()),
      students: v.array(v.any()),
      attendanceSessions: v.array(v.any()),
      attendanceRecords: v.array(v.any()),
      calendarEntries: v.array(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user && normalizedEmail !== args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
    }

    if (!user) {
      throw new Error("User not found");
    }

    const userId = user._id;
    const now = Date.now();
    let updated = 0;

    // Helper function to upsert (update or insert)
    async function upsertEntity(
      tableName: any,
      localId: number,
      data: any
    ) {
      // Find existing cloud record
      const existing = await ctx.db
        .query(tableName)
        .withIndex("by_user_localId", (q: any) => 
          q.eq("userId", userId).eq("localId", localId)
        )
        .first();

      if (existing) {
        // Check if local data is newer (last-write-wins)
        if (data.diubahPada >= (existing.diubahPada || 0)) {
          await ctx.db.patch(existing._id, {
            ...data,
            lastSyncedAt: now,
            version: existing.version + 1,
          });
          updated++;
        }
      } else {
        // Insert new
        await ctx.db.insert(tableName, {
          userId,
          localId,
          ...data,
          lastSyncedAt: now,
          version: 1,
        });
        updated++;
      }
    }

    // Process each entity type
    for (const school of args.changes.schools) {
      await upsertEntity("cloudSchools", school.id, {
        nama: school.nama,
        jenjang: school.jenjang,
        logoUrl: school.logoUrl,
        alamat: school.alamat,
        dibuatPada: school.dibuatPada,
        diubahPada: school.diubahPada,
      });
    }

    for (const teacher of args.changes.teachers) {
      await upsertEntity("cloudTeachers", teacher.id, {
        nama: teacher.nama,
        email: teacher.email,
        sekolahId: teacher.sekolahId,
        tier: teacher.tier,
        dibuatPada: teacher.dibuatPada,
        diubahPada: teacher.diubahPada,
      });
    }

    for (const ay of args.changes.academicYears) {
      await upsertEntity("cloudAcademicYears", ay.id, {
        guruId: ay.guruId,
        label: ay.label,
        tanggalMulai: ay.tanggalMulai,
        tanggalSelesai: ay.tanggalSelesai,
        semesterAktif: ay.semesterAktif,
      });
    }

    for (const classroom of args.changes.classrooms) {
      await upsertEntity("cloudClassrooms", classroom.id, {
        tahunAjaranId: classroom.tahunAjaranId,
        guruId: classroom.guruId,
        nama: classroom.nama,
        statusAktif: classroom.statusAktif,
        dibuatPada: classroom.dibuatPada,
        diubahPada: classroom.diubahPada,
      });
    }

    for (const student of args.changes.students) {
      await upsertEntity("cloudStudents", student.id, {
        kelasId: student.kelasId,
        nama: student.nama,
        nisn: student.nisn,
        jenisKelamin: student.jenisKelamin,
        urutan: student.urutan,
        statusAktif: student.statusAktif,
        dibuatPada: student.dibuatPada,
        diubahPada: student.diubahPada,
      });
    }

    for (const session of args.changes.attendanceSessions) {
      await upsertEntity("cloudAttendanceSessions", session.id, {
        kelasId: session.kelasId,
        tanggal: session.tanggal,
        dibuatPada: session.dibuatPada,
        diubahPada: session.diubahPada,
      });
    }

    for (const record of args.changes.attendanceRecords) {
      await upsertEntity("cloudAttendanceRecords", record.id, {
        sesiId: record.sesiId,
        siswaId: record.siswaId,
        status: record.status,
        catatan: record.catatan,
        diubahPada: record.diubahPada,
      });
    }

    for (const entry of args.changes.calendarEntries) {
      await upsertEntity("cloudCalendarEntries", entry.id, {
        tahunAjaranId: entry.tahunAjaranId,
        tanggal: entry.tanggal,
        jenis: entry.jenis,
        keterangan: entry.keterangan,
        sumber: entry.sumber,
      });
    }

    return {
      success: true,
      updated,
      syncedAt: now,
    };
  },
});

/**
 * Initial sync: Upload local data to cloud
 * Called when user first enables cloud sync
 */
export const initialUpload = mutation({
  args: {
    email: v.string(),
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
    const normalizedEmail = args.email.toLowerCase().trim();

    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user && normalizedEmail !== args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
    }

    if (!user) {
      throw new Error("User not found");
    }

    const userId = user._id;
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
 * Incremental sync - only get data changed since last sync
 */
export const incrementalSync = query({
  args: {
    email: v.string(),
    lastSyncedAt: v.number(),
  },
  handler: async (ctx, { email, lastSyncedAt }) => {
    const normalizedEmail = email.toLowerCase().trim();

    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user && normalizedEmail !== email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user) {
      throw new Error("User not found");
    }

    const userId = user._id;

    // Get only data that changed after lastSyncedAt
    const schools = await ctx.db
      .query("cloudSchools")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("lastSyncedAt"), lastSyncedAt))
      .collect();

    const teachers = await ctx.db
      .query("cloudTeachers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("lastSyncedAt"), lastSyncedAt))
      .collect();

    const academicYears = await ctx.db
      .query("cloudAcademicYears")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("lastSyncedAt"), lastSyncedAt))
      .collect();

    const classrooms = await ctx.db
      .query("cloudClassrooms")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("lastSyncedAt"), lastSyncedAt))
      .collect();

    const students = await ctx.db
      .query("cloudStudents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("lastSyncedAt"), lastSyncedAt))
      .collect();

    const attendanceSessions = await ctx.db
      .query("cloudAttendanceSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("lastSyncedAt"), lastSyncedAt))
      .collect();

    const attendanceRecords = await ctx.db
      .query("cloudAttendanceRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("lastSyncedAt"), lastSyncedAt))
      .collect();

    const calendarEntries = await ctx.db
      .query("cloudCalendarEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gt(q.field("lastSyncedAt"), lastSyncedAt))
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
      hasChanges: 
        schools.length > 0 ||
        teachers.length > 0 ||
        academicYears.length > 0 ||
        classrooms.length > 0 ||
        students.length > 0 ||
        attendanceSessions.length > 0 ||
        attendanceRecords.length > 0 ||
        calendarEntries.length > 0,
    };
  },
});

/**
 * Download all data from cloud
 * Called when user logs in from new device (first sync)
 */
export const downloadAll = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const normalizedEmail = email.toLowerCase().trim();

    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user && normalizedEmail !== email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user) {
      throw new Error("User not found");
    }

    const userId = user._id;

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
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const normalizedEmail = email.toLowerCase().trim();

    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user && normalizedEmail !== email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (!user) {
      return null;
    }

    // Get sync metadata
    const metadata = await ctx.db
      .query("syncMetadata")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return metadata;
  },
});
