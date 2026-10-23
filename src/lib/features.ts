import { Tier } from "@/types/enums";

export const LIMITS: Record<Tier, { kelas: number; siswaPerKelas: number; trialDays: number }> = {
  [Tier.FREE]: { kelas: 1, siswaPerKelas: 10, trialDays: 30 },
  [Tier.PLUS]: { kelas: 4, siswaPerKelas: 25, trialDays: 0 },
  [Tier.PRO]: { kelas: Infinity, siswaPerKelas: Infinity, trialDays: 0 },
};

const FEATURES: Record<Tier, string[]> = {
  [Tier.FREE]: ["presensi", "export_basic", "import_excel"],
  [Tier.PLUS]: [
    "presensi",
    "export_basic",
    "import_excel",
    "logo_report",
    "cloud_sync",
    "backup_auto",
    "pjj_mode",
    "rekap_custom",
    "bulk_update",
    "support_wa",
    "backup_local",
  ],
  [Tier.PRO]: [
    "presensi",
    "export_basic",
    "import_excel",
    "logo_report",
    "logo_report_custom",
    "cloud_sync",
    "cloud_sync_3device",
    "backup_auto",
    "backup_manual",
    "pjj_mode",
    "qr_mode",
    "rekap_custom",
    "bulk_update",
    "support_wa",
    "support_priority",
    "calendar_edit",
    "backup_local",
  ],
};

export function canUse(feature: string, tier: Tier | undefined | null = Tier.FREE): boolean {
  const t = tier || Tier.FREE;
  return (FEATURES[t] ?? []).includes(feature);
}

const INSTALL_DATE_KEY = "bgy_install_date";

export function trialDaysRemaining(): number {
  const stored = parseInt(localStorage.getItem(INSTALL_DATE_KEY) || "0", 10);
  if (!stored) {
    localStorage.setItem(INSTALL_DATE_KEY, Date.now().toString());
    return 30;
  }
  const elapsed = (Date.now() - stored) / 86400000;
  return Math.max(0, 30 - Math.floor(elapsed));
}

export function isTrialExpired(tier: Tier | undefined | null): boolean {
  if (tier && tier !== Tier.FREE) return false;
  return trialDaysRemaining() <= 0;
}

export function limitsFor(tier: Tier | undefined | null) {
  return LIMITS[tier || Tier.FREE];
}

export function tierLabel(tier: Tier | undefined | null): string {
  const t = tier || Tier.FREE;
  if (t === Tier.FREE) return "FREE";
  if (t === Tier.PLUS) return "PLUS";
  return "PRO";
}

export function isQrActive(tier: Tier | undefined | null): boolean {
  try {
    return localStorage.getItem("bgy_qr_mode") === "1" && canUse("qr_mode", tier);
  } catch {
    return false;
  }
}

export function isPjjActive(tier: Tier | undefined | null): boolean {
  try {
    return localStorage.getItem("bgy_pjj_mode") === "1" && canUse("pjj_mode", tier);
  } catch {
    return false;
  }
}

export const TRIAL_DAYS = 30;

/** PRO selama masa coba 30 hari untuk akun FREE; setelah itu tier asli. */
export function effectiveTier(realTier: Tier | undefined | null): Tier {
  const t = realTier || Tier.FREE;
  if (t !== Tier.FREE) return t;
  return trialDaysRemaining() > 0 ? Tier.PRO : Tier.FREE;
}

export function isOnTrial(realTier: Tier | undefined | null): boolean {
  return (realTier || Tier.FREE) === Tier.FREE && trialDaysRemaining() > 0;
}

/** Kelas di luar batas paket (urut id) terkunci: bisa dilihat, tidak bisa diisi presensi. */
export function isKelasLocked(
  kelasId: number | undefined | null,
  classrooms: { id: number }[],
  tier: Tier | undefined | null
): boolean {
  if (kelasId == null) return false;
  const max = limitsFor(tier).kelas;
  if (!isFinite(max)) return false;
  const allowed = [...classrooms].sort((a, b) => a.id - b.id).slice(0, max).map((c) => c.id);
  return !allowed.includes(kelasId);
}

export const QR_MODE_EVENT = "bgy-qr-mode";

/** Nyalakan/matikan Mode QR dan beri tahu semua komponen (hamburger, navbar, Pengaturan). */
export function setQrMode(on: boolean): void {
  try {
    localStorage.setItem("bgy_qr_mode", on ? "1" : "0");
    if (on) {
      localStorage.setItem("bgy_pjj_mode", "0");
      localStorage.setItem("bgy_auto_hadir", "0");
      localStorage.removeItem("bgy_qr_hint_seen");
    }
  } catch { /* ignore */ }
  window.dispatchEvent(new Event(QR_MODE_EVENT));
  window.dispatchEvent(new Event("storage"));
}
