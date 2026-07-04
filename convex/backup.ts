import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Save backup to cloud
 */
export const saveCloudBackup = mutation({
  args: {
    token: v.string(),
    data: v.string(),
    label: v.string(),
    totalEntitas: v.number(),
    type: v.string(), // "auto" | "manual"
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = session.userId;
    const now = Date.now();
    const size = new Blob([args.data]).size;

    await ctx.db.insert("cloudBackups", {
      userId,
      type: args.type,
      data: args.data,
      size,
      totalEntitas: args.totalEntitas,
      label: args.label,
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * List all cloud backups for user
 */
export const listCloudBackups = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = session.userId;

    // Get all backups for user, sorted by creation time (newest first)
    return ctx.db
      .query("cloudBackups")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/**
 * Delete a cloud backup
 */
export const deleteCloudBackup = mutation({
  args: {
    token: v.string(),
    backupId: v.id("cloudBackups"),
  },
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = session.userId;

    // Verify backup belongs to user
    const backup = await ctx.db.get(args.backupId);
    if (!backup || backup.userId !== userId) {
      throw new Error("Backup not found or access denied");
    }

    await ctx.db.delete(args.backupId);
    return { success: true };
  },
});
