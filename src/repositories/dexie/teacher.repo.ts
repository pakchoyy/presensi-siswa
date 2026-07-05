import { db } from "./db";
import type { Teacher } from "@/types/entities";
import { Tier } from "@/types/enums";
import { triggerAutoSync } from "@/hooks/useAutoSync";

export const teacherRepo = {
  async get(): Promise<Teacher | undefined> {
    return db.teachers.orderBy("id").first();
  },

  async save(teacher: Teacher): Promise<number> {
    const result = await db.teachers.put(teacher);
    triggerAutoSync();
    return result;
  },

  async update(id: number, teacher: Teacher): Promise<void> {
    await db.teachers.update(id, { ...teacher, diubahPada: Date.now() });
    triggerAutoSync();
  },

  async updateTier(id: number, tier: Tier): Promise<void> {
    await db.teachers.update(id, { tier, diubahPada: Date.now() });
    triggerAutoSync();
  },
};
