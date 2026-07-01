import { db } from "./db";
import type { School } from "@/types/entities";

export const schoolRepo = {
  async get(): Promise<School | undefined> {
    return db.schools.orderBy("id").first();
  },

  async save(school: School): Promise<number> {
    return db.schools.put(school);
  },

  async updateLogo(id: number, logoUrl: string): Promise<void> {
    await db.schools.update(id, { logoUrl, diubahPada: Date.now() });
  },
};
