import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hashPassword, verifyPassword, generateToken } from "./auth_helpers";

/**
 * Register new user
 */
export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { email, password, name }) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      throw new Error("Email sudah terdaftar");
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create user
    const userId = await ctx.db.insert("users", {
      email,
      passwordHash,
      name,
      tier: "FREE",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { userId, email, name };
  },
});

/**
 * Login user
 */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    deviceId: v.string(),
    deviceName: v.string(),
  },
  handler: async (ctx, { email, password, deviceId, deviceName }) => {
    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      throw new Error("Email atau password salah");
    }

    // Verify password
    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Email atau password salah");
    }

    // Tier-based device limit
    const deviceLimit = user.tier === "PRO" ? 3 : 1;

    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Check if same device (replace session instead of counting as new)
    const existingSession = activeSessions.find(
      (s) => s.deviceId === deviceId
    );

    if (existingSession) {
      // Same device - delete old session, will create new one below
      await ctx.db.delete(existingSession._id);
    } else if (activeSessions.length >= deviceLimit) {
      // Different device and limit reached - throw error with device list
      const deviceList = activeSessions
        .map(
          (s, i) =>
            `${i + 1}. ${s.deviceName} (Last active: ${new Date(s.lastActiveAt).toLocaleString("id-ID")})`
        )
        .join("\n");

      throw new Error(
        `Batas perangkat tercapai. Tier ${user.tier} maksimal ${deviceLimit} perangkat.\n\nPerangkat aktif:\n${deviceList}\n\nLogout dari salah satu perangkat terlebih dahulu atau upgrade ke PRO untuk 3 perangkat.`
      );
    }

    // Generate token
    const token = generateToken(user._id);

    // Create session
    const sessionId = await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      deviceId,
      deviceName,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
    };
  },
});

/**
 * Logout user
 */
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

/**
 * Get current user from token
 */
export const getCurrentUser = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    // Find session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!session) {
      return null;
    }

    // Check if expired
    if (session.expiresAt < Date.now()) {
      return null; // Will be cleaned up by mutation later
    }

    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      tier: user.tier,
    };
  },
});

/**
 * Update session activity (separate mutation)
 */
export const updateSessionActivity = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        lastActiveAt: Date.now(),
      });
    }
  },
});

/**
 * Get active devices for user
 */
export const getActiveDevices = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    // Find session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!session) {
      return [];
    }

    // Get all sessions for this user
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    return sessions.map((s) => ({
      deviceId: s.deviceId,
      deviceName: s.deviceName,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s.token === token,
    }));
  },
});

/**
 * Logout from specific device
 */
export const logoutDevice = mutation({
  args: {
    token: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, { token, deviceId }) => {
    // Verify current session
    const currentSession = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!currentSession) {
      throw new Error("Unauthorized");
    }

    // Find target session
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", currentSession.userId))
      .collect();

    const targetSession = sessions.find((s) => s.deviceId === deviceId);
    if (targetSession) {
      await ctx.db.delete(targetSession._id);
    }

    return { success: true };
  },
});

/**
 * Logout from all devices
 */
export const logoutAll = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    // Verify current session
    const currentSession = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!currentSession) {
      throw new Error("Unauthorized");
    }

    // Delete all sessions
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", currentSession.userId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});
