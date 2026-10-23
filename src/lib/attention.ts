import { attendanceService } from "@/services/attendance.service";
import { todayStr } from "@/lib/utils";
import type { Student } from "@/types/entities";

/** Siswa ditandai "perlu perhatian" bila Alpha bulan ini mencapai batas ini. */
export const ALPHA_ALERT_THRESHOLD = 3;

export interface AttentionItem {
  student: Student;
  alpha: number;
}

/** Siswa dengan Alpha ≥ batas pada bulan berjalan, urut Alpha terbanyak. */
export async function getAttention(kelasId: number, students: Student[]): Promise<AttentionItem[]> {
  const today = todayStr();
  const monthStart = today.slice(0, 8) + "01";
  const rekap = (await attendanceService.hitungRekapRentang(kelasId, monthStart, today)) || {};
  return students
    .map((student) => ({ student, alpha: ((rekap as Record<number, Record<string, number>>)[student.id]?.A) || 0 }))
    .filter((x) => x.alpha >= ALPHA_ALERT_THRESHOLD)
    .sort((a, b) => b.alpha - a.alpha);
}
