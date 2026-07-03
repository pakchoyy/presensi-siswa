import { db } from "./db";
import type { Teacher } from "@/types/entities";
import { Tier } from "@/types/enums";

export const teacherRepo = {
  async get(): Promise<Teacher | undefined> {
    return db.teachers.orderBy("id").first();
  },

  async save(teacher: Teacher): Promise<number> {
    return db.teachers.put(teacher);
  },

  async update(id: number, teacher: Teacher): Promise<void> {
    await db.teachers.update(id, { ...teacher, diubahPada: Date.now() });
  },

  async updateTier(id: number, tier: Tier): Promise<void> {
    await db.teachers.update(id, { tier, diubahPada: Date.now() });
  },
};
