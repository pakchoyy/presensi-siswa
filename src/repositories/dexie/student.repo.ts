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
