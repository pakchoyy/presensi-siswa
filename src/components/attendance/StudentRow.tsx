import type { Student } from "@/types/entities";
import type { AttendanceStatus } from "@/types/enums";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/constants";
import { inisial } from "@/lib/utils";

interface Props {
  student: Student;
  index: number;
  status: AttendanceStatus;
  onClick: () => void;
}

const STATUS_BORDER: Record<string, string> = {
  H: "#16a34a",
  S: "#b45309",
  I: "#1d4ed8",
  A: "#dc2626",
};

const STATUS_BG: Record<string, string> = {
  H: "var(--hadir-bg, #dcfce7)",
  S: "var(--sakit-bg, #fef3c7)",
  I: "var(--izin-bg, #dbeafe)",
  A: "var(--alpha-bg, #fee2e2)",
};

export function StudentRow({ student, index, status, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-[10px] px-3 py-[11px] rounded-[10px] bg-[var(--input-bg)] mb-2 cursor-pointer active:scale-[0.98] transition-transform border-l-4 select-none"
      style={{ touchAction: "manipulation", borderLeftColor: STATUS_BORDER[status] || STATUS_BORDER.H }}
    >
      <div
        className="w-[34px] h-[34px] rounded-full text-white flex items-center justify-center font-bold text-[0.78rem] flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)",
        }}
      >
        {inisial(student.nama)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[0.86rem] font-bold whitespace-nowrap overflow-hidden text-ellipsis">
          {student.nama}
        </div>
        <div className="text-[0.68rem] text-[var(--text-light)]">No. {index + 1}</div>
      </div>
      <div
        className="text-[11px] font-bold px-[9px] py-1 rounded-full flex-shrink-0"
        style={{
          background: STATUS_BG[status] || STATUS_BG.H,
          color: STATUS_COLOR[status as AttendanceStatus] || STATUS_COLOR.H,
        }}
      >
        {STATUS_LABEL[status as AttendanceStatus]}
      </div>
    </div>
  );
}
