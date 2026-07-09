import { db } from "./db";
import type { Classroom } from "@/types/entities";
import { triggerAutoSync } from "@/hooks/useAutoSync";

export const classroomRepo = {
  async getAll(): Promise<Classroom[]> {
    return db.classrooms.filter((c) => c.statusAktif === true).toArray();
  },

  async countActive(): Promise<number> {
    return db.classrooms.filter((c) => c.statusAktif === true).count();
  },

  async getById(id: number): Promise<Classroom | undefined> {
    return db.classrooms.get(id);
  },

  async save(classroom: Classroom): Promise<number> {
    const result = await db.classrooms.put(classroom);
    triggerAutoSync();
    return result;
  },

  async delete(id: number): Promise<void> {
    await db.classrooms.delete(id);
    triggerAutoSync();
  },

  async softDelete(id: number): Promise<void> {
    await db.classrooms.update(id, { statusAktif: false, diubahPada: Date.now() });
    triggerAutoSync();
  },
};
