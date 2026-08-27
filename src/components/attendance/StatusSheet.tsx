import { AttendanceStatus } from "@/types/enums";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/constants";
import { CheckCircle2, Thermometer, FileText, XCircle, Clock } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (status: AttendanceStatus) => void;
  studentName: string;
}

const STATUS_ICONS: Record<AttendanceStatus, typeof CheckCircle2> = {
  [AttendanceStatus.HADIR]: CheckCircle2,
  [AttendanceStatus.SAKIT]: Thermometer,
  [AttendanceStatus.IZIN]: FileText,
  [AttendanceStatus.ALPHA]: XCircle,
  [AttendanceStatus.TERLAMBAT]: Clock,
};

const STATUSES: AttendanceStatus[] = [
  AttendanceStatus.HADIR,
  AttendanceStatus.SAKIT,
  AttendanceStatus.IZIN,
  AttendanceStatus.ALPHA,
  AttendanceStatus.TERLAMBAT,
];

export function StatusSheet({ isOpen, onClose, onSelect, studentName }: Props) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[500] animate-fade-in"
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 bottom-0 -translate-x-1/2 w-full max-w-app bg-[var(--card-bg)] rounded-t-[18px] px-4 pt-[18px] pb-6 z-[501] animate-slide-up"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto mb-[14px]" />
        <div className="text-[0.85rem] font-bold mb-[14px] text-center">
          Ubah status — {studentName}
        </div>
        <div className="grid grid-cols-2 gap-[10px]">
          {STATUSES.map((status) => {
            const Icon = STATUS_ICONS[status];
            const isLastOdd = STATUSES.length % 2 === 1 && status === STATUSES[STATUSES.length - 1];
            return (
              <button
                key={status}
                onClick={() => onSelect(status)}
                className={`flex flex-col items-center gap-[6px] py-4 px-2 rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--input-bg)] cursor-pointer font-bold text-[0.82rem] active:scale-95 transition-transform ${isLastOdd ? "col-span-2 max-w-[calc(50%-5px)] mx-auto w-full" : ""}`}
                style={{ color: STATUS_COLOR[status] }}
              >
                <Icon size={24} />
                {STATUS_LABEL[status]}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
