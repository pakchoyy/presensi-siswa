import { db } from "./db";
import type { Classroom } from "@/types/entities";

export const classroomRepo = {
  async getAll(): Promise<Classroom[]> {
    return db.classrooms.where("statusAktif").equals(true).toArray();
  },

  async countActive(): Promise<number> {
    return db.classrooms.where("statusAktif").equals(true).count();
  },

  async getById(id: number): Promise<Classroom | undefined> {
    return db.classrooms.get(id);
  },

  async save(classroom: Classroom): Promise<number> {
    return db.classrooms.put(classroom);
  },
};
