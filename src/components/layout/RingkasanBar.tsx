import { useApp } from "@/contexts/AppContext";
import type { AttendanceStatus } from "@/types/enums";

interface Props {
  counts: Record<AttendanceStatus, number>;
}

export function RingkasanBar({ counts }: Props) {
  const { activePage, setupSelesai } = useApp();
  if (!setupSelesai || activePage !== "presensi") return null;

  const items: { label: string; key: AttendanceStatus; color: string }[] = [
    { label: "Hadir", key: "H" as AttendanceStatus, color: "var(--hadir)" },
    { label: "Sakit", key: "S" as AttendanceStatus, color: "var(--sakit)" },
    { label: "Izin", key: "I" as AttendanceStatus, color: "var(--izin)" },
    { label: "Alpha", key: "A" as AttendanceStatus, color: "var(--alpha)" },
  ];

  return (
    <div className="sticky top-14 z-[200] bg-[var(--card-bg)] border-b border-[var(--border)] px-[14px] py-2 flex gap-[10px] justify-between overflow-x-auto">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-[5px] text-[11px] font-semibold whitespace-nowrap">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: item.color }}
          />
          {item.label} <b className="text-[11px] font-semibold">{counts[item.key]}</b>
        </div>
      ))}
    </div>
  );
}
