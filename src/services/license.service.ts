import { licenseRepo } from "@/repositories/dexie/license.repo";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import type { License } from "@/types/entities";
import { Tier } from "@/types/enums";
import { generateId, timestamp } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export interface ActivationResult {
  success: boolean;
  message: string;
  email?: string;
  shouldAutoRegister?: boolean;
  cloudEmail?: string;
  tanggalBerakhir?: number;
  tier?: Tier;
}

function tierFromKode(kode: string): Tier {
  const upper = (kode || "").toUpperCase();
  if (upper.includes("-PLUS-")) return Tier.PLUS;
  if (upper.includes("-PRO-")) return Tier.PRO;
  // Legacy BGY-PS-XXXX fallback — treat as PRO (back-compat)
  return Tier.PRO;
}

async function callLicenseApi(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const { data: sess } = await supabase.auth.getSession();
  if (sess.session?.access_token) headers.Authorization = `Bearer ${sess.session.access_token}`;
  const res = await fetch("/api/license", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const licenseService = {
  /** Cek lisensi aktif milik email yang sedang login (OTP). Tanpa sesi, server menolak (401). */
  async lookupByEmail(email: string): Promise<{ found: boolean; tier: Tier | null; tanggalBerakhir: number | null }> {
    const { ok, data } = await callLicenseApi({ action: "status", email });
    if (!ok) throw new Error(data.error || "Gagal cek lisensi");
    return { found: !!data.found, tier: (data.tier as Tier) ?? null, tanggalBerakhir: data.tanggalBerakhir ?? null };
  },

  /** Pasang ulang lisensi yang sudah pernah diaktivasi (email + kode harus cocok). */
  async restore(email: string, kode: string): Promise<{ ok: boolean; tier?: Tier; tanggalBerakhir?: number; error?: string }> {
    const { ok, data } = await callLicenseApi({ action: "restore", email: email.toLowerCase().trim(), kode: kode.toUpperCase().trim() });
    if (!ok) return { ok: false, error: data.error || "Gagal memulihkan lisensi" };
    return { ok: true, tier: data.tier as Tier, tanggalBerakhir: data.tanggalBerakhir };
  },

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
      return { success: false, message: "Format kode: BGY-PS-PLUS-XXXX atau BGY-PS-PRO-XXXX" };
    }

    const existing = await licenseRepo.getActive(guruId);
    // PLUS boleh naik ke PRO; selain itu tolak lisensi ganda
    if (existing && !((existing.tier || Tier.PRO) === Tier.PLUS && tierFromKode(kode.toUpperCase().trim()) === Tier.PRO)) {
      return { success: false, message: "Kamu sudah memiliki lisensi aktif" };
    }

    const upperKode = kode.toUpperCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const { ok, status, data } = await callLicenseApi({ action: "activate", email: normalizedEmail, kode: upperKode, guruId });
      if (!ok) {
        return { success: false, message: status >= 500 ? "Gagal mengaktivasi lisensi" : data.error || "Gagal mengaktivasi lisensi" };
      }
      const now = Date.now();
      const tanggalBerakhir: number = data.tanggalBerakhir;
      const tier: Tier = (data.tier as Tier) || tierFromKode(upperKode);

      const license_: License = {
        id: generateId(),
        guruId,
        emailAktivasi: email,
        kodeLisensi: upperKode,
        tier,
        tanggalAktivasi: now,
        tanggalBerakhir,
        statusLisensi: "Aktif",
      };

      if (existing) await licenseRepo.expire(existing.id);
      await licenseRepo.save(license_);
      await teacherRepo.updateTier(guruId, tier);

      const teacher = await teacherRepo.get();
      if (teacher) {
        await teacherRepo.update(teacher.id, { ...teacher, email });
      }

      localStorage.setItem("presensi_cloud_email", normalizedEmail);

      return {
        success: true,
        message: `✅ Lisensi ${tier} berhasil diaktivasi!`,
        cloudEmail: normalizedEmail,
        tanggalBerakhir,
        tier,
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
    tier?: Tier;
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
      tier: license.tier || Tier.PRO,
      berakhir: formatDate(license.tanggalBerakhir),
      daysRemaining,
      isExpiring: daysRemaining <= 7,
      email: license.emailAktivasi,
      kode: license.kodeLisensi,
    };
  },

  async renew(guruId: number, email: string, kode: string): Promise<ActivationResult> {
    if (!kode || kode.trim().length < 8) {
      return { success: false, message: "Format kode: BGY-PS-PLUS-XXXX atau BGY-PS-PRO-XXXX" };
    }

    const upperKode = kode.toUpperCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const { ok, data } = await callLicenseApi({ action: "renew", email: normalizedEmail, kode: upperKode });
      if (!ok) {
        return { success: false, message: data.error || "Kode perpanjangan tidak valid atau sudah digunakan" };
      }
      const newExpiry: number = data.tanggalBerakhir;
      const tier: Tier = (data.tier as Tier) || tierFromKode(upperKode);

      const license = await licenseRepo.getActive(guruId);
      if (license) {
        await licenseRepo.save({
          ...license,
          tanggalBerakhir: newExpiry,
          kodeLisensi: upperKode,
          tier,
        });
      }
      await teacherRepo.updateTier(guruId, tier);

      return { success: true, message: `✅ Lisensi ${tier} berhasil diperpanjang 1 semester!`, tanggalBerakhir: newExpiry, tier };
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
