import { useState } from "react";
import { CloudOff } from "lucide-react";
import { useCloudAuth } from "@/contexts/CloudAuthContext";
import { OtpVerify } from "@/components/auth/OtpVerify";

/** Muncul kalau perangkat punya email cloud tapi belum verifikasi kode email (sync dijeda). */
export function CloudVerifyBanner() {
  const { cloudEmail, needsVerify, refreshCloudUser } = useCloudAuth();
  const [open, setOpen] = useState(false);
  if (!needsVerify || !cloudEmail || localStorage.getItem("bgy_demo_mode") === "1") return null;

  return (
    <>
      <div className="mx-3 mt-2 flex items-center gap-2 rounded-[10px] border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2">
        <CloudOff size={16} className="text-[#d97706] flex-shrink-0" />
        <div className="flex-1 text-[0.72rem] text-[var(--text)] leading-snug">
          Sinkron cloud dijeda. Verifikasi email sekali di perangkat ini.
        </div>
        <button onClick={() => setOpen(true)} className="text-[0.72rem] font-bold text-white bg-[#0ea5a0] border-none rounded-[8px] px-3 py-[6px] cursor-pointer flex-shrink-0">
          Verifikasi
        </button>
      </div>
      {open && (
        <OtpVerify
          email={cloudEmail}
          title="Verifikasi email"
          onConnected={() => { setOpen(false); refreshCloudUser(); }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
