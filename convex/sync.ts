import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const pushBatch = internalMutation({
  args: {
    entities: v.object({
      schools: v.array(v.any()),
      teachers: v.array(v.any()),
      academicYears: v.array(v.any()),
      classrooms: v.array(v.any()),
      students: v.array(v.any()),
      attendanceSessions: v.array(v.any()),
      attendanceRecords: v.array(v.any()),
      calendarEntries: v.array(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const tables: Record<string, string> = {
      schools: "schools",
      teachers: "teachers",
      academicYears: "academicYears",
      classrooms: "classrooms",
      students: "students",
      attendanceSessions: "attendanceSessions",
      attendanceRecords: "attendanceRecords",
      calendarEntries: "calendarEntries",
    };

    let count = 0;
    for (const [key, tableName] of Object.entries(tables)) {
      const entities = (args.entities as any)[key];
      for (const entity of entities) {
        if (tableName === "teachers") {
          const existing = await ctx.db
            .query(tableName as any)
            .filter((q: any) => q.eq(q.field("email"), entity.email))
            .first();
          if (existing) {
            if (entity.diubahPada >= (existing.diubahPada || 0)) {
              await ctx.db.patch(existing._id, entity);
              count++;
            }
          } else {
            await ctx.db.insert(tableName as any, entity);
            count++;
          }
        } else {
          const existing = await ctx.db
            .query(tableName as any)
            .filter((q: any) => q.eq(q.field("id"), entity.id))
            .first();
          if (existing) {
            if (!entity.diubahPada || entity.diubahPada >= (existing.diubahPada || 0)) {
              await ctx.db.patch(existing._id, entity);
              count++;
            }
          } else {
            await ctx.db.insert(tableName as any, entity);
            count++;
          }
        }
      }
    }
    return { count };
  },
});

export const pullAll = internalQuery({
  args: { guruId: v.number() },
  handler: async (ctx, args) => {
    const tables = ["schools", "academicYears", "classrooms", "students", "attendanceSessions", "attendanceRecords", "calendarEntries"];

    const result: Record<string, any[]> = {};

    for (const table of tables) {
      let query = ctx.db.query(table as any);
      if (table === "schools" || table === "calendarEntries") {
        result[table] = await query.collect();
      } else {
        result[table] = await query.filter((q: any) => q.eq(q.field("guruId"), args.guruId)).collect();
      }
    }

    result["teachers"] = await ctx.db.query("teachers").filter((q: any) => q.eq(q.field("guruId"), args.guruId)).collect();

    return result;
  },
});

export const saveCloudBackup = internalMutation({
  args: {
    guruId: v.number(),
    data: v.string(),
    label: v.string(),
    totalEntitas: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("backups", {
      guruId: args.guruId,
      data: args.data,
      label: args.label,
      totalEntitas: args.totalEntitas,
      dibuatPada: Date.now(),
    });
    return { success: true };
  },
});

export const listCloudBackups = internalQuery({
  args: { guruId: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("backups")
      .filter((q: any) => q.eq(q.field("guruId"), args.guruId))
      .order("desc")
      .collect();
  },
});
