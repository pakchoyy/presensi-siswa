import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
});
