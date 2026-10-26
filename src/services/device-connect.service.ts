import { licenseRepo } from "@/repositories/dexie/license.repo";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import { syncService } from "@/services/sync.service";
import { setTrialMulai, TRIAL_DAYS } from "@/lib/features";
import { LICENSE_DURATION_DAYS } from "@/lib/constants";
import { generateId } from "@/lib/utils";
import { Tier } from "@/types/enums";
import type { License, Teacher } from "@/types/entities";

export interface ConnectInfo { tier: Tier; tanggalBerakhir: number | null; trial?: boolean }

/**
 * Setelah email terverifikasi & perangkat terdaftar: jadikan email ini akun cloud perangkat,
 * ambil datanya (atau unggah data HP bila cloud kosong), simpan lisensi lokal & email guru.
 * Mengembalikan pesan hasil untuk toast. Halaman perlu dimuat ulang sesudahnya.
 */
export async function connectDevice(teacher: Teacher, result: ConnectInfo, emailAddress: string): Promise<string> {
  const foundTier = result.tier === Tier.PLUS ? Tier.PLUS : Tier.PRO;
  if (result.trial && result.tanggalBerakhir) setTrialMulai(result.tanggalBerakhir - TRIAL_DAYS * 86400000);
  localStorage.setItem("presensi_cloud_email", emailAddress);

  let message: string;
  try {
    const downloaded = await syncService.downloadAll(emailAddress);
    if (downloaded > 0) {
      message = `✅ ${downloaded} data dimuat, menyegarkan tampilan…`;
    } else {
      // Cloud masih kosong: data yang sudah ada di HP ini jadi data awal akun.
      const uploaded = await syncService.initialUpload(emailAddress);
      message = uploaded > 0 ? `✅ ${uploaded} data di HP ini disimpan ke cloud` : "⚠️ Terhubung, tapi belum ada data terkirim ke cloud";
    }
  } catch (error) {
    console.error("Download error:", error);
    message = "⚠️ Gagal mengambil data cloud, coba lagi";
  }

  // Masa coba: cloud aktif, tapi paket & lisensi di HP tetap FREE.
  const existingLicense = result.trial ? true : await licenseRepo.getActive(teacher.id);
  if (!existingLicense) {
    const now = Date.now();
    const license: License = {
      id: generateId(),
      guruId: teacher.id,
      emailAktivasi: emailAddress,
      kodeLisensi: "DEVICE-CONNECTED",
      tanggalAktivasi: now,
      tanggalBerakhir: result.tanggalBerakhir || now + LICENSE_DURATION_DAYS * 24 * 60 * 60 * 1000,
      statusLisensi: "Aktif",
      tier: foundTier,
    };
    await licenseRepo.save(license);
  }

  await teacherRepo.update(teacher.id, {
    ...teacher,
    tier: result.trial ? teacher.tier : foundTier,
    email: emailAddress,
  });
  return message;
}
