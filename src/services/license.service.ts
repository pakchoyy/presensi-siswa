import { supabase } from "@/lib/supabase";
import { licenseRepo } from "@/repositories/dexie/license.repo";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import type { License } from "@/types/entities";
import { Tier } from "@/types/enums";
import { generateId, timestamp } from "@/lib/utils";

export interface ActivationResult {
  success: boolean;
  message: string;
  email?: string;
  shouldAutoRegister?: boolean;
  cloudEmail?: string;
  tanggalBerakhir?: number;
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

    const upperKode = kode.toUpperCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const { data: license, error: findError } = await supabase
        .from("licenses")
        .select("id, status")
        .eq("kode", upperKode)
        .maybeSingle();

      if (findError || !license) {
        return { success: false, message: "Kode lisensi tidak ditemukan" };
      }

      if (license.status !== "tersedia") {
        return { success: false, message: "Kode lisensi sudah digunakan" };
      }

      const now = Date.now();
      const tanggalBerakhir = now + 365 * 24 * 60 * 60 * 1000;

      const { error: updateError } = await supabase
        .from("licenses")
        .update({
          status: "digunakan",
          email: normalizedEmail,
          guru_id: guruId,
          tanggal_aktivasi: now,
          tanggal_berakhir: tanggalBerakhir,
        })
        .eq("id", license.id);

      if (updateError) {
        return { success: false, message: "Gagal mengaktivasi lisensi" };
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, tier")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (profile) {
        if (profile.tier !== "PRO") {
          await supabase.from("profiles").update({ tier: "PRO", updated_at: new Date().toISOString() }).eq("id", profile.id);
        }
      }

      const license_: License = {
        id: generateId(),
        guruId,
        emailAktivasi: email,
        kodeLisensi: upperKode,
        tanggalAktivasi: now,
        tanggalBerakhir,
        statusLisensi: "Aktif",
      };

      await licenseRepo.save(license_);
      await teacherRepo.updateTier(guruId, Tier.PRO);

      const teacher = await teacherRepo.get();
      if (teacher) {
        await teacherRepo.update(teacher.id, { ...teacher, email });
      }

      localStorage.setItem("presensi_cloud_email", normalizedEmail);

      return {
        success: true,
        message: "✅ Lisensi PRO berhasil diaktivasi!",
        cloudEmail: normalizedEmail,
        tanggalBerakhir,
      };
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

    const upperKode = kode.toUpperCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const { data: newCode, error: findError } = await supabase
        .from("licenses")
        .select("id, status")
        .eq("kode", upperKode)
        .maybeSingle();

      if (findError || !newCode || newCode.status !== "tersedia") {
        return { success: false, message: "Kode perpanjangan tidak valid atau sudah digunakan" };
      }

      const { data: existingLicense } = await supabase
        .from("licenses")
        .select("id, tanggal_berakhir")
        .eq("email", normalizedEmail)
        .eq("status", "digunakan")
        .maybeSingle();

      const now = Date.now();
      let newExpiry: number;

      if (existingLicense && existingLicense.tanggal_berakhir) {
        const base = Math.max(now, existingLicense.tanggal_berakhir);
        newExpiry = base + 365 * 24 * 60 * 60 * 1000;
        await supabase
          .from("licenses")
          .update({ tanggal_berakhir: newExpiry })
          .eq("id", existingLicense.id);
      } else {
        newExpiry = now + 365 * 24 * 60 * 60 * 1000;
      }

      await supabase
        .from("licenses")
        .update({
          status: "digunakan",
          email: normalizedEmail,
          tanggal_aktivasi: now,
          tanggal_berakhir: newExpiry,
        })
        .eq("id", newCode.id);

      const license = await licenseRepo.getActive(guruId);
      if (license) {
        await licenseRepo.save({
          ...license,
          tanggalBerakhir: newExpiry,
          kodeLisensi: upperKode,
        });
      }

      return { success: true, message: "✅ Lisensi berhasil diperpanjang 1 tahun!", tanggalBerakhir: newExpiry };
    } catch {
      return { success: false, message: "Gagal terhubung. Periksa internet." };
    }
  },

  async claimCode(): Promise<ActivationResult & { kode?: string }> {
    try {
      const { data: available, error } = await supabase
        .from("licenses")
        .select("kode")
        .eq("status", "tersedia")
        .limit(1);

      if (error || !available || available.length === 0) {
        return { success: false, message: "Stok kode habis" };
      }

      return { success: true, message: "Kode berhasil diklaim!", kode: available[0].kode };
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
