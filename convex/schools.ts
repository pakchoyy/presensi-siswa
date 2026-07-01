import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const pushSchools = mutation({
  args: { schools: v.array(v.any()) },
  handler: async (ctx, args) => {
    for (const s of args.schools) {
      const existing = await ctx.db.query("schools").filter((q) => q.eq(q.field("diubahPada"), s.diubahPada)).first();
      if (!existing) {
        await ctx.db.insert("schools", s);
      }
    }
  },
});

export const pullSchools = query({
  args: { guruId: v.number(), since: v.number() },
  handler: async (ctx, args) => {
    return ctx.db.query("schools").filter((q) => q.gt(q.field("diubahPada"), args.since)).collect();
  },
});
