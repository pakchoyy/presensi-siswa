import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

const ADMIN_EMAILS = ["pulsachoy@gmail.com", "choiruddin2410@gmail.com"];

export const checkEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();
    
    if (ADMIN_EMAILS.includes(normalizedEmail)) {
      return { tier: "PRO", admin: true };
    }

    // Skip PRO detection for default/placeholder emails
    if (normalizedEmail === "guru@email.com" || normalizedEmail === "admin@gmail.com") {
      return { tier: "FREE", data: null };
    }

    // Lookup license table for expiry info
    const license = await ctx.db
      .query("licenses")
      .filter((q) => q.eq(q.field("email"), normalizedEmail))
      .filter((q) => q.eq(q.field("status"), "digunakan"))
      .first();

    // Check cloud user first (for multi-device sync) - try normalized, fallback original
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user && normalizedEmail !== args.email) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
    }
    
    if (user && user.tier === "PRO") {
      const now = Date.now();
      return {
        tier: "PRO",
        data: user,
        tanggalBerakhir: license?.tanggalBerakhir || Math.max(user.createdAt + 365 * 24 * 60 * 60 * 1000, now),
      };
    }

    // Fallback to teachers table (for backward compatibility)
    const teacher = await ctx.db
      .query("teachers")
      .filter((q) => q.eq(q.field("email"), normalizedEmail))
      .first();

    if (!teacher) return { tier: "FREE", data: null };
    const now = Date.now();
    return {
      tier: teacher.tier,
      data: teacher,
      tanggalBerakhir: license?.tanggalBerakhir || now + 365 * 24 * 60 * 60 * 1000,
    };
  },
});

export const pushTeachers = mutation({
  args: { teachers: v.array(v.any()) },
  handler: async (ctx, args) => {
    for (const t of args.teachers) {
      const existing = await ctx.db
        .query("teachers")
        .filter((q) => q.eq(q.field("email"), t.email))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { ...t, _id: existing._id });
      } else {
        await ctx.db.insert("teachers", t);
      }
    }
  },
});

export const pullTeachers = query({
  args: { email: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("teachers")
      .filter((q) => q.eq(q.field("email"), args.email))
      .collect();
  },
});

export const pushAllEntities = mutation({
  args: {
    entityType: v.string(),
    entities: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const table = args.entityType as keyof typeof ctx.db extends infer T ? any : any;
    for (const entity of args.entities) {
      if (entity.id) {
        const existing = (await ctx.db.query(args.entityType as any).filter((q: any) =>
          q.eq(q.field("id"), entity.id)
        ).first()) as any;
        if (existing) {
          if (!entity.diubahPada || entity.diubahPada >= (existing.diubahPada || 0)) {
            await ctx.db.patch(existing._id, entity);
          }
        } else {
          await ctx.db.insert(args.entityType as any, entity);
        }
      }
    }
  },
});

export const pullAllEntities = query({
  args: { entityType: v.string(), guruId: v.number(), since: v.number() },
  handler: async (ctx, args) => {
    const table = ctx.db.query(args.entityType as any);
    if (args.entityType === "schools" || args.entityType === "calendarEntries") {
      return table.filter((q: any) => q.gt(q.field("diubahPada"), args.since)).collect();
    }
    if (args.entityType === "teachers") {
      return table.collect();
    }
    return table
      .filter((q: any) => q.gt(q.field("diubahPada"), args.since))
      .filter((q: any) => q.eq(q.field("guruId"), args.guruId))
      .collect();
  },
});

export const validateAndActivate = mutation({
  args: {
    kode: v.string(),
    email: v.string(),
    guruId: v.number(),
  },
  handler: async (ctx, args) => {
    const upperKode = args.kode.toUpperCase().trim();

    const license = await ctx.db
      .query("licenses")
      .filter((q) => q.eq(q.field("kode"), upperKode))
      .first();

    if (!license) {
      return { success: false, message: "Kode lisensi tidak ditemukan" };
    }

    if (license.status !== "tersedia") {
      return { success: false, message: "Kode lisensi sudah digunakan" };
    }

    const now = Date.now();
    const normalizedEmail = args.email.toLowerCase().trim();

    await ctx.db.patch(license._id, {
      status: "digunakan",
      email: normalizedEmail,
      guruId: args.guruId,
      tanggalAktivasi: now,
      tanggalBerakhir: now + 365 * 24 * 60 * 60 * 1000,
    });

    // Auto-create cloud user for PRO license
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      // Create new user
      await ctx.db.insert("users", {
        email: normalizedEmail,
        passwordHash: "", // Passwordless
        name: normalizedEmail.split('@')[0],
        tier: "PRO",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Update existing user to PRO
      await ctx.db.patch(user._id, {
        tier: "PRO",
        updatedAt: now,
      });
    }

    return {
      success: true,
      message: "✅ Lisensi PRO berhasil diaktivasi!",
      tanggalBerakhir: now + 365 * 24 * 60 * 60 * 1000,
      cloudEmail: normalizedEmail, // Return email for cloud sync
    };
  },
});

export const generateCodes = mutation({
  args: { count: v.number() },
  handler: async (ctx, args) => {
    const codes: string[] = [];
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for (let i = 0; i < args.count; i++) {
      let code: string;
      do {
        const random = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        code = `BGY-PS-${random}`;
      } while (codes.includes(code));

      codes.push(code);
      await ctx.db.insert("licenses", {
        kode: code,
        status: "tersedia",
      });
    }

    return { codes };
  },
});

export const claimCode = internalMutation({
  handler: async (ctx) => {
    const available = await ctx.db
      .query("licenses")
      .filter((q) => q.eq(q.field("status"), "tersedia"))
      .take(1);

    if (available.length === 0) {
      return { success: false, message: "Stok kode habis. Hubungi admin." };
    }

    return { success: true, kode: available[0].kode };
  },
});

export const renewLicense = mutation({
  args: {
    kode: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const upperKode = args.kode.toUpperCase().trim();
    const normalizedEmail = args.email.toLowerCase().trim();

    const newCode = await ctx.db
      .query("licenses")
      .filter((q) => q.eq(q.field("kode"), upperKode))
      .first();

    if (!newCode || newCode.status !== "tersedia") {
      return { success: false, message: "Kode perpanjangan tidak valid atau sudah digunakan" };
    }

    // Cari lisensi existing user
    const existing = await ctx.db
      .query("licenses")
      .filter((q) => q.eq(q.field("email"), normalizedEmail))
      .filter((q) => q.eq(q.field("status"), "digunakan"))
      .first();

    const now = Date.now();
    let newExpiry: number;

    if (existing) {
      // Tambah 1 tahun dari expired (atau dari sekarang, whichever is later)
      const base = Math.max(now, existing.tanggalBerakhir || now);
      newExpiry = base + 365 * 24 * 60 * 60 * 1000;

      await ctx.db.patch(existing._id, {
        tanggalBerakhir: newExpiry,
      });
    } else {
      newExpiry = now + 365 * 24 * 60 * 60 * 1000;
    }

    // Tandai kode baru sebagai digunakan
    await ctx.db.patch(newCode._id, {
      status: "digunakan",
      email: normalizedEmail,
      tanggalAktivasi: now,
      tanggalBerakhir: newExpiry,
    });

    return {
      success: true,
      message: "✅ Lisensi berhasil diperpanjang 1 tahun!",
      tanggalBerakhir: newExpiry,
    };
  },
});
