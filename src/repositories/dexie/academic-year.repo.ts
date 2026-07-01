import { db } from "./db";
import type { AcademicYear } from "@/types/entities";

export const academicYearRepo = {
  async getActive(): Promise<AcademicYear | undefined> {
    return db.academicYears.orderBy("id").last();
  },

  async save(ay: AcademicYear): Promise<number> {
    return db.academicYears.put(ay);
  },
};
