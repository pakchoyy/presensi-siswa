import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useApp } from "@/contexts/AppContext";
import { Tier } from "@/types/enums";
import { Wifi, WifiOff, Loader } from "lucide-react";

export function SyncIndicator() {
  const online = useOnlineStatus();
  const { teacher, setupSelesai } = useApp();

  if (!setupSelesai) return null;

  const isPRO = teacher?.tier === Tier.PRO;

  if (!isPRO) return null;

  return (
    <div
      className="flex items-center gap-1 text-[0.6rem] px-2 py-1 rounded-full text-white/80"
      style={{
        background: online ? "rgba(22,163,74,0.25)" : "rgba(239,68,68,0.25)",
      }}
      title={online ? "Tersinkron — data aman di cloud" : "Menunggu koneksi internet"}
    >
      {online ? <Wifi size={11} /> : <WifiOff size={11} />}
      <span className="font-semibold">
        {online ? "Cloud" : "Offline"}
      </span>
    </div>
  );
}
