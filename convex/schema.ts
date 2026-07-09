import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Custom auth tables (simplified)
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    tier: v.string(), // "FREE" | "PRO"
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    deviceId: v.string(),
    deviceName: v.string(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    expiresAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_token", ["token"]),

  // Original tables...
  schools: defineTable({
    nama: v.string(),
    jenjang: v.string(),
    logoUrl: v.optional(v.string()),
    alamat: v.optional(v.string()),
    dibuatPada: v.number(),
    diubahPada: v.number(),
  }).index("by_diubah", ["diubahPada"]),

  teachers: defineTable({
    nama: v.string(),
    email: v.string(),
    sekolahId: v.number(),
    tier: v.string(),
    dibuatPada: v.number(),
    diubahPada: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_diubah", ["diubahPada"]),

  academicYears: defineTable({
    guruId: v.number(),
    label: v.string(),
    tanggalMulai: v.string(),
    tanggalSelesai: v.string(),
    semesterAktif: v.string(),
  }).index("by_guru", ["guruId"]),

  classrooms: defineTable({
    tahunAjaranId: v.number(),
    guruId: v.number(),
    nama: v.string(),
    statusAktif: v.boolean(),
    dibuatPada: v.number(),
    diubahPada: v.number(),
  })
    .index("by_guru", ["guruId"])
    .index("by_diubah", ["diubahPada"]),

  students: defineTable({
    kelasId: v.number(),
    nama: v.string(),
    nisn: v.optional(v.string()),
    jenisKelamin: v.optional(v.string()),
    urutan: v.number(),
    statusAktif: v.boolean(),
    dibuatPada: v.number(),
    diubahPada: v.number(),
  })
    .index("by_kelas", ["kelasId"])
    .index("by_diubah", ["diubahPada"]),

  attendanceSessions: defineTable({
    kelasId: v.number(),
    tanggal: v.string(),
    dibuatPada: v.number(),
    diubahPada: v.number(),
  })
    .index("by_kelas_tanggal", ["kelasId", "tanggal"])
    .index("by_diubah", ["diubahPada"]),

  attendanceRecords: defineTable({
    sesiId: v.number(),
    siswaId: v.number(),
    status: v.string(),
    catatan: v.optional(v.string()),
    diubahPada: v.number(),
  })
    .index("by_sesi", ["sesiId"])
    .index("by_sesi_siswa", ["sesiId", "siswaId"])
    .index("by_diubah", ["diubahPada"]),

  calendarEntries: defineTable({
    tahunAjaranId: v.number(),
    tanggal: v.string(),
    jenis: v.string(),
    keterangan: v.optional(v.string()),
    sumber: v.string(),
  }).index("by_tanggal", ["tanggal"]),

  licenses: defineTable({
    kode: v.string(),
    status: v.string(),
    email: v.optional(v.string()),
    guruId: v.optional(v.number()),
    tanggalAktivasi: v.optional(v.number()),
    tanggalBerakhir: v.optional(v.number()),
  }).index("by_kode", ["kode"]),

  backups: defineTable({
    guruId: v.number(),
    data: v.string(),
    label: v.string(),
    totalEntitas: v.number(),
    dibuatPada: v.number(),
  }).index("by_guru", ["guruId"]),

  // ============================================
  // FASE 4: CLOUD SYNC TABLES (PRO ONLY)
  // ============================================

  // Sync metadata - track sync status per user
  syncMetadata: defineTable({
    userId: v.id("users"),
    entityType: v.string(), // "school" | "classroom" | "student" | "attendance" | "calendar"
    lastSyncedAt: v.number(),
    syncStatus: v.string(), // "idle" | "syncing" | "error"
    errorMessage: v.optional(v.string()),
    totalRecords: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_entity", ["userId", "entityType"]),

  // Cloud version of schools (PRO users)
  cloudSchools: defineTable({
    userId: v.id("users"),
    localId: v.number(), // Original ID from IndexedDB
    nama: v.string(),
    jenjang: v.string(),
    logoUrl: v.optional(v.string()),
    alamat: v.optional(v.string()),
    dibuatPada: v.number(),
    diubahPada: v.number(),
    lastSyncedAt: v.number(),
    version: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_localId", ["userId", "localId"]),

  // Cloud version of teachers (PRO users)
  cloudTeachers: defineTable({
    userId: v.id("users"),
    localId: v.number(),
    nama: v.string(),
    email: v.string(),
    sekolahId: v.number(),
    tier: v.string(),
    dibuatPada: v.number(),
    diubahPada: v.number(),
    lastSyncedAt: v.number(),
    version: v.number(),
  }).index("by_user", ["userId"])
    .index("by_email", ["email"])
    .index("by_user_localId", ["userId", "localId"]),

  // Cloud version of academic years (PRO users)
  cloudAcademicYears: defineTable({
    userId: v.id("users"),
    localId: v.number(),
    guruId: v.number(),
    label: v.string(),
    tanggalMulai: v.string(),
    tanggalSelesai: v.string(),
    semesterAktif: v.string(),
    lastSyncedAt: v.number(),
    version: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_localId", ["userId", "localId"]),

  // Cloud version of classrooms (PRO users)
  cloudClassrooms: defineTable({
    userId: v.id("users"),
    localId: v.number(),
    tahunAjaranId: v.number(),
    guruId: v.number(),
    nama: v.string(),
    statusAktif: v.boolean(),
    dibuatPada: v.number(),
    diubahPada: v.number(),
    lastSyncedAt: v.number(),
    version: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_guru", ["userId", "guruId"])
    .index("by_user_localId", ["userId", "localId"]),

  // Cloud version of students (PRO users)
  cloudStudents: defineTable({
    userId: v.id("users"),
    localId: v.number(),
    kelasId: v.number(),
    nama: v.string(),
    nisn: v.optional(v.string()),
    jenisKelamin: v.optional(v.string()),
    urutan: v.number(),
    statusAktif: v.boolean(),
    dibuatPada: v.number(),
    diubahPada: v.number(),
    lastSyncedAt: v.number(),
    version: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_kelas", ["userId", "kelasId"])
    .index("by_user_localId", ["userId", "localId"]),

  // Cloud version of attendance sessions (PRO users)
  cloudAttendanceSessions: defineTable({
    userId: v.id("users"),
    localId: v.number(),
    kelasId: v.number(),
    tanggal: v.string(),
    dibuatPada: v.number(),
    diubahPada: v.number(),
    lastSyncedAt: v.number(),
    version: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_kelas_tanggal", ["userId", "kelasId", "tanggal"])
    .index("by_user_localId", ["userId", "localId"]),

  // Cloud version of attendance records (PRO users)
  cloudAttendanceRecords: defineTable({
    userId: v.id("users"),
    localId: v.number(),
    sesiId: v.number(),
    siswaId: v.number(),
    status: v.string(),
    catatan: v.optional(v.string()),
    diubahPada: v.number(),
    lastSyncedAt: v.number(),
    version: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_sesi", ["userId", "sesiId"])
    .index("by_user_localId", ["userId", "localId"]),

  // Cloud version of calendar entries (PRO users)
  cloudCalendarEntries: defineTable({
    userId: v.id("users"),
    localId: v.number(),
    tahunAjaranId: v.number(),
    tanggal: v.string(),
    jenis: v.string(),
    keterangan: v.optional(v.string()),
    sumber: v.string(),
    lastSyncedAt: v.number(),
    version: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_tanggal", ["userId", "tanggal"])
    .index("by_user_localId", ["userId", "localId"]),

  // Offline queue - for syncing when back online
  syncQueue: defineTable({
    userId: v.id("users"),
    entityType: v.string(),
    localId: v.number(),
    operation: v.string(), // "create" | "update" | "delete"
    data: v.any(),
    createdAt: v.number(),
    status: v.string(), // "pending" | "synced" | "failed"
    retries: v.number(),
    errorMessage: v.optional(v.string()),
  }).index("by_user_status", ["userId", "status"])
    .index("by_created", ["createdAt"]),

  // Cloud backups (enhanced version with compression)
  cloudBackups: defineTable({
    userId: v.id("users"),
    type: v.string(), // "auto" | "manual"
    data: v.string(), // compressed JSON
    size: v.number(), // bytes
    totalEntitas: v.number(),
    label: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"]),

  // Tombstones - track deleted records so all devices learn about deletions
  cloudTombstones: defineTable({
    userId: v.id("users"),
    entityType: v.string(), // "schools" | "teachers" | "classrooms" | "students" | ...
    localId: v.number(),
    deletedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Device tracking - max 3 devices per user
  devices: defineTable({
    userId: v.id("users"),
    deviceName: v.string(), // Auto-detected (e.g., "Chrome on Windows")
    deviceId: v.string(), // Unique identifier
    lastActiveAt: v.number(),
    createdAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_user_device", ["userId", "deviceId"]),
});
