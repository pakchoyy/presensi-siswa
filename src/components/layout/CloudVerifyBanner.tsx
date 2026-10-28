import { useState } from "react";
import { CloudOff, X } from "lucide-react";
import { useCloudAuth } from "@/contexts/CloudAuthContext";
import { OtpVerify } from "@/components/auth/OtpVerify";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { connectDevice } from "@/services/device-connect.service";
import { Tier } from "@/types/enums";

/** Dipasang wizard saat setup selesai: buka dialog simpan ke cloud sekali. */
export const CLOUD_PROMPT_KEY = "bgy_cloud_prompt_now";
const NUDGE_KEY = "bgy_cloud_nudge_hidden";
const today = () => new Date().toISOString().slice(0, 10);
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

/**
 * Satu banner untuk dua kasus:
 * - perangkat punya email cloud tapi belum verifikasi kode (sinkron dijeda);
 * - data baru di HP ini (belum pernah ke cloud) dan paket bisa cloud (masa coba / PLUS / PRO).
 * Bisa ditutup, muncul lagi besok.
 */
export function CloudVerifyBanner() {
  const { cloudEmail, needsVerify, refreshCloudUser } = useCloudAuth();
  const { teacher, tier } = useApp();
  const { toast } = useToast();
  const [hidden, setHidden] = useState(() => read(NUDGE_KEY) === today());
  const [open, setOpen] = useState(() => {
    if (!read(CLOUD_PROMPT_KEY)) return false;
    try { localStorage.removeItem(CLOUD_PROMPT_KEY); } catch { /* abaikan */ }
    return true;
  });

  if (read("bgy_demo_mode") === "1") return null;
  const belumCloud = !cloudEmail && tier !== Tier.FREE;
  if (!(needsVerify && cloudEmail) && !belumCloud) return null;

  const tutup = () => {
    try { localStorage.setItem(NUDGE_KEY, today()); } catch { /* abaikan */ }
    setHidden(true);
  };

  return (
    <>
      {!hidden && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-[10px] border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2">
          <CloudOff size={16} className="text-[#d97706] flex-shrink-0" />
          <div className="flex-1 text-[0.72rem] text-[var(--text)] leading-snug">
            {belumCloud
              ? "Data kamu baru tersimpan di HP ini. Simpan ke cloud supaya aman & bisa dibuka di HP lain."
              : "Sinkron cloud dijeda. Verifikasi email sekali di perangkat ini."}
          </div>
          <button onClick={() => setOpen(true)} className="text-[0.72rem] font-bold text-white bg-[#0ea5a0] border-none rounded-[8px] px-3 py-[6px] cursor-pointer flex-shrink-0">
            {belumCloud ? "Simpan ke cloud" : "Verifikasi"}
          </button>
          <button onClick={tutup} aria-label="Tutup pengingat" className="bg-transparent border-none text-[var(--text-light)] cursor-pointer p-1 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}
      {open && (
        <OtpVerify
          email={cloudEmail || teacher?.email || ""}
          title={belumCloud ? "Simpan data ke cloud" : "Verifikasi email"}
          editEmail={belumCloud}
          laterLabel="Nanti saja"
          onConnected={async (r, email) => {
            setOpen(false);
            // Email sama: cukup lanjutkan sinkron. Data baru / email diganti: jadikan akun cloud perangkat ini & ambil datanya.
            if ((cloudEmail && email === cloudEmail.toLowerCase().trim()) || !teacher) { refreshCloudUser(); return; }
            toast("Menyimpan ke akun " + email + "…");
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
