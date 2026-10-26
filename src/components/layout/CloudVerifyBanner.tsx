import { useState } from "react";
import { CloudOff } from "lucide-react";
import { useCloudAuth } from "@/contexts/CloudAuthContext";
import { OtpVerify } from "@/components/auth/OtpVerify";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { connectDevice } from "@/services/device-connect.service";

/** Muncul kalau perangkat punya email cloud tapi belum verifikasi kode email (sync dijeda). */
export function CloudVerifyBanner() {
  const { cloudEmail, needsVerify, refreshCloudUser } = useCloudAuth();
  const { teacher } = useApp();
  const { toast } = useToast();
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
          onConnected={async (r, email) => {
            setOpen(false);
            // Email sama: cukup lanjutkan sinkron. Email diganti: pindahkan perangkat ke akun itu & ambil datanya.
            if (email === cloudEmail?.toLowerCase().trim() || !teacher) { refreshCloudUser(); return; }
            toast("Menghubungkan ke akun " + email + "…");
            try {
              toast(await connectDevice(teacher, r, email));
              setTimeout(() => window.location.reload(), 1500);
            } catch {
              toast("❌ Gagal menghubungkan. Coba lagi dari Pengaturan.");
            }
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
