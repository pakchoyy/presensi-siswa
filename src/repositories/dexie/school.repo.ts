import { db } from "./db";
import type { School } from "@/types/entities";
import { triggerAutoSync } from "@/hooks/useAutoSync";

export const schoolRepo = {
  async get(): Promise<School | undefined> {
    // Utamakan sekolah milik guru aktif; setelah tarik cloud bisa ada beberapa sekolah lama.
    const teacher = await db.teachers.orderBy("id").first();
    const own = teacher?.sekolahId ? await db.schools.get(teacher.sekolahId) : undefined;
    return own ?? db.schools.orderBy("id").first();
  },

  async save(school: School): Promise<number> {
    const result = await db.schools.put(school);
    triggerAutoSync();
    return result;
  },

  async updateLogo(id: number, logoUrl: string): Promise<void> {
    if (!id || typeof id !== 'number') {
      console.warn('updateLogo: invalid id', { id });
      return;
    }
    await db.schools.update(id, { logoUrl, diubahPada: Date.now() });
    triggerAutoSync();
  },
};
