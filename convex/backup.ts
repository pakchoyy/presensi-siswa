import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Save backup to cloud
 */
export const saveCloudBackup = mutation({
  args: {
    email: v.string(),
    data: v.string(),
    label: v.string(),
    totalEntitas: v.number(),
    type: v.string(), // "auto" | "manual"
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const userId = user._id;
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
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get all backups for user, sorted by creation time (newest first)
    return ctx.db
      .query("cloudBackups")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/**
 * Delete a cloud backup
 */
export const deleteCloudBackup = mutation({
  args: {
    email: v.string(),
    backupId: v.id("cloudBackups"),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify backup belongs to user
    const backup = await ctx.db.get(args.backupId);
    if (!backup || backup.userId !== user._id) {
      throw new Error("Backup not found or access denied");
    }

    await ctx.db.delete(args.backupId);
    return { success: true };
  },
});
