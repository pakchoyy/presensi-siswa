import { db } from "./db";
import type { School } from "@/types/entities";
import { triggerAutoSync } from "@/hooks/useAutoSync";

export const schoolRepo = {
  async get(): Promise<School | undefined> {
    return db.schools.orderBy("id").first();
  },

  async save(school: School): Promise<number> {
    const result = await db.schools.put(school);
    triggerAutoSync();
    return result;
  },

  async updateLogo(id: number, logoUrl: string): Promise<void> {
    await db.schools.update(id, { logoUrl, diubahPada: Date.now() });
    triggerAutoSync();
  },
};
