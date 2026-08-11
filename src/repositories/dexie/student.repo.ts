import { db } from "./db";
import type { Student } from "@/types/entities";
import { triggerAutoSync } from "@/hooks/useAutoSync";

export const studentRepo = {
  async getByClass(classroomId: number): Promise<Student[]> {
    if (!classroomId || typeof classroomId !== 'number') {
      console.warn('getByClass: invalid classroomId', { classroomId });
      return [];
    }
    return db.students
      .where("kelasId")
      .equals(classroomId)
      .and((s) => s.statusAktif === true)
      .sortBy("nama");
  },

  async getById(id: number): Promise<Student | undefined> {
    if (!id || typeof id !== 'number') {
      console.warn('getById: invalid id', { id });
      return undefined;
    }
    return db.students.get(id);
  },

  async save(student: Student): Promise<number> {
    const result = await db.students.put(student);
    triggerAutoSync();
    return result;
  },

  async bulkSave(students: Student[]): Promise<number> {
    const result = await db.students.bulkPut(students);
    triggerAutoSync();
    return result;
  },

  // Tambah siswa baru; jika ada siswa NONAKTIF di kelas yang sama dengan nama
  // yang sama, siswa tersebut DIHIDUPKAN LAGI (bukan dibuat baris baru).
  // Dengan begitu riwayat absensi lama tetap tersambung ke siswa yang sama
  // (mencegah masalah "masuk terus tapi itungan berkurang").
  async addOrRestore(student: Student): Promise<{ id: number; restored: boolean }> {
    const match = await db.students
      .where("kelasId")
      .equals(student.kelasId)
      .filter(
        (s) =>
          s.statusAktif === false &&
          s.nama.toLowerCase().trim() === student.nama.toLowerCase().trim()
      )
      .first();

    if (match) {
      const restored: Student = {
        ...match,
        nama: student.nama,
        nisn: student.nisn || match.nisn,
        jenisKelamin: student.jenisKelamin || match.jenisKelamin,
        statusAktif: true,
        urutan: student.urutan,
        diubahPada: Date.now(),
      };
      await this.save(restored);
      return { id: restored.id, restored: true };
    }

    await this.save(student);
    return { id: student.id, restored: false };
  },

  // Self-heal: siswa NONAKTIF ("hantu") yang kembar dengan siswa AKTIF (nama +
  // NISN sama) digabung — record absensinya dipindah ke siswa aktif, lalu baris
  // hantu dihapus. Memperbaiki data lama yang kena soft-delete + re-add/import.
  async mergeDuplicateStudents(): Promise<number> {
    const all = await db.students.toArray();
    const byClass = new Map<number, Student[]>();
    for (const s of all) {
      if (!byClass.has(s.kelasId)) byClass.set(s.kelasId, []);
      byClass.get(s.kelasId)!.push(s);
    }

    let merged = 0;
    for (const [, list] of byClass) {
      const active = list.filter((s) => s.statusAktif);
      const inactive = list.filter((s) => !s.statusAktif);
      for (const ghost of inactive) {
        const match = active.find(
          (a) =>
            a.nama.toLowerCase().trim() === ghost.nama.toLowerCase().trim() &&
            (!ghost.nisn || !a.nisn || a.nisn === ghost.nisn)
        );
        if (!match) continue;

        // Pindahkan record absensi milik siswa hantu ke siswa aktif
        const records = await db.attendanceRecords
          .where("siswaId")
          .equals(ghost.id)
          .toArray();
        for (const rec of records) {
          const existing = await db.attendanceRecords
            .where("sesiId")
            .equals(rec.sesiId)
            .filter((r) => r.siswaId === match.id)
            .first();
          if (existing) {
            if ((rec.diubahPada || 0) > (existing.diubahPada || 0)) {
              await db.attendanceRecords.update(existing.id, {
                status: rec.status,
                catatan: rec.catatan,
                diubahPada: rec.diubahPada,
              });
            }
            await db.attendanceRecords.delete(rec.id);
          } else {
            await db.attendanceRecords.put({ ...rec, siswaId: match.id });
          }
        }

        // Hapus siswa hantu lokal + tombstone agar penghapusan propagate ke cloud
        await db.tombstones.add({
          entityType: "students",
          localId: ghost.id,
          deletedAt: Date.now(),
        });
        await db.students.delete(ghost.id);
        merged++;
      }
    }

    if (merged > 0) {
      triggerAutoSync();
      window.dispatchEvent(new Event("data-changed"));
    }
    return merged;
  },

  async delete(id: number): Promise<void> {
    if (!id || typeof id !== 'number') {
      console.warn('delete: invalid id', { id });
      return;
    }
    await db.students.delete(id);
    triggerAutoSync();
  },

  async softDelete(id: number): Promise<void> {
    if (!id || typeof id !== 'number') {
      console.warn('softDelete: invalid id', { id });
      return;
    }
    await db.students.update(id, { statusAktif: false, diubahPada: Date.now() });
    triggerAutoSync();
  },

  async countActiveByClass(classroomId: number): Promise<number> {
    if (!classroomId || typeof classroomId !== 'number') {
      console.warn('countActiveByClass: invalid classroomId', { classroomId });
      return 0;
    }
    return db.students
      .where("kelasId")
      .equals(classroomId)
      .and((s) => s.statusAktif === true)
      .count();
  },
};
