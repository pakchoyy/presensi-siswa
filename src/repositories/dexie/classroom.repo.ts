import { db } from "./db";
import type { Classroom } from "@/types/entities";
import { triggerAutoSync } from "@/hooks/useAutoSync";

export const classroomRepo = {
  async getAll(): Promise<Classroom[]> {
    return db.classrooms.where("statusAktif").equals(true as any).toArray();
  },

  async countActive(): Promise<number> {
    return db.classrooms.filter((c) => c.statusAktif === true).count();
  },

  async getById(id: number): Promise<Classroom | undefined> {
    if (!id || typeof id !== 'number') {
      console.warn('getById: invalid id', { id });
      return undefined;
    }
    return db.classrooms.get(id);
  },

  async save(classroom: Classroom): Promise<number> {
    const result = await db.classrooms.put(classroom);
    triggerAutoSync();
    return result;
  },

  async delete(id: number): Promise<void> {
    if (!id || typeof id !== 'number') {
      console.warn('delete: invalid id', { id });
      return;
    }
    await db.classrooms.delete(id);
    triggerAutoSync();
  },

  async softDelete(id: number): Promise<void> {
    if (!id || typeof id !== 'number') {
      console.warn('softDelete: invalid id', { id });
      return;
    }
    await db.classrooms.update(id, { statusAktif: false, diubahPada: Date.now() });
    triggerAutoSync();
  },
};
