import { AttendanceStatus } from "@/types/enums";

export const STATUS_HADIR: AttendanceStatus = AttendanceStatus.HADIR;
export const STATUS_SAKIT: AttendanceStatus = AttendanceStatus.SAKIT;
export const STATUS_IZIN: AttendanceStatus = AttendanceStatus.IZIN;
export const STATUS_ALPHA: AttendanceStatus = AttendanceStatus.ALPHA;

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  [AttendanceStatus.HADIR]: "Hadir",
  [AttendanceStatus.SAKIT]: "Sakit",
  [AttendanceStatus.IZIN]: "Izin",
  [AttendanceStatus.ALPHA]: "Alpha",
  [AttendanceStatus.TERLAMBAT]: "Terlambat",
};

export const STATUS_COLOR: Record<AttendanceStatus, string> = {
  [AttendanceStatus.HADIR]: "#16a34a",
  [AttendanceStatus.SAKIT]: "#b45309",
  [AttendanceStatus.IZIN]: "#1d4ed8",
  [AttendanceStatus.ALPHA]: "#dc2626",
  [AttendanceStatus.TERLAMBAT]: "#f59e0b",
};

export const STORAGE_KEY = "bgy_presensi";
export const STORAGE_DARK_KEY = "bgy_presensi_dark";

export const APP_NAME = "Presensi Siswa";
export const APP_BRAND = "Bantu Guru Yuk";

export const WIZARD_TOTAL_STEPS = 6;

export const PLUS_PRICE = "Rp17.000/semester";
export const PRO_PRICE = "Rp32.000/semester";

export const LICENSE_DURATION_DAYS = 180;

export const KREACY_PLUS_URL = "https://kreacy.my.id/produk/8nonq6ro";
export const KREACY_PRO_URL = "https://kreacy.my.id/produk/8nonq6ro";

// Kept for backward compat where still referenced; prefer LIMITS from @/lib/features
export const MAX_KELAS_FREE = 1;
export const MAX_STUDENTS_FREE = 10;

export const APP_URL = "https://presiswa.bantuguruyuk.web.id";
export const MAIN_SITE_URL = "https://bantuguruyuk.web.id";
