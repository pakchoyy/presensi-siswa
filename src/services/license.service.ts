import { licenseRepo } from "@/repositories/dexie/license.repo";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import type { License } from "@/types/entities";
import { Tier } from "@/types/enums";
import { generateId, timestamp } from "@/lib/utils";
import { convexClient } from "@/lib/convex";

export interface ActivationResult {
  success: boolean;
  message: string;
}

export const licenseService = {
  async validateKode(email: string, kode: string): Promise<ActivationResult> {
    if (!email || !email.includes("@")) {
      return { success: false, message: "Email tidak valid" };
    }
    if (!kode || kode.trim().length < 4) {
      return { success: false, message: "Kode lisensi tidak valid" };
    }
    return { success: true, message: "Kode valid" };
  },

  async activate(email: string, kode: string, guruId: number): Promise<ActivationResult> {
    if (!email || !email.includes("@")) {
      return { success: false, message: "Email tidak valid" };
    }
    if (!kode || kode.trim().length < 8) {
      return { success: false, message: "Format kode: BGY-PS-XXXX" };
    }

    const existing = await licenseRepo.getActive(guruId);
    if (existing) {
      return { success: false, message: "Kamu sudah memiliki lisensi PRO aktif" };
    }

    // Validate via Convex
    try {
      const result = await (convexClient as any).mutation("licenses:validateAndActivate", {
        kode: kode.toUpperCase().trim(),
        email,
        guruId,
      }) as ActivationResult & { tanggalBerakhir?: number };

      if (!result.success) {
        return result;
      }

      // Save locally
      const now = timestamp();
      const license: License = {
        id: generateId(),
        guruId,
        emailAktivasi: email,
        kodeLisensi: kode.toUpperCase().trim(),
        tanggalAktivasi: now,
        tanggalBerakhir: result.tanggalBerakhir || now + 365 * 24 * 60 * 60 * 1000,
        statusLisensi: "Aktif",
      };

      await licenseRepo.save(license);
      await teacherRepo.updateTier(guruId, Tier.PRO);

      return { success: true, message: "✅ Lisensi PRO berhasil diaktivasi!" };
    } catch (err) {
      return { success: false, message: "Gagal terhubung ke server. Periksa koneksi internet." };
    }
  },

  async checkExpiry(guruId: number): Promise<boolean> {
    const license = await licenseRepo.getActive(guruId);
    if (!license) return false;

    const now = timestamp();
    if (now > license.tanggalBerakhir) {
      await licenseRepo.expire(license.id);
      await teacherRepo.updateTier(guruId, Tier.FREE);
      return true;
    }
    return false;
  },

  async getStatus(guruId: number): Promise<{
    aktif: boolean;
    berakhir?: string;
    daysRemaining?: number;
    isExpiring?: boolean;
    email?: string;
    kode?: string;
  }> {
    const license = await licenseRepo.getActive(guruId);
    if (!license) return { aktif: false };

    const now = timestamp();
    if (now > license.tanggalBerakhir) {
      await licenseRepo.expire(license.id);
      await teacherRepo.updateTier(guruId, Tier.FREE);
      return { aktif: false };
    }

    const daysRemaining = Math.ceil((license.tanggalBerakhir - now) / (24 * 60 * 60 * 1000));

    return {
      aktif: true,
      berakhir: formatDate(license.tanggalBerakhir),
      daysRemaining,
      isExpiring: daysRemaining <= 7,
      email: license.emailAktivasi,
      kode: license.kodeLisensi,
    };
  },

  async renew(guruId: number, email: string, kode: string): Promise<ActivationResult> {
    if (!kode || kode.trim().length < 8) {
      return { success: false, message: "Format kode: BGY-PS-XXXX" };
    }

    try {
      const result = await (convexClient as any).mutation("licenses:renewLicense", {
        kode: kode.toUpperCase().trim(),
        email,
      }) as ActivationResult & { tanggalBerakhir?: number };

      if (!result.success) return result;

      // Update local license
      const license = await licenseRepo.getActive(guruId);
      if (license && result.tanggalBerakhir) {
        await licenseRepo.save({
          ...license,
          tanggalBerakhir: result.tanggalBerakhir,
          kodeLisensi: kode.toUpperCase().trim(),
        });
      }

      return { success: true, message: "✅ Lisensi berhasil diperpanjang 1 tahun!" };
    } catch {
      return { success: false, message: "Gagal terhubung. Periksa internet." };
    }
  },

  async claimCode(): Promise<ActivationResult & { kode?: string }> {
    try {
      const result = await (convexClient as any).mutation("licenses:claimCode", {}) as any;
      if (result.success) {
        return { success: true, message: "Kode berhasil diklaim!", kode: result.kode };
      }
      return { success: false, message: result.message || "Stok kode habis" };
    } catch {
      return { success: false, message: "Gagal terhubung. Periksa internet." };
    }
  },

  async deactivate(guruId: number): Promise<void> {
    const license = await licenseRepo.getActive(guruId);
    if (license) {
      await licenseRepo.expire(license.id);
      await teacherRepo.updateTier(guruId, Tier.FREE);
    }
  },

  getManfaat(): string[] {
    return [
      "Kelola semua kelas yang kamu ajar (tanpa batas)",
      "Buka data yang sama dari HP, laptop, atau tablet",
      "Data aman tersimpan & otomatis sinkron di internet",
      "Atur kalender sendiri: tandai libur & hari penting",
      "Update data siswa lewat Excel tanpa duplikat",
      "Backup & pulihkan data dari internet (cloud)",
      "Tambah logo sekolah di laporan PDF & Excel",
    ];
  },
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
