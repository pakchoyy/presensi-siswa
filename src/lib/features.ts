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
