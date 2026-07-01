import { db } from "./db";
import type { Student } from "@/types/entities";

export const studentRepo = {
  async getByClass(classroomId: number): Promise<Student[]> {
    return db.students
      .where("kelasId")
      .equals(classroomId)
      .and((s) => s.statusAktif === true)
      .sortBy("urutan");
  },

  async getById(id: number): Promise<Student | undefined> {
    return db.students.get(id);
  },

  async save(student: Student): Promise<number> {
    return db.students.put(student);
  },

  async bulkSave(students: Student[]): Promise<number> {
    return db.students.bulkPut(students);
  },

  async delete(id: number): Promise<void> {
    await db.students.delete(id);
  },

  async softDelete(id: number): Promise<void> {
    await db.students.update(id, { statusAktif: false, diubahPada: Date.now() });
  },

  async countActiveByClass(classroomId: number): Promise<number> {
    return db.students
      .where("kelasId")
      .equals(classroomId)
      .and((s) => s.statusAktif === true)
      .count();
  },
};
